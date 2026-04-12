import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../shared';
import axios from 'axios';
import api from '../../../lib/api';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../../ui/dialog';
import {
  Plus, Receipt, CheckCircle, XCircle, Banknote, Eye,
  RefreshCw, ChevronLeft, ChevronRight, Trash2, Upload,
  MessageSquare, ArrowRight, FileImage, BarChart3
} from 'lucide-react';

const STATUS_MAP = {
  submitted: { label: 'Soumise', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: '📤' },
  approved: { label: 'Approuvée', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: '✅' },
  rejected: { label: 'Rejetée', class: 'bg-red-500/10 text-red-500 border-red-500/20', icon: '❌' },
  reimbursed: { label: 'Remboursée', class: 'bg-violet-500/10 text-violet-500 border-violet-500/20', icon: '💰' },
  accounted: { label: 'Comptabilisée', class: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: '📋' },
};

const CATEGORIES = [
  { value: 'transport', label: '🚗 Transport', icon: '🚗' },
  { value: 'repas', label: '🍽️ Repas', icon: '🍽️' },
  { value: 'hébergement', label: '🏨 Hébergement', icon: '🏨' },
  { value: 'fournitures', label: '📎 Fournitures', icon: '📎' },
  { value: 'équipement', label: '💻 Équipement', icon: '💻' },
  { value: 'télécommunications', label: '📱 Télécom', icon: '📱' },
  { value: 'formation', label: '📚 Formation', icon: '📚' },
  { value: 'divers', label: '📦 Divers', icon: '📦' },
];

