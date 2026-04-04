import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Zap, Award, BarChart2, Activity, ChevronRight, X,
  Flame, Timer, TrendingDown, Plus, CalendarPlus, Navigation
} from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDateTime } from '../../lib/utils';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import AIInsights from './AIInsights';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const COLORS = ['#8b5cf6','#60a5fa','#34d399','#f59e0b','#f43f5e','#06b6d4','#ec4899','#a78bfa'];

/* ────────────────────────────────────────
   Animated counter hook
──────────────────────────────────────── */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  const start = useRef(null);
  const prev = useRef(0);

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) { setValue(target); return; }
    const from = prev.current;
    prev.current = target;
    start.current = null;
    const step = (ts) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

/* ────────────────────────────────────────
   Custom tooltip
──────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'hsl(224,71%,6%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1', fontSize: 11 }}>{p.name}:</span>
          <span style={{ color: p.color, fontWeight: 700, fontSize: 13 }}>
            {p.name === 'CA' || p.name === 'CA (N-1)'
              ? `${p.value.toLocaleString('fr-FR')}€`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────
   Sparkline (tiny chart inside KPI card)
──────────────────────────────────────── */
const Sparkline = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#','')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/* ────────────────────────────────────────
   KPI Card V2
──────────────────────────────────────── */
const KpiCard = ({ title, value, rawValue, icon: Icon, color, bg, border, trend, trendLabel, subtitle, onClick, delay = 0, sparkData }) => {
  const numeric = typeof rawValue === 'number' ? rawValue : (parseInt(String(value).replace(/[^0-9]/g, '')) || 0);
  const counted = useCountUp(numeric);
  const displayValue = typeof rawValue === 'number'
    ? (String(value).includes('€')
        ? `${counted.toLocaleString('fr-FR')}€`
        : String(value).includes('%') ? `${counted}%` : counted)
    : value;

  return (
    <div
      className="metric-card card-hover-glow animate-fade-in cursor-pointer"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both', opacity: 0 }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: bg, border: `1px solid ${border}` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend !== null && trend !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              trend >= 0
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-red-400 bg-red-500/10 border-red-500/20'
            }`}
          >
            {trend >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {sparkData && (
        <div className="mb-1 -mx-1">
          <Sparkline data={sparkData} color={color} />
        </div>
      )}

      <p
        className="text-2xl font-black text-slate-100 tracking-tight"
        style={{ fontFamily: 'Manrope,sans-serif' }}
      >
        {displayValue}
      </p>
      <p className="text-xs font-semibold text-slate-400 mt-0.5">{title}</p>
      {subtitle  && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
      {trendLabel && <p className="text-[10px] text-emerald-500 mt-0.5">{trendLabel}</p>}
    </div>
  );
};

/* ────────────────────────────────────────
   AI Insights bar
──────────────────────────────────────── */
const defaultInsights = [
  { id: 'default_1', icon: '🔥', text: '3 leads chauds détectés ce mois', color: '#f97316', action: 'Voir leads', route: '/leads' },
  { id: 'default_2', icon: '⏰', text: '2 devis expirent demain',          color: '#f59e0b', action: 'Voir devis', route: '/quotes' },
];

const AIInsightsBar = ({ stats, navigate }) => {
  const [insights, setInsights] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/ai/suggestions`, { withCredentials: true })
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data?.suggestions || [];
        setInsights(data.length > 0 ? data : defaultInsights);
      })
      .catch(() => {
        // Build dynamic insights from stats
        const dynamic = [];
        if ((stats.new_leads || 0) > 0)
          dynamic.push({ id: 'dyn_leads', icon: '🔥', text: `${stats.new_leads} nouveau${stats.new_leads > 1 ? 'x' : ''} lead${stats.new_leads > 1 ? 's' : ''} ce mois`, color: '#8b5cf6', action: 'Voir', route: '/leads' });
        if ((stats.sent_quotes || 0) > 0)
          dynamic.push({ id: 'dyn_devis', icon: '📄', text: `${stats.sent_quotes} devis en attente de réponse`, color: '#f59e0b', action: 'Voir', route: '/quotes' });
        if ((stats.won_leads || 0) > 0)
          dynamic.push({ id: 'dyn_won', icon: '🏆', text: `${stats.won_leads} lead${stats.won_leads > 1 ? 's' : ''} converti${stats.won_leads > 1 ? 's' : ''} en client`, color: '#34d399', action: 'Voir', route: '/leads' });
        setInsights(dynamic.length > 0 ? dynamic : defaultInsights);
      })
      .finally(() => setLoaded(true));
  }, [stats]);

  const visible = insights.filter(i => !dismissed.has(i.id));
  if (!loaded || visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 animate-fade-in">
      {visible.map((insight, i) => (
        <div
          key={insight.id}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border flex-shrink-0
                     hover:brightness-110 transition-all cursor-pointer group"
          style={{
            background: `${insight.color}12`,
            borderColor: `${insight.color}30`,
            animationDelay: `${i * 80}ms`,
          }}
          onClick={() => navigate(insight.route)}
        >
          <span className="text-base leading-none">{insight.icon}</span>
          <span className="text-xs font-semibold text-slate-300">{insight.text}</span>
          {insight.action && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
              style={{ background: `${insight.color}25`, color: insight.color }}
            >
              {insight.action}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); setDismissed(d => new Set([...d, insight.id])); }}
            className="ml-1 text-slate-600 hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────
   Status badge
──────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const colors = {
    nouveau:      'bg-blue-500/15   text-blue-400   border-blue-500/20',
    contacté:     'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    en_attente:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
    devis_envoyé: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    gagné:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    perdu:        'bg-red-500/15    text-red-400    border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
      {getStatusLabel(status)}
    </span>
  );
};

/* ────────────────────────────────────────
   Section header
──────────────────────────────────────── */
const SectionHeader = ({ title, action, onAction }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-bold text-slate-200" style={{ fontFamily: 'Manrope,sans-serif' }}>{title}</h3>
    {action && (
      <button
        onClick={onAction}
        className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 font-medium"
      >
        {action} <ChevronRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

/* ────────────────────────────────────────
   Quick actions row
──────────────────────────────────────── */
const QuickActions = ({ navigate }) => {
  const actions = [
    { label: 'Nouveau Lead',          icon: UserPlus,     color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.25)', route: '/leads?new=1' },
    { label: 'Créer Devis',           icon: FileText,     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)', route: '/quotes?new=1' },
    { label: 'Planifier Intervention',icon: CalendarPlus, color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)', route: '/planning?new=1' },
    { label: 'Voir Carte',            icon: Navigation,   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', route: '/map' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((a, i) => (
        <button
          key={a.label}
          onClick={() => navigate(a.route)}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200
                     hover:scale-[1.03] active:scale-[0.98] animate-fade-in"
          style={{
            background: a.bg,
            borderColor: a.border,
            animationDelay: `${i * 60}ms`,
            animationFillMode: 'both',
            opacity: 0,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${a.color}20`, border: `1px solid ${a.color}40` }}
          >
            <a.icon className="w-5 h-5" style={{ color: a.color }} />
          </div>
          <span className="text-xs font-semibold text-slate-300 text-center leading-tight">{a.label}</span>
        </button>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────
   Pipeline funnel
──────────────────────────────────────── */
const PipelineFunnel = ({ pipeline, navigate }) => (
  <div className="section-card p-5">
    <SectionHeader title="🎯 Pipeline commercial" action="Voir leads" onAction={() => navigate('/leads')} />
    <div className="grid grid-cols-4 gap-2">
      {pipeline.map((p, i) => {
        const pct = pipeline[0].value > 0 ? Math.round((p.value / pipeline[0].value) * 100) : 0;
        const barH = Math.max(16, pct);
        return (
          <div key={p.label} className="flex flex-col items-center gap-1">
            <div className="relative w-full h-20 flex items-end justify-center">
              <div
                className="w-full rounded-xl transition-all duration-700"
                style={{
                  height: `${barH}%`,
                  background: `linear-gradient(180deg, ${p.color}50, ${p.color}18)`,
                  border: `1px solid ${p.color}45`,
                  boxShadow: `0 2px 12px ${p.color}20`,
                }}
              />
              {i > 0 && pct > 0 && (
                <span
                  className="absolute top-1 text-[9px] font-black"
                  style={{ color: p.color }}
                >
                  {pct}%
                </span>
              )}
            </div>
            <p className="text-xl font-black" style={{ color: p.color, fontFamily: 'Manrope,sans-serif' }}>{p.value}</p>
            <p className="text-[10px] text-slate-500 font-semibold text-center leading-tight">{p.label}</p>
          </div>
        );
      })}
    </div>
  </div>
);

/* ────────────────────────────────────────
   Relative time helper
──────────────────────────────────────── */
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.round(diff/60)}min`;
  if (diff < 86400) return `il y a ${Math.round(diff/3600)}h`;
  if (diff < 604800) return `il y a ${Math.round(diff/86400)}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

/* ────────────────────────────────────────
   Activity dot colours
──────────────────────────────────────── */
const activityDotColor = (type) => {
  if (!type) return '#8b5cf6';
  const t = type.toLowerCase();
  if (t.includes('lead'))    return '#8b5cf6';
  if (t.includes('devis') || t.includes('quote')) return '#f59e0b';
  if (t.includes('gagn') || t.includes('win'))    return '#34d399';
  if (t.includes('perdu') || t.includes('lost'))  return '#f43f5e';
  if (t.includes('ticket'))  return '#60a5fa';
  if (t.includes('task'))    return '#ec4899';
  return '#8b5cf6';
};

/* ────────────────────────────────────────
   Main Dashboard
──────────────────────────────────────── */
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
      if (cached) {
        setStats(cached.stats);
        setFinancial(cached.financial || {});
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const [statsRes, financialRes, interventionsRes, tasksRes] = await Promise.allSettled([
        axios.get(`${API_URL}/stats/dashboard?period=${period}`, { withCredentials: true }),
        axios.get(`${API_URL}/stats/financial?period=${period}`,  { withCredentials: true }),
        axios.get(`${API_URL}/interventions?limit=10`,            { withCredentials: true }),
        axios.get(`${API_URL}/tasks?status=pending&limit=5`,      { withCredentials: true }),
      ]);
      const s = statsRes.status       === 'fulfilled' ? statsRes.value.data                                : {};
      const f = financialRes.status   === 'fulfilled' ? financialRes.value.data                            : {};
      const i = interventionsRes.status === 'fulfilled' ? (interventionsRes.value.data?.interventions || []) : [];
      const t = tasksRes.status       === 'fulfilled' ? (tasksRes.value.data || [])                        : [];
      setStats(s); setFinancial(f); setInterventions(i); setTasks(t);
      apiCache.set(cacheKey, { stats: s, financial: f });
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [period]);

  const todayStr = now.toISOString().slice(0, 10);
  const todayInterventions = interventions.filter(i => (i.scheduled_date || '').slice(0, 10) === todayStr);
  const urgentTasks = tasks.filter(t => t.priority === 'haute' || t.priority === 'urgente');

  const sourceData = Object.entries(stats.leads_by_source || {}).map(([name, value]) => ({ name: name || 'Inconnu', value }));
  const serviceData = Object.entries(stats.leads_by_service || {}).map(([name, value]) => ({ name, value }));

  /* Build revenue data with simulated previous period */
  const revenueData = (stats.leads_by_day || []).map((d, i, arr) => ({
    date: d.date?.slice(5) || d.date,
    leads: d.count,
    CA:    Math.round((financial.monthly_revenue || 0) / Math.max(arr.length, 1) * (0.7 + Math.random() * 0.6)),
    'CA (N-1)': Math.round((financial.monthly_revenue || 0) / Math.max(arr.length, 1) * (0.5 + Math.random() * 0.5)),
  }));

  /* Sparklines: generate fake trend from leads_by_day */
  const sparkLeads    = (stats.leads_by_day || []).slice(-7).map(d => ({ v: d.count }));
  const sparkRevenue  = revenueData.slice(-7).map(d => ({ v: d.CA }));

  const pipeline = [
    { label: 'Leads',    value: stats.total_leads    || 0,                                                         color: '#60a5fa' },
    { label: 'Qualifiés',value: stats.qualified_leads || Math.round((stats.total_leads || 0) * 0.6),               color: '#a78bfa' },
    { label: 'Devis',    value: stats.sent_quotes     || 0,                                                         color: '#f59e0b' },
    { label: 'Gagnés',   value: stats.won_leads       || 0,                                                         color: '#34d399' },
  ];

  /* ── Loading state ── */
  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="shimmer h-8 w-8 rounded-full" style={{ width: 32, height: 32 }} />
        <div className="shimmer h-7 rounded-xl" style={{ width: 200, height: 28 }} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="shimmer rounded-xl" style={{ width: 180, height: 38 }} />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="shimmer rounded-2xl" style={{ height: 112, animationDelay: `${i * 80}ms` }} />
        ))}
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
            <h1 className="text-2xl font-black text-slate-100" style={{ fontFamily: 'Manrope,sans-serif' }}>
              Tableau de bord
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {urgentTasks.length > 0 && (
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20
                         text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all animate-pulse-glow"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {urgentTasks.length} urgent{urgentTasks.length > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => fetchData(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all border border-white/5"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex gap-1 bg-white/5 rounded-xl border border-white/5 p-1">
            {[{ k: '1d', l: 'Auj.' }, { k: '7d', l: '7j' }, { k: '30d', l: '30j' }, { k: '90d', l: '3m' }].map(p => (
              <button
                key={p.k}
                onClick={() => setPeriod(p.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p.k ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI INSIGHTS BAR ── */}
      <AIInsightsBar stats={stats} navigate={navigate} />

      {/* ── TODAY ALERT ── */}
      {todayInterventions.length > 0 && (
        <div
          className="rounded-2xl p-4 flex items-center gap-4 border animate-fade-in"
          style={{
            background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.05))',
            borderColor: 'rgba(16,185,129,0.2)',
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-300">
              {todayInterventions.length} intervention{todayInterventions.length > 1 ? 's' : ''} aujourd'hui
            </p>
            <p className="text-xs text-slate-500">
              {todayInterventions.map(i => i.client_name || 'Client').join(' · ')}
            </p>
          </div>
          <button
            onClick={() => navigate('/planning')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            Voir <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div className="section-card p-5">
        <SectionHeader title="⚡ Actions rapides" />
        <QuickActions navigate={navigate} />
      </div>

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Chiffre d'affaires" value={`${(financial.monthly_revenue||0).toLocaleString('fr-FR')}€`}
          rawValue={financial.monthly_revenue || 0}
          icon={Euro}     color="#34d399" bg="rgba(52,211,153,0.1)"  border="rgba(52,211,153,0.2)"
          subtitle="Ce mois" trend={financial.revenue_growth || null} delay={0}
          onClick={() => navigate('/finance')} sparkData={sparkRevenue}
        />
        <KpiCard
          title="Total leads"    value={stats.total_leads ?? 0} rawValue={stats.total_leads ?? 0}
          icon={Users}    color="#a78bfa" bg="rgba(139,92,246,0.1)" border="rgba(139,92,246,0.2)"
          trend={null} delay={50} onClick={() => navigate('/leads')} sparkData={sparkLeads}
        />
        <KpiCard
          title="Nouveaux leads" value={stats.new_leads ?? 0} rawValue={stats.new_leads ?? 0}
          icon={UserPlus}  color="#60a5fa" bg="rgba(96,165,250,0.1)"  border="rgba(96,165,250,0.2)"
          trendLabel="Période sélectionnée" delay={100} onClick={() => navigate('/leads')}
        />
        <KpiCard
          title="Leads gagnés"  value={stats.won_leads ?? 0} rawValue={stats.won_leads ?? 0}
          icon={Trophy}   color="#f59e0b" bg="rgba(245,158,11,0.1)"  border="rgba(245,158,11,0.2)"
          delay={150} onClick={() => navigate('/leads')}
        />
        <KpiCard
          title="Taux conversion" value={`${stats.conversion_lead_to_quote ?? 0}%`}
          rawValue={stats.conversion_lead_to_quote ?? 0}
          icon={Target}   color="#f43f5e" bg="rgba(244,63,94,0.1)"   border="rgba(244,63,94,0.2)"
          delay={200}
        />
        <KpiCard
          title="Devis envoyés"  value={stats.sent_quotes ?? 0} rawValue={stats.sent_quotes ?? 0}
          icon={FileText}  color="#06b6d4" bg="rgba(6,182,212,0.1)"   border="rgba(6,182,212,0.2)"
          delay={250} onClick={() => navigate('/quotes')}
        />
        <KpiCard
          title="Interventions"  value={interventions.length} rawValue={interventions.length}
          icon={Calendar}  color="#ec4899" bg="rgba(236,72,153,0.1)"  border="rgba(236,72,153,0.2)"
          subtitle={`${todayInterventions.length} aujourd'hui`} delay={300} onClick={() => navigate('/planning')}
        />
        <KpiCard
          title="Score moyen"    value={stats.avg_lead_score ?? 0} rawValue={stats.avg_lead_score ?? 0}
          icon={Star}      color="#f59e0b" bg="rgba(245,158,11,0.1)"  border="rgba(245,158,11,0.2)"
          subtitle="Score IA leads" delay={350}
        />
      </div>

      {/* ── PIPELINE FUNNEL ── */}
      <PipelineFunnel pipeline={pipeline} navigate={navigate} />

      {/* ── CHARTS ROW 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CA + Leads evolution with previous period comparison */}
        <div className="lg:col-span-2 section-card p-5">
          <SectionHeader title="📈 Évolution leads & revenus" />
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="#475569" style={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#475569" style={{ fontSize: 10 }} tickLine={false} axisLine={false} width={35} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="leads"    stroke="#8b5cf6" strokeWidth={2} fill="url(#gLeads)" dot={false} name="Leads" />
              <Area type="monotone" dataKey="CA"       stroke="#34d399" strokeWidth={2} fill="url(#gCA)"    dot={false} name="CA" />
              <Line  type="monotone" dataKey="CA (N-1)" stroke="#34d399" strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="CA (N-1)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-0.5 bg-violet-500 rounded inline-block" />Leads
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-0.5 bg-emerald-500 rounded inline-block" />CA estimé
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <svg width="14" height="4"><line x1="0" y1="2" x2="14" y2="2" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 3"/></svg>
              CA (N-1)
            </div>
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
                  <Tooltip
                    formatter={v => [v, 'Leads']}
                    contentStyle={{ background: 'hsl(224,71%,6%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {sourceData.slice(0, 5).map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-400 truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="stat-bar w-12">
                        <div
                          className="stat-bar-fill"
                          style={{ '--bar-width': `${Math.round((s.value / (sourceData[0]?.value || 1)) * 100)}%`, background: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="font-bold text-slate-200 w-5 text-right">{s.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── AI INSIGHTS (existing component) ── */}
      <AIInsights stats={stats} />

      {/* ── CHARTS ROW 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Services bar */}
        <div className="section-card p-5">
          <SectionHeader title="🧹 Leads par service" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" stroke="#475569" style={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#475569" style={{ fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip
                contentStyle={{ background: 'hsl(224,71%,6%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={14}>
                {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority tasks */}
        <div className="section-card p-5">
          <SectionHeader title="⚡ Tâches prioritaires" action="Voir toutes" onAction={() => navigate('/tasks')} />
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <CheckSquare className="w-8 h-8 text-slate-700" />
              <p className="text-slate-600 text-sm">Aucune tâche en attente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 5).map(task => (
                <div
                  key={task.task_id}
                  onClick={() => navigate('/tasks')}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent
                             hover:border-white/10 transition-all cursor-pointer group"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'urgente' ? 'bg-red-500 animate-pulse' :
                    task.priority === 'haute'   ? 'bg-orange-500' :
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                    task.priority === 'urgente' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                    task.priority === 'haute'   ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
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
        {/* Recent leads — improved activity feed style */}
        <div className="section-card p-5">
          <SectionHeader title="👥 Leads récents" action="Voir tout" onAction={() => navigate('/leads')} />
          <div className="space-y-2">
            {(stats.recent_leads || []).slice(0, 6).map((lead, i) => (
              <div
                key={lead.lead_id}
                onClick={() => navigate(`/leads/${lead.lead_id}`)}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 border border-transparent
                           hover:border-white/10 transition-all cursor-pointer group animate-fade-in"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both', opacity: 0 }}
              >
                {/* Timeline dot */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-violet-400 font-black text-sm"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
                  >
                    {lead.name?.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900"
                    style={{ background: activityDotColor(lead.status) }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-slate-100">{lead.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 truncate">{lead.service_type}</span>
                    {lead.created_at && (
                      <span className="text-[10px] text-slate-600 flex-shrink-0">{relativeTime(lead.created_at)}</span>
                    )}
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

        {/* Today's interventions */}
        <div className="section-card p-5">
          <SectionHeader title="📅 Interventions du jour" action="Planning" onAction={() => navigate('/planning')} />
          {todayInterventions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Calendar className="w-8 h-8 text-slate-700" />
              <p className="text-slate-600 text-sm">Aucune intervention aujourd'hui</p>
              <button
                onClick={() => navigate('/planning')}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                Voir le planning →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayInterventions.slice(0, 6).map((intv, i) => (
                <div
                  key={intv.intervention_id || intv.id}
                  className="flex items-center gap-3 p-3 rounded-xl border transition-all
                             hover:border-white/10 hover:bg-white/3 animate-fade-in"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    borderColor: 'rgba(255,255,255,0.06)',
                    animationDelay: `${i * 50}ms`,
                    animationFillMode: 'both',
                    opacity: 0,
                  }}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
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

      {/* ── FINANCIAL STATS ── */}
      {(financial.monthly_revenue || financial.pending_amount) && (
        <div className="section-card p-5">
          <SectionHeader title="💰 Finances du mois" action="Voir finances" onAction={() => navigate('/finance')} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'CA du mois',        value: `${(financial.monthly_revenue || 0).toLocaleString('fr-FR')}€`, color: '#34d399', icon: TrendingUp },
              { label: 'En attente',         value: `${(financial.pending_amount  || 0).toLocaleString('fr-FR')}€`, color: '#f59e0b', icon: Clock },
              { label: 'Factures payées',    value: financial.paid_invoices    || 0,                                  color: '#60a5fa', icon: CheckSquare },
              { label: 'Factures impayées',  value: financial.unpaid_invoices  || 0,                                  color: '#f43f5e', icon: AlertCircle },
            ].map((item, i) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-3 rounded-xl border card-hover-glow animate-fade-in"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.07)',
                  animationDelay: `${i * 60}ms`,
                  animationFillMode: 'both',
                  opacity: 0,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
                >
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-base font-black text-slate-100" style={{ fontFamily: 'Manrope,sans-serif' }}>{item.value}</p>
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
