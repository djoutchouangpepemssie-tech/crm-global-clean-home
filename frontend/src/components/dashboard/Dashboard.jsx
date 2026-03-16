import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { apiCache } from '../../lib/apiCache.js';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserPlus, Trophy, FileText, Target, CheckSquare, TrendingUp, Star, ArrowUpRight, RefreshCw, Sparkles } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDateTime } from '../../lib/utils';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const CHART_COLORS = ['#8b5cf6', '#60a5fa', '#34d399', '#f59e0b', '#f43f5e', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{background:'hsl(224,71%,8%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'10px 14px'}}>
        <p style={{color:'#94a3b8',fontSize:'11px',marginBottom:'4px'}}>{label}</p>
        <p style={{color:'#a78bfa',fontWeight:700,fontSize:'14px'}}>{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (force = false) => {
    const cacheKey = `dashboard_${period}`;
    if (!force) {
      const cached = apiCache.get(cacheKey);
      if (cached) { setStats(cached); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/stats/dashboard?period=${period}`, { withCredentials: true });
      apiCache.set(cacheKey, response.data);
      setStats(response.data || {});
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [period]);

  const kpis = [
    { title: 'Total leads', value: stats.total_leads ?? 0, icon: Users, color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', trend: null },
    { title: 'Nouveaux leads', value: stats.new_leads ?? 0, icon: UserPlus, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', trend: '+' + (stats.new_leads ?? 0) },
    { title: 'Leads gagnés', value: stats.won_leads ?? 0, icon: Trophy, color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', trend: null },
    { title: 'Devis envoyés', value: stats.sent_quotes ?? 0, icon: FileText, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', trend: null },
    { title: 'Taux conversion', value: `${stats.conversion_lead_to_quote ?? 0}%`, icon: Target, color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', trend: null },
    { title: 'Tâches en cours', value: stats.pending_tasks ?? 0, icon: CheckSquare, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', trend: null },
    { title: 'Score moyen', value: stats.avg_lead_score ?? 0, icon: Star, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', trend: null },
    { title: 'Meilleure source', value: stats.best_source?.name || '-', icon: TrendingUp, color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', trend: null },
  ];

  const sourceData = Object.entries(stats.leads_by_source || {}).map(([name, value]) => ({ name: name || 'Inconnu', value }));
  const serviceData = Object.entries(stats.leads_by_service || {}).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="dashboard-page">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>
              Tableau de bord
            </h1>
          </div>
          <p className="text-slate-500 text-sm">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all border border-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex gap-1 bg-white/5 rounded-lg border border-white/5 p-1" data-testid="period-selector">
            {[
              { key: '1d', label: "Auj." },
              { key: '7d', label: '7j' },
              { key: '30d', label: '30j' },
            ].map(p => (
              <button
                key={p.key}
                data-testid={`period-${p.key}`}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.key
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-grid">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="metric-card animate-fade-in" style={{animationDelay: `${idx * 50}ms`}}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background: kpi.bg, border: `1px solid ${kpi.border}`}}>
                <kpi.icon className="w-4 h-4" style={{color: kpi.color}} />
              </div>
              {kpi.trend && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ArrowUpRight className="w-3 h-3" />
                  {kpi.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-100 tracking-tight" style={{fontFamily:'Manrope,sans-serif'}}>{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads over time */}
        <div className="lg:col-span-2 section-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Évolution des leads</h3>
            <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-md">{period}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.leads_by_day || []}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorLeads)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sources */}
        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Sources</h3>
          {sourceData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-slate-600 text-sm">Aucune donnée</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={65} innerRadius={38} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, 'Leads']} contentStyle={{background:'hsl(224,71%,8%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',fontSize:'12px'}} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {sourceData.slice(0,4).map((s, idx) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]}} />
                      <span className="text-slate-400 truncate">{s.name}</span>
                    </div>
                    <span className="font-semibold text-slate-200">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Services */}
        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Leads par service</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{background:'hsl(224,71%,8%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',fontSize:'12px'}} />
              <Bar dataKey="value" radius={[0,6,6,0]} barSize={16}>
                {serviceData.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Leads */}
        <div className="section-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Leads récents</h3>
            <button onClick={() => navigate('/leads')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {(stats.recent_leads || []).slice(0, 6).map((lead) => (
              <div
                key={lead.lead_id}
                data-testid={`recent-lead-${lead.lead_id}`}
                onClick={() => navigate(`/leads/${lead.lead_id}`)}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer group border border-transparent hover:border-white/10"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm flex-shrink-0">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate group-hover:text-slate-100">{lead.name}</p>
                  <p className="text-xs text-slate-500 truncate">{lead.service_type}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <LeadScoreBadge score={lead.score || 50} />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(lead.status)}`}>
                    {getStatusLabel(lead.status)}
                  </span>
                </div>
              </div>
            ))}
            {(!stats.recent_leads || stats.recent_leads.length === 0) && (
              <div className="text-center py-8 text-slate-600 text-sm">Aucun lead récent</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
