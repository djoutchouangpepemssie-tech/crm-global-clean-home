import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  Plus, Users, CheckCircle, Eye, RefreshCw, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign, Download, FileText, Trash2, Edit
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltipStyle = {
  background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '12px 16px',
};

const STATUS_MAP = {
  draft: { label: 'Brouillon', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  validated: { label: 'Validée', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  paid: { label: 'Payée', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

export default function PayrollModule() {
  const [payslips, setPayslips] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);

  const now = new Date();
  const [form, setForm] = useState({
    employee_id: '', employee_name: '', period_month: now.getMonth() + 1,
    period_year: now.getFullYear(), contract_type: 'cdi', gross_salary: 0,
    worked_hours: 151.67, overtime_hours: 0, overtime_rate: 1.25, bonuses: 0, deductions: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [slipsRes, sumRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/enterprise/payroll/payslips`, { params: { page, limit: 20 } }),
        axios.get(`${BACKEND_URL}/api/enterprise/payroll/summary`),
      ]);
      setPayslips(slipsRes.data.items || []);
      setTotal(slipsRes.data.total || 0);
      setPages(slipsRes.data.pages || 1);
      setSummary(sumRes.data.summary || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/enterprise/payroll/payslips`, {
        ...form,
        gross_salary: parseFloat(form.gross_salary) || 0,
        worked_hours: parseFloat(form.worked_hours) || 151.67,
        overtime_hours: parseFloat(form.overtime_hours) || 0,
        bonuses: parseFloat(form.bonuses) || 0,
        deductions: parseFloat(form.deductions) || 0,
      });
      setShowCreate(false);
      setShowDetail(res.data);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleValidate = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/payroll/payslips/${id}/validate`);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette fiche de paie ?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/enterprise/payroll/payslips/${id}`);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const fmtK = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-pink-500/10">
              <Users className="w-5 h-5 text-pink-500" />
            </div>
            Paie & RH
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{total} fiche(s) de paie</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 shadow-md shadow-pink-500/20">
              <Plus className="w-3.5 h-3.5" />Fiche de paie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-500" />
                Créer une fiche de paie
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salarié (ID)</label>
                  <Input value={form.employee_id} onChange={e => setForm(p => ({...p, employee_id: e.target.value}))} placeholder="EMP-001" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom</label>
                  <Input value={form.employee_name} onChange={e => setForm(p => ({...p, employee_name: e.target.value}))} placeholder="Jean Dupont" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mois</label>
                  <Input type="number" min={1} max={12} value={form.period_month} onChange={e => setForm(p => ({...p, period_month: parseInt(e.target.value)}))} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Année</label>
                  <Input type="number" value={form.period_year} onChange={e => setForm(p => ({...p, period_year: parseInt(e.target.value)}))} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type contrat</label>
                  <Select value={form.contract_type} onValueChange={v => setForm(p => ({...p, contract_type: v}))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdi">CDI</SelectItem>
                      <SelectItem value="cdd">CDD</SelectItem>
                      <SelectItem value="prestataire">Prestataire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salaire brut (€)</label>
                  <Input type="number" step="0.01" value={form.gross_salary} onChange={e => setForm(p => ({...p, gross_salary: e.target.value}))} className="h-10 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Heures travaillées</label>
                  <Input type="number" step="0.01" value={form.worked_hours} onChange={e => setForm(p => ({...p, worked_hours: e.target.value}))} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Heures sup</label>
                  <Input type="number" step="0.01" value={form.overtime_hours} onChange={e => setForm(p => ({...p, overtime_hours: e.target.value}))} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primes (€)</label>
                  <Input type="number" step="0.01" value={form.bonuses} onChange={e => setForm(p => ({...p, bonuses: e.target.value}))} className="h-10 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Retenues (€)</label>
                  <Input type="number" step="0.01" value={form.deductions} onChange={e => setForm(p => ({...p, deductions: e.target.value}))} className="h-10 font-mono" />
                </div>
              </div>
              <Button className="w-full h-10 bg-gradient-to-r from-pink-500 to-pink-600" onClick={handleCreate}>
                <DollarSign className="w-4 h-4 mr-2" />Calculer & Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary chart */}
      {summary.length > 0 && (
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-500" />
              Masse salariale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CustomTooltipStyle} formatter={v => fmt(v)} />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                <Bar dataKey="total_brut" name="Brut" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="total_net" name="Net" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="total_patronales" name="Patronales" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full border-2 border-pink-500/20 border-t-pink-500 animate-spin" />
            </div>
          ) : payslips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucune fiche de paie</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employé</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Période</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contrat</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Brut</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cot. patron</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cot. salarié</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Net à payer</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p, idx) => (
                    <tr key={p.payslip_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="p-3 pl-5 text-sm font-medium">{p.employee_name}</td>
                      <td className="p-3 text-center text-sm tabular-nums">{String(p.period_month).padStart(2,'0')}/{p.period_year}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-medium">{p.contract_type?.toUpperCase()}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums">{fmt(p.total_brut)}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums text-muted-foreground">{fmt(p.total_patronales)}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums text-muted-foreground">{fmt(p.total_salariales)}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold text-emerald-500">{fmt(p.net_salary)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${STATUS_MAP[p.status]?.class || ''}`}>
                          {STATUS_MAP[p.status]?.label || p.status}
                        </Badge>
                      </td>
                      <td className="p-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setShowDetail(p)} title="Voir le détail complet de la fiche de paie">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {p.status === 'draft' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleValidate(p.payslip_id)} title="Valider la fiche de paie">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" title="Modifier les montants de la fiche" onClick={() => alert('Éditer fiche ' + p.payslip_id)}>
                                <Edit className="w-3.5 h-3.5 text-blue-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleDelete(p.payslip_id)} title="Supprimer cette fiche de paie">
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </>
                          )}
                          {p.status === 'validated' && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 rounded-lg text-emerald-600 hover:bg-emerald-500/10" title="Enregistrer le paiement du salaire" onClick={() => alert('Paiement enregistré : ' + p.payslip_id)}>
                              <DollarSign className="w-3 h-3" />Payer
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

      {/* Payslip Detail Drawer */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-500" />
              Fiche de paie — {showDetail?.employee_name}
              <Badge className={`ml-2 ${STATUS_MAP[showDetail?.status]?.class || ''}`}>
                {STATUS_MAP[showDetail?.status]?.label || showDetail?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-5">
              {/* Header cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-muted/20"><CardContent className="p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Période</div>
                  <div className="font-bold text-sm">{String(showDetail.period_month).padStart(2,'0')}/{showDetail.period_year}</div>
                </CardContent></Card>
                <Card className="bg-muted/20"><CardContent className="p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Contrat</div>
                  <div className="font-bold text-sm">{showDetail.contract_type?.toUpperCase()}</div>
                </CardContent></Card>
                <Card className="bg-muted/20"><CardContent className="p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Heures</div>
                  <div className="font-bold text-sm">{showDetail.worked_hours}h + {showDetail.overtime_hours}h sup</div>
                </CardContent></Card>
              </div>

              {/* Barème détaillé */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="py-2 px-4 bg-muted/20">
                  <CardTitle className="text-xs font-semibold">Barème détaillé</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-t"><td className="p-3 pl-4">Salaire de base</td><td className="p-3 text-right font-mono tabular-nums pr-4">{fmt(showDetail.gross_salary)}</td></tr>
                      {showDetail.overtime_amount > 0 && <tr className="border-t"><td className="p-3 pl-4">Heures supplémentaires</td><td className="p-3 text-right font-mono tabular-nums pr-4">{fmt(showDetail.overtime_amount)}</td></tr>}
                      {showDetail.bonuses > 0 && <tr className="border-t"><td className="p-3 pl-4">Primes</td><td className="p-3 text-right font-mono tabular-nums pr-4 text-emerald-500">+{fmt(showDetail.bonuses)}</td></tr>}
                      {showDetail.deductions > 0 && <tr className="border-t"><td className="p-3 pl-4 text-red-500">Retenues</td><td className="p-3 text-right font-mono tabular-nums pr-4 text-red-500">-{fmt(showDetail.deductions)}</td></tr>}
                      <tr className="border-t-2 bg-muted/20 font-semibold"><td className="p-3 pl-4">TOTAL BRUT</td><td className="p-3 text-right font-mono tabular-nums pr-4">{fmt(showDetail.total_brut)}</td></tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Cotisations */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="bg-amber-500/10 p-3 text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                    Cotisations salariales
                  </div>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <tbody>
                        {showDetail.cotisations_salariales && Object.entries(showDetail.cotisations_salariales).map(([k, v]) => (
                          <tr key={k} className="border-t hover:bg-muted/20 transition-colors">
                            <td className="p-2 pl-3 capitalize">{k.replace(/_/g, ' ')}</td>
                            <td className="p-2 text-right text-muted-foreground tabular-nums">{v.rate}%</td>
                            <td className="p-2 text-right font-mono tabular-nums pr-3">{fmt(v.amount)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 bg-muted/20 font-semibold">
                          <td className="p-2.5 pl-3" colSpan={2}>Total</td>
                          <td className="p-2.5 text-right font-mono tabular-nums pr-3">{fmt(showDetail.total_salariales)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="bg-violet-500/10 p-3 text-xs font-semibold text-violet-600 flex items-center gap-1.5">
                    Cotisations patronales
                  </div>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <tbody>
                        {showDetail.cotisations_patronales && Object.entries(showDetail.cotisations_patronales).map(([k, v]) => (
                          <tr key={k} className="border-t hover:bg-muted/20 transition-colors">
                            <td className="p-2 pl-3 capitalize">{k.replace(/_/g, ' ')}</td>
                            <td className="p-2 text-right text-muted-foreground tabular-nums">{v.rate}%</td>
                            <td className="p-2 text-right font-mono tabular-nums pr-3">{fmt(v.amount)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 bg-muted/20 font-semibold">
                          <td className="p-2.5 pl-3" colSpan={2}>Total</td>
                          <td className="p-2.5 text-right font-mono tabular-nums pr-3">{fmt(showDetail.total_patronales)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>

              {/* Final amounts */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Net à payer</div>
                    <div className="text-3xl font-bold text-emerald-500">{fmt(showDetail.net_salary)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-violet-500/5 border-violet-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Coût employeur</div>
                    <div className="text-3xl font-bold text-violet-500">{fmt(showDetail.total_cost_employer)}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
