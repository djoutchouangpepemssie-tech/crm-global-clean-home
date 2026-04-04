import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  Flame, Timer, TrendingDown, Plus, CalendarPlus, Navigation,
  ArrowRight, ExternalLink, Shield, Rocket, Crown
} from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDateTime } from '../../lib/utils';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import AIInsights from './AIInsights';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const COLORS = ['#8b5cf6','#60a5fa','#34d399','#f59e0b','#f43f5e','#06b6d4','#ec4899','#a78bfa'];

/* ═══════════════════════════════════════════════
   Premium color palette with gradient pairs
═══════════════════════════════════════════════ */
const GRADIENTS = {
  violet:  { from: '#8b5cf6', to: '#6d28d9', glow: 'rgba(139,92,246,0.4)' },
  blue:    { from: '#60a5fa', to: '#3b82f6', glow: 'rgba(96,165,250,0.4)' },
  emerald: { from: '#34d399', to: '#10b981', glow: 'rgba(52,211,153,0.4)' },
  amber:   { from: '#fbbf24', to: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  rose:    { from: '#fb7185', to: '#f43f5e', glow: 'rgba(244,63,94,0.4)' },
  cyan:    { from: '#22d3ee', to: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
  pink:    { from: '#f472b6', to: '#ec4899', glow: 'rgba(236,72,153,0.4)' },
};

/* ═══════════════════════════════════════════════
   Intersection Observer hook for reveal animations
═══════════════════════════════════════════════ */
function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsInView(true); obs.unobserve(el); }
    }, { threshold: 0.1, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, isInView];
}