export default function ExpenseReports() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({
    employee_id: '', description: '', total_amount: 0,
    lines: [{ date: new Date().toISOString().slice(0, 10), category: 'divers', description: '', amount: 0, supplier: '' }],
  });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/expense-reports`, { params });
      setReports(res.data.items || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const addLine = () => setForm(p => ({
    ...p, lines: [...p.lines, { date: new Date().toISOString().slice(0, 10), category: 'divers', description: '', amount: 0, supplier: '' }]
  }));

  const updateLine = (i, field, value) => {
    setForm(p => ({
      ...p, lines: p.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l)
    }));
  };

  const removeLine = (i) => {
    if (form.lines.length <= 1) return;
    setForm(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));
  };

  const calcTotal = form.lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

  const handleCreate = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/expense-reports`, {
        ...form, total_amount: calcTotal,
      });
      setShowCreate(false);
      setForm({
        employee_id: '', description: '', total_amount: 0,
        lines: [{ date: new Date().toISOString().slice(0, 10), category: 'divers', description: '', amount: 0, supplier: '' }],
      });
      loadReports();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleApprove = async (id, status) => {
    const comment = status === 'rejected' ? prompt('Raison du rejet:') : '';
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/expense-reports/${id}/approve`, { status, comment });
      loadReports();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleReimburse = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/expense-reports/${id}/reimburse`);
      loadReports();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Receipt className="w-5 h-5 text-amber-500" />
            </div>
            Notes de frais
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{total} note(s) — Workflow d'approbation</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/20 text-white">
              <Plus className="w-3.5 h-3.5" />Nouvelle note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                Nouvelle note de frais
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salarié (ID)</label>
                  <Input value={form.employee_id} onChange={e => setForm(p => ({...p, employee_id: e.target.value}))} placeholder="EMP-001" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                  <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Déplacement client Paris" className="h-10" />
                </div>
              </div>

              {/* File upload zone */}
              <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 text-center hover:border-amber-500/40 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Glissez vos justificatifs ici</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PDF, JPG, PNG — Max 10 Mo</p>
              </div>

              {/* Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lignes de frais</label>
                  <Button size="sm" variant="outline" onClick={addLine} className="text-xs gap-1 h-7">
                    <Plus className="w-3 h-3" />Ajouter
                  </Button>
                </div>
                {form.lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2 items-end p-3 rounded-xl bg-muted/20 border border-border/50">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Date</label>
                      <Input className="h-9 text-xs" type="date" value={line.date} onChange={e => updateLine(i, 'date', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Catégorie</label>
                      <Select value={line.category} onValueChange={v => updateLine(i, 'category', v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Description</label>
                      <Input className="h-9 text-xs" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Fournisseur</label>
                      <Input className="h-9 text-xs" value={line.supplier} onChange={e => updateLine(i, 'supplier', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Montant (€)</label>
                      <Input className="h-9 text-xs font-mono" type="number" step="0.01" value={line.amount} onChange={e => updateLine(i, 'amount', e.target.value)} />
                    </div>
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => removeLine(i)} disabled={form.lines.length <= 1}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                ))}
                <div className="text-right text-sm font-semibold">
                  Total: <span className="text-amber-600 font-mono tabular-nums">{fmt(calcTotal)}</span>
                </div>
              </div>

              <Button className="w-full h-10 bg-gradient-to-r from-amber-500 to-amber-600 text-white" onClick={handleCreate}>
                <Receipt className="w-4 h-4 mr-2" />Soumettre la note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar: Status filters + action buttons */}
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {['all', 'submitted', 'approved', 'rejected', 'reimbursed'].map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  className="text-xs h-8"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  title={s === 'all' ? 'Afficher toutes les notes de frais' : `Filtrer : ${STATUS_MAP[s]?.label}`}
                >
                  {s === 'all' ? 'Toutes' : STATUS_MAP[s]?.icon + ' ' + STATUS_MAP[s]?.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" title="Scanner ou uploader un justificatif de reçu" onClick={() => alert('Ouvrir scanner de reçu')}>
                <FileImage className="w-3.5 h-3.5 text-violet-500" />Scan Reçu
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" title="Voir les statistiques de notes de frais par catégorie" onClick={() => alert('Vue d\'ensemble des notes de frais')}>
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />Vue d'ensemble
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Receipt className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucune note de frais</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employé</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Montant</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, idx) => (
                    <tr key={r.report_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="p-3 pl-5 text-sm font-medium">{r.employee_id}</td>
                      <td className="p-3 text-sm max-w-[250px] truncate">{r.description}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold">{fmt(r.total_amount)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${STATUS_MAP[r.status]?.class || ''}`}>
                          {STATUS_MAP[r.status]?.label || r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{r.created_at?.slice(0, 10)}</td>
                      <td className="p-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setShowDetail(r)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {r.status === 'submitted' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleApprove(r.report_id, 'approved')} title="Approuver">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleApprove(r.report_id, 'rejected')} title="Rejeter">
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </>
                          )}
                          {r.status === 'approved' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleReimburse(r.report_id)} title="Rembourser">
                              <Banknote className="w-3.5 h-3.5 text-violet-500" />
                            </Button>
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

      {/* Detail */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              Note de frais
              <Badge className={`ml-2 ${STATUS_MAP[showDetail?.status]?.class || ''}`}>
                {STATUS_MAP[showDetail?.status]?.label || showDetail?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Employé</p>
                  <p className="text-sm font-medium">{showDetail.employee_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</p>
                  <p className="text-sm">{showDetail.description}</p>
                </div>
              </div>

              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="p-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase">Date</th>
                        <th className="p-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase">Catégorie</th>
                        <th className="p-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase">Description</th>
                        <th className="p-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase">Fournisseur</th>
                        <th className="p-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showDetail.lines || []).map((l, i) => (
                        <tr key={i} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="p-2.5">{l.date}</td>
                          <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{l.category}</Badge></td>
                          <td className="p-2.5">{l.description}</td>
                          <td className="p-2.5 text-muted-foreground">{l.supplier}</td>
                          <td className="p-2.5 text-right font-mono tabular-nums">{fmt(l.amount_ttc || l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-semibold">
                      <tr>
                        <td colSpan={4} className="p-2.5 text-right text-xs uppercase tracking-wider text-muted-foreground">Total</td>
                        <td className="p-2.5 text-right font-mono tabular-nums">{fmt(showDetail.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>

              {/* Workflow history */}
              {showDetail.workflow && showDetail.workflow.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historique workflow</h4>
                  <div className="space-y-2">
                    {showDetail.workflow.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/20">
                        <Badge variant="outline" className="text-[10px]">{w.step}</Badge>
                        <span className="text-muted-foreground">{w.date?.slice(0, 10)}</span>
                        {w.comment && <span className="text-muted-foreground">— {w.comment}</span>}
                      </div>
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
