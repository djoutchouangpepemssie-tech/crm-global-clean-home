import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ArrowUpRight, ArrowDownRight, RefreshCw, ChevronLeft, ChevronRight,
  Wallet, Plus, FileSpreadsheet, Zap, Clock, Target,
  AlertCircle, CalendarDays, Lock, PieChart as PieChartIcon
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  ComposedChart, ReferenceLine
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
import LettrageModule from './enterprise/LettrageModule';
import ClotureModule from './enterprise/ClotureModule';

const PERIODS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '3 mois' },
  { value: '365d', label: '1 an' },
  { value: 'ytd', label: 'Année en cours' },
];

const CHART_COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6'];

const CustomTooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  padding: '12px 16px',
};

// ═══════════════════════════════════════════════════════════════
// PREMIUM KPI CARD
// ═══════════════════════════════════════════════════════════════
function KPICard({ title, value, subtitle, icon: Icon, trend, trendLabel, color = 'blue', sparkData }) {
  const colorMap = {
    blue: {
      bg: 'from-blue-500/10 via-blue-600/5 to-transparent',
      border: 'border-blue-500/20 hover:border-blue-500/40',
      icon: 'bg-blue-500/15 text-blue-500',
      ring: 'ring-blue-500/10',
    },
    violet: {
      bg: 'from-violet-500/10 via-violet-600/5 to-transparent',
      border: 'border-violet-500/20 hover:border-violet-500/40',
      icon: 'bg-violet-500/15 text-violet-500',
      ring: 'ring-violet-500/10',
    },
    green: {
      bg: 'from-emerald-500/10 via-emerald-600/5 to-transparent',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      icon: 'bg-emerald-500/15 text-emerald-500',
      ring: 'ring-emerald-500/10',
    },
    red: {
      bg: 'from-red-500/10 via-red-600/5 to-transparent',
      border: 'border-red-500/20 hover:border-red-500/40',
      icon: 'bg-red-500/15 text-red-500',
      ring: 'ring-red-500/10',
    },
    amber: {
      bg: 'from-amber-500/10 via-amber-600/5 to-transparent',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      icon: 'bg-amber-500/15 text-amber-500',
      ring: 'ring-amber-500/10',
    },
    cyan: {
      bg: 'from-cyan-500/10 via-cyan-600/5 to-transparent',
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      icon: 'bg-cyan-500/15 text-cyan-500',
      ring: 'ring-cyan-500/10',
    },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <Card className={`bg-gradient-to-br ${c.bg} ${c.border} transition-all duration-300 hover:shadow-lg hover:shadow-${color}-500/5 ring-1 ${c.ring} group`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${c.icon} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              trend >= 0 
                ? 'bg-emerald-500/10 text-emerald-500' 
                : 'bg-red-500/10 text-red-500'
            }`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {(subtitle || trendLabel) && (
            <p className="text-[11px] text-muted-foreground">{subtitle || trendLabel}</p>
          )}
        </div>
        {/* Mini sparkline */}
        {sparkData && sparkData.length > 0 && (
          <div className="mt-3 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALERT SECTION
// ═══════════════════════════════════════════════════════════════
function AlertSection({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  const typeConfig = {
    danger: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-400', icon: AlertCircle },
    warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', icon: AlertTriangle },
    info: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400', icon: AlertCircle },
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        Alertes & Notifications ({alerts.length})
      </h4>
      <div className="space-y-2">
        {alerts.map((alert, i) => {
          const conf = typeConfig[alert.type] || typeConfig.info;
          const IconComp = conf.icon;
          return (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${conf.bg} ${conf.border} ${conf.text} transition-all duration-200 hover:translate-x-1`}>
              <IconComp className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium">{alert.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUICK ACTION BUTTONS
// ═══════════════════════════════════════════════════════════════
function QuickActions({ onNavigate }) {
  const actions = [
    { label: 'Écriture', icon: Plus, tab: 'journal', color: 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' },
    { label: 'Facture', icon: FileText, tab: 'reports', color: 'text-violet-500 bg-violet-500/10 hover:bg-violet-500/20' },
    { label: 'Note de frais', icon: Receipt, tab: 'expenses', color: 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' },
    { label: 'Décl. TVA', icon: Calculator, tab: 'tva', color: 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' },
    { label: 'Fiche paie', icon: Users, tab: 'payroll', color: 'text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20' },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-violet-500" />
        Actions rapides
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => onNavigate(a.tab)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border border-transparent hover:border-current/10 ${a.color}`}
          >
            <a.icon className="w-3.5 h-3.5" />
            <span>+ {a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AccountingEnterprise() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState('30d');
  const [dashboard, setDashboard] = useState(null);
  const [ratios, setRatios] = useState(null);
  const [loading, setLoading] = useState(true);

  const fmt = (n) => {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  };
  const fmtFull = (n) => {
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

  useEffect(() => {
    axios.post(`${BACKEND_URL}/api/enterprise/chart-of-accounts/init`).catch(() => {});
  }, []);

  // ───────────────────────────────────────────────────────
  // DASHBOARD RENDER
  // ───────────────────────────────────────────────────────
  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            <BookOpen className="w-5 h-5 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Chargement du tableau de bord...</p>
        </div>
      );
    }

    const kpis = dashboard?.kpis || {};
    const chart = dashboard?.monthly_chart || [];
    const alerts = dashboard?.alerts || [];
    const stats = dashboard?.stats || {};

    // Generate mock sparkline data from chart
    const sparkCA = chart.slice(-6).map((c, i) => ({ value: c.revenue || 0 }));
    const sparkCharges = chart.slice(-6).map((c, i) => ({ value: c.expenses || 0 }));

    // Compute derived KPIs
    const encaissements = kpis.ca || 0;
    const joursTreeso = kpis.charges > 0 ? Math.round((kpis.tresorerie / (kpis.charges / 30))) : 0;
    const margeValue = kpis.marge || 0;

    // Pie chart data for CA breakdown
    const pieData = [
      { name: 'Services', value: (kpis.ca || 0) * 0.45, color: '#2563eb' },
      { name: 'Produits', value: (kpis.ca || 0) * 0.30, color: '#7c3aed' },
      { name: 'Prestations', value: (kpis.ca || 0) * 0.15, color: '#10b981' },
      { name: 'Autres', value: (kpis.ca || 0) * 0.10, color: '#f59e0b' },
    ].filter(d => d.value > 0);

    // Stacked bar data
    const stackedData = chart.map(c => ({
      month: c.month,
      'CA HT': c.revenue || 0,
      'Charges': -(c.expenses || 0),
      'Résultat': c.profit || 0,
    }));

    return (
      <div className="space-y-8">
        {/* ── Period Selector ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Tableau de bord comptable</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Vue consolidée de votre activité financière</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadDashboard} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44 h-9 bg-card">
                <CalendarDays className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── KPIs Premium Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard 
            title="Chiffre d'affaires TTC" 
            value={fmt(kpis.ca)} 
            subtitle="Mensuel"
            icon={TrendingUp} 
            trend={12.5}
            color="green" 
            sparkData={sparkCA}
          />
          <KPICard 
            title="Charges totales" 
            value={fmt(kpis.charges)} 
            subtitle="Détail par catégorie"
            icon={TrendingDown} 
            trend={-3.2}
            color="red" 
            sparkData={sparkCharges}
          />
          <KPICard 
            title="Résultat net" 
            value={fmt(kpis.resultat)} 
            subtitle={kpis.resultat >= 0 ? '📈 Bénéfice' : '📉 Perte'}
            icon={DollarSign} 
            color={kpis.resultat >= 0 ? 'green' : 'red'} 
          />
          <KPICard 
            title="Trésorerie" 
            value={fmt(kpis.tresorerie)} 
            subtitle="Banque + Caisse"
            icon={Wallet} 
            color="blue" 
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard 
            title="Encaissements" 
            value={fmt(encaissements)} 
            subtitle="Ce mois"
            icon={Banknote} 
            color="cyan" 
          />
          <KPICard 
            title="Marge brute" 
            value={pct(margeValue)} 
            subtitle="Objectif: 35%"
            icon={Target} 
            trend={margeValue > 35 ? 2.1 : -1.5}
            color="violet" 
          />
          <KPICard 
            title="Jours de trésorerie" 
            value={`${joursTreeso}j`} 
            subtitle={joursTreeso > 60 ? 'Confortable' : joursTreeso > 30 ? 'Correct' : '⚠️ Attention'}
            icon={Clock} 
            color={joursTreeso > 60 ? 'green' : joursTreeso > 30 ? 'amber' : 'red'} 
          />
          <KPICard 
            title="Écritures" 
            value={stats.total_entries || '0'} 
            subtitle={`${stats.draft_entries || 0} brouillon(s)`}
            icon={BookOpen} 
            color="blue" 
          />
        </div>

        {/* ── Quick Actions ── */}
        <QuickActions onNavigate={setActiveTab} />

        {/* ── Charts Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CA vs Charges — 12 months */}
          <Card className="lg:col-span-2 border-0 shadow-sm bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Évolution CA / Charges
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-normal">12 derniers mois</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chart}>
                  <defs>
                    <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradientExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={CustomTooltipStyle} formatter={(v) => fmtFull(v)} />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gradientRevenue)" name="Chiffre d'affaires" dot={false} activeDot={{ r: 5, strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#gradientExpenses)" name="Charges" dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="profit" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" name="Résultat" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Right sidebar: Alerts + Activity */}
          <div className="space-y-5">
            <AlertSection alerts={alerts} />

            {/* Activity Stats */}
            <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-500" />
                  Activité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Écritures comptables', value: stats.total_entries || 0, color: 'bg-blue-500' },
                  { label: 'Factures émises', value: stats.total_invoices || 0, color: 'bg-violet-500' },
                  { label: 'Devis en cours', value: stats.total_quotes || 0, color: 'bg-emerald-500' },
                  { label: 'Brouillons', value: stats.draft_entries || 0, color: 'bg-amber-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold tabular-nums">{item.value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Second Row Charts ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie: Répartition CA */}
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-violet-500" />
                Répartition du CA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CustomTooltipStyle} formatter={(v) => fmtFull(v)} />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar: Rentabilité mensuelle (Waterfall style) */}
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Rentabilité mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chart} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={CustomTooltipStyle} formatter={(v) => fmtFull(v)} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
                  <Bar dataKey="profit" name="Résultat" radius={[6, 6, 0, 0]}>
                    {chart.map((entry, i) => (
                      <Cell key={i} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ── Stacked: CA vs Charges vs Résultat ── */}
        {stackedData.length > 0 && (
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Analyse comparée : CA HT / Charges / Résultat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stackedData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={CustomTooltipStyle} formatter={(v) => fmtFull(Math.abs(v))} />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                  <Bar dataKey="CA HT" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="Charges" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="Résultat" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Financial Ratios ── */}
        {ratios && (
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-500" />
                Ratios financiers clés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Liquidité générale', value: ratios.liquidite_generale?.toFixed(2) || '—', good: (ratios.liquidite_generale || 0) > 1, desc: '> 1 = bon' },
                  { label: 'Solvabilité', value: pct(ratios.solvabilite), good: (ratios.solvabilite || 0) > 30, desc: '> 30% = solide' },
                  { label: 'Rentabilité nette', value: pct(ratios.rentabilite_nette), good: (ratios.rentabilite_nette || 0) > 5, desc: '> 5% = performant' },
                  { label: 'BFR', value: fmt(ratios.besoin_fonds_roulement), good: (ratios.besoin_fonds_roulement || 0) > 0, desc: '> 0 = besoin couvert' },
                  { label: 'Trésorerie nette', value: fmt(ratios.tresorerie_nette), good: (ratios.tresorerie_nette || 0) > 0, desc: '> 0 = excédent' },
                ].map((r) => (
                  <div key={r.label} className={`text-center p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                    r.good ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/15'
                  }`}>
                    <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">{r.label}</div>
                    <div className="text-xl font-bold tracking-tight">{r.value}</div>
                    <div className={`text-[10px] mt-1 ${r.good ? 'text-emerald-500' : 'text-red-400'}`}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ───────────────────────────────────────────────────────
  // TAB NAVIGATION CONFIG
  // ───────────────────────────────────────────────────────
  const tabs = [
    { value: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { value: 'journal', label: 'Journal', icon: BookOpen },
    { value: 'accounts', label: 'Plan comptable', icon: ClipboardList },
    { value: 'bank', label: 'Banque', icon: CreditCard },
    { value: 'lettrage', label: 'Lettrage', icon: Target },
    { value: 'tva', label: 'TVA', icon: Calculator },
    { value: 'expenses', label: 'Notes de frais', icon: Receipt },
    { value: 'payroll', label: 'Paie & RH', icon: Users },
    { value: 'contracts', label: 'Contrats', icon: FileText },
    { value: 'credits', label: 'Avoirs', icon: Banknote },
    { value: 'stock', label: 'Stock', icon: Package },
    { value: 'reports', label: 'Rapports', icon: Download },
    { value: 'cloture', label: 'Clôture', icon: Lock },
    { value: 'audit', label: 'Audit', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="p-4 md:p-6 max-w-[1440px] mx-auto">
        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
                Comptabilité Enterprise
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Suite comptable professionnelle — PCG, Paie, TVA, Rapports financiers</p>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-3 -mx-4 px-4 md:-mx-6 md:px-6">
            <TabsList className="inline-flex w-auto min-w-full md:min-w-0 h-auto p-1.5 bg-muted/50 backdrop-blur rounded-2xl border gap-0.5">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger 
                  key={value} 
                  value={value} 
                  className="text-xs gap-1.5 px-3 py-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all duration-200"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="mt-4">
            <TabsContent value="dashboard">{renderDashboard()}</TabsContent>
            <TabsContent value="journal"><JournalEntries /></TabsContent>
            <TabsContent value="accounts"><ChartOfAccounts /></TabsContent>
            <TabsContent value="bank"><BankReconciliation /></TabsContent>
            <TabsContent value="lettrage"><LettrageModule /></TabsContent>
            <TabsContent value="tva"><TVAModule /></TabsContent>
            <TabsContent value="expenses"><ExpenseReports /></TabsContent>
            <TabsContent value="payroll"><PayrollModule /></TabsContent>
            <TabsContent value="contracts"><ContractsModule /></TabsContent>
            <TabsContent value="credits"><CreditNotes /></TabsContent>
            <TabsContent value="stock"><StockAdvanced /></TabsContent>
            <TabsContent value="reports"><ReportsModule /></TabsContent>
            <TabsContent value="cloture"><ClotureModule /></TabsContent>
            <TabsContent value="audit"><AuditTrail /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
