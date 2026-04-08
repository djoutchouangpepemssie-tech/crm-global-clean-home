import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, CreditCard,
  AlertTriangle, FileText, Calculator, BookOpen, Banknote,
  Users, Package, Receipt, ClipboardList, Shield, Download,
  ArrowUpRight, ArrowDownRight, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// Sub-components
import JournalEntries from './enterprise/JournalEntries';
import ChartOfAccounts from './enterprise/ChartOfAccounts';
import BankReconciliation from './enterprise/BankReconciliation';
import ExpenseReports from './enterprise/ExpenseReports';
import PayrollModule from './enterprise/PayrollModule';
import TVAModule from './enterprise/TVAModule';
import ContractsModule from './enterprise/ContractsModule';
import CreditNotes from './enterprise/CreditNotes';
import StockAdvanced from './enterprise/StockAdvanced';
import ReportsModule from './enterprise/ReportsModule';
import AuditTrail from './enterprise/AuditTrail';

const PERIODS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '3 mois' },
  { value: '365d', label: '1 an' },
  { value: 'ytd', label: 'Année en cours' },
];

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function KPICard({ title, value, icon: Icon, trend, trendLabel, color = 'violet' }) {
  const colorMap = {
    violet: 'from-violet-500/10 to-violet-600/5 border-violet-500/20',
    green: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20',
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
  };
  const iconColorMap = {
    violet: 'text-violet-500', green: 'text-emerald-500', red: 'text-red-500',
    blue: 'text-blue-500', amber: 'text-amber-500',
  };

  return (
    <Card className={`bg-gradient-to-br ${colorMap[color]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
          <Icon className={`w-4 h-4 ${iconColorMap[color]}`} />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{Math.abs(trend)}% {trendLabel || ''}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertCard({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  
  const typeColors = {
    danger: 'border-red-500/30 bg-red-500/5 text-red-400',
    warning: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
    info: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Alertes ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className={`text-xs px-3 py-2 rounded-lg border ${typeColors[alert.type] || typeColors.info}`}>
            {alert.message}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AccountingEnterprise() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState('30d');
  const [dashboard, setDashboard] = useState(null);
  const [ratios, setRatios] = useState(null);
  const [loading, setLoading] = useState(true);

  const fmt = (n) => {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  };
  const pct = (n) => n !== null && n !== undefined ? `${n.toFixed(1)}%` : '—';

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, ratioRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/enterprise/dashboard/advanced?period=${period}`),
        axios.get(`${BACKEND_URL}/api/enterprise/reports/financial-ratios`),
      ]);
      setDashboard(dashRes.data);
      setRatios(ratioRes.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
  }, [activeTab, loadDashboard]);

  // Init chart of accounts on first load
  useEffect(() => {
    axios.post(`${BACKEND_URL}/api/enterprise/chart-of-accounts/init`).catch(() => {});
  }, []);

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      );
    }

    const kpis = dashboard?.kpis || {};
    const chart = dashboard?.monthly_chart || [];
    const alerts = dashboard?.alerts || [];
    const stats = dashboard?.stats || {};

    return (
      <div className="space-y-6">
        {/* Period selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dashboard Comptable</h2>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPICard title="Chiffre d'affaires" value={fmt(kpis.ca)} icon={TrendingUp} color="green" />
          <KPICard title="Charges" value={fmt(kpis.charges)} icon={TrendingDown} color="red" />
          <KPICard title="Résultat" value={fmt(kpis.resultat)} icon={DollarSign} color={kpis.resultat >= 0 ? 'green' : 'red'} />
          <KPICard title="Marge" value={pct(kpis.marge)} icon={BarChart3} color="violet" />
          <KPICard title="Trésorerie" value={fmt(kpis.tresorerie)} icon={Banknote} color="blue" />
        </div>

        {/* Charts + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue/Expenses Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Évolution CA / Charges (12 mois)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(v) => fmt(v)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#colorRev)" name="CA" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#colorExp)" name="Charges" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Alerts */}
          <div className="space-y-4">
            <AlertCard alerts={alerts} />
            
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Activité</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Écritures</span>
                  <Badge variant="secondary">{stats.total_entries || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Factures</span>
                  <Badge variant="secondary">{stats.total_invoices || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Devis</span>
                  <Badge variant="secondary">{stats.total_quotes || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Brouillons</span>
                  <Badge variant="outline" className="text-amber-500">{stats.draft_entries || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Financial Ratios */}
        {ratios && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Ratios Financiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Liquidité générale</div>
                  <div className="text-lg font-bold">{ratios.liquidite_generale?.toFixed(2) || '—'}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Solvabilité</div>
                  <div className="text-lg font-bold">{pct(ratios.solvabilite)}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Rentabilité nette</div>
                  <div className="text-lg font-bold">{pct(ratios.rentabilite_nette)}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">BFR</div>
                  <div className="text-lg font-bold">{fmt(ratios.besoin_fonds_roulement)}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Trésorerie nette</div>
                  <div className="text-lg font-bold">{fmt(ratios.tresorerie_nette)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profit Chart */}
        {chart.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rentabilité mensuelle</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    formatter={(v) => fmt(v)}
                  />
                  <Bar dataKey="profit" name="Résultat" radius={[4, 4, 0, 0]}>
                    {chart.map((entry, i) => (
                      <Cell key={i} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-500" />
          Comptabilité Enterprise
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Suite comptable professionnelle complète</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full md:min-w-0">
            <TabsTrigger value="dashboard" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />Dashboard</TabsTrigger>
            <TabsTrigger value="journal" className="text-xs gap-1"><BookOpen className="w-3 h-3" />Journal</TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs gap-1"><ClipboardList className="w-3 h-3" />Plan comptable</TabsTrigger>
            <TabsTrigger value="bank" className="text-xs gap-1"><CreditCard className="w-3 h-3" />Banque</TabsTrigger>
            <TabsTrigger value="tva" className="text-xs gap-1"><Calculator className="w-3 h-3" />TVA</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs gap-1"><Receipt className="w-3 h-3" />Notes de frais</TabsTrigger>
            <TabsTrigger value="payroll" className="text-xs gap-1"><Users className="w-3 h-3" />Paie</TabsTrigger>
            <TabsTrigger value="contracts" className="text-xs gap-1"><FileText className="w-3 h-3" />Contrats</TabsTrigger>
            <TabsTrigger value="credits" className="text-xs gap-1"><Banknote className="w-3 h-3" />Avoirs</TabsTrigger>
            <TabsTrigger value="stock" className="text-xs gap-1"><Package className="w-3 h-3" />Stock</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs gap-1"><Download className="w-3 h-3" />Rapports</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1"><Shield className="w-3 h-3" />Audit</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-4">{renderDashboard()}</TabsContent>
        <TabsContent value="journal" className="mt-4"><JournalEntries /></TabsContent>
        <TabsContent value="accounts" className="mt-4"><ChartOfAccounts /></TabsContent>
        <TabsContent value="bank" className="mt-4"><BankReconciliation /></TabsContent>
        <TabsContent value="tva" className="mt-4"><TVAModule /></TabsContent>
        <TabsContent value="expenses" className="mt-4"><ExpenseReports /></TabsContent>
        <TabsContent value="payroll" className="mt-4"><PayrollModule /></TabsContent>
        <TabsContent value="contracts" className="mt-4"><ContractsModule /></TabsContent>
        <TabsContent value="credits" className="mt-4"><CreditNotes /></TabsContent>
        <TabsContent value="stock" className="mt-4"><StockAdvanced /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsModule /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditTrail /></TabsContent>
      </Tabs>
    </div>
  );
}
