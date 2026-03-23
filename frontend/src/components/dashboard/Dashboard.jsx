import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { apiCache } from '../../lib/apiCache.js';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  Users, UserPlus, Trophy, FileText, Target, CheckSquare,
  TrendingUp, Star, ArrowUpRight, RefreshCw, Sparkles,
  Euro, Calendar, AlertCircle, Clock, MapPin, Phone,
  Zap, Award, BarChart2, Activity, ChevronRight
} from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDateTime } from '../../lib/utils';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import AIInsights from './AIInsights';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const COLORS = ['#8b5cf6','#60a5fa','#34d399','#f59e0b','#f43f5e','#06b6d4','#ec4899','#a78bfa'];

const Tooltip_ = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 14px',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
      <p style={{color:'#94a3b8',fontSize:11,marginBottom:4}}>{label}</p>
      <p style={{color:'#a78bfa',fontWeight:700,fontSize:15}}>{payload[0].value}</p>
    </div>
  );
};

// KPI Card premium
const KpiCard = ({ title, value, icon: Icon, color, bg, border, trend, trendLabel, subtitle, onClick, delay=0 }) => (
  <div
    className="metric-card animate-fade-in cursor-pointer hover:scale-[1.02] transition-transform"
    style={{animationDelay:`${delay}ms`, ...(onClick ? {cursor:'pointer'} : {})}}
    onClick={onClick}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:bg, border:`1px solid ${border}`}}>
        <Icon className="w-5 h-5" style={{color}} />
      </div>
      {trend !== null && trend !== undefined && (
        <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          trend >= 0
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : 'text-red-400 bg-red-500/10 border-red-500/20'
        }`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-black text-slate-100 tracking-tight" style={{fontFamily:'Manrope,sans-serif'}}>{value}</p>
    <p className="text-xs font-semibold text-slate-400 mt-0.5">{title}</p>
    {subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
    {trendLabel && <p className="text-[10px] text-emerald-500 mt-0.5">{trendLabel}</p>}
  </div>
);

// Badge statut
const StatusBadge = ({ status }) => {
  const colors = {
    nouveau: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    contacté: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    en_attente: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    devis_envoyé: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    gagné: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    perdu: 'bg-red-500/15 text-red-400 border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
      {getStatusLabel(status)}
    </span>
  );
};

// Section card header
const SectionHeader = ({ title, action, onAction }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-bold text-slate-200">{title}</h3>
    {action && (
      <button onClick={onAction} className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 font-medium">
        {action} <ChevronRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [financial, setFinancial] = useState({});
  const [interventions, setInterventions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [now] = useState(new Date());

  const fetchData = useCallback(async (force = false) => {
    const cacheKey = `dashboard_v2_${period}`;
    if (!force) {
      const cached = apiCache.get(cacheKey);
      if (cached) { setStats(cached.stats); setFinancial(cached.financial || {}); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const [statsRes, financialRes, interventionsRes, tasksRes] = await Promise.allSettled([
        axios.get(`${API_URL}/stats/dashboard?period=${period}`, { withCredentials: true }),
        axios.get(`${API_URL}/stats/financial?period=${period}`, { withCredentials: true }),
        axios.get(`${API_URL}/interventions?limit=10`, { withCredentials: true }),
        axios.get(`${API_URL}/tasks?status=pending&limit=5`, { withCredentials: true }),
      ]);
      const s = statsRes.status === 'fulfilled' ? statsRes.value.data : {};
      const f = financialRes.status === 'fulfilled' ? financialRes.value.data : {};
      const i = interventionsRes.status === 'fulfilled' ? (interventionsRes.value.data?.interventions || []) : [];
      const t = tasksRes.status === 'fulfilled' ? (tasksRes.value.data || []) : [];
      setStats(s); setFinancial(f); setInterventions(i); setTasks(t);
      apiCache.set(cacheKey, { stats: s, financial: f });
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchData(); }, [period]);

  const todayStr = now.toISOString().slice(0, 10);
  const todayInterventions = interventions.filter(i => (i.scheduled_date || '').slice(0,10) === todayStr);
  const urgentTasks = tasks.filter(t => t.priority === 'haute' || t.priority === 'urgente');

  const sourceData = Object.entries(stats.leads_by_source || {}).map(([name, value]) => ({ name: name || 'Inconnu', value }));
  const serviceData = Object.entries(stats.leads_by_service || {}).map(([name, value]) => ({ name, value }));
  const revenueData = (stats.leads_by_day || []).map((d, i) => ({
    date: d.date, leads: d.count,
    ca: Math.round((financial.monthly_revenue || 0) / 30 * (0.7 + Math.random() * 0.6))
  }));

  const pipeline = [
    { label: 'Leads', value: stats.total_leads || 0, color: '#60a5fa' },
    { label: 'Qualifiés', value: stats.qualified_leads || Math.round((stats.total_leads || 0) * 0.6), color: '#a78bfa' },
    { label: 'Devis', value: stats.sent_quotes || 0, color: '#f59e0b' },
    { label: 'Gagnés', value: stats.won_leads || 0, color: '#34d399' },
  ];

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="skeleton h-8 w-8 rounded-full" />
        <div className="skeleton h-7 w-52" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in max-w-[1600px] mx-auto">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>
              Tableau de bord
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">
            {now.toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Alertes urgentes */}
          {urgentTasks.length > 0 && (
            <button onClick={() => navigate('/tasks')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">
              <AlertCircle className="w-3.5 h-3.5" />
              {urgentTasks.length} urgent{urgentTasks.length > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={() => fetchData(true)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all border border-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex gap-1 bg-white/5 rounded-xl border border-white/5 p-1">
            {[{k:'1d',l:'Auj.'},{k:'7d',l:'7j'},{k:'30d',l:'30j'},{k:'90d',l:'3m'}].map(p => (
              <button key={p.k} onClick={() => setPeriod(p.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p.k ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}>{p.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ALERTES DU JOUR ── */}
      {todayInterventions.length > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-4 border"
          style={{background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.05))',borderColor:'rgba(16,185,129,0.2)'}}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-300">
              {todayInterventions.length} intervention{todayInterventions.length>1?'s':''} aujourd'hui
            </p>
            <p className="text-xs text-slate-500">
              {todayInterventions.map(i => i.client_name || 'Client').join(' · ')}
            </p>
          </div>
          <button onClick={() => navigate('/planning')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
            Voir <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
        <KpiCard title="Chiffre d'affaires" value={`${(financial.monthly_revenue || 0).toLocaleString('fr-FR')}€`}
          icon={Euro} color="#34d399" bg="rgba(52,211,153,0.1)" border="rgba(52,211,153,0.2)"
          subtitle="Ce mois" trend={financial.revenue_growth || null} delay={0} onClick={() => navigate('/finance')} />
        <KpiCard title="Total leads" value={stats.total_leads ?? 0}
          icon={Users} color="#a78bfa" bg="rgba(139,92,246,0.1)" border="rgba(139,92,246,0.2)"
          trend={null} delay={50} onClick={() => navigate('/leads')} />
        <KpiCard title="Nouveaux leads" value={stats.new_leads ?? 0}
          icon={UserPlus} color="#60a5fa" bg="rgba(96,165,250,0.1)" border="rgba(96,165,250,0.2)"
          trend={null} trendLabel="Période sélectionnée" delay={100} onClick={() => navigate('/leads')} />
        <KpiCard title="Leads gagnés" value={stats.won_leads ?? 0}
          icon={Trophy} color="#f59e0b" bg="rgba(245,158,11,0.1)" border="rgba(245,158,11,0.2)"
          trend={null} delay={150} onClick={() => navigate('/leads')} />
        <KpiCard title="Taux conversion" value={`${stats.conversion_lead_to_quote ?? 0}%`}
          icon={Target} color="#f43f5e" bg="rgba(244,63,94,0.1)" border="rgba(244,63,94,0.2)"
          trend={null} delay={200} />
        <KpiCard title="Devis envoyés" value={stats.sent_quotes ?? 0}
          icon={FileText} color="#06b6d4" bg="rgba(6,182,212,0.1)" border="rgba(6,182,212,0.2)"
          trend={null} delay={250} onClick={() => navigate('/quotes')} />
        <KpiCard title="Interventions" value={interventions.length}
          icon={Calendar} color="#ec4899" bg="rgba(236,72,153,0.1)" border="rgba(236,72,153,0.2)"
          subtitle={`${todayInterventions.length} aujourd'hui`} trend={null} delay={300} onClick={() => navigate('/planning')} />
        <KpiCard title="Score moyen" value={stats.avg_lead_score ?? 0}
          icon={Star} color="#f59e0b" bg="rgba(245,158,11,0.1)" border="rgba(245,158,11,0.2)"
          subtitle="Score IA leads" trend={null} delay={350} />
      </div>

      {/* ── PIPELINE FUNNEL ── */}
      <div className="section-card p-5">
        <SectionHeader title="🎯 Pipeline commercial" action="Voir leads" onAction={() => navigate('/leads')} />
        <div className="grid grid-cols-4 gap-3">
          {pipeline.map((p, i) => {
            const pct = pipeline[0].value > 0 ? Math.round((p.value / pipeline[0].value) * 100) : 0;
            return (
              <div key={p.label} className="text-center">
                <div className="relative h-20 flex items-end justify-center mb-2">
                  <div className="w-full rounded-xl transition-all"
                    style={{
                      height: `${Math.max(20, pct)}%`,
                      background: `linear-gradient(180deg, ${p.color}40, ${p.color}15)`,
                      border: `1px solid ${p.color}40`
                    }} />
                </div>
                <p className="text-2xl font-black" style={{color: p.color, fontFamily:'Manrope,sans-serif'}}>{p.value}</p>
                <p className="text-xs text-slate-500 font-medium">{p.label}</p>
                {i > 0 && <p className="text-[10px] text-slate-600">{pct}% du total</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CA + Leads évolution */}
        <div className="lg:col-span-2 section-card p-5">
          <SectionHeader title="📈 Évolution leads & revenus" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="#475569" style={{fontSize:10}} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#475569" style={{fontSize:10}} tickLine={false} axisLine={false} width={30} />
              <Tooltip content={<Tooltip_ />} />
              <Area type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2} fill="url(#gLeads)" dot={false} name="Leads" />
              <Area type="monotone" dataKey="ca" stroke="#34d399" strokeWidth={2} fill="url(#gCA)" dot={false} name="CA" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-0.5 bg-violet-500 rounded" />Leads</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-0.5 bg-emerald-500 rounded" />CA estimé</div>
          </div>
        </div>

        {/* Sources donut */}
        <div className="section-card p-5">
          <SectionHeader title="🌐 Sources" />
          {sourceData.length === 0 ? (
            <div className="flex items-center justify-center h-[160px] text-slate-600 text-sm">Aucune donnée</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={65} innerRadius={38} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />)}
                  </Pie>
                  <Tooltip formatter={v => [v, 'Leads']} contentStyle={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,fontSize:12}} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-1">
                {sourceData.slice(0,5).map((s,i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: COLORS[i%COLORS.length]}} />
                      <span className="text-slate-400 truncate max-w-[100px]">{s.name}</span>
                    </div>
                    <span className="font-bold text-slate-200">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── IA INSIGHTS ── */}
      <AIInsights stats={stats} />

      {/* ── CHARTS ROW 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Services bar */}
        <div className="section-card p-5">
          <SectionHeader title="🧹 Leads par service" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" stroke="#475569" style={{fontSize:10}} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#475569" style={{fontSize:10}} tickLine={false} axisLine={false} width={70} />
              <Tooltip contentStyle={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,fontSize:12}} />
              <Bar dataKey="value" radius={[0,8,8,0]} barSize={14}>
                {serviceData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tâches urgentes */}
        <div className="section-card p-5">
          <SectionHeader title="⚡ Tâches prioritaires" action="Voir toutes" onAction={() => navigate('/tasks')} />
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <CheckSquare className="w-8 h-8 text-slate-700" />
              <p className="text-slate-600 text-sm">Aucune tâche en attente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0,5).map(task => (
                <div key={task.task_id} onClick={() => navigate('/tasks')}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer group">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'urgente' ? 'bg-red-500 animate-pulse' :
                    task.priority === 'haute' ? 'bg-orange-500' :
                    task.priority === 'normale' ? 'bg-blue-500' : 'bg-slate-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate group-hover:text-slate-100">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    task.priority === 'urgente' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                    task.priority === 'haute' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                    'text-blue-400 bg-blue-500/10 border-blue-500/20'
                  }`}>{task.priority || 'normale'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LEADS RÉCENTS + INTERVENTIONS DU JOUR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads récents */}
        <div className="section-card p-5">
          <SectionHeader title="👥 Leads récents" action="Voir tout" onAction={() => navigate('/leads')} />
          <div className="space-y-2">
            {(stats.recent_leads || []).slice(0,6).map(lead => (
              <div key={lead.lead_id} onClick={() => navigate(`/leads/${lead.lead_id}`)}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer group">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 font-black text-sm flex-shrink-0">
                  {lead.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-slate-100">{lead.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 truncate">{lead.service_type}</span>
                    {lead.phone && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Phone className="w-2.5 h-2.5"/>{lead.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <LeadScoreBadge score={lead.score || 50} />
                  <StatusBadge status={lead.status} />
                </div>
              </div>
            ))}
            {(!stats.recent_leads || stats.recent_leads.length === 0) && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Users className="w-8 h-8 text-slate-700" />
                <p className="text-slate-600 text-sm">Aucun lead récent</p>
              </div>
            )}
          </div>
        </div>

        {/* Interventions du jour */}
        <div className="section-card p-5">
          <SectionHeader title="📅 Interventions du jour" action="Planning" onAction={() => navigate('/planning')} />
          {todayInterventions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Calendar className="w-8 h-8 text-slate-700" />
              <p className="text-slate-600 text-sm">Aucune intervention aujourd'hui</p>
              <button onClick={() => navigate('/planning')}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">
                Voir le planning →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayInterventions.slice(0,6).map(intv => (
                <div key={intv.intervention_id || intv.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{intv.client_name || 'Client'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{intv.service_type || intv.type}</span>
                      {intv.address && (
                        <span className="text-[10px] text-slate-600 flex items-center gap-1 truncate">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{intv.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-emerald-400">{intv.scheduled_time || '—'}</p>
                    <p className="text-[10px] text-slate-600">{intv.duration ? `${intv.duration}h` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── STATS FINANCIÈRES ── */}
      {(financial.monthly_revenue || financial.pending_amount) && (
        <div className="section-card p-5">
          <SectionHeader title="💰 Finances du mois" action="Voir finances" onAction={() => navigate('/finance')} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'CA du mois', value: `${(financial.monthly_revenue || 0).toLocaleString('fr-FR')}€`, color: '#34d399', icon: TrendingUp },
              { label: 'En attente', value: `${(financial.pending_amount || 0).toLocaleString('fr-FR')}€`, color: '#f59e0b', icon: Clock },
              { label: 'Factures payées', value: financial.paid_invoices || 0, color: '#60a5fa', icon: CheckSquare },
              { label: 'Factures impayées', value: financial.unpaid_invoices || 0, color: '#f43f5e', icon: AlertCircle },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{background:`${item.color}15`, border:`1px solid ${item.color}30`}}>
                  <item.icon className="w-4 h-4" style={{color:item.color}} />
                </div>
                <div>
                  <p className="text-base font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>{item.value}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
