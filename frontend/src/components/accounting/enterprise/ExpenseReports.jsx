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
import {
  Plus, Receipt, CheckCircle, XCircle, Banknote, Eye,
  RefreshCw, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';

const STATUS_COLORS = {
  submitted: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-500',
  reimbursed: 'bg-violet-500/10 text-violet-500',
};

const CATEGORIES = ['transport', 'repas', 'hébergement', 'fournitures', 'équipement', 'télécommunications', 'formation', 'divers'];

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="w-5 h-5 text-violet-500" />
          Notes de frais
        </h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-3 h-3" />Nouvelle note</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouvelle note de frais</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">ID Employé</label>
                  <Input value={form.employee_id} onChange={e => setForm(p => ({...p, employee_id: e.target.value}))} placeholder="EMP-001" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Description</label>
                  <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Déplacement client" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Lignes de frais</label>
                  <Button size="sm" variant="outline" onClick={addLine} className="text-xs gap-1"><Plus className="w-3 h-3" />Ligne</Button>
                </div>
                {form.lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2 items-end p-2 rounded-lg bg-muted/20">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Date</label>
                      <Input className="h-8 text-xs" type="date" value={line.date} onChange={e => updateLine(i, 'date', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Catégorie</label>
                      <Select value={line.category} onValueChange={v => updateLine(i, 'category', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Description</label>
                      <Input className="h-8 text-xs" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Fournisseur</label>
                      <Input className="h-8 text-xs" value={line.supplier} onChange={e => updateLine(i, 'supplier', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Montant</label>
                      <Input className="h-8 text-xs" type="number" step="0.01" value={line.amount} onChange={e => updateLine(i, 'amount', e.target.value)} />
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                  </div>
                ))}
                <div className="text-right text-sm font-medium">Total: {fmt(calcTotal)}</div>
              </div>

              <Button className="w-full" onClick={handleCreate}>Soumettre la note</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="submitted">Soumise</SelectItem>
            <SelectItem value="approved">Approuvée</SelectItem>
            <SelectItem value="rejected">Rejetée</SelectItem>
            <SelectItem value="reimbursed">Remboursée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Aucune note de frais</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">N°</th>
                    <th className="text-left p-3">Employé</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Montant</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.report_id} className="border-t hover:bg-muted/20">
                      <td className="p-3 font-mono text-[10px]">{r.report_id}</td>
                      <td className="p-3">{r.employee_id}</td>
                      <td className="p-3 max-w-[200px] truncate">{r.description}</td>
                      <td className="p-3 text-right font-mono font-medium">{fmt(r.total_amount)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${STATUS_COLORS[r.status]}`}>{r.status}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{r.created_at?.slice(0, 10)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowDetail(r)}><Eye className="w-3 h-3" /></Button>
                          {r.status === 'submitted' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleApprove(r.report_id, 'approved')} title="Approuver">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleApprove(r.report_id, 'rejected')} title="Rejeter">
                                <XCircle className="w-3 h-3 text-red-500" />
                              </Button>
                            </>
                          )}
                          {r.status === 'approved' && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleReimburse(r.report_id)} title="Rembourser">
                              <Banknote className="w-3 h-3 text-violet-500" />
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
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-xs text-muted-foreground">Page {page}/{pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Note de frais {showDetail?.report_id}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Employé:</span> {showDetail.employee_id}</div>
                <div><span className="text-muted-foreground">Statut:</span> <Badge className={STATUS_COLORS[showDetail.status]}>{showDetail.status}</Badge></div>
                <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {showDetail.description}</div>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Catégorie</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left">Fournisseur</th>
                      <th className="p-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showDetail.lines || []).map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{l.date}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">{l.category}</Badge></td>
                        <td className="p-2">{l.description}</td>
                        <td className="p-2">{l.supplier}</td>
                        <td className="p-2 text-right font-mono">{fmt(l.amount_ttc || l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-medium">
                    <tr>
                      <td colSpan={4} className="p-2 text-right">TOTAL</td>
                      <td className="p-2 text-right">{fmt(showDetail.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {showDetail.workflow && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Historique workflow</label>
                  {showDetail.workflow.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{w.step}</Badge>
                      <span>{w.date?.slice(0, 10)}</span>
                      {w.comment && <span>— {w.comment}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
