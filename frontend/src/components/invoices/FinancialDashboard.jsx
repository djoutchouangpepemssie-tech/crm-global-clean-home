import React, { useState } from 'react';
import { useFinancialStats } from '../../hooks/api';
import {
  ComposedChart, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Line, Legend,
} from 'recharts';
import { DollarSign, CreditCard, Clock, AlertTriangle, TrendingUp, TrendingDown, FileText, Download, BarChart3, Minus } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { PageHeader } from '../shared';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const COLORS = ['#8b5cf6','#60a5fa','#34d399','#f59e0b','#f43f5e','#06b6d4'];

// ── helpers ───────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);

const fmtShort = (v) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M€`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k€`;
  return `${v || 0}€`;
};

// ── Trend arrow ───────────────────────────────
function Trend({ value, suffix = '%' }) {
  if (value === undefined || value === null) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 600,
      color: up ? '#34d399' : '#f43f5e',
    }}>
      <Icon style={{ width: 11, height: 11 }} />
      {up ? '+' : ''}{value}{suffix}
    </span>
  );
}

// ── Custom tooltip ────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: '10px 14px', minWidth: 140,
    }}>
      {label && <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#94a3b8', fontSize: 10 }}>{p.name}: </span>
          <span style={{ color: p.color, fontWeight: 700, fontSize: 12 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── KPI Card ──────────────────────────────────
function KpiCard({ title, value, icon: Icon, color, bg, trend, trendSuffix, subtitle, delay = 0 }) {
  return (
    <div className="metric-card animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
        {trend !== undefined && <Trend value={trend} suffix={trendSuffix} />}
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'Manrope,sans-serif', lineHeight: 1.2 }}>{value}</p>
      <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{title}</p>
      {subtitle && <p style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>{subtitle}</p>}
    </div>
  );
}

// ── Cash Flow bar ─────────────────────────────
function CashFlowBar({ income, expenses }) {
  const total = (income || 0) + (expenses || 0);
  if (!total) return null;
  const incomePct = Math.round(((income || 0) / total) * 100);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>Entrées {fmt(income)}</span>
        <span style={{ fontSize: 12, color: '#f43f5e', fontWeight: 600 }}>Sorties {fmt(expenses)}</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${incomePct}%`, background: '#34d399', borderRadius: '5px 0 0 5px', transition: 'width 0.5s' }} />
        <div style={{ flex: 1, background: '#f43f5e', borderRadius: '0 5px 5px 0' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: '#64748b' }}>{incomePct}% encaissé</span>
        <span style={{ fontSize: 10, color: '#64748b' }}>{100 - incomePct}% en attente</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────
const FinancialDashboard = () => {
  const [period, setPeriod] = useState('30d');

  // Vague 4 : React Query — le dashboard financier se met à jour automatiquement
  // quand un paiement est enregistré, une facture est créée/modifiée, etc.
  // grâce à l'invalidation croisée de useRecordPayment, useCreateInvoice, etc.
  const { data: stats = {}, isLoading: loading, refetch } = useFinancialStats(period);

  // Build cumulative revenue data
  const revenueByDay = stats.revenue_by_day || [];
  let cumulative = 0;
  const composedData = revenueByDay.map(d => {
    cumulative += (d.revenue || 0);
    return { ...d, cumulative };
  });

  const serviceData = Object.entries(stats.revenue_by_service || {}).map(([name, value]) => ({ name, revenue: value }));

  // KPI values
  const totalRevenue  = stats.total_revenue || 0;
  const totalPending  = stats.total_pending || 0;
  const totalOverdue  = stats.total_overdue || 0;
  const totalInvoices = stats.total_invoices || 0;
  const paidCount     = stats.paid_count || 0;
  const overduePct    = totalInvoices > 0 ? Math.round(((stats.overdue_count || 0) / totalInvoices) * 100) : 0;
  const avgValue      = paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0;

  const kpis = [
    {
      title: 'Chiffre d\'affaires',
      value: fmt(totalRevenue),
      icon: DollarSign, color: '#34d399', bg: 'rgba(52,211,153,0.1)',
      trend: stats.revenue_trend, trendSuffix: '%',
      subtitle: `${paidCount} factures payées`,
    },
    {
      title: 'En attente',
      value: fmt(totalPending),
      icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
      subtitle: `${stats.pending_count || 0} factures`,
    },
    {
      title: 'Taux de retard',
      value: `${overduePct}%`,
      icon: AlertTriangle, color: overduePct > 20 ? '#f43f5e' : '#f59e0b', bg: 'rgba(244,63,94,0.1)',
      trend: stats.overdue_trend !== undefined ? -stats.overdue_trend : undefined,
      trendSuffix: '%',
      subtitle: `${fmt(totalOverdue)} en retard`,
    },
    {
      title: 'Valeur moyenne',
      value: fmt(avgValue),
      icon: TrendingUp, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',
      trend: stats.avg_trend, trendSuffix: '%',
      subtitle: 'par facture payée',
    },
  ];

  if (loading) return (
    <div className="p-6 animate-fade-in">
      <div className="skeleton h-8 w-64 mb-6 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="financial-dashboard">

      <PageHeader title="Finance" subtitle="Tableau de bord financier" />

      {/* Actions */}
      <div className="flex justify-end -mt-4 mb-4">
        <div className="flex items-center gap-2">
          <a href={`${API_URL}/exports/financial/pdf?period=${period}`} data-testid="export-financial-pdf"
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg transition-all text-sm font-medium">
            <Download className="w-4 h-4" /> PDF
          </a>
          <div className="flex gap-1 bg-white/5 border border-white/5 rounded-lg p-1" data-testid="period-selector">
            {['7d','30d','90d'].map(p => (
              <button key={p} data-testid={`period-${p}`} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {p === '7d' ? '7j' : p === '30d' ? '30j' : '90j'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => <KpiCard key={i} {...kpi} delay={i * 50} />)}
      </div>

      {/* Cash Flow */}
      <div className="section-card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>💰</span> Flux de trésorerie
        </h3>
        <CashFlowBar income={totalRevenue} expenses={totalPending + totalOverdue} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue + Cumulative */}
        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Revenus par jour</h3>
          <p className="text-xs text-slate-600 mb-4">Barres = journalier · Ligne = cumulatif</p>
          {composedData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-slate-600 text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={composedData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default, rgba(0,0,0,0.06))" />
                <XAxis dataKey="date" stroke="#475569" style={{fontSize:9}} tickLine={false} axisLine={false}
                  interval="preserveStartEnd" tickFormatter={v => v?.slice(5) || v} />
                <YAxis yAxisId="left" stroke="#475569" style={{fontSize:9}} tickLine={false} axisLine={false}
                  width={38} tickFormatter={fmtShort} />
                <YAxis yAxisId="right" orientation="right" stroke="#475569" style={{fontSize:9}} tickLine={false}
                  axisLine={false} width={42} tickFormatter={fmtShort} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize:10,color:'#64748b',paddingTop:8}} />
                <Bar yAxisId="left" dataKey="revenue" name="Journalier" fill="url(#revenueGrad)"
                  stroke="#8b5cf6" strokeWidth={1} radius={[4,4,0,0]} barSize={18} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulatif"
                  stroke="#34d399" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by service */}
        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Revenus par service</h3>
          {serviceData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-slate-600 text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={serviceData} margin={{ top: 4, right: 4, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default, rgba(0,0,0,0.06))" />
                <XAxis dataKey="name" stroke="#475569" style={{fontSize:9}} tickLine={false} axisLine={false}
                  angle={-20} textAnchor="end" height={44} interval={0} />
                <YAxis stroke="#475569" style={{fontSize:9}} tickLine={false} axisLine={false}
                  width={38} tickFormatter={fmtShort} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenus" radius={[6,6,0,0]} barSize={32}>
                  {serviceData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} opacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="section-card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Transactions récentes</h3>
        {(stats?.recent_transactions || []).length === 0 ? (
          <p className="text-slate-600 text-center py-8 text-sm">Aucune transaction</p>
        ) : (
          <div className="space-y-2">
            {(stats?.recent_transactions || []).map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/3 hover:bg-white/5 rounded-lg transition-all gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-400 truncate">{tx.transaction_id}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Facture: {tx.invoice_id}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm text-slate-200">{fmt(tx.amount)}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    tx.payment_status === 'paid'      ? 'bg-green-500/15 text-green-400' :
                    tx.payment_status === 'initiated' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {tx.payment_status === 'paid' ? 'Payé' : tx.payment_status === 'initiated' ? 'Initié' : tx.payment_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDashboard;
