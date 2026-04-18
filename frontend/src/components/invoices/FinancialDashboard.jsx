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

const COLORS = ['#047857','#d97706','#c2410c','#44403c','#a8a29e','#14532d'];

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
      color: up ? '#047857' : '#c2410c',
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
      background: '#ffffff', border: '1px solid #e5e0d6',
      borderRadius: 8, padding: '10px 14px', minWidth: 140,
    }}>
      {label && <p style={{ color: '#78716c', fontSize: 11, marginBottom: 6 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#78716c', fontSize: 10 }}>{p.name}: </span>
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
      <p style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: 11, color: '#78716c', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      {subtitle && <p style={{ fontSize: 10, color: '#44403c', marginTop: 2 }}>{subtitle}</p>}
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
        <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>Entrées {fmt(income)}</span>
        <span style={{ fontSize: 12, color: '#c2410c', fontWeight: 600 }}>Sorties {fmt(expenses)}</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: '#f5f0e8', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${incomePct}%`, background: '#047857', borderRadius: '5px 0 0 5px', transition: 'width 0.5s' }} />
        <div style={{ flex: 1, background: '#c2410c', borderRadius: '0 5px 5px 0' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: '#78716c' }}>{incomePct}% encaissé</span>
        <span style={{ fontSize: 10, color: '#78716c' }}>{100 - incomePct}% en attente</span>
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
      icon: DollarSign, color: '#047857', bg: 'rgba(4,120,87,0.1)',
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
      icon: AlertTriangle, color: overduePct > 20 ? '#c2410c' : '#d97706', bg: 'rgba(194,65,12,0.1)',
      trend: stats.overdue_trend !== undefined ? -stats.overdue_trend : undefined,
      trendSuffix: '%',
      subtitle: `${fmt(totalOverdue)} en retard`,
    },
    {
      title: 'Valeur moyenne',
      value: fmt(avgValue),
      icon: TrendingUp, color: '#d97706', bg: 'rgba(217,119,6,0.1)',
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
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg transition-all text-sm font-medium">
            <Download className="w-4 h-4" /> PDF
          </a>
          <div className="flex gap-1 bg-neutral-100 border border-neutral-200 rounded-lg p-1" data-testid="period-selector">
            {['7d','30d','90d'].map(p => (
              <button key={p} data-testid={`period-${p}`} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p ? 'bg-brand-600 text-white' : 'text-neutral-500 hover:text-neutral-900'
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
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <span>💰</span> Flux de trésorerie
        </h3>
        <CashFlowBar income={totalRevenue} expenses={totalPending + totalOverdue} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue + Cumulative */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-1">Revenus par jour</h3>
          <p className="text-xs text-neutral-500 mb-4">Barres = journalier · Ligne = cumulatif</p>
          {composedData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-neutral-400 text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={composedData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#047857" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6" />
                <XAxis dataKey="date" stroke="#78716c" style={{fontSize:9}} tickLine={false} axisLine={false}
                  interval="preserveStartEnd" tickFormatter={v => v?.slice(5) || v} />
                <YAxis yAxisId="left" stroke="#78716c" style={{fontSize:9}} tickLine={false} axisLine={false}
                  width={38} tickFormatter={fmtShort} />
                <YAxis yAxisId="right" orientation="right" stroke="#78716c" style={{fontSize:9}} tickLine={false}
                  axisLine={false} width={42} tickFormatter={fmtShort} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize:10,color:'#78716c',paddingTop:8}} />
                <Bar yAxisId="left" dataKey="revenue" name="Journalier" fill="url(#revenueGrad)"
                  stroke="#047857" strokeWidth={1} radius={[4,4,0,0]} barSize={18} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulatif"
                  stroke="#d97706" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by service */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Revenus par service</h3>
          {serviceData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-neutral-400 text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={serviceData} margin={{ top: 4, right: 4, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6" />
                <XAxis dataKey="name" stroke="#78716c" style={{fontSize:9}} tickLine={false} axisLine={false}
                  angle={-20} textAnchor="end" height={44} interval={0} />
                <YAxis stroke="#78716c" style={{fontSize:9}} tickLine={false} axisLine={false}
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
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">Transactions récentes</h3>
        {(stats?.recent_transactions || []).length === 0 ? (
          <p className="text-neutral-400 text-center py-8 text-sm">Aucune transaction</p>
        ) : (
          <div className="space-y-2">
            {(stats?.recent_transactions || []).map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-all gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-neutral-500 truncate">{tx.transaction_id}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Facture: {tx.invoice_id}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm text-neutral-900 tabular-nums">{fmt(tx.amount)}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    tx.payment_status === 'paid'      ? 'bg-brand-50 text-brand-700' :
                    tx.payment_status === 'initiated' ? 'bg-amber-50 text-amber-700' :
                    'bg-terracotta-50 text-terracotta-700'
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
