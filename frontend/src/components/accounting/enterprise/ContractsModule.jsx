import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../../ui/dialog';
import { Plus, FileText, Eye, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const CONTRACT_TYPES = [
  { value: 'service', label: 'Service' },
  { value: 'prestation', label: 'Prestation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'location', label: 'Location' },
  { value: 'autre', label: 'Autre' },
];

export default function ContractsModule() {
  const [contracts, setContracts] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({
    title: '', contract_type: 'service', start_date: new Date().toISOString().slice(0, 10),
    end_date: '', amount: 0, payment_terms: '', auto_renew: false, terms: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsRes, expiringRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/enterprise/contracts`, { params: { page, limit: 20 } }),
        axios.get(`${BACKEND_URL}/api/enterprise/contracts/alerts/expiring`),
      ]);
      setContracts(contractsRes.data.items || []);
      setTotal(contractsRes.data.total || 0);
      setPages(contractsRes.data.pages || 1);
      setExpiring(expiringRes.data.items || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/contracts`, {
        ...form, amount: parseFloat(form.amount) || 0,
      });
      setShowCreate(false);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-500" />
          Contrats
        </h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-3 h-3" />Nouveau contrat</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau contrat</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Titre</label>
                <Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Contrat de maintenance annuel" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Type</label>
                  <Select value={form.contract_type} onValueChange={v => setForm(p => ({...p, contract_type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Montant</label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Début</label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Fin</label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(p => ({...p, end_date: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Conditions de paiement</label>
                <Input value={form.payment_terms} onChange={e => setForm(p => ({...p, payment_terms: e.target.value}))} placeholder="30 jours fin de mois" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Termes & conditions</label>
                <Textarea value={form.terms} onChange={e => setForm(p => ({...p, terms: e.target.value}))} rows={3} />
              </div>
              <Button className="w-full" onClick={handleCreate}>Créer le contrat</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expiring Alert */}
      {expiring.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              {expiring.length} contrat(s) expire(nt) dans 30 jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {expiring.map(c => (
                <div key={c.contract_id} className="flex items-center justify-between text-xs">
                  <span>{c.title}</span>
                  <Badge variant="outline" className="text-amber-500">{c.end_date}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Aucun contrat</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">N°</th>
                    <th className="text-left p-3">Titre</th>
                    <th className="text-center p-3">Type</th>
                    <th className="text-right p-3">Montant</th>
                    <th className="text-center p-3">Début</th>
                    <th className="text-center p-3">Fin</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.contract_id} className="border-t hover:bg-muted/20">
                      <td className="p-3 font-mono text-[10px]">{c.contract_id}</td>
                      <td className="p-3">{c.title}</td>
                      <td className="p-3 text-center"><Badge variant="outline" className="text-[10px]">{c.contract_type}</Badge></td>
                      <td className="p-3 text-right font-mono">{fmt(c.amount)}</td>
                      <td className="p-3 text-center">{c.start_date}</td>
                      <td className="p-3 text-center">{c.end_date || '∞'}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowDetail(c)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-xs text-muted-foreground">Page {page}/{pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{showDetail?.title}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Type:</span> {showDetail.contract_type}</div>
                <div><span className="text-muted-foreground">Montant:</span> {fmt(showDetail.amount)}</div>
                <div><span className="text-muted-foreground">Début:</span> {showDetail.start_date}</div>
                <div><span className="text-muted-foreground">Fin:</span> {showDetail.end_date || 'Indéfini'}</div>
                <div><span className="text-muted-foreground">Paiement:</span> {showDetail.payment_terms || '—'}</div>
                <div><span className="text-muted-foreground">Renouvellement auto:</span> {showDetail.auto_renew ? 'Oui' : 'Non'}</div>
              </div>
              {showDetail.terms && (
                <div>
                  <span className="text-muted-foreground">Conditions:</span>
                  <p className="mt-1 text-xs bg-muted/20 p-2 rounded">{showDetail.terms}</p>
                </div>
              )}
              {showDetail.versions && (
                <div>
                  <span className="text-xs font-medium">Versions ({showDetail.versions.length})</span>
                  <div className="mt-1 space-y-1">
                    {showDetail.versions.map((v, i) => (
                      <div key={i} className="text-xs text-muted-foreground">v{v.version} — {v.date?.slice(0, 10)}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
