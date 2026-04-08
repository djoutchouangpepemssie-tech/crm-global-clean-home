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
  Plus, CreditCard, Link2, Unlink, RefreshCw, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Building2, Upload, Eye, BarChart3, Zap, Save
} from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  matched: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  unmatched: 'bg-red-500/10 text-red-500 border-red-500/20',
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

  const handleAutoMatch = async (lineId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/bank-reconciliation/${lineId}/match`);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Aucune correspondance trouvée'); }
  };

  const handleUnmatch = async (lineId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/bank-reconciliation/${lineId}/unmatch`);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            Rapprochement Bancaire
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Rapprochez vos relevés avec les écritures comptables</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" title="Importer un relevé bancaire (CSV, OFX, QIF)" onClick={() => alert('Import relevé bancaire — format CSV/OFX/QIF')}>
            <Upload className="w-3.5 h-3.5" />Import Relevé
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" title="Rapprochement automatique par montant" onClick={() => alert('Rapprochement automatique lancé')}>
            <Zap className="w-3.5 h-3.5 text-amber-500" />Rapprocher Auto
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" title="Voir le détail des écarts théorique vs bancaire" onClick={() => { /* scroll to summary */ }}>
            <BarChart3 className="w-3.5 h-3.5 text-violet-500" />Voir Écart
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/20" title="Ajouter manuellement un mouvement bancaire">
              <Plus className="w-3.5 h-3.5" />+ Ligne Bancaire
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                Ajouter un mouvement bancaire
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                <Input type="date" className="h-10" value={form.bank_date} onChange={e => setForm(p => ({...p, bank_date: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Libellé</label>
                <Input className="h-10" value={form.label} onChange={e => setForm(p => ({...p, label: e.target.value}))} placeholder="Virement client X" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Montant (+ crédit, - débit)</label>
                <Input type="number" step="0.01" className="h-10 font-mono" value={form.amount} onChange={e => setForm(p => ({...p, amount: parseFloat(e.target.value) || 0}))} />
              </div>
              <Button className="w-full h-10 bg-gradient-to-r from-blue-500 to-blue-600" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Solde comptable</p>
              <p className="text-xl font-bold">{fmt(summary.book_balance)}</p>
            </CardContent>
          </Card>
          <Card className="bg-violet-500/5 border-violet-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Solde bancaire</p>
              <p className="text-xl font-bold">{fmt(summary.bank_balance)}</p>
            </CardContent>
          </Card>
          <Card className={`${Math.abs(summary.difference || 0) < 0.01 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <CardContent className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Écart</p>
              <p className={`text-xl font-bold ${Math.abs(summary.difference || 0) < 0.01 ? 'text-emerald-500' : 'text-red-500'}`}>{fmt(summary.difference)}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">En attente</p>
              <p className="text-xl font-bold text-amber-500">{summary.by_status?.pending?.count || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            </div>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CreditCard className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucune ligne bancaire</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Libellé</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Montant</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Écriture liée</th>
                    <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.line_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="p-3 pl-5 text-sm">{l.bank_date}</td>
                      <td className="p-3 text-sm">{l.label}</td>
                      <td className={`p-3 text-right font-mono text-sm tabular-nums font-medium ${l.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        <span className="flex items-center justify-end gap-1">
                          {l.amount >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {fmt(l.amount)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${STATUS_COLORS[l.status] || ''}`}>
                          {l.status === 'matched' ? '✓ Rapproché' : l.status === 'pending' ? 'En attente' : 'Non rapproché'}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-muted-foreground">{l.matched_entry_id || '—'}</td>
                      <td className="p-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {l.status === 'matched' ? (
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleUnmatch(l.line_id)} title="Annuler le rapprochement de cette ligne">
                              <Unlink className="w-3 h-3" />Dé-rapprocher
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAutoMatch(l.line_id)} title="Chercher automatiquement une écriture correspondante">
                                <Zap className="w-3 h-3 text-amber-500" />Match auto
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setShowDetail && setShowDetail(l)} title="Voir le détail de la ligne bancaire">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
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
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">Page {page}/{pages}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