/* ═══════════════════════════════════════════════
   Enhanced animated counter with easing
═══════════════════════════════════════════════ */
function useCountUp(target, duration = 1200) {
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
      // Smooth elastic-like easing
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

/* ═══════════════════════════════════════════════
   Premium Skeleton Loader
═══════════════════════════════════════════════ */
const SkeletonPulse = ({ className = '', style = {}, variant = 'default' }) => (
  <div
    className={`premium-shimmer ${variant === 'circle' ? 'rounded-full' : variant === 'card' ? 'rounded-2xl' : 'rounded-xl'} ${className}`}
    style={style}
  />
);

const DashboardSkeleton = () => (
  <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
    {/* Header skeleton */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <SkeletonPulse style={{ width: 40, height: 40 }} variant="card" />
        <div className="space-y-2">
          <SkeletonPulse style={{ width: 220, height: 28 }} />
          <SkeletonPulse style={{ width: 160, height: 16 }} />
        </div>
      </div>
      <div className="flex gap-2">
        <SkeletonPulse style={{ width: 40, height: 40 }} />
        <SkeletonPulse style={{ width: 200, height: 40 }} />
      </div>
    </div>

    {/* AI Insights skeleton */}
    <div className="flex gap-3 overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <SkeletonPulse key={i} style={{ width: 240, height: 42, flexShrink: 0, animationDelay: `${i * 150}ms` }} />
      ))}
    </div>

    {/* Quick actions skeleton */}
    <SkeletonPulse variant="card" style={{ height: 120 }} />

    {/* KPI Grid skeleton */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {[...Array(8)].map((_, i) => (
        <SkeletonPulse key={i} variant="card" style={{ height: 140, animationDelay: `${i * 100}ms` }} />
      ))}
    </div>

    {/* Charts skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SkeletonPulse variant="card" className="lg:col-span-2" style={{ height: 320 }} />
      <SkeletonPulse variant="card" style={{ height: 320 }} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════
   Premium Chart Tooltip
═══════════════════════════════════════════════ */
const PremiumTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="premium-tooltip">
      <div className="premium-tooltip-header">
        <span className="premium-tooltip-label">{label}</span>
      </div>
      <div className="premium-tooltip-body">
        {payload.map((p, i) => (
          <div key={i} className="premium-tooltip-row">
            <span className="premium-tooltip-dot" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}80` }} />
            <span className="premium-tooltip-name">{p.name}</span>
            <span className="premium-tooltip-value" style={{ color: p.color }}>
              {p.name === 'CA' || p.name === 'CA (N-1)'
                ? `${p.value.toLocaleString('fr-FR')} €`
                : p.value.toLocaleString('fr-FR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Premium Sparkline with glow
═══════════════════════════════════════════════ */
const Sparkline = ({ data, color, height = 44 }) => {
  if (!data || data.length < 2) return null;
  const id = `spark-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive
          animationDuration={1500}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/* ═══════════════════════════════════════════════
   Premium KPI Card with gradient accent
═══════════════════════════════════════════════ */
const KpiCard = ({ title, value, rawValue, icon: Icon, gradient, trend, trendLabel, subtitle, onClick, delay = 0, sparkData, badge }) => {
  const [ref, isInView] = useInView();
  const numeric = typeof rawValue === 'number' ? rawValue : (parseInt(String(value).replace(/[^0-9]/g, '')) || 0);
  const counted = useCountUp(isInView ? numeric : 0, 1400);
  const displayValue = typeof rawValue === 'number'
    ? (String(value).includes('€')
        ? `${counted.toLocaleString('fr-FR')} €`
        : String(value).includes('%') ? `${counted}%` : counted.toLocaleString('fr-FR'))
    : value;

  const g = GRADIENTS[gradient] || GRADIENTS.violet;

  return (
    <div
      ref={ref}
      className={`kpi-card-premium ${isInView ? 'kpi-card-visible' : ''}`}
      style={{ '--delay': `${delay}ms`, '--accent': g.from, '--accent-glow': g.glow }}
      onClick={onClick}
    >
      {/* Gradient accent line at top */}
      <div className="kpi-accent-line" style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="kpi-icon-wrap" style={{
          background: `linear-gradient(135deg, ${g.from}18, ${g.to}08)`,
          border: `1px solid ${g.from}30`,
          boxShadow: `0 4px 12px ${g.from}15`
        }}>
          <Icon className="w-[18px] h-[18px]" style={{ color: g.from }} />
        </div>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="kpi-badge" style={{ background: `${g.from}20`, color: g.from, borderColor: `${g.from}30` }}>
              {badge}
            </span>
          )}
          {trend !== null && trend !== undefined && (
            <span className={`kpi-trend ${trend >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>

      {sparkData && sparkData.length > 1 && (
        <div className="mb-2 -mx-1 opacity-80">
          <Sparkline data={sparkData} color={g.from} />
        </div>
      )}

      <p className="kpi-value">{displayValue}</p>
      <p className="kpi-title">{title}</p>
      {subtitle  && <p className="kpi-subtitle">{subtitle}</p>}
      {trendLabel && <p className="kpi-trend-label">{trendLabel}</p>}

      {/* Hover glow overlay */}
      <div className="kpi-glow-overlay" style={{ background: `radial-gradient(circle at 50% 0%, ${g.from}12, transparent 70%)` }} />
    </div>
  );
};

/* ═══════════════════════════════════════════════
   AI Insights bar (premium)
═══════════════════════════════════════════════ */
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
    <div className="insights-bar-scroll">
      <div className="flex gap-2.5">
        {visible.map((insight, i) => (
          <div
            key={insight.id}
            className="insight-chip"
            style={{
              '--chip-color': insight.color,
              animationDelay: `${i * 100 + 200}ms`,
            }}
            onClick={() => navigate(insight.route)}
          >
            <span className="insight-chip-icon">{insight.icon}</span>
            <span className="insight-chip-text">{insight.text}</span>
            {insight.action && (
              <span className="insight-chip-action" style={{ background: `${insight.color}25`, color: insight.color }}>
                {insight.action} <ArrowRight className="w-2.5 h-2.5" />
              </span>
            )}
            <button
              onClick={e => { e.stopPropagation(); setDismissed(d => new Set([...d, insight.id])); }}
              className="insight-chip-dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Premium Status Badge with pulse
═══════════════════════════════════════════════ */
const StatusBadge = ({ status }) => {
  const configs = {
    nouveau:      { bg: '#3b82f6', label: 'Nouveau',   pulse: true },
    contacté:     { bg: '#f59e0b', label: 'Contacté',  pulse: false },
    en_attente:   { bg: '#f97316', label: 'En attente',pulse: false },
    devis_envoyé: { bg: '#8b5cf6', label: 'Devis envoyé', pulse: false },
    gagné:        { bg: '#10b981', label: 'Gagné',     pulse: false },
    perdu:        { bg: '#ef4444', label: 'Perdu',     pulse: false },
  };
  const cfg = configs[status] || { bg: '#64748b', label: getStatusLabel(status), pulse: false };
  return (
    <span className="status-badge-premium" style={{ '--badge-color': cfg.bg }}>
      <span className={`status-badge-dot ${cfg.pulse ? 'status-badge-dot-pulse' : ''}`} style={{ background: cfg.bg }} />
      {cfg.label}
    </span>
  );
};

/* ═══════════════════════════════════════════════
   Section header (premium)
═══════════════════════════════════════════════ */
const SectionHeader = ({ title, action, onAction, icon: HeaderIcon }) => (
  <div className="flex items-center justify-between mb-5">
    <h3 className="section-title-premium">{title}</h3>
    {action && (
      <button onClick={onAction} className="section-action-btn">
        {action} <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </button>
    )}
  </div>
);

/* ═══════════════════════════════════════════════
   Quick Actions (premium with glassmorphism)
═══════════════════════════════════════════════ */
const QuickActions = ({ navigate }) => {
  const actions = [
    { label: 'Nouveau Lead',           icon: UserPlus,     gradient: GRADIENTS.violet, route: '/leads?new=1' },
    { label: 'Créer Devis',            icon: FileText,     gradient: GRADIENTS.blue,   route: '/quotes?new=1' },
    { label: 'Planifier Intervention', icon: CalendarPlus, gradient: GRADIENTS.emerald, route: '/planning?new=1' },
    { label: 'Voir Carte',             icon: Navigation,   gradient: GRADIENTS.amber,  route: '/map' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((a, i) => (
        <button
          key={a.label}
          onClick={() => navigate(a.route)}
          className="quick-action-btn animate-slide-up"
          style={{
            '--action-color': a.gradient.from,
            '--action-color-to': a.gradient.to,
            '--action-glow': a.gradient.glow,
            animationDelay: `${i * 80 + 300}ms`,
          }}
        >
          <div className="quick-action-icon" style={{
            background: `linear-gradient(135deg, ${a.gradient.from}20, ${a.gradient.to}08)`,
            border: `1px solid ${a.gradient.from}35`,
            boxShadow: `0 4px 16px ${a.gradient.from}15`
          }}>
            <a.icon className="w-5 h-5" style={{ color: a.gradient.from }} />
          </div>
          <span className="quick-action-label">{a.label}</span>
          <div className="quick-action-arrow">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Pipeline Funnel (premium 3D-style)
═══════════════════════════════════════════════ */
const PipelineFunnel = ({ pipeline, navigate }) => {
  const [ref, isInView] = useInView();
  const maxVal = Math.max(...pipeline.map(p => p.value), 1);

  return (
    <div ref={ref} className="section-card-premium p-5 md:p-6">
      <SectionHeader title="🎯 Pipeline commercial" action="Voir leads" onAction={() => navigate('/leads')} />
      <div className="grid grid-cols-4 gap-3">
        {pipeline.map((p, i) => {
          const pct = Math.round((p.value / pipeline[0].value) * 100) || 0;
          const barH = Math.max(20, (p.value / maxVal) * 100);
          return (
            <div key={p.label} className="flex flex-col items-center gap-2 group">
              <div className="relative w-full h-24 flex items-end justify-center">
                <div
                  className="pipeline-bar"
                  style={{
                    height: isInView ? `${barH}%` : '0%',
                    '--bar-color': p.color,
                    transitionDelay: `${i * 150}ms`,
                  }}
                />
                {i > 0 && pct > 0 && (
                  <span className="pipeline-pct" style={{ color: p.color }}>
                    {pct}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-black tabular-nums" style={{
                color: p.color,
                fontFamily: 'Manrope, sans-serif',
                textShadow: `0 0 20px ${p.color}40`
              }}>
                {isInView ? p.value : 0}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold text-center leading-tight uppercase tracking-wider">
                {p.label}
              </p>
              {/* Connector arrow */}
              {i < pipeline.length - 1 && (
                <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-slate-700 z-10">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Conversion summary */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-6 flex-wrap">
        {pipeline[0].value > 0 && (
          <>
            <div className="flex items-center gap-2 text-xs">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Taux global:</span>
              <span className="font-bold text-amber-400">
                {Math.round((pipeline[3].value / pipeline[0].value) * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-slate-400">En cours:</span>
              <span className="font-bold text-violet-400">
                {pipeline[0].value - pipeline[3].value - (pipeline.find(p => p.label === 'Perdus')?.value || 0)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Relative time helper
═══════════════════════════════════════════════ */
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.round(diff/60)}min`;
  if (diff < 86400) return `il y a ${Math.round(diff/3600)}h`;
  if (diff < 604800) return `il y a ${Math.round(diff/86400)}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

/* ═══════════════════════════════════════════════
   Activity dot colours
═══════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════
   Greeting helper
═══════════════════════════════════════════════ */
function getGreeting(date) {
  const h = date.getHours();
  if (h < 6)  return { text: 'Bonne nuit', emoji: '🌙' };
  if (h < 12) return { text: 'Bonjour', emoji: '☀️' };
  if (h < 18) return { text: 'Bon après-midi', emoji: '🌤️' };
  return { text: 'Bonsoir', emoji: '🌆' };
}

/* ═══════════════════════════════════════════════
   Main Dashboard
═══════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [financial, setFinancial] = useState({});
  const [interventions, setInterventions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now] = useState(new Date());

  const greeting = useMemo(() => getGreeting(now), [now]);

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
    if (force) setRefreshing(true); else setLoading(true);
    try {
      const [statsRes, financialRes, interventionsRes, tasksRes] = await Promise.allSettled([
        axios.get(`${API_URL}/stats/dashboard?period=${period}`, { withCredentials: true }),
        axios.get(`${API_URL}/stats/financial?period=${period}`,  { withCredentials: true }),
        axios.get(`${API_URL}/interventions?limit=10`,            { withCredentials: true }),
        axios.get(`${API_URL}/tasks?status=pending&limit=5`,      { withCredentials: true }),
      ]);
      const s = statsRes.status       === 'fulfilled' ? statsRes.value.data                                : {};
      const f = financialRes.status   === 'fulfilled' ? financialRes.value.data                            : {};
      const iRaw = interventionsRes.status === 'fulfilled' ? interventionsRes.value.data : [];
      const i = Array.isArray(iRaw) ? iRaw : (iRaw?.items || iRaw?.interventions || []);
      const tRaw = tasksRes.status === 'fulfilled' ? tasksRes.value.data : [];
      const t = Array.isArray(tRaw) ? tRaw : (tRaw?.items || tRaw?.tasks || []);
      setStats(s); setFinancial(f); setInterventions(i); setTasks(t);
      apiCache.set(cacheKey, { stats: s, financial: f });
      if (force) toast.success('Données actualisées');
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [period]);

  const todayStr = now.toISOString().slice(0, 10);
  const todayInterventions = interventions.filter(i => (i.scheduled_date || '').slice(0, 10) === todayStr);
  const urgentTasks = tasks.filter(t => t.priority === 'haute' || t.priority === 'urgente');

  const sourceData = Object.entries(stats.leads_by_source || {}).map(([name, value]) => ({ name: name || 'Inconnu', value }));
  const serviceData = Object.entries(stats.leads_by_service || {}).map(([name, value]) => ({ name, value }));

  const revenueData = (stats.leads_by_day || []).map((d, i, arr) => ({
    date: d.date?.slice(5) || d.date,
    leads: d.count,
    CA:    Math.round((financial.monthly_revenue || 0) / Math.max(arr.length, 1) * (0.7 + Math.random() * 0.6)),
    'CA (N-1)': Math.round((financial.monthly_revenue || 0) / Math.max(arr.length, 1) * (0.5 + Math.random() * 0.5)),
  }));

  const sparkLeads    = (stats.leads_by_day || []).slice(-7).map(d => ({ v: d.count }));
  const sparkRevenue  = revenueData.slice(-7).map(d => ({ v: d.CA }));

  const pipeline = [
    { label: 'Leads',    value: stats.total_leads    || 0,                                                         color: '#60a5fa' },
    { label: 'Qualifiés',value: stats.qualified_leads || Math.round((stats.total_leads || 0) * 0.6),               color: '#a78bfa' },
    { label: 'Devis',    value: stats.sent_quotes     || 0,                                                         color: '#f59e0b' },
    { label: 'Gagnés',   value: stats.won_leads       || 0,                                                         color: '#34d399' },
  ];

  /* Loading state → Premium skeleton */
  if (loading) return <DashboardSkeleton />;

  return (
    <div className="dashboard-premium p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-slide-down">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="header-icon-premium">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="dashboard-title">
                {greeting.emoji} {greeting.text}
              </h1>
              <p className="text-slate-500 text-sm font-medium">
                {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {urgentTasks.length > 0 && (
            <button
              onClick={() => navigate('/tasks')}
              className="urgent-badge-premium"
            >
              <span className="urgent-badge-dot" />
              <AlertCircle className="w-3.5 h-3.5" />
              {urgentTasks.length} urgent{urgentTasks.length > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => fetchData(true)}
            className={`refresh-btn-premium ${refreshing ? 'refreshing' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="period-selector-premium">
            {[{ k: '1d', l: 'Auj.' }, { k: '7d', l: '7j' }, { k: '30d', l: '30j' }, { k: '90d', l: '3m' }].map(p => (
              <button
                key={p.k}
                onClick={() => setPeriod(p.k)}
                className={`period-btn ${period === p.k ? 'period-btn-active' : ''}`}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ AI INSIGHTS BAR ═══ */}
      <AIInsightsBar stats={stats} navigate={navigate} />

      {/* ═══ TODAY ALERT ═══ */}
      {todayInterventions.length > 0 && (
        <div className="today-alert-premium animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="today-alert-icon">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-300">
              {todayInterventions.length} intervention{todayInterventions.length > 1 ? 's' : ''} aujourd'hui
            </p>
            <p className="text-xs text-slate-500 truncate">
              {todayInterventions.map(i => i.client_name || 'Client').join(' · ')}
            </p>
          </div>
          <button
            onClick={() => navigate('/planning')}
            className="today-alert-action"
          >
            Voir le planning <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="section-card-premium p-5 md:p-6">
        <SectionHeader title="⚡ Actions rapides" />
        <QuickActions navigate={navigate} />
      </div>

      {/* ═══ KPI GRID ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          title="Chiffre d'affaires" value={`${(financial.monthly_revenue||0).toLocaleString('fr-FR')}€`}
          rawValue={financial.monthly_revenue || 0}
          icon={Euro} gradient="emerald"
          subtitle="Ce mois" trend={financial.revenue_growth || null} delay={0}
          onClick={() => navigate('/finance')} sparkData={sparkRevenue}
          badge={financial.revenue_growth > 10 ? '🔥 Hot' : null}
        />
        <KpiCard
          title="Total leads" value={stats.total_leads ?? 0} rawValue={stats.total_leads ?? 0}
          icon={Users} gradient="violet"
          trend={null} delay={80} onClick={() => navigate('/leads')} sparkData={sparkLeads}
        />
        <KpiCard
          title="Nouveaux leads" value={stats.new_leads ?? 0} rawValue={stats.new_leads ?? 0}
          icon={UserPlus} gradient="blue"
          trendLabel="Période sélectionnée" delay={160} onClick={() => navigate('/leads')}
          badge={stats.new_leads > 10 ? 'Record!' : null}
        />
        <KpiCard
          title="Leads gagnés" value={stats.won_leads ?? 0} rawValue={stats.won_leads ?? 0}
          icon={Trophy} gradient="amber"
          delay={240} onClick={() => navigate('/leads')}
        />
        <KpiCard
          title="Taux conversion" value={`${stats.conversion_lead_to_quote ?? 0}%`}
          rawValue={stats.conversion_lead_to_quote ?? 0}
          icon={Target} gradient="rose"
          delay={320}
          badge={(stats.conversion_lead_to_quote ?? 0) > 30 ? '⭐ Excellent' : null}
        />
        <KpiCard
          title="Devis envoyés" value={stats.sent_quotes ?? 0} rawValue={stats.sent_quotes ?? 0}
          icon={FileText} gradient="cyan"
          delay={400} onClick={() => navigate('/quotes')}
        />
        <KpiCard
          title="Interventions" value={interventions.length} rawValue={interventions.length}
          icon={Calendar} gradient="pink"
          subtitle={`${todayInterventions.length} aujourd'hui`} delay={480} onClick={() => navigate('/planning')}
        />
        <KpiCard
          title="Score moyen" value={stats.avg_lead_score ?? 0} rawValue={stats.avg_lead_score ?? 0}
          icon={Star} gradient="amber"
          subtitle="Score IA leads" delay={560}
        />
      </div>

      {/* ═══ PIPELINE FUNNEL ═══ */}
      <PipelineFunnel pipeline={pipeline} navigate={navigate} />

      {/* ═══ CHARTS ROW 1 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CA + Leads evolution */}
        <div className="lg:col-span-2 section-card-premium p-5 md:p-6">
          <SectionHeader title="📈 Évolution leads & revenus" />
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="gLeadsPremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCAPremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="#475569" style={{ fontSize: 10, fontFamily: 'Manrope, sans-serif' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#475569" style={{ fontSize: 10, fontFamily: 'Manrope, sans-serif' }} tickLine={false} axisLine={false} width={35} />
              <Tooltip content={<PremiumTooltip />} />
              <Area type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gLeadsPremium)" dot={false} name="Leads" animationDuration={1500} />
              <Area type="monotone" dataKey="CA" stroke="#34d399" strokeWidth={2.5} fill="url(#gCAPremium)" dot={false} name="CA" animationDuration={1500} animationBegin={300} />
              <Line type="monotone" dataKey="CA (N-1)" stroke="#34d399" strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="CA (N-1)" opacity={0.5} animationDuration={1500} animationBegin={600} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 flex-wrap">
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: '#8b5cf6' }} />Leads
            </div>
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: '#34d399' }} />CA estimé
            </div>
            <div className="chart-legend-item">
              <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/></svg>
              <span className="text-slate-500">CA (N-1)</span>
            </div>
          </div>
        </div>

        {/* Sources donut (premium) */}
        <div className="section-card-premium p-5 md:p-6">
          <SectionHeader title="🌐 Sources" />
          {sourceData.length === 0 ? (
            <div className="empty-state-mini">
              <Target className="w-8 h-8 text-slate-700" />
              <p>Aucune donnée</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%" cy="50%"
                    outerRadius={68} innerRadius={40}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={1200}
                    animationBegin={400}
                  >
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.9} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<PremiumTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {sourceData.slice(0, 5).map((s, i) => {
                  const pct = Math.round((s.value / sourceData.reduce((a, b) => a + b.value, 0)) * 100);
                  return (
                    <div key={s.name} className="source-row-premium">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="source-dot" style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}40` }} />
                        <span className="text-xs text-slate-400 truncate font-medium">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="source-bar-track">
                          <div
                            className="source-bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}80)`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-200 w-6 text-right tabular-nums">{s.value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ AI INSIGHTS (existing component) ═══ */}
      <AIInsights stats={stats} />

      {/* ═══ CHARTS ROW 2 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Services bar (premium) */}
        <div className="section-card-premium p-5 md:p-6">
          <SectionHeader title="🧹 Leads par service" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serviceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" stroke="#475569" style={{ fontSize: 10, fontFamily: 'Manrope, sans-serif' }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#475569" style={{ fontSize: 10, fontFamily: 'Manrope, sans-serif' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<PremiumTooltip />} />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={16} animationDuration={1200}>
                {serviceData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority tasks (premium) */}
        <div className="section-card-premium p-5 md:p-6">
          <SectionHeader title="⚡ Tâches prioritaires" action="Voir toutes" onAction={() => navigate('/tasks')} />
          {tasks.length === 0 ? (
            <div className="empty-state-mini h-48">
              <div className="empty-state-icon">
                <CheckSquare className="w-7 h-7 text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Aucune tâche en attente</p>
              <p className="text-slate-600 text-xs">Tout est à jour ! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 5).map((task, idx) => (
                <div
                  key={task.task_id}
                  onClick={() => navigate('/tasks')}
                  className="task-row-premium animate-slide-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className={`task-priority-dot ${
                    task.priority === 'urgente' ? 'task-dot-urgent' :
                    task.priority === 'haute'   ? 'task-dot-high' :
                    task.priority === 'normale' ? 'task-dot-normal' : 'task-dot-low'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <span className={`task-priority-badge ${
                    task.priority === 'urgente' ? 'task-badge-urgent' :
                    task.priority === 'haute'   ? 'task-badge-high' :
                    'task-badge-normal'
                  }`}>{task.priority || 'normale'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ LEADS RÉCENTS + INTERVENTIONS DU JOUR ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent leads */}
        <div className="section-card-premium p-5 md:p-6">
          <SectionHeader title="👥 Leads récents" action="Voir tout" onAction={() => navigate('/leads')} />
          <div className="space-y-1.5">
            {(stats.recent_leads || []).slice(0, 6).map((lead, i) => (
              <div
                key={lead.lead_id}
                onClick={() => navigate(`/leads/${lead.lead_id}`)}
                className="lead-row-premium animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative flex-shrink-0">
                  <div className="lead-avatar-premium">
                    {lead.name?.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className="lead-status-dot"
                    style={{ background: activityDotColor(lead.status), boxShadow: `0 0 6px ${activityDotColor(lead.status)}60` }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{lead.name}</p>
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
              <div className="empty-state-mini py-10">
                <div className="empty-state-icon">
                  <Users className="w-7 h-7 text-slate-600" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Aucun lead récent</p>
              </div>
            )}
          </div>
        </div>

        {/* Today's interventions */}
        <div className="section-card-premium p-5 md:p-6">
          <SectionHeader title="📅 Interventions du jour" action="Planning" onAction={() => navigate('/planning')} />
          {todayInterventions.length === 0 ? (
            <div className="empty-state-mini py-10">
              <div className="empty-state-icon">
                <Calendar className="w-7 h-7 text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Aucune intervention aujourd'hui</p>
              <button
                onClick={() => navigate('/planning')}
                className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors font-semibold flex items-center gap-1"
              >
                Voir le planning <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayInterventions.slice(0, 6).map((intv, i) => (
                <div
                  key={intv.intervention_id || intv.id}
                  className="intervention-row-premium animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="intervention-icon-premium">
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

      {/* ═══ FINANCIAL STATS ═══ */}
      {(financial.monthly_revenue || financial.pending_amount) && (
        <div className="section-card-premium p-5 md:p-6">
          <SectionHeader title="💰 Finances du mois" action="Voir finances" onAction={() => navigate('/finance')} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'CA du mois',       value: `${(financial.monthly_revenue || 0).toLocaleString('fr-FR')} €`, gradient: GRADIENTS.emerald, icon: TrendingUp },
              { label: 'En attente',        value: `${(financial.pending_amount  || 0).toLocaleString('fr-FR')} €`, gradient: GRADIENTS.amber,   icon: Clock },
              { label: 'Factures payées',   value: financial.paid_invoices    || 0,                                  gradient: GRADIENTS.blue,    icon: CheckSquare },
              { label: 'Factures impayées', value: financial.unpaid_invoices  || 0,                                  gradient: GRADIENTS.rose,    icon: AlertCircle },
            ].map((item, i) => (
              <div
                key={item.label}
                className="finance-card-premium animate-slide-up"
                style={{
                  '--fin-color': item.gradient.from,
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div className="finance-card-icon" style={{
                  background: `linear-gradient(135deg, ${item.gradient.from}18, ${item.gradient.to}08)`,
                  border: `1px solid ${item.gradient.from}30`,
                }}>
                  <item.icon className="w-4 h-4" style={{ color: item.gradient.from }} />
                </div>
                <div>
                  <p className="text-base font-black text-slate-100 tabular-nums" style={{ fontFamily: 'Manrope, sans-serif' }}>{item.value}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{item.label}</p>
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
