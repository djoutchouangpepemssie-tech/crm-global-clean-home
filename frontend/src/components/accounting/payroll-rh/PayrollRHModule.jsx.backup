/**
 * PayrollRHModule — Module Paie & RH intégré dans l'onglet Comptabilité ERP
 * 
 * 4 sous-onglets :
 * 1. 👥 Intervenants (Employees)
 * 2. 📄 Contrats RH
 * 3. 📋 Fiches de Paie
 * 4. 📝 Notes de Frais
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../../ui/dialog';
import {
  Users, FileText, Receipt, Briefcase, Plus, Eye, Edit, Trash2,
  Download, Check, X, Clock, DollarSign, TrendingUp, RefreshCw,
  ChevronLeft, ChevronRight, Search, AlertCircle, CheckCircle,
  Banknote, Calendar, ArrowRight, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API = `${BACKEND_URL}/api/payroll-rh`;

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

const MONTHS_FR = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
  5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
  9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
};

const CONTRACT_TYPES = ['CDI', 'CDD', 'Prestataire', 'Stage'];
const FUNCTIONS = ['Nettoyeur', 'Superviseur', 'Manager', 'Technicien', 'Administratif', 'Commercial', 'Autre'];
const EXPENSE_CATEGORIES = [
  { value: 'transport', label: '🚗 Transport' },
  { value: 'lodging', label: '🏨 Hébergement' },
  { value: 'meals', label: '🍽️ Repas' },
  { value: 'other', label: '📦 Autres' },
];

const CustomTooltipStyle = {
  background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '12px 16px',
};

// ═══════════════════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════════════════

export default function PayrollRHModule() {
  const [subTab, setSubTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/stats`);
      setStats(data);
    } catch (e) {
      console.error('Stats error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Briefcase className="h-6 w-6 text-violet-500" />
        <h2 className="text-xl font-bold">Paie & Ressources Humaines</h2>
        <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/30">
          Module ERP
        </Badge>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-11">
          <TabsTrigger value="dashboard" className="text-xs">📊 Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="employees" className="text-xs">👥 Intervenants</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs">📄 Contrats</TabsTrigger>
          <TabsTrigger value="payslips" className="text-xs">📋 Fiches de Paie</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">📝 Notes de Frais</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <RHDashboard stats={stats} loading={loading} onNavigate={setSubTab} onRefresh={loadStats} />
        </TabsContent>
        <TabsContent value="employees">
          <EmployeesTab />
        </TabsContent>
        <TabsContent value="contracts">
          <ContractsTab />
        </TabsContent>
        <TabsContent value="payslips">
          <PayslipsTab />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpenseReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// A. DASHBOARD RH
// ═══════════════════════════════════════════════════════

function RHDashboard({ stats, loading, onNavigate, onRefresh }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1,2,3,4].map(i => <Card key={i} className="h-28"><CardContent className="p-4"><div className="h-4 bg-muted rounded w-2/3 mb-2" /><div className="h-6 bg-muted rounded w-1/2" /></CardContent></Card>)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Intervenants actifs" value={stats.employees_active} icon={Users} color="blue" onClick={() => onNavigate('employees')} />
        <KPICard title="Contrats actifs" value={stats.contracts_active} icon={FileText} color="violet" onClick={() => onNavigate('contracts')} />
        <KPICard title="Fiches ce mois" value={stats.payslips_this_month} icon={Receipt} color="green" onClick={() => onNavigate('payslips')} />
        <KPICard title="Notes en attente" value={stats.pending_expenses} icon={Clock} color="amber" onClick={() => onNavigate('expenses')} />
      </div>

      {/* Year stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Masse salariale brute (année)</p>
            <p className="text-2xl font-bold">{fmt(stats.payroll_year?.total_brut)}</p>
            <p className="text-xs text-muted-foreground">{stats.payroll_year?.count} fiches générées</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Salaires nets versés (année)</p>
            <p className="text-2xl font-bold">{fmt(stats.payroll_year?.total_net)}</p>
            <p className="text-xs text-muted-foreground">Charges: {fmt(stats.payroll_year?.total_charges)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Notes de frais (année)</p>
            <p className="text-2xl font-bold">{fmt(stats.expenses_year?.total_ttc)}</p>
            <p className="text-xs text-muted-foreground">{stats.expenses_year?.count} notes soumises</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend chart */}
      {stats.monthly_trend && stats.monthly_trend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              Évolution masse salariale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={CustomTooltipStyle} formatter={v => fmt(v)} />
                <Legend />
                <Bar dataKey="brut" name="Brut" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" name="Net" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, onClick }) {
  const colors = {
    blue: 'from-blue-500/10 border-blue-500/20 text-blue-500',
    violet: 'from-violet-500/10 border-violet-500/20 text-violet-500',
    green: 'from-emerald-500/10 border-emerald-500/20 text-emerald-500',
    amber: 'from-amber-500/10 border-amber-500/20 text-amber-500',
  };
  return (
    <Card className={`bg-gradient-to-br ${colors[color]} cursor-pointer hover:shadow-md transition-all`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-5 h-5 opacity-70" />
          <ArrowRight className="w-3 h-3 opacity-40" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}


// ═══════════════════════════════════════════════════════
// B. INTERVENANTS (Employees)
// ═══════════════════════════════════════════════════════

function EmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', address: '', numero_secu: '',
    function: '', base_salary: 0, hire_date: new Date().toISOString().slice(0, 10),
    leave_date: '', notes: '', status: 'active',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/employees`, {
        params: { page, limit: 20, status: statusFilter !== 'all' ? statusFilter : undefined, search: search || undefined }
      });
      setEmployees(data.employees);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await axios.post(`${API}/employees`, form);
      setShowCreate(false);
      resetForm();
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleUpdate = async () => {
    if (!showDetail) return;
    try {
      await axios.put(`${API}/employees/${showDetail.employee_id}`, form);
      setEditMode(false);
      setShowDetail(null);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (empId) => {
    if (!window.confirm('Désactiver cet intervenant ?')) return;
    try {
      await axios.delete(`${API}/employees/${empId}`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const openDetail = async (emp) => {
    try {
      const { data } = await axios.get(`${API}/employees/${emp.employee_id}`);
      setShowDetail(data);
      setForm({
        full_name: data.full_name || '', email: data.email || '', phone: data.phone || '',
        address: data.address || '', numero_secu: data.numero_secu || '',
        function: data.function || '', base_salary: data.base_salary || 0,
        hire_date: data.hire_date || '', leave_date: data.leave_date || '',
        notes: data.notes || '', status: data.status || 'active',
      });
      setEditMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => setForm({
    full_name: '', email: '', phone: '', address: '', numero_secu: '',
    function: '', base_salary: 0, hire_date: new Date().toISOString().slice(0, 10),
    leave_date: '', notes: '', status: 'active',
  });

  const statusBadge = (s) => {
    const map = {
      active: { label: '🟢 Actif', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      suspended: { label: '🟡 Suspendu', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      left: { label: '🔴 Quitté', cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
    };
    const m = map[s] || map.active;
    return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="suspended">Suspendus</SelectItem>
            <SelectItem value="left">Quittés</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Nouvel intervenant
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">Nom</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Téléphone</th>
                  <th className="text-left p-3 font-medium">Fonction</th>
                  <th className="text-right p-3 font-medium">Salaire brut</th>
                  <th className="text-left p-3 font-medium">Embauche</th>
                  <th className="text-center p-3 font-medium">Statut</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun intervenant</td></tr>
                ) : employees.map(emp => (
                  <tr key={emp.employee_id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium">{emp.full_name}</td>
                    <td className="p-3 text-muted-foreground">{emp.email}</td>
                    <td className="p-3 text-muted-foreground">{emp.phone}</td>
                    <td className="p-3">{emp.function}</td>
                    <td className="p-3 text-right font-mono">{fmt(emp.base_salary)}</td>
                    <td className="p-3 text-muted-foreground">{emp.hire_date?.slice(0, 10)}</td>
                    <td className="p-3 text-center">{statusBadge(emp.status)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(emp)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(emp.employee_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{total} intervenant(s)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm">{page} / {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-violet-500" /> Nouvel intervenant</DialogTitle>
          </DialogHeader>
          <EmployeeForm form={form} setForm={setForm} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.full_name}>✅ Créer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => { setShowDetail(null); setEditMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              {showDetail?.full_name}
              {showDetail && statusBadge(showDetail.status)}
            </DialogTitle>
          </DialogHeader>
          {showDetail && !editMode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Email:</span> {showDetail.email}</div>
                <div><span className="text-muted-foreground">Téléphone:</span> {showDetail.phone}</div>
                <div><span className="text-muted-foreground">Fonction:</span> {showDetail.function}</div>
                <div><span className="text-muted-foreground">Salaire brut:</span> {fmt(showDetail.base_salary)}</div>
                <div><span className="text-muted-foreground">Embauche:</span> {showDetail.hire_date?.slice(0, 10)}</div>
                <div><span className="text-muted-foreground">Adresse:</span> {showDetail.address}</div>
              </div>

              {/* Active contract */}
              {showDetail.active_contract && (
                <Card className="border-violet-500/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">📄 Contrat actif</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>Type: <strong>{showDetail.active_contract.contract_type}</strong></p>
                    <p>Fonction: {showDetail.active_contract.function}</p>
                    <p>Salaire: {fmt(showDetail.active_contract.salary_brut)}</p>
                    <p>Début: {showDetail.active_contract.start_date?.slice(0, 10)}</p>
                  </CardContent>
                </Card>
              )}

              {/* Recent payslips */}
              {showDetail.recent_payslips?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">📋 Fiches de paie récentes</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    {showDetail.recent_payslips.map(p => (
                      <div key={p.payslip_id} className="flex items-center justify-between py-1 border-b last:border-0">
                        <span>{MONTHS_FR[p.period_month]} {p.period_year}</span>
                        <span className="font-mono">{fmt(p.salary_net)}</span>
                        <Badge variant="outline" className={p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}>
                          {p.status === 'paid' ? '✅ Payée' : '⏳ En attente'}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recent expenses */}
              {showDetail.recent_expenses?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">📝 Notes de frais récentes</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    {showDetail.recent_expenses.map(e => (
                      <div key={e.report_id} className="flex items-center justify-between py-1 border-b last:border-0">
                        <span>{e.period_start?.slice(0, 10)} → {e.period_end?.slice(0, 10)}</span>
                        <span className="font-mono">{fmt(e.total_ttc)}</span>
                        <ExpenseStatusBadge status={e.status} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditMode(true)}><Edit className="w-3.5 h-3.5 mr-1" /> Modifier</Button>
              </div>
            </div>
          )}
          {showDetail && editMode && (
            <div>
              <EmployeeForm form={form} setForm={setForm} />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setEditMode(false)}>Annuler</Button>
                <Button onClick={handleUpdate}>💾 Sauvegarder</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeForm({ form, setForm }) {
  const u = (field, value) => setForm(f => ({ ...f, [field]: value }));
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="text-xs font-medium mb-1 block">Nom complet *</label>
        <Input value={form.full_name} onChange={e => u('full_name', e.target.value)} placeholder="Jean Dupont" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Email</label>
        <Input type="email" value={form.email} onChange={e => u('email', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Téléphone</label>
        <Input value={form.phone} onChange={e => u('phone', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Fonction</label>
        <Select value={form.function} onValueChange={v => u('function', v)}>
          <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
          <SelectContent>
            {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Salaire brut</label>
        <Input type="number" value={form.base_salary} onChange={e => u('base_salary', parseFloat(e.target.value) || 0)} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Date d'embauche</label>
        <Input type="date" value={form.hire_date} onChange={e => u('hire_date', e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Statut</label>
        <Select value={form.status} onValueChange={v => u('status', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="suspended">Suspendu</SelectItem>
            <SelectItem value="left">Quitté</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium mb-1 block">Adresse</label>
        <Textarea value={form.address} onChange={e => u('address', e.target.value)} rows={2} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">N° Sécurité sociale</label>
        <Input value={form.numero_secu} onChange={e => u('numero_secu', e.target.value)} placeholder="1 XX XX XX XXX XXX XX" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Date fin (optionnel)</label>
        <Input type="date" value={form.leave_date} onChange={e => u('leave_date', e.target.value)} />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium mb-1 block">Notes</label>
        <Textarea value={form.notes} onChange={e => u('notes', e.target.value)} rows={2} />
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// C. CONTRATS RH
// ═══════════════════════════════════════════════════════

function ContractsTab() {
  const [contracts, setContracts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({
    employee_id: '', contract_type: 'CDI', function: '', salary_brut: 0,
    start_date: new Date().toISOString().slice(0, 10), end_date: '',
    hours_per_week: 35, special_clauses: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, eRes] = await Promise.all([
        axios.get(`${API}/contracts`, { params: { page, limit: 20 } }),
        axios.get(`${API}/employees`, { params: { limit: 200, status: 'active' } }),
      ]);
      setContracts(cRes.data.contracts);
      setTotal(cRes.data.total);
      setPages(cRes.data.pages);
      setEmployees(eRes.data.employees);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await axios.post(`${API}/contracts`, form);
      setShowCreate(false);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleDownloadPdf = async (contractId) => {
    try {
      const res = await axios.get(`${API}/contracts/${contractId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat_${contractId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erreur PDF');
    }
  };

  const contractStatusBadge = (s) => {
    const map = {
      active: { label: '🟢 Actif', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      suspended: { label: '🟡 Suspendu', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      terminated: { label: '🔴 Terminé', cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
    };
    const m = map[s] || map.active;
    return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} contrat(s)</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nouveau contrat
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">Intervenant</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Fonction</th>
                  <th className="text-right p-3 font-medium">Salaire brut</th>
                  <th className="text-left p-3 font-medium">Début</th>
                  <th className="text-left p-3 font-medium">Fin</th>
                  <th className="text-center p-3 font-medium">Statut</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
                ) : contracts.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun contrat</td></tr>
                ) : contracts.map(c => (
                  <tr key={c.contract_id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium">{c.employee_name}</td>
                    <td className="p-3"><Badge variant="outline">{c.contract_type}</Badge></td>
                    <td className="p-3">{c.function}</td>
                    <td className="p-3 text-right font-mono">{fmt(c.salary_brut)}</td>
                    <td className="p-3 text-muted-foreground">{c.start_date?.slice(0, 10)}</td>
                    <td className="p-3 text-muted-foreground">{c.end_date?.slice(0, 10) || '—'}</td>
                    <td className="p-3 text-center">{contractStatusBadge(c.status)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(c)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPdf(c.contract_id)}><Download className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Create Contract */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-violet-500" /> Nouveau contrat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Intervenant *</label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.employee_id} value={e.employee_id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Type contrat</label>
                <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Fonction</label>
                <Input value={form.function} onChange={e => setForm(f => ({ ...f, function: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Salaire brut mensuel</label>
                <Input type="number" value={form.salary_brut} onChange={e => setForm(f => ({ ...f, salary_brut: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Heures/semaine</label>
                <Input type="number" value={form.hours_per_week} onChange={e => setForm(f => ({ ...f, hours_per_week: parseFloat(e.target.value) || 35 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Date début</label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Date fin (optionnel)</label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Clauses spéciales</label>
              <Textarea value={form.special_clauses} onChange={e => setForm(f => ({ ...f, special_clauses: e.target.value }))} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.employee_id || !form.salary_brut}>✅ Créer contrat</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>📄 Détails du contrat</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Intervenant:</span> <strong>{showDetail.employee_name}</strong></div>
                <div><span className="text-muted-foreground">Type:</span> <strong>{showDetail.contract_type}</strong></div>
                <div><span className="text-muted-foreground">Fonction:</span> {showDetail.function}</div>
                <div><span className="text-muted-foreground">Salaire brut:</span> {fmt(showDetail.salary_brut)}</div>
                <div><span className="text-muted-foreground">Début:</span> {showDetail.start_date?.slice(0, 10)}</div>
                <div><span className="text-muted-foreground">Fin:</span> {showDetail.end_date?.slice(0, 10) || 'Indéterminée'}</div>
                <div><span className="text-muted-foreground">Heures/sem:</span> {showDetail.hours_per_week}h</div>
                <div><span className="text-muted-foreground">Statut:</span> {contractStatusBadge(showDetail.status)}</div>
              </div>
              {showDetail.special_clauses && (
                <div><span className="text-muted-foreground">Clauses:</span><p className="mt-1 p-2 bg-muted/30 rounded text-xs">{showDetail.special_clauses}</p></div>
              )}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(showDetail.contract_id)}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Télécharger PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// D. FICHES DE PAIE
// ═══════════════════════════════════════════════════════

function PayslipsTab() {
  const [payslips, setPayslips] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);

  const now = new Date();
  const [form, setForm] = useState({
    employee_id: '', period_month: now.getMonth() + 1,
    period_year: now.getFullYear(), salary_brut_override: 0, notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        axios.get(`${API}/payslips`, { params: { page, limit: 20 } }),
        axios.get(`${API}/employees`, { params: { limit: 200, status: 'active' } }),
      ]);
      setPayslips(pRes.data.payslips);
      setTotal(pRes.data.total);
      setPages(pRes.data.pages);
      setStats(pRes.data.stats || {});
      setEmployees(eRes.data.employees);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      const payload = {
        employee_id: form.employee_id,
        period_month: parseInt(form.period_month),
        period_year: parseInt(form.period_year),
        salary_brut_override: form.salary_brut_override > 0 ? form.salary_brut_override : null,
        notes: form.notes,
      };
      await axios.post(`${API}/payslips`, payload);
      setShowCreate(false);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handlePayment = async (payslipId) => {
    if (!window.confirm('Enregistrer le paiement de ce salaire ?')) return;
    try {
      await axios.post(`${API}/payslips/${payslipId}/record-payment`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleDownloadPdf = async (payslipId) => {
    try {
      const res = await axios.get(`${API}/payslips/${payslipId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fiche_paie_${payslipId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erreur PDF');
    }
  };

  const handleDelete = async (payslipId) => {
    if (!window.confirm('Supprimer cette fiche de paie ?')) return;
    try {
      await axios.delete(`${API}/payslips/${payslipId}`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats.count > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-blue-500/20"><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total brut</p>
            <p className="text-lg font-bold">{fmt(stats.total_brut)}</p>
          </CardContent></Card>
          <Card className="border-emerald-500/20"><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total net</p>
            <p className="text-lg font-bold text-emerald-500">{fmt(stats.total_net)}</p>
          </CardContent></Card>
          <Card className="border-amber-500/20"><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total charges</p>
            <p className="text-lg font-bold text-amber-500">{fmt(stats.total_charges)}</p>
          </CardContent></Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} fiche(s) de paie</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Générer fiche de paie
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">Période</th>
                  <th className="text-left p-3 font-medium">Intervenant</th>
                  <th className="text-right p-3 font-medium">Brut</th>
                  <th className="text-right p-3 font-medium">Charges</th>
                  <th className="text-right p-3 font-medium">Impôt</th>
                  <th className="text-right p-3 font-medium">Net</th>
                  <th className="text-center p-3 font-medium">Statut</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
                ) : payslips.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucune fiche de paie</td></tr>
                ) : payslips.map(p => (
                  <tr key={p.payslip_id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium">{MONTHS_FR[p.period_month]} {p.period_year}</td>
                    <td className="p-3">{p.employee_name}</td>
                    <td className="p-3 text-right font-mono">{fmt(p.salary_brut)}</td>
                    <td className="p-3 text-right font-mono text-amber-500">{fmt(p.social_charges)}</td>
                    <td className="p-3 text-right font-mono text-red-400">{fmt(p.tax_estimation)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-500">{fmt(p.salary_net)}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}>
                        {p.status === 'paid' ? '✅ Payée' : '⏳ En attente'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(p)} title="Détails"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPdf(p.payslip_id)} title="PDF"><Download className="w-3.5 h-3.5" /></Button>
                        {p.status !== 'paid' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" onClick={() => handlePayment(p.payslip_id)} title="Enregistrer paiement"><Banknote className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(p.payslip_id)} title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Create payslip */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-violet-500" /> Générer une fiche de paie</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Intervenant *</label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.employee_id} value={e.employee_id}>
                      {e.full_name} — {fmt(e.base_salary)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Mois</label>
                <Select value={String(form.period_month)} onValueChange={v => setForm(f => ({ ...f, period_month: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MONTHS_FR).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Année</label>
                <Input type="number" value={form.period_year} onChange={e => setForm(f => ({ ...f, period_year: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Salaire brut (override, 0 = depuis contrat)</label>
              <Input type="number" value={form.salary_brut_override} onChange={e => setForm(f => ({ ...f, salary_brut_override: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="bg-muted/30 p-3 rounded-lg text-xs">
              <p className="font-medium mb-1">⚡ Automatisation ERP</p>
              <p>• Charges sociales calculées (~42% du brut)</p>
              <p>• Impôt estimé (~20% du net avant impôt)</p>
              <p>• Écriture comptable auto: 621 Salaires / 421 Dettes</p>
              <p>• PDF généré automatiquement</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.employee_id}>✅ Générer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>📋 Détail fiche de paie</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Intervenant:</span><br /><strong>{showDetail.employee_name}</strong></div>
                <div><span className="text-muted-foreground">Période:</span><br /><strong>{MONTHS_FR[showDetail.period_month]} {showDetail.period_year}</strong></div>
              </div>
              <div className="bg-muted/20 p-3 rounded-lg space-y-2">
                <div className="flex justify-between"><span>Salaire brut</span><span className="font-mono">{fmt(showDetail.salary_brut)}</span></div>
                <div className="flex justify-between text-amber-500"><span>Charges sociales</span><span className="font-mono">- {fmt(showDetail.social_charges)}</span></div>
                <div className="flex justify-between text-red-400"><span>Impôt estimation</span><span className="font-mono">- {fmt(showDetail.tax_estimation)}</span></div>
                <hr className="border-border" />
                <div className="flex justify-between font-bold text-emerald-500"><span>Salaire net</span><span className="font-mono">{fmt(showDetail.salary_net)}</span></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Statut:</span>
                <Badge variant="outline" className={showDetail.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}>
                  {showDetail.status === 'paid' ? '✅ Payée' : '⏳ En attente'}
                </Badge>
              </div>
              {showDetail.payment_date && <p className="text-xs text-muted-foreground">Payée le: {showDetail.payment_date.slice(0, 10)}</p>}
              {showDetail.journal_entry_id && <p className="text-xs text-muted-foreground">Écriture comptable: {showDetail.journal_entry_id}</p>}
              {showDetail.notes && <p className="text-xs"><span className="text-muted-foreground">Notes:</span> {showDetail.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// E. NOTES DE FRAIS
// ═══════════════════════════════════════════════════════

function ExpenseStatusBadge({ status }) {
  const map = {
    pending: { label: '⏳ En attente', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    validated: { label: '✅ Validée', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    rejected: { label: '🔴 Rejetée', cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
    reimbursed: { label: '💰 Remboursée', cls: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
  };
  const m = map[status] || map.pending;
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}

function ExpenseReportsTab() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [form, setForm] = useState({
    employee_id: '',
    period_start: new Date().toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    items: [{ date: new Date().toISOString().slice(0, 10), category: 'other', description: '', amount_ht: 0, tva_rate: 20 }],
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, eRes] = await Promise.all([
        axios.get(`${API}/expense-reports`, { params: { page, limit: 20, status: statusFilter !== 'all' ? statusFilter : undefined } }),
        axios.get(`${API}/employees`, { params: { limit: 200, status: 'active' } }),
      ]);
      setReports(rRes.data.reports);
      setTotal(rRes.data.total);
      setPages(rRes.data.pages);
      setEmployees(eRes.data.employees);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const addItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { date: new Date().toISOString().slice(0, 10), category: 'other', description: '', amount_ht: 0, tva_rate: 20 }],
    }));
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const totalHT = form.items.reduce((s, i) => s + (parseFloat(i.amount_ht) || 0), 0);
  const totalTVA = form.items.reduce((s, i) => s + ((parseFloat(i.amount_ht) || 0) * (parseFloat(i.tva_rate) || 0) / 100), 0);
  const totalTTC = totalHT + totalTVA;

  const handleCreate = async () => {
    try {
      await axios.post(`${API}/expense-reports`, form);
      setShowCreate(false);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleValidate = async (reportId) => {
    try {
      await axios.post(`${API}/expense-reports/${reportId}/validate`);
      setShowDetail(null);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleReject = async (reportId) => {
    try {
      await axios.post(`${API}/expense-reports/${reportId}/reject`, { reason: rejectReason });
      setShowDetail(null);
      setRejectReason('');
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleReimburse = async (reportId) => {
    if (!window.confirm('Enregistrer le remboursement ?')) return;
    try {
      await axios.post(`${API}/expense-reports/${reportId}/reimburse`);
      setShowDetail(null);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleDownloadPdf = async (reportId) => {
    try {
      const res = await axios.get(`${API}/expense-reports/${reportId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note_frais_${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erreur PDF');
    }
  };

  const catLabel = (c) => {
    const map = { transport: '🚗 Transport', lodging: '🏨 Hébergement', meals: '🍽️ Repas', other: '📦 Autres' };
    return map[c] || c;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="validated">Validées</SelectItem>
            <SelectItem value="rejected">Rejetées</SelectItem>
            <SelectItem value="reimbursed">Remboursées</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">{total} note(s) de frais</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nouvelle note de frais
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">Intervenant</th>
                  <th className="text-left p-3 font-medium">Période</th>
                  <th className="text-right p-3 font-medium">Total HT</th>
                  <th className="text-right p-3 font-medium">TVA</th>
                  <th className="text-right p-3 font-medium">Total TTC</th>
                  <th className="text-center p-3 font-medium">Statut</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
                ) : reports.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucune note de frais</td></tr>
                ) : reports.map(r => (
                  <tr key={r.report_id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium">{r.employee_name}</td>
                    <td className="p-3 text-muted-foreground">{r.period_start?.slice(0, 10)} → {r.period_end?.slice(0, 10)}</td>
                    <td className="p-3 text-right font-mono">{fmt(r.total_ht)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{fmt(r.total_tva)}</td>
                    <td className="p-3 text-right font-mono font-bold">{fmt(r.total_ttc)}</td>
                    <td className="p-3 text-center"><ExpenseStatusBadge status={r.status} /></td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(r)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPdf(r.report_id)}><Download className="w-3.5 h-3.5" /></Button>
                        {r.status === 'pending' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" onClick={() => handleValidate(r.report_id)} title="Valider"><Check className="w-3.5 h-3.5" /></Button>
                        )}
                        {r.status === 'validated' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-violet-500" onClick={() => handleReimburse(r.report_id)} title="Rembourser"><Banknote className="w-3.5 h-3.5" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Create expense report */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-violet-500" /> Nouvelle note de frais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Intervenant *</label>
                <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.employee_id} value={e.employee_id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Date début</label>
                <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Date fin</label>
                <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Lignes de frais</label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/20 p-2 rounded-lg">
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground">Date</label>
                      <Input type="date" value={item.date} onChange={e => updateItem(idx, 'date', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground">Catégorie</label>
                      <Select value={item.category} onValueChange={v => updateItem(idx, 'category', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-muted-foreground">Description</label>
                      <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} className="h-8 text-xs" placeholder="Description..." />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground">Montant HT</label>
                      <Input type="number" value={item.amount_ht} onChange={e => updateItem(idx, 'amount_ht', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground">TVA %</label>
                      <Input type="number" value={item.tva_rate} onChange={e => updateItem(idx, 'tva_rate', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeItem(idx)} disabled={form.items.length <= 1}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="flex justify-between text-sm"><span>Total HT</span><span className="font-mono">{fmt(totalHT)}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>Total TVA</span><span className="font-mono">{fmt(totalTVA)}</span></div>
              <hr className="my-1 border-border" />
              <div className="flex justify-between text-sm font-bold"><span>Total TTC</span><span className="font-mono">{fmt(totalTTC)}</span></div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.employee_id || form.items.length === 0}>✅ Soumettre</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail + Validation */}
      <Dialog open={!!showDetail} onOpenChange={() => { setShowDetail(null); setRejectReason(''); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📝 Détail note de frais</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Intervenant:</span> <strong>{showDetail.employee_name}</strong></div>
                <div><span className="text-muted-foreground">Statut:</span> <ExpenseStatusBadge status={showDetail.status} /></div>
                <div><span className="text-muted-foreground">Période:</span> {showDetail.period_start?.slice(0, 10)} → {showDetail.period_end?.slice(0, 10)}</div>
                {showDetail.rejection_reason && (
                  <div className="col-span-2 text-red-500"><span className="text-muted-foreground">Motif rejet:</span> {showDetail.rejection_reason}</div>
                )}
              </div>

              {/* Items */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Catégorie</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">HT</th>
                      <th className="text-right p-2">TVA</th>
                      <th className="text-right p-2">TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showDetail.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{item.date}</td>
                        <td className="p-2">{catLabel(item.category)}</td>
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-right font-mono">{fmt(item.amount_ht)}</td>
                        <td className="p-2 text-right font-mono">{fmt(item.amount_tva)}</td>
                        <td className="p-2 text-right font-mono">{fmt(item.amount_ttc)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td colSpan={3} className="p-2 text-right">TOTAUX</td>
                      <td className="p-2 text-right font-mono">{fmt(showDetail.total_ht)}</td>
                      <td className="p-2 text-right font-mono">{fmt(showDetail.total_tva)}</td>
                      <td className="p-2 text-right font-mono">{fmt(showDetail.total_ttc)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {showDetail.journal_entry_id && <p className="text-xs text-muted-foreground">Écriture comptable: {showDetail.journal_entry_id}</p>}
              {showDetail.reimbursement_date && <p className="text-xs text-muted-foreground">Remboursé le: {showDetail.reimbursement_date.slice(0, 10)}</p>}

              {/* Actions */}
              {showDetail.status === 'pending' && (
                <div className="space-y-3 border-t pt-3">
                  <p className="font-medium text-xs">🔧 Actions responsable</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleValidate(showDetail.report_id)}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Valider
                    </Button>
                    <div className="flex-1 flex gap-2">
                      <Input placeholder="Motif de rejet..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="h-9 text-xs" />
                      <Button size="sm" variant="destructive" onClick={() => handleReject(showDetail.report_id)}>
                        <X className="w-3.5 h-3.5 mr-1" /> Rejeter
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {showDetail.status === 'validated' && (
                <div className="border-t pt-3">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => handleReimburse(showDetail.report_id)}>
                    <Banknote className="w-3.5 h-3.5 mr-1" /> Enregistrer remboursement
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
