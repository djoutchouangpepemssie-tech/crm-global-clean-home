import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Eye, MousePointer, FileText, TrendingUp, Globe, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const COLORS = ['#8b5cf6', '#60a5fa', '#34d399', '#f59e0b', '#f43f5e', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{background:'hsl(224,71%,8%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'10px 14px'}}>
        {label && <p style={{color:'#94a3b8',fontSize:'11px',marginBottom:'4px'}}>{label}</p>}
        <p style={{color:'#a78bfa',fontWeight:700,fontSize:'14px'}}>{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [stats, setStats] = useState({});
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/tracking/stats?period=${period}`, { withCredentials: true });
      setStats(res.data || {});
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const kpis = [
    { title: 'Visiteurs uniques', value: stats?.total_visitors ?? 0, icon: Users, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { title: 'Pages vues', value: stats?.total_page_views ?? 0, icon: Eye, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { title: 'Clics CTA', value: stats?.total_cta_clicks ?? 0, icon: MousePointer, color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
    { title: 'Formulaires', value: stats?.total_form_submits ?? 0, icon: FileText, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    { title: 'Taux conversion', value: `${stats?.conversion_rate ?? 0}%`, icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { title: 'Sessions', value: stats?.total_sessions ?? 0, icon: Globe, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  ];

  const sourceData = Object.entries(stats?.sources || {}).map(([name, value]) => ({ name, value }));
  const deviceData = Object.entries(stats?.devices || {}).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  const visitors = stats?.funnel?.visitors || 0;

  const funnelSteps = [
    { label: 'Visiteurs', value: visitors, color: '#60a5fa', pct: 100 },
    { label: 'Clics CTA', value: stats?.funnel?.cta_clicks || 0, color: '#a78bfa', pct: visitors > 0 ? ((stats?.funnel?.cta_clicks || 0) / visitors) * 100 : 0 },
    { label: 'Formulaires', value: stats?.funnel?.form_submits || 0, color: '#34d399', pct: visitors > 0 ? ((stats?.funnel?.form_submits || 0) / visitors) * 100 : 0 },
  ];

  if (loading) return (
    <div className="p-6 animate-fade-in">
      <div className="skeleton h-8 w-48 mb-6 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="analytics-page">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Analytics</h1>
          </div>
          <p className="text-slate-500 text-sm">Comportement des visiteurs sur votre site</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStats} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex gap-1 bg-white/5 border border-white/5 rounded-lg p-1">
            {[
              { key: '1d', label: "Auj." },
              { key: '7d', label: '7j' },
              { key: '30d', label: '30j' },
            ].map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.key ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {p.label}
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
            <p className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="section-card p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Entonnoir de conversion</h2>
        <div className="space-y-3">
          {funnelSteps.map((step, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-400">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{step.pct.toFixed(1)}%</span>
                  <span className="text-xs font-bold text-slate-200">{step.value}</span>
                </div>
              </div>
              <div className="h-5 rounded-lg overflow-hidden bg-white/5">
                <div className="h-full rounded-lg transition-all duration-700"
                  style={{width: `${Math.max(step.pct, 2)}%`, background: step.color, opacity: 0.8}} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sources */}
        <div className="section-card p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Sources de trafic</h2>
          {sourceData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Aucune donnée</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} opacity={0.85} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {sourceData.map((s, idx) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{background:COLORS[idx%COLORS.length]}} />
                      <span className="text-slate-400">{s.name}</span>
                    </div>
                    <span className="font-semibold text-slate-200">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Devices */}
        <div className="section-card p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Appareils</h2>
          {deviceData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deviceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="#475569" style={{fontSize:'11px'}} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" style={{fontSize:'11px'}} width={25} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6,6,0,0]} barSize={40}>
                  {deviceData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} opacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top pages */}
      <div className="section-card p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Pages les plus visitées</h2>
        <div className="space-y-2">
          {(stats?.top_pages || []).length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-6">Aucune donnée de page</p>
          ) : (stats?.top_pages || []).slice(0, 10).map((page, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/3 hover:bg-white/5 transition-all">
              <span className="text-xs font-bold text-slate-600 w-5 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-300 truncate">{page.url}</p>
                  <span className="text-xs font-bold text-violet-400 flex-shrink-0">{page.views}</span>
                </div>
                <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500/50" 
                    style={{width:`${((page.views / (stats?.top_pages?.[0]?.views || 1)) * 100)}%`}} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tracking script */}
      <div className="section-card p-5" style={{borderColor:'rgba(139,92,246,0.2)'}}>
        <h2 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <Globe className="w-4 h-4 text-violet-400" /> Installation du tracker
        </h2>
        <p className="text-xs text-slate-500 mb-3">Ajoutez ce script sur votre site avant &lt;/body&gt; :</p>
        <div className="p-3 rounded-lg bg-black/30 border border-white/5 font-mono text-xs text-green-400 overflow-x-auto">
          {`<script src="${BACKEND_URL}/tracking.js"></script>`}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
