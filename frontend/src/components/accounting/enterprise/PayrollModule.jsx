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
  TrendingUp, DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-500" />
          Paie & RH
        </h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-3 h-3" />Fiche de paie</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Créer une fiche de paie</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">ID Employé</label>
                  <Input value={form.employee_id} onChange={e => setForm(p => ({...p, employee_id: e.target.value}))} placeholder="EMP-001" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Nom</label>
                  <Input value={form.employee_name} onChange={e => setForm(p => ({...p, employee_name: e.target.value}))} placeholder="Jean Dupont" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Mois</label>
                  <Input type="number" min={1} max={12} value={form.period_month} onChange={e => setForm(p => ({...p, period_month: parseInt(e.target.value)}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Année</label>
                  <Input type="number" value={form.period_year} onChange={e => setForm(p => ({...p, period_year: parseInt(e.target.value)}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Type contrat</label>
                  <Select value={form.contract_type} onValueChange={v => setForm(p => ({...p, contract_type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdi">CDI</SelectItem>
                      <SelectItem value="cdd">CDD</SelectItem>
                      <SelectItem value="prestataire">Prestataire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Salaire brut</label>
                  <Input type="number" step="0.01" value={form.gross_salary} onChange={e => setForm(p => ({...p, gross_salary: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Heures travaillées</label>
                  <Input type="number" step="0.01" value={form.worked_hours} onChange={e => setForm(p => ({...p, worked_hours: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Heures sup</label>
                  <Input type="number" step="0.01" value={form.overtime_hours} onChange={e => setForm(p => ({...p, overtime_hours: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Primes</label>
                  <Input type="number" step="0.01" value={form.bonuses} onChange={e => setForm(p => ({...p, bonuses: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Retenues</label>
                  <Input type="number" step="0.01" value={form.deductions} onChange={e => setForm(p => ({...p, deductions: e.target.value}))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate}>Calculer & créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary chart */}
      {summary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Masse salariale</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={v => fmt(v)} />
                <Legend />
                <Bar dataKey="total_brut" name="Brut" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total_net" name="Net" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total_patronales" name="Patronales" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Aucune fiche de paie</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">N°</th>
                    <th className="text-left p-3">Employé</th>
                    <th className="text-center p-3">Période</th>
                    <th className="text-center p-3">Contrat</th>
                    <th className="text-right p-3">Brut</th>
                    <th className="text-right p-3">Net</th>
                    <th className="text-right p-3">Coût total</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(p => (
                    <tr key={p.payslip_id} className="border-t hover:bg-muted/20">
                      <td className="p-3 font-mono text-[10px]">{p.payslip_id}</td>
                      <td className="p-3">{p.employee_name}</td>
                      <td className="p-3 text-center">{String(p.period_month).padStart(2,'0')}/{p.period_year}</td>
                      <td className="p-3 text-center"><Badge variant="outline" className="text-[10px]">{p.contract_type?.toUpperCase()}</Badge></td>
                      <td className="p-3 text-right font-mono">{fmt(p.total_brut)}</td>
                      <td className="p-3 text-right font-mono font-medium text-emerald-500">{fmt(p.net_salary)}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{fmt(p.total_cost_employer)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${p.status === 'validated' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {p.status === 'validated' ? 'Validé' : 'Brouillon'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowDetail(p)}><Eye className="w-3 h-3" /></Button>
                          {p.status === 'draft' && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleValidate(p.payslip_id)}>
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
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

      {/* Payslip Detail */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Fiche de paie — {showDetail?.employee_name}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <Card className="bg-muted/20"><CardContent className="p-3 text-center">
                  <div className="text-muted-foreground">Période</div>
                  <div className="font-bold">{String(showDetail.period_month).padStart(2,'0')}/{showDetail.period_year}</div>
                </CardContent></Card>
                <Card className="bg-muted/20"><CardContent className="p-3 text-center">
                  <div className="text-muted-foreground">Contrat</div>
                  <div className="font-bold">{showDetail.contract_type?.toUpperCase()}</div>
                </CardContent></Card>
                <Card className="bg-muted/20"><CardContent className="p-3 text-center">
                  <div className="text-muted-foreground">Heures</div>
                  <div className="font-bold">{showDetail.worked_hours}h + {showDetail.overtime_hours}h sup</div>
                </CardContent></Card>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50"><tr><th className="text-left p-2">Rubrique</th><th className="text-right p-2">Montant</th></tr></thead>
                  <tbody>
                    <tr className="border-t"><td className="p-2">Salaire de base</td><td className="p-2 text-right font-mono">{fmt(showDetail.gross_salary)}</td></tr>
                    {showDetail.overtime_amount > 0 && <tr className="border-t"><td className="p-2">Heures supplémentaires</td><td className="p-2 text-right font-mono">{fmt(showDetail.overtime_amount)}</td></tr>}
                    {showDetail.bonuses > 0 && <tr className="border-t"><td className="p-2">Primes</td><td className="p-2 text-right font-mono">{fmt(showDetail.bonuses)}</td></tr>}
                    {showDetail.deductions > 0 && <tr className="border-t"><td className="p-2 text-red-500">Retenues</td><td className="p-2 text-right font-mono text-red-500">-{fmt(showDetail.deductions)}</td></tr>}
                    <tr className="border-t bg-muted/20 font-medium"><td className="p-2">TOTAL BRUT</td><td className="p-2 text-right font-mono">{fmt(showDetail.total_brut)}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-muted/30 p-2 text-xs font-medium">Cotisations salariales</div>
                  <table className="w-full text-xs">
                    <tbody>
                      {showDetail.cotisations_salariales && Object.entries(showDetail.cotisations_salariales).map(([k, v]) => (
                        <tr key={k} className="border-t">
                          <td className="p-1.5 pl-3">{k.replace(/_/g, ' ')}</td>
                          <td className="p-1.5 text-right text-muted-foreground">{v.rate}%</td>
                          <td className="p-1.5 text-right font-mono pr-3">{fmt(v.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-muted/20 font-medium">
                        <td className="p-2 pl-3" colSpan={2}>Total</td>
                        <td className="p-2 text-right font-mono pr-3">{fmt(showDetail.total_salariales)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-muted/30 p-2 text-xs font-medium">Cotisations patronales</div>
                  <table className="w-full text-xs">
                    <tbody>
                      {showDetail.cotisations_patronales && Object.entries(showDetail.cotisations_patronales).map(([k, v]) => (
                        <tr key={k} className="border-t">
                          <td className="p-1.5 pl-3">{k.replace(/_/g, ' ')}</td>
                          <td className="p-1.5 text-right text-muted-foreground">{v.rate}%</td>
                          <td className="p-1.5 text-right font-mono pr-3">{fmt(v.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-muted/20 font-medium">
                        <td className="p-2 pl-3" colSpan={2}>Total</td>
                        <td className="p-2 text-right font-mono pr-3">{fmt(showDetail.total_patronales)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground">Net à payer</div>
                    <div className="text-2xl font-bold text-emerald-500">{fmt(showDetail.net_salary)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-violet-500/5 border-violet-500/20">
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground">Coût employeur total</div>
                    <div className="text-2xl font-bold text-violet-500">{fmt(showDetail.total_cost_employer)}</div>
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
