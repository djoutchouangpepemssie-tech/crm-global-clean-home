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
import { Plus, FileText, Eye, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Calendar, Clock, Edit, Trash2, History } from 'lucide-react';
import { useConfirm } from '../../shared/ConfirmDialog';

const CONTRACT_TYPES = [
  { value: 'cdi', label: 'CDI' }, { value: 'cdd', label: 'CDD' },
  { value: 'prestataire', label: 'Prestataire' }, { value: 'service', label: 'Service' },
  { value: 'maintenance', label: 'Maintenance' }, { value: 'location', label: 'Location' },
];

const STATUS_MAP = {
  active: { label: 'Actif', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  expired: { label: 'Expiré', class: 'bg-red-500/10 text-red-500 border-red-500/20' },
  pending: { label: 'En attente', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
};

export default function ContractsModule() {
  const { confirm, ConfirmElement } = useConfirm();
  const [contracts, setContracts] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({
    title: '', contract_type: 'service', party_name: '', party_type: 'fournisseur',
    start_date: new Date().toISOString().slice(0, 10),
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
      await axios.post(`${BACKEND_URL}/api/enterprise/contracts`, { ...form, amount: parseFloat(form.amount) || 0 });
      setShowCreate(false);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleArchive = async (contractId) => {
    const ok = await confirm({
      title: 'Archiver ce contrat ?',
      description: 'Le contrat sera archivé.',
      variant: 'warning',
      confirmText: 'Archiver',
    });
    if (!ok) return;
    alert('Contrat archivé');
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <FileText className="w-5 h-5 text-indigo-500" />
            </div>
            Contrats & Documents
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{total} contrat(s)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-md shadow-indigo-500/20">
              <Plus className="w-3.5 h-3.5" />Nouveau contrat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                Nouveau contrat
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Titre</label>
                <Input className="h-10" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Contrat de maintenance annuel" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                  <Select value={form.contract_type} onValueChange={v => setForm(p => ({...p, contract_type: v}))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Partie</label>
                  <Select value={form.party_type} onValueChange={v => setForm(p => ({...p, party_type: v}))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salarie">Salarié</SelectItem>
                      <SelectItem value="fournisseur">Fournisseur</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom partie</label>
                  <Input className="h-10" value={form.party_name} onChange={e => setForm(p => ({...p, party_name: e.target.value}))} placeholder="Nom..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Montant annuel</label>
                  <Input type="number" step="0.01" className="h-10 font-mono" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Début</label>
                  <Input type="date" className="h-10" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fin</label>
                  <Input type="date" className="h-10" value={form.end_date} onChange={e => setForm(p => ({...p, end_date: e.target.value}))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conditions de paiement</label>
                <Input className="h-10" value={form.payment_terms} onChange={e => setForm(p => ({...p, payment_terms: e.target.value}))} placeholder="30 jours fin de mois" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Termes (optionnel)</label>
                <Textarea value={form.terms} onChange={e => setForm(p => ({...p, terms: e.target.value}))} rows={3} />
              </div>
              <Button className="w-full h-10 bg-gradient-to-r from-indigo-500 to-indigo-600" onClick={handleCreate}>
                <FileText className="w-4 h-4 mr-2" />Créer le contrat
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expiring alert */}
      {expiring.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-600">{expiring.length} contrat(s) expire(nt) dans 30 jours</p>
              <div className="mt-2 space-y-1">
                {expiring.map(c => (
                  <div key={c.contract_id} className="flex items-center justify-between text-xs">
                    <span>{c.title}</span>
                    <Badge variant="outline" className="text-amber-600">{c.end_date}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucun contrat</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Titre</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Montant/an</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Début</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fin</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Expire dans</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c, idx) => {
                    const days = daysUntil(c.end_date);
                    return (
                      <tr key={c.contract_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="p-3 pl-5 text-sm font-medium">{c.title}</td>
                        <td className="p-3 text-center"><Badge variant="outline" className="text-[10px]">{c.contract_type?.toUpperCase()}</Badge></td>
                        <td className="p-3 text-right font-mono text-sm tabular-nums">{fmt(c.amount)}</td>
                        <td className="p-3 text-center text-sm">{c.start_date}</td>
                        <td className="p-3 text-center text-sm">{c.end_date || '∞'}</td>
                        <td className="p-3 text-center">
                          {days !== null ? (
                            <Badge className={`text-[10px] ${
                              days < 0 ? 'bg-red-500/10 text-red-500' :
                              days < 30 ? 'bg-amber-500/10 text-amber-500' :
                              'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              <Clock className="w-2.5 h-2.5 mr-1" />
                              {days < 0 ? `Expiré (${Math.abs(days)}j)` : `${days}j`}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`text-[10px] ${STATUS_MAP[c.status]?.class || 'bg-muted'}`}>
                            {STATUS_MAP[c.status]?.label || c.status}
                          </Badge>
                        </td>
                        <td className="p-3 pr-5 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setShowDetail(c)} title="Voir les détails du contrat">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" title="Modifier le contrat" onClick={() => alert('Éditer contrat ' + c.contract_id)}>
                              <Edit className="w-3.5 h-3.5 text-blue-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" title="Voir l'historique des versions" onClick={() => alert('Historique contrat ' + c.contract_id)}>
                              <History className="w-3.5 h-3.5 text-violet-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" title="Archiver le contrat" onClick={() => handleArchive(c.contract_id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">Page {page}/{pages}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              {showDetail?.title}
            </DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Type', value: showDetail.contract_type?.toUpperCase() },
                  { label: 'Montant', value: fmt(showDetail.amount) },
                  { label: 'Début', value: showDetail.start_date },
                  { label: 'Fin', value: showDetail.end_date || 'Indéfini' },
                  { label: 'Paiement', value: showDetail.payment_terms || '—' },
                  { label: 'Renouvellement auto', value: showDetail.auto_renew ? '✅ Oui' : '❌ Non' },
                ].map((f, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                    <p className="text-sm font-medium">{f.value}</p>
                  </div>
                ))}
              </div>
              {showDetail.terms && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conditions</p>
                  <p className="text-sm bg-muted/20 p-3 rounded-xl">{showDetail.terms}</p>
                </div>
              )}
              {showDetail.versions && showDetail.versions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historique versions ({showDetail.versions.length})</p>
                  <div className="space-y-1">
                    {showDetail.versions.map((v, i) => (
                      <div key={i} className="text-xs text-muted-foreground p-2 rounded-lg bg-muted/10">
                        v{v.version} — {v.date?.slice(0, 10)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmElement />
    </div>
  );
}
