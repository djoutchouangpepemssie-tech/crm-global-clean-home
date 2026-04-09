import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, PieChart as PieIcon,
  Plus, BarChart3, FileText, Wallet, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Send, Download, Edit, Trash2, Eye, Check,
  AlertTriangle, BookOpen, Receipt, Building2, ChevronRight, Search,
  RefreshCw, Banknote, ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import PayrollRHModule from './payroll-rh/PayrollRHModule';

const API = `${BACKEND_URL}/api/accounting/erp`;
const COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

const CATEGORIES = [
  { value: 'materiel', label: 'Matériel' },
  { value: 'transport', label: 'Transport' },
  { value: 'salaires', label: 'Salaires' },
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'energie', label: 'Énergie' },
  { value: 'loyer', label: 'Loyer' },
  { value: 'assurances', label: 'Assurances' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'autres', label: 'Autres' },
];

const STATUS_LABELS = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-500', icon: '⚪' },
  envoyee: { label: 'Envoyée', color: 'bg-yellow-500', icon: '🟡' },
  payee: { label: 'Payée', color: 'bg-green-500', icon: '🟢' },
  en_retard: { label: 'En retard', color: 'bg-red-500', icon: '🔴' },
};

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(n || 0).toFixed(1)}%`;

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function AccountingERP() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="h-7 w-7 text-violet-500" />
        <h1 className="text-2xl font-bold">Comptabilité ERP</h1>
        <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/30">
          Système intégré
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex gap-1 bg-white/5 rounded-2xl p-1.5 overflow-x-auto w-fit mb-2">
          <TabsTrigger value="dashboard" className="px-4 py-2 rounded-xl text-xs font-bold data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-500">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="invoices" className="px-4 py-2 rounded-xl text-xs font-bold data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-500">📄 Factures</TabsTrigger>
          <TabsTrigger value="expenses" className="px-4 py-2 rounded-xl text-xs font-bold data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-500">💸 Dépenses</TabsTrigger>
          <TabsTrigger value="treasury" className="px-4 py-2 rounded-xl text-xs font-bold data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-500">🏦 Trésorerie</TabsTrigger>
          <TabsTrigger value="journals" className="px-4 py-2 rounded-xl text-xs font-bold data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-500">📒 Journaux</TabsTrigger>
          <TabsTrigger value="tva" className="px-4 py-2 rounded-xl text-xs font-bold data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-500">🧾 TVA</TabsTrigger>
          <TabsTrigger value="reports" className="px-4 py-2 rounded-xl text-xs font-bold data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-500">📈 Rapports</TabsTrigger>
          <TabsTrigger value="payroll-rh" className="px-4 py-2 rounded-xl text-xs font-bold data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-500">💼 Paie & RH</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardSection onNavigate={setActiveTab} /></TabsContent>
        <TabsContent value="invoices"><InvoiceModule /></TabsContent>
        <TabsContent value="expenses"><ExpenseModule /></TabsContent>
        <TabsContent value="treasury"><TreasuryModule /></TabsContent>
        <TabsContent value="journals"><JournalModule /></TabsContent>
        <TabsContent value="tva"><TVAModule /></TabsContent>
        <TabsContent value="reports"><ReportingModule /></TabsContent>
        <TabsContent value="payroll-rh"><PayrollRHModule /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// A. DASHBOARD FINANCIER
// ═══════════════════════════════════════════════════════════

function DashboardSection({ onNavigate }) {
  const [kpis, setKpis] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, cRes] = await Promise.all([
        axios.get(`${API}/dashboard/kpis`),
        axios.get(`${API}/dashboard/charts`),
      ]);
      setKpis(kRes.data);
      setCharts(cRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (!kpis) return <EmptyState text="Impossible de charger le dashboard" />;

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="CA TTC (mois)"
          value={fmt(kpis.ca?.month)}
          sub={`Jour: ${fmt(kpis.ca?.day)} | Année: ${fmt(kpis.ca?.year)}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="text-green-400"
          bgColor="bg-green-500/10"
          hexColor="#10b981"
        />
        <KPICard
          title="Bénéfice (mois)"
          value={fmt(kpis.benefice?.month)}
          sub={fmtPct(kpis.benefice?.variation_pct)}
          icon={<TrendingUp className="h-5 w-5" />}
          color={kpis.benefice?.month >= 0 ? "text-emerald-400" : "text-red-400"}
          bgColor="bg-emerald-500/10"
          hexColor={kpis.benefice?.month >= 0 ? "#10b981" : "#f43f5e"}
          trend={kpis.benefice?.variation_pct}
        />
        <KPICard
          title="Dépenses (mois)"
          value={fmt(kpis.expenses?.month)}
          sub={Object.entries(kpis.expenses?.breakdown || {}).slice(0, 2).map(([k, v]) => `${k}: ${fmt(v)}`).join(' | ')}
          icon={<CreditCard className="h-5 w-5" />}
          color="text-orange-400"
          bgColor="bg-orange-500/10"
          hexColor="#f97316"
        />
        <KPICard
          title="Trésorerie"
          value={fmt(kpis.treasury?.solde)}
          sub={`Prévu 30j: ${fmt(kpis.treasury?.prevision_30j)}`}
          icon={<Wallet className="h-5 w-5" />}
          color={kpis.treasury?.solde < kpis.treasury?.alert_threshold ? "text-red-400" : "text-blue-400"}
          bgColor="bg-blue-500/10"
          hexColor={kpis.treasury?.solde < kpis.treasury?.alert_threshold ? "#f43f5e" : "#3b82f6"}
        />
        <KPICard
          title="Impayées"
          value={`${kpis.unpaid_invoices?.count || 0}`}
          sub={fmt(kpis.unpaid_invoices?.amount)}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={kpis.unpaid_invoices?.count > 0 ? "text-red-400" : "text-gray-400"}
          bgColor={kpis.unpaid_invoices?.count > 0 ? "bg-red-500/10" : "bg-gray-500/10"}
          hexColor={kpis.unpaid_invoices?.count > 0 ? "#f43f5e" : "#64748b"}
          alert={kpis.unpaid_invoices?.overdue > 0}
        />
        <KPICard
          title="À payer"
          value={`${kpis.pending_expenses?.count || 0}`}
          sub={fmt(kpis.pending_expenses?.amount)}
          icon={<Receipt className="h-5 w-5" />}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
          hexColor="#f59e0b"
        />
      </div>

      {/* Alerts */}
      {kpis.unpaid_invoices?.overdue > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 py-3 px-5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-400 font-medium text-sm">
            ⚠️ {kpis.unpaid_invoices.overdue} facture(s) en retard (&gt;30j) — {fmt(kpis.unpaid_invoices.amount)} impayés
          </span>
          <Button size="sm" variant="outline" className="ml-auto border-red-500/30 text-red-400" onClick={() => onNavigate('invoices')}>
            Voir les factures
          </Button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => onNavigate('invoices')}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Facture
        </Button>
        <Button variant="outline" onClick={() => onNavigate('expenses')}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Dépense
        </Button>
        <Button variant="outline" onClick={() => onNavigate('journals')}>
          <Eye className="h-4 w-4 mr-2" /> Journal Comptable
        </Button>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Charts */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CA 12 mois */}
          <div className="section-card overflow-hidden">
            <div className="px-5 pt-5 pb-3"><h3 className="text-sm font-black text-slate-200 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-400" />CA TTC (12 derniers mois)</h3></div>
            <div className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={charts.ca_monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#666" />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
                  <Area type="monotone" dataKey="ca" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Répartition prestations */}
          <div className="section-card overflow-hidden">
            <div className="px-5 pt-5 pb-3"><h3 className="text-sm font-black text-slate-200 flex items-center gap-2"><PieIcon className="h-4 w-4 text-emerald-400" />Répartition CA par prestation</h3></div>
            <div className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={charts.prestation_breakdown} dataKey="ca" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={({ type, ca }) => `${type}: ${fmt(ca)}`}>
                    {charts.prestation_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Waterfall */}
          <div className="section-card overflow-hidden">
            <div className="px-5 pt-5 pb-3"><h3 className="text-sm font-black text-slate-200 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-amber-400" />Résultat du mois</h3></div>
            <div className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.waterfall}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#666" />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {charts.waterfall.map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Solde bancaire */}
          <div className="section-card overflow-hidden">
            <div className="px-5 pt-5 pb-3"><h3 className="text-sm font-black text-slate-200 flex items-center gap-2"><Wallet className="h-4 w-4 text-blue-400" />Solde bancaire (6 mois)</h3></div>
            <div className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={charts.solde_monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#666" />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
                  <Area type="monotone" dataKey="solde" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, sub, icon, color, bgColor, trend, alert, hexColor }) {
  return (
    <div className={`section-card p-5 hover:border-white/10 transition-all ${alert ? 'border-red-500/30 animate-pulse' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{background: hexColor ? `${hexColor}20` : 'rgba(124,58,237,0.15)', border: hexColor ? `1px solid ${hexColor}30` : '1px solid rgba(124,58,237,0.3)'}}>
          <span className={color}>{icon}</span>
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${trend > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-black text-slate-100 mb-1" style={{fontFamily:'Manrope,sans-serif'}}>{value}</div>
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// B. FACTURATION
// ═══════════════════════════════════════════════════════════

function InvoiceModule() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailInv, setDetailInv] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get(`${API}/invoices`, { params });
      setInvoices(res.data.items);
      setTotal(res.data.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handleSend = async (id) => {
    if (!window.confirm('Envoyer cette facture ? Une écriture comptable sera générée.')) return;
    try {
      await axios.post(`${API}/invoices/${id}/send`);
      loadInvoices();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archiver cette facture ?')) return;
    try {
      await axios.delete(`${API}/invoices/${id}`);
      loadInvoices();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Facture
        </Button>
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Rechercher (n° ou client)..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="brouillon">⚪ Brouillon</SelectItem>
            <SelectItem value="envoyee">🟡 Envoyée</SelectItem>
            <SelectItem value="payee">🟢 Payée</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">{total} facture(s)</Badge>
      </div>

      {loading ? <LoadingState /> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">N° Facture</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Prestation</th>
                <th className="text-right p-3">HT</th>
                <th className="text-right p-3">TVA</th>
                <th className="text-right p-3">TTC</th>
                <th className="text-center p-3">Statut</th>
                <th className="text-left p-3">Date</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const st = STATUS_LABELS[inv.status_display || inv.status] || STATUS_LABELS.brouillon;
                return (
                  <tr key={inv.invoice_id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="p-3 font-medium">{inv.client_name || '—'}</td>
                    <td className="p-3 text-muted-foreground">{inv.prestation_type || '—'}</td>
                    <td className="p-3 text-right">{fmt(inv.total_ht)}</td>
                    <td className="p-3 text-right text-muted-foreground">{fmt(inv.total_tva)}</td>
                    <td className="p-3 text-right font-semibold">{fmt(inv.total_ttc)}</td>
                    <td className="p-3 text-center">
                      <Badge className={`${st.color} text-white text-xs`}>{st.icon} {st.label}</Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{inv.invoice_date?.slice(0, 10)}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="ghost" title="Détails" onClick={() => setDetailInv(inv)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {inv.status === 'brouillon' && (
                          <>
                            <Button size="sm" variant="ghost" title="Envoyer" onClick={() => handleSend(inv.invoice_id)}>
                              <Send className="h-3.5 w-3.5 text-blue-400" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Supprimer" onClick={() => handleDelete(inv.invoice_id)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </>
                        )}
                        {(inv.status === 'envoyee' || inv.status_display === 'en_retard') && (
                          <Button size="sm" variant="ghost" title="Paiement" onClick={() => setPaymentOpen(inv)}>
                            <Banknote className="h-3.5 w-3.5 text-green-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr><td colSpan={9} className="text-center p-8 text-muted-foreground">Aucune facture</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
          <span className="text-sm text-muted-foreground py-2">Page {page}</span>
          <Button size="sm" variant="outline" disabled={invoices.length < 20} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <InvoiceCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); loadInvoices(); }} />

      {/* Detail Dialog */}
      {detailInv && (
        <Dialog open={!!detailInv} onOpenChange={() => setDetailInv(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Facture {detailInv.invoice_number}</DialogTitle></DialogHeader>
            <InvoiceDetail invoice={detailInv} />
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Dialog */}
      {paymentOpen && (
        <PaymentDialog invoice={paymentOpen} onClose={() => setPaymentOpen(null)} onPaid={() => { setPaymentOpen(null); loadInvoices(); }} />
      )}
    </div>
  );
}

function InvoiceCreateDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    client_name: '', client_email: '', client_phone: '', client_address: '',
    prestation_type: '', notes: '', payment_terms: 'Paiement à 30 jours',
    items: [{ description: '', quantity: 1, unit_price_ht: 0, tva_rate: 20 }],
  });
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    if (open && clientSearch.length >= 2) {
      axios.get(`${BACKEND_URL}/api/leads`, { params: { search: clientSearch, page_size: 5 } })
        .then(r => setClients(r.data.leads || []))
        .catch(() => {});
    }
  }, [clientSearch, open]);

  const selectClient = (c) => {
    setForm(f => ({ ...f, client_name: c.name || '', client_email: c.email || '', client_phone: c.phone || '', client_address: c.address || '', client_id: c.lead_id }));
    setClientSearch('');
    setClients([]);
  };

  const updateItem = (idx, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: field === 'description' ? value : Number(value) };
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price_ht: 0, tva_rate: 20 }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const totals = useMemo(() => {
    let ht = 0, tva = 0;
    form.items.forEach(i => {
      const h = (i.quantity || 0) * (i.unit_price_ht || 0);
      ht += h;
      tva += h * (i.tva_rate || 0) / 100;
    });
    return { ht: Math.round(ht * 100) / 100, tva: Math.round(tva * 100) / 100, ttc: Math.round((ht + tva) * 100) / 100 };
  }, [form.items]);

  const handleSubmit = async () => {
    if (!form.items.length || !form.items[0].description) return alert('Ajoutez au moins un article');
    setSaving(true);
    try {
      await axios.post(`${API}/invoices`, form);
      onCreated();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>✨ Nouvelle Facture</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Client */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Client (rechercher dans CRM)</label>
            <Input placeholder="Rechercher un client..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
            {clients.length > 0 && (
              <div className="border rounded-md p-1 space-y-1 max-h-32 overflow-y-auto">
                {clients.map(c => (
                  <button key={c.lead_id} className="w-full text-left p-2 hover:bg-muted rounded text-sm" onClick={() => selectClient(c)}>
                    <strong>{c.name}</strong> — {c.email || c.phone || ''}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nom client" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              <Input placeholder="Email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
              <Input placeholder="Téléphone" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
              <Input placeholder="Adresse" value={form.client_address} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} />
            </div>
          </div>

          {/* Prestation type */}
          <Select value={form.prestation_type} onValueChange={v => setForm(f => ({ ...f, prestation_type: v }))}>
            <SelectTrigger><SelectValue placeholder="Type de prestation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="menage">🏠 Ménage domicile</SelectItem>
              <SelectItem value="bureau">🏢 Nettoyage bureau</SelectItem>
              <SelectItem value="canape">🛋️ Nettoyage canapé</SelectItem>
              <SelectItem value="tapis">🧹 Nettoyage tapis</SelectItem>
              <SelectItem value="matelas">🛏️ Nettoyage matelas</SelectItem>
              <SelectItem value="autre">📋 Autre</SelectItem>
            </SelectContent>
          </Select>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Articles / Services</label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Ligne</Button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-4" placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                <Input className="col-span-2" type="number" placeholder="Qté" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                <Input className="col-span-2" type="number" placeholder="PU HT" value={item.unit_price_ht} onChange={e => updateItem(idx, 'unit_price_ht', e.target.value)} />
                <Select value={String(item.tva_rate)} onValueChange={v => updateItem(idx, 'tva_rate', v)}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5.5">5.5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
                <div className="col-span-1 text-right text-sm font-medium">{fmt(item.quantity * item.unit_price_ht * (1 + item.tva_rate / 100))}</div>
                <Button size="sm" variant="ghost" className="col-span-1" onClick={() => removeItem(idx)} disabled={form.items.length === 1}>
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="section-card" className="bg-muted/30">
            <div className="p-4 grid grid-cols-3 gap-4 text-center">
              <div><div className="text-xs text-muted-foreground">Total HT</div><div className="text-lg font-bold">{fmt(totals.ht)}</div></div>
              <div><div className="text-xs text-muted-foreground">TVA</div><div className="text-lg font-bold text-amber-400">{fmt(totals.tva)}</div></div>
              <div><div className="text-xs text-muted-foreground">Total TTC</div><div className="text-lg font-bold text-green-400">{fmt(totals.ttc)}</div></div>
            </div>
          </div>

          <Textarea placeholder="Notes / conditions..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Création...' : '✅ Créer Facture (Brouillon)'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDetail({ invoice }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Client</div>
          <div className="font-medium">{invoice.client_name || '—'}</div>
          <div className="text-sm text-muted-foreground">{invoice.client_email}</div>
          <div className="text-sm text-muted-foreground">{invoice.client_phone}</div>
          <div className="text-sm text-muted-foreground">{invoice.client_address}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">N° Facture</div>
          <div className="font-mono font-bold">{invoice.invoice_number}</div>
          <div className="text-xs text-muted-foreground mt-2">Date</div>
          <div>{invoice.invoice_date?.slice(0, 10)}</div>
          <Badge className={`mt-2 ${(STATUS_LABELS[invoice.status_display || invoice.status] || STATUS_LABELS.brouillon).color} text-white`}>
            {(STATUS_LABELS[invoice.status_display || invoice.status] || STATUS_LABELS.brouillon).icon} {(STATUS_LABELS[invoice.status_display || invoice.status] || STATUS_LABELS.brouillon).label}
          </Badge>
        </div>
      </div>

      <Separator />

      <table className="w-full text-sm">
        <thead><tr className="border-b"><th className="text-left p-2">Description</th><th className="text-right p-2">Qté</th><th className="text-right p-2">PU HT</th><th className="text-right p-2">TVA</th><th className="text-right p-2">TTC</th></tr></thead>
        <tbody>
          {(invoice.items || []).map((item, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{item.description}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right">{fmt(item.unit_price_ht)}</td>
              <td className="p-2 text-right text-muted-foreground">{item.tva_rate}%</td>
              <td className="p-2 text-right font-medium">{fmt(item.amount_ttc)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-sm"><span>Total HT</span><span>{fmt(invoice.total_ht)}</span></div>
          <div className="flex justify-between text-sm text-amber-400"><span>TVA</span><span>{fmt(invoice.total_tva)}</span></div>
          <Separator />
          <div className="flex justify-between font-bold text-lg"><span>Total TTC</span><span className="text-green-400">{fmt(invoice.total_ttc)}</span></div>
        </div>
      </div>

      {invoice.notes && <div className="text-sm text-muted-foreground italic">📝 {invoice.notes}</div>}

      {/* Journal entries */}
      {invoice.journal_entries?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2"><BookOpen className="h-4 w-4" />Écritures comptables</h4>
          {invoice.journal_entries.map(j => (
            <div className="section-card" key={j.entry_id} className="bg-muted/20">
              <div className="p-3 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{j.description}</span>
                  <Badge variant="outline" className="text-xs">{j.journal_type}</Badge>
                </div>
                {j.entries.map((e, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{e.account_number} {e.account_label}</span>
                    <span>{e.debit > 0 ? `D: ${fmt(e.debit)}` : `C: ${fmt(e.credit)}`}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentDialog({ invoice, onClose, onPaid }) {
  const [form, setForm] = useState({ method: 'virement', reference: '', notes: '', amount: invoice.total_ttc });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/invoices/${invoice.invoice_id}/record-payment`, form);
      onPaid();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    setSaving(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>💰 Enregistrer Paiement — {invoice.invoice_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Montant facture</div>
            <div className="text-2xl font-bold text-green-400">{fmt(invoice.total_ttc)}</div>
          </div>
          <Input type="number" placeholder="Montant payé" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
          <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="virement">🏦 Virement</SelectItem>
              <SelectItem value="carte">💳 Carte</SelectItem>
              <SelectItem value="especes">💵 Espèces</SelectItem>
              <SelectItem value="cheque">📝 Chèque</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Référence (optionnel)" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Enregistrement...' : '✅ Enregistrer Paiement'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════
// C. DÉPENSES
// ═══════════════════════════════════════════════════════════

function ExpenseModule() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      if (catFilter) params.category = catFilter;
      const res = await axios.get(`${API}/expenses`, { params });
      setExpenses(res.data.items);
      setTotal(res.data.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, catFilter]);

  useEffect(() => { load(); }, [load]);

  const handlePay = async (id) => {
    if (!window.confirm('Marquer comme payée ?')) return;
    try {
      await axios.post(`${API}/expenses/${id}/pay`);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette dépense ?')) return;
    try {
      await axios.delete(`${API}/expenses/${id}`);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Dépense
        </Button>
        <Input placeholder="Rechercher..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={catFilter} onValueChange={v => { setCatFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline">{total} dépense(s)</Badge>
      </div>

      {loading ? <LoadingState /> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Catégorie</th>
                <th className="text-left p-3">Description</th>
                <th className="text-right p-3">HT</th>
                <th className="text-right p-3">TVA</th>
                <th className="text-right p-3">TTC</th>
                <th className="text-left p-3">Fournisseur</th>
                <th className="text-center p-3">Statut</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.expense_id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs">{exp.date?.slice(0, 10)}</td>
                  <td className="p-3"><Badge variant="outline" className="text-xs">{exp.category}</Badge></td>
                  <td className="p-3">{exp.description}</td>
                  <td className="p-3 text-right">{fmt(exp.amount_ht)}</td>
                  <td className="p-3 text-right text-muted-foreground">{fmt(exp.amount_tva)}</td>
                  <td className="p-3 text-right font-medium">{fmt(exp.amount_ttc)}</td>
                  <td className="p-3 text-muted-foreground">{exp.supplier_name || '—'}</td>
                  <td className="p-3 text-center">
                    <Badge className={exp.status === 'payee' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}>
                      {exp.status === 'payee' ? '✅ Payée' : '⏳ En attente'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-center">
                      {exp.status === 'en_attente' && (
                        <Button size="sm" variant="ghost" title="Payer" onClick={() => handlePay(exp.expense_id)}>
                          <Banknote className="h-3.5 w-3.5 text-green-400" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" title="Supprimer" onClick={() => handleDelete(exp.expense_id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={9} className="text-center p-8 text-muted-foreground">Aucune dépense</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ExpenseCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function ExpenseCreateDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    category: 'autres', description: '', amount_ht: 0, supplier_name: '', status: 'payee',
  });
  const [saving, setSaving] = useState(false);

  const tvaRate = { materiel: 20, transport: 20, fournitures: 20, salaires: 0, energie: 20, loyer: 20, assurances: 0, maintenance: 20, autres: 20 }[form.category] || 20;
  const tva = Math.round(form.amount_ht * tvaRate) / 100;
  const ttc = Math.round((form.amount_ht + tva) * 100) / 100;

  const handleSubmit = async () => {
    if (!form.description || form.amount_ht <= 0) return alert('Remplissez description et montant');
    setSaving(true);
    try {
      await axios.post(`${API}/expenses`, form);
      onCreated();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>💸 Nouvelle Dépense</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input type="number" placeholder="Montant HT (€)" value={form.amount_ht || ''} onChange={e => setForm(f => ({ ...f, amount_ht: Number(e.target.value) }))} />
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg text-center">
            <div><div className="text-xs text-muted-foreground">TVA ({tvaRate}%)</div><div className="font-bold text-amber-400">{fmt(tva)}</div></div>
            <div><div className="text-xs text-muted-foreground">Total TTC</div><div className="font-bold text-red-400">{fmt(ttc)}</div></div>
            <div>
              <div className="text-xs text-muted-foreground">Statut</div>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payee">✅ Payée</SelectItem>
                  <SelectItem value="en_attente">⏳ En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input placeholder="Fournisseur (optionnel)" value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Enregistrement...' : '✅ Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════
// D. TRÉSORERIE
// ═══════════════════════════════════════════════════════════

function TreasuryModule() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/treasury`, { params: { month } });
      setData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Erreur chargement trésorerie" />;

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center gap-3">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="section-card overflow-hidden">
          <div className="p-4 text-center">
            <div className="text-xs text-muted-foreground">Solde initial</div>
            <div className="text-xl font-bold">{fmt(data.solde_initial)}</div>
          </div>
        </div>
        <div className="section-card" className="border-green-500/30">
          <div className="p-4 text-center">
            <div className="text-xs text-muted-foreground">Entrées</div>
            <div className="text-xl font-bold text-green-400">+{fmt(data.total_in)}</div>
          </div>
        </div>
        <div className="section-card" className="border-red-500/30">
          <div className="p-4 text-center">
            <div className="text-xs text-muted-foreground">Sorties</div>
            <div className="text-xl font-bold text-red-400">-{fmt(data.total_out)}</div>
          </div>
        </div>
        <div className="section-card" className="border-blue-500/30">
          <div className="p-4 text-center">
            <div className="text-xs text-muted-foreground">Solde courant</div>
            <div className={`text-xl font-bold ${data.solde_courant >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{fmt(data.solde_courant)}</div>
            <div className="text-xs text-muted-foreground mt-1">Prévision 30j: {fmt(data.prevision_30j)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entrées */}
        <div className="section-card overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm text-green-400">📥 Entrées (Factures payées)</h3></div>
          <div className="px-5 pb-5">
            {data.entries_in.length === 0 ? <p className="text-sm text-muted-foreground">Aucune entrée</p> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.entries_in.map((e, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-green-500/5 rounded">
                    <div>
                      <div className="text-sm font-medium">{e.invoice_number} — {e.client_name}</div>
                      <div className="text-xs text-muted-foreground">{e.payment_date?.slice(0, 10)}</div>
                    </div>
                    <span className="font-bold text-green-400">+{fmt(e.total_ttc)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sorties */}
        <div className="section-card overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm text-red-400">📤 Sorties (Dépenses payées)</h3></div>
          <div className="px-5 pb-5">
            {data.entries_out.length === 0 ? <p className="text-sm text-muted-foreground">Aucune sortie</p> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.entries_out.map((e, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-red-500/5 rounded">
                    <div>
                      <div className="text-sm font-medium">{e.description}</div>
                      <div className="text-xs text-muted-foreground">{e.category} — {e.date?.slice(0, 10)}</div>
                    </div>
                    <span className="font-bold text-red-400">-{fmt(e.amount_ttc)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// E. JOURNAUX COMPTABLES
// ═══════════════════════════════════════════════════════════

function JournalModule() {
  const [journalType, setJournalType] = useState('general');
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0, balanced: true });
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (month) params.month = month;
      const res = await axios.get(`${API}/journals/${journalType}`, { params });
      setEntries(res.data.items);
      setTotals({ debit: res.data.total_debit, credit: res.data.total_credit, balanced: res.data.is_balanced });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [journalType, month]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={journalType} onValueChange={setJournalType}>
          <TabsList>
            <TabsTrigger value="general">📋 Général</TabsTrigger>
            <TabsTrigger value="ventes">📈 Ventes</TabsTrigger>
            <TabsTrigger value="achats">📉 Achats</TabsTrigger>
            <TabsTrigger value="banque">🏦 Banque</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" placeholder="Mois..." />
        {month && <Button size="sm" variant="ghost" onClick={() => setMonth('')}>✕</Button>}
      </div>

      {/* Balance summary */}
      <div className="flex gap-4 items-center">
        <Badge variant="outline" className="text-green-400 border-green-500/30">Débit: {fmt(totals.debit)}</Badge>
        <Badge variant="outline" className="text-red-400 border-red-500/30">Crédit: {fmt(totals.credit)}</Badge>
        <Badge className={totals.balanced ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
          {totals.balanced ? '✅ Équilibré' : '⚠️ Déséquilibré'}
        </Badge>
      </div>

      {loading ? <LoadingState /> : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div className="section-card" key={entry.entry_id} className="hover:border-violet-500/30 transition-colors">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-medium">{entry.description}</span>
                    <div className="text-xs text-muted-foreground">{entry.entry_date?.slice(0, 10)} — {entry.reference_type}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{entry.journal_type}</Badge>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Compte</th>
                        <th className="text-left p-2">Libellé</th>
                        <th className="text-right p-2">Débit</th>
                        <th className="text-right p-2">Crédit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(entry.entries || []).map((e, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-mono text-xs">{e.account_number}</td>
                          <td className="p-2">{e.account_label}</td>
                          <td className="p-2 text-right text-green-400">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                          <td className="p-2 text-right text-red-400">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-4 mt-2 text-xs">
                  <span>Total Débit: <strong className="text-green-400">{fmt(entry.total_debit)}</strong></span>
                  <span>Total Crédit: <strong className="text-red-400">{fmt(entry.total_credit)}</strong></span>
                  {entry.is_balanced && <Badge className="bg-green-500/20 text-green-400 text-xs">✓ Équilibré</Badge>}
                </div>
              </div>
            </div>
          ))}
          {entries.length === 0 && <EmptyState text="Aucune écriture comptable" />}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// F. TVA & FISCALITÉ
// ═══════════════════════════════════════════════════════════

function TVAModule() {
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tva/${month}`);
      setData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/tva/${month}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `declaration_tva_${month}.csv`;
      a.click();
    } catch (e) { alert('Erreur export'); }
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center gap-3">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Exporter CSV
        </Button>
      </div>

      {loading ? <LoadingState /> : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="section-card" className="border-green-500/30">
              <div className="p-6 text-center">
                <div className="text-sm text-muted-foreground mb-2">TVA Collectée</div>
                <div className="text-3xl font-bold text-green-400">{fmt(data.tva_collectee)}</div>
                <div className="text-xs text-muted-foreground mt-1">Sur ventes</div>
              </div>
            </div>
            <div className="section-card" className="border-blue-500/30">
              <div className="p-6 text-center">
                <div className="text-sm text-muted-foreground mb-2">TVA Déductible</div>
                <div className="text-3xl font-bold text-blue-400">{fmt(data.tva_deductible)}</div>
                <div className="text-xs text-muted-foreground mt-1">Sur achats</div>
              </div>
            </div>
            <div className="section-card" className={`border-2 ${data.tva_a_verser >= 0 ? 'border-amber-500/50' : 'border-green-500/50'}`}>
              <div className="p-6 text-center">
                <div className="text-sm text-muted-foreground mb-2">TVA à verser</div>
                <div className={`text-3xl font-bold ${data.tva_a_verser >= 0 ? 'text-amber-400' : 'text-green-400'}`}>
                  {fmt(data.tva_a_verser)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.tva_a_verser >= 0 ? 'À payer au Trésor Public' : 'Crédit de TVA'}
                </div>
              </div>
            </div>
          </div>

          {/* Detail tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="section-card overflow-hidden">
              <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📈 Détail TVA Collectée</h3></div>
              <div className="px-5 pb-5">
                {data.detail_collectee?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left p-2">Taux</th><th className="text-right p-2">Base HT</th><th className="text-right p-2">TVA</th></tr></thead>
                    <tbody>
                      {data.detail_collectee.map((d, i) => (
                        <tr key={i} className="border-b"><td className="p-2">{d.rate}%</td><td className="p-2 text-right">{fmt(d.base_ht)}</td><td className="p-2 text-right font-medium">{fmt(d.tva)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-sm text-muted-foreground">Aucune vente ce mois</p>}
              </div>
            </div>
            <div className="section-card overflow-hidden">
              <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📉 Détail TVA Déductible</h3></div>
              <div className="px-5 pb-5">
                {data.detail_deductible?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left p-2">Taux</th><th className="text-right p-2">Base HT</th><th className="text-right p-2">TVA</th></tr></thead>
                    <tbody>
                      {data.detail_deductible.map((d, i) => (
                        <tr key={i} className="border-b"><td className="p-2">{d.rate}%</td><td className="p-2 text-right">{fmt(d.base_ht)}</td><td className="p-2 text-right font-medium">{fmt(d.tva)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-sm text-muted-foreground">Aucun achat ce mois</p>}
              </div>
            </div>
          </div>
        </>
      ) : <EmptyState text="Erreur chargement TVA" />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// G. REPORTING
// ═══════════════════════════════════════════════════════════

function ReportingModule() {
  const [reportTab, setReportTab] = useState('pl');

  return (
    <div className="space-y-4 mt-4">
      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList>
          <TabsTrigger value="pl">📊 Compte de Résultat</TabsTrigger>
          <TabsTrigger value="clients">👥 Top Clients</TabsTrigger>
          <TabsTrigger value="services">🧹 Services</TabsTrigger>
          <TabsTrigger value="compare">📅 Comparaison</TabsTrigger>
        </TabsList>

        <TabsContent value="pl"><IncomeStatement /></TabsContent>
        <TabsContent value="clients"><TopClients /></TabsContent>
        <TabsContent value="services"><ServicesAnalysis /></TabsContent>
        <TabsContent value="compare"><PeriodComparison /></TabsContent>
      </Tabs>
    </div>
  );
}

function IncomeStatement() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = month ? { month } : {};
        const res = await axios.get(`${API}/reports/income-statement`, { params });
        setData(res.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [month]);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Erreur" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" placeholder="Toutes périodes" />
        {month && <Button size="sm" variant="ghost" onClick={() => setMonth('')}>Tout</Button>}
      </div>

      <div className="section-card" className="max-w-lg">
        <div className="px-5 pt-5 pb-3"><h3>📊 Compte de Résultat {month || '(global)'}</h3></div>
        <div className="space-y-3">
          <div className="flex justify-between py-2"><span>CA HT</span><span className="font-bold text-green-400">{fmt(data.ca_ht)}</span></div>
          <Separator />
          {data.charges_detail.map((c, i) => (
            <div key={i} className="flex justify-between py-1 text-sm pl-4">
              <span className="text-muted-foreground">- {c.category}</span>
              <span className="text-red-400">{fmt(c.ht)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 border-t"><span>Total Charges HT</span><span className="font-bold text-red-400">{fmt(data.charges_ht)}</span></div>
          <Separator />
          <div className="flex justify-between py-2 text-lg">
            <span className="font-bold">Résultat Brut</span>
            <span className={`font-bold ${data.resultat_brut >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(data.resultat_brut)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">- TVA à verser</span><span>{fmt(data.tva_a_verser)}</span></div>
          <Separator />
          <div className="flex justify-between py-2 text-xl">
            <span className="font-bold">Résultat Net</span>
            <span className={`font-bold ${data.resultat_net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(data.resultat_net)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopClients() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/reports/top-clients`).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Aucune donnée" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="section-card overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm">👥 Top Clients par CA</h3></div>
          <div className="px-5 pb-5">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr><th className="text-left p-2">Client</th><th className="text-right p-2">CA TTC</th><th className="text-right p-2">Factures</th><th className="text-right p-2">% CA</th></tr>
                </thead>
                <tbody>
                  {data.clients.map((c, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-medium">{c.client_name}</td>
                      <td className="p-2 text-right font-bold">{fmt(c.ca_ttc)}</td>
                      <td className="p-2 text-right">{c.invoices_count}</td>
                      <td className="p-2 text-right text-muted-foreground">{c.pct_ca}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="section-card overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📊 Répartition CA par client</h3></div>
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.clients} dataKey="ca_ttc" nameKey="client_name" cx="50%" cy="50%" outerRadius={100} label={({ client_name, pct_ca }) => `${client_name} (${pct_ca}%)`}>
                  {data.clients.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicesAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/reports/services-analysis`).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Aucune donnée" />;

  return (
    <div className="space-y-4">
      <div className="section-card overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h3 className="text-sm">🧹 Rentabilité par type de prestation</h3></div>
        <div className="px-5 pb-5">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Type prestation</th>
                  <th className="text-right p-3">CA TTC</th>
                  <th className="text-right p-3">Interventions</th>
                  <th className="text-right p-3">Moy / interv.</th>
                  <th className="text-right p-3">Marge %</th>
                  <th className="text-right p-3">Marge estimée</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3 font-medium">{s.type}</td>
                    <td className="p-3 text-right font-bold">{fmt(s.ca_ttc)}</td>
                    <td className="p-3 text-right">{s.count}</td>
                    <td className="p-3 text-right">{fmt(s.avg_per_intervention)}</td>
                    <td className="p-3 text-right">
                      <Badge variant="outline" className={s.margin_pct >= 50 ? 'text-green-400 border-green-500/30' : 'text-amber-400 border-amber-500/30'}>
                        {s.margin_pct}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-green-400">{fmt(s.margin_estimated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="section-card overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📊 CA par type de service</h3></div>
        <div className="px-5 pb-5">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.services}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="#666" />
              <YAxis tick={{ fontSize: 10 }} stroke="#666" />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
              <Bar dataKey="ca_ttc" name="CA TTC" radius={[4, 4, 0, 0]}>
                {data.services.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PeriodComparison() {
  const [data, setData] = useState(null);
  const [month1, setMonth1] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [month2, setMonth2] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/reports/period-comparison`, { params: { month1, month2 } })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month1, month2]);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Erreur" />;

  const chartData = [
    { name: 'CA HT', [data.period1.month]: data.period1.ca_ht, [data.period2.month]: data.period2.ca_ht },
    { name: 'Dépenses HT', [data.period1.month]: data.period1.expenses_ht, [data.period2.month]: data.period2.expenses_ht },
    { name: 'Bénéfice', [data.period1.month]: data.period1.benefice, [data.period2.month]: data.period2.benefice },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input type="month" value={month1} onChange={e => setMonth1(e.target.value)} className="w-48" />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Input type="month" value={month2} onChange={e => setMonth2(e.target.value)} className="w-48" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="section-card overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📅 Comparaison</h3></div>
          <div className="px-5 pb-5">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Indicateur</th>
                    <th className="text-right p-3">{data.period1.month}</th>
                    <th className="text-right p-3">{data.period2.month}</th>
                    <th className="text-right p-3">Variation</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['CA HT', data.period1.ca_ht, data.period2.ca_ht],
                    ['Dépenses HT', data.period1.expenses_ht, data.period2.expenses_ht],
                    ['Bénéfice', data.period1.benefice, data.period2.benefice],
                  ].map(([label, v1, v2], i) => {
                    const variation = v2 !== 0 ? ((v1 - v2) / Math.abs(v2)) * 100 : 0;
                    return (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{label}</td>
                        <td className="p-3 text-right">{fmt(v1)}</td>
                        <td className="p-3 text-right">{fmt(v2)}</td>
                        <td className={`p-3 text-right font-medium ${variation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmtPct(variation)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="section-card overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📊 Graphique comparatif</h3></div>
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#666" />
                <YAxis tick={{ fontSize: 10 }} stroke="#666" />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e1e2e', border: '1px solid #333' }} />
                <Legend />
                <Bar dataKey={data.period1.month} fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey={data.period2.month} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
      <FileText className="h-12 w-12 mb-3 opacity-30" />
      <p>{text}</p>
    </div>
  );
}
