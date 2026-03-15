import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, CreditCard, Clock, AlertTriangle, TrendingUp, FileText, Download, BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const COLORS = ['#8b5cf6','#60a5fa','#34d399','#f59e0b','#f43f5e','#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{background:'hsl(224,71%,8%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'10px 14px'}}>
        {label && <p style={{color:'#94a3b8',fontSize:'11px',marginBottom:'4px'}}>{label}</p>}
        <p style={{color:'#34d399',fontWeight:700,fontSize:'14px'}}>{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const FinancialDashboard = () => {
  const [stats, setStats] = useState({});
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/stats/financial?period=${period}`, { withCredentials: true });
      setStats(res.data || {});
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const kpis = [
    { title: 'Chiffre d\'affaires', value: formatCurrency(stats.total_revenue), icon: DollarSign, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    { title: 'En attente', value: formatCurrency(stats.total_pending), icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { title: 'En retard', value: formatCurrency(stats.total_overdue), icon: AlertTriangle, color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
    { title: 'Factures payées', value: stats.paid_count ?? 0, icon: CreditCard, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { title: 'En attente', value: stats.pending_count ?? 0, icon: FileText, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { title: 'Total factures', value: stats.total_invoices ?? 0, icon: TrendingUp, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  ];

  const serviceData = Object.entries(stats.revenue_by_service || {}).map(([name, value]) => ({ name, revenue: value }));

  if (loading) return (
    <div className="p-6 animate-fade-in">
      <div className="skeleton h-8 w-64 mb-6 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="financial-dashboard">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Finance</h1>
          </div>
          <p className="text-slate-500 text-sm">Vue d'ensemble de vos revenus et paiements</p>
        </div>
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="metric-card animate-fade-in" style={{animationDelay:`${i*50}ms`}}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:kpi.bg}}>
                <kpi.icon className="w-4 h-4" style={{color:kpi.color}} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{color:kpi.color,fontFamily:'Manrope,sans-serif'}}>{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue over time */}
        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Revenus par jour</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.revenue_by_day || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} width={40} tickFormatter={v => `${v}€`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} fill="url(#colorRevenue)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by service */}
        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Revenus par service</h3>
          {serviceData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-slate-600 text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={serviceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="#475569" style={{fontSize:'9px'}} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={40} />
                <YAxis stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} width={40} tickFormatter={v => `${v}€`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" radius={[6,6,0,0]} barSize={32}>
                  {serviceData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} opacity={0.8} />)}
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
                  <p className="font-bold text-sm text-slate-200">{formatCurrency(tx.amount)}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    tx.payment_status === 'paid' ? 'bg-green-500/15 text-green-400' :
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
