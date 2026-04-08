import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../../ui/dialog';
import {
  Plus, CreditCard, Link2, Unlink, RefreshCw, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-500',
  matched: 'bg-emerald-500/10 text-emerald-500',
  unmatched: 'bg-red-500/10 text-red-500',
};

export default function BankReconciliation() {
  const [lines, setLines] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ bank_date: new Date().toISOString().slice(0, 10), label: '', amount: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [linesRes, summaryRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/enterprise/bank-reconciliation`, { params: { page, limit: 20 } }),
        axios.get(`${BACKEND_URL}/api/enterprise/bank-reconciliation/summary`),
      ]);
      setLines(linesRes.data.items || []);
      setTotal(linesRes.data.total || 0);
      setPages(linesRes.data.pages || 1);
      setSummary(summaryRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/bank-reconciliation`, form);
      setShowCreate(false);
      setForm({ bank_date: new Date().toISOString().slice(0, 10), label: '', amount: 0 });
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleUnmatch = async (lineId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/bank-reconciliation/${lineId}/unmatch`);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-violet-500" />
          Rapprochement Bancaire
        </h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-3 h-3" />Ligne bancaire</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter une ligne bancaire</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Date</label>
                <Input type="date" value={form.bank_date} onChange={e => setForm(p => ({...p, bank_date: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Libellé</label>
                <Input value={form.label} onChange={e => setForm(p => ({...p, label: e.target.value}))} placeholder="Virement client X" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Montant (+ pour crédit, - pour débit)</label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({...p, amount: parseFloat(e.target.value) || 0}))} />
              </div>
              <Button className="w-full" onClick={handleCreate}>Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">Solde comptable</div>
              <div className="text-lg font-bold">{fmt(summary.book_balance)}</div>
            </CardContent>
          </Card>
          <Card className="bg-violet-500/5 border-violet-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">Solde bancaire</div>
              <div className="text-lg font-bold">{fmt(summary.bank_balance)}</div>
            </CardContent>
          </Card>
          <Card className={`${Math.abs(summary.difference) < 0.01 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">Écart</div>
              <div className="text-lg font-bold">{fmt(summary.difference)}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">En attente</div>
              <div className="text-lg font-bold">{summary.by_status?.pending?.count || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Libellé</th>
                    <th className="text-right p-3">Montant</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-left p-3">Rapproché avec</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => (
                    <tr key={l.line_id} className="border-t hover:bg-muted/20">
                      <td className="p-3">{l.bank_date}</td>
                      <td className="p-3">{l.label}</td>
                      <td className={`p-3 text-right font-mono ${l.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        <span className="flex items-center justify-end gap-1">
                          {l.amount >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {fmt(l.amount)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${STATUS_COLORS[l.status]}`}>
                          {l.status === 'matched' ? 'Rapproché' : l.status === 'pending' ? 'En attente' : 'Non rapproché'}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[10px]">{l.matched_entry_id || '—'}</td>
                      <td className="p-3 text-right">
                        {l.status === 'matched' && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUnmatch(l.line_id)} title="Annuler">
                            <Unlink className="w-3 h-3 text-red-500" />
                          </Button>
                        )}
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
    </div>
  );
}
