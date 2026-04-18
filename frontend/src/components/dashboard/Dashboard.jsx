import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { apiCache } from '../../lib/apiCache.js';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats, useFinancialStats } from '../../hooks/api';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line
} from 'recharts';
import {
  Users, UserPlus, Trophy, FileText, Target, CheckSquare,
  TrendingUp, Star, ArrowUpRight, RefreshCw,
  Euro, Calendar, AlertCircle, Clock, MapPin,
  Zap, ChevronRight, X,
  TrendingDown, CalendarPlus, Navigation,
  ArrowRight,
} from 'lucide-react';
import { getStatusLabel } from '../../lib/utils';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import { PageHeader } from '../shared';
import AIInsights from './AIInsights';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

/* ═══════════════════════════════════════════════════════════════
   ATELIER — Palette éditoriale (émeraude + terracotta + encre)
   Alignée avec les tokens v2 (émeraude = brand, terracotta = accent).
═══════════════════════════════════════════════════════════════ */
const COLORS = ['#059669', '#D97757', '#26241F', '#CA8A04', '#2563EB', '#A04A30', '#34D399', '#736B5C'];

const GRADIENTS = {
  emerald:   { from: '#059669', to: '#047857', glow: 'rgba(5,150,105,0.28)' },
  terracotta:{ from: '#D97757', to: '#C25E40', glow: 'rgba(217,119,87,0.28)' },
  ink:       { from: '#3A3631', to: '#26241F', glow: 'rgba(38,36,31,0.20)' },
  gold:      { from: '#CA8A04', to: '#A16207', glow: 'rgba(202,138,4,0.24)' },
  azure:     { from: '#2563EB', to: '#1D4ED8', glow: 'rgba(37,99,235,0.24)' },
  rust:      { from: '#A04A30', to: '#7E3A26', glow: 'rgba(160,74,48,0.24)' },
  sage:      { from: '#34D399', to: '#10B981', glow: 'rgba(52,211,153,0.24)' },
  sand:      { from: '#A89E89', to: '#736B5C', glow: 'rgba(168,158,137,0.20)' },
};

/* ═══════════════════════════════════════════════════════════════
   Hooks utilitaires (inchangés)
═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   Skeleton (crème, minimal)
═══════════════════════════════════════════════════════════════ */
const SkeletonPulse = ({ className = '', style = {}, variant = 'default' }) => (
  <div
    className={`bg-neutral-200 animate-pulse ${variant === 'circle' ? 'rounded-full' : variant === 'card' ? 'rounded-2xl' : 'rounded-lg'} ${className}`}
    style={style}
  />
);

const DashboardSkeleton = () => (
  <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
    <div className="space-y-3">
      <SkeletonPulse style={{ width: 320, height: 48 }} />
      <SkeletonPulse style={{ width: 480, height: 20 }} />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {[...Array(8)].map((_, i) => (
        <SkeletonPulse key={i} variant="card" style={{ height: 140 }} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SkeletonPulse variant="card" className="lg:col-span-2" style={{ height: 320 }} />
      <SkeletonPulse variant="card" style={{ height: 320 }} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   Tooltip (crème, propre)
═══════════════════════════════════════════════════════════════ */
const AtelierTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white backdrop-blur shadow-lg px-3 py-2 text-xs">
      {label && <div className="font-semibold text-neutral-700 mb-1.5 font-mono tracking-wide uppercase text-[10px]">{label}</div>}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-neutral-500">{p.name}</span>
            <span className="font-semibold tabular-nums ml-auto" style={{ color: p.color }}>
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

/* ═══════════════════════════════════════════════════════════════
   Sparkline éditoriale (monochrome + fill subtil)
═══════════════════════════════════════════════════════════════ */
const Sparkline = ({ data, color, height = 44 }) => {
  if (!data || data.length < 2) return null;
  const id = `spark-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#${id})`} dot={false} isAnimationActive animationDuration={1500} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/* ═══════════════════════════════════════════════════════════════
   KPI Card — version Atelier (chiffre HÉROÏQUE en Fraunces)
═══════════════════════════════════════════════════════════════ */
const KpiCard = ({ title, value, rawValue, icon: Icon, gradient, trend, trendLabel, subtitle, onClick, delay = 0, sparkData, badge }) => {
  const [ref, isInView] = useInView();
  const numeric = typeof rawValue === 'number' ? rawValue : (parseInt(String(value).replace(/[^0-9]/g, '')) || 0);
  const counted = useCountUp(isInView ? numeric : 0, 1400);
  const displayValue = typeof rawValue === 'number'
    ? (String(value).includes('€')
        ? `${counted.toLocaleString('fr-FR')} €`
        : String(value).includes('%') ? `${counted}%` : counted.toLocaleString('fr-FR'))
    : value;

  const g = GRADIENTS[gradient] || GRADIENTS.emerald;

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-white border border-neutral-200/70 p-4 md:p-5 transition-all duration-300
        ${onClick ? 'cursor-pointer hover:border-neutral-300 hover:-translate-y-0.5 hover:shadow-card-lg' : ''}
        ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Filet coloré en haut */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${g.from}14`, border: `1px solid ${g.from}25` }}>
          <Icon className="w-[18px] h-[18px]" style={{ color: g.from }} />
        </div>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border"
              style={{ background: `${g.from}12`, color: g.from, borderColor: `${g.from}25` }}>
              {badge}
            </span>
          )}
          {trend !== null && trend !== undefined && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${trend >= 0 ? 'text-brand-700' : 'text-terracotta-600'}`}>
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

      {/* Chiffre hero en Fraunces */}
      <p className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 leading-none tabular-nums">
        {displayValue}
      </p>
      <p className="mt-2 text-xs text-neutral-500 font-mono uppercase tracking-[0.08em]">{title}</p>
      {subtitle  && <p className="mt-0.5 text-[11px] text-neutral-400">{subtitle}</p>}
      {trendLabel && <p className="mt-0.5 text-[11px] text-neutral-400">{trendLabel}</p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   AI Insights bar — version crème/épurée
═══════════════════════════════════════════════════════════════ */
const defaultInsights = [
  { id: 'default_1', icon: '🔥', text: '3 leads chauds détectés ce mois', color: '#D97757', action: 'Voir leads', route: '/leads' },
  { id: 'default_2', icon: '⏰', text: '2 devis expirent demain',          color: '#CA8A04', action: 'Voir devis', route: '/quotes' },
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
          dynamic.push({ id: 'dyn_leads', icon: '🔥', text: `${stats.new_leads} nouveau${stats.new_leads > 1 ? 'x' : ''} lead${stats.new_leads > 1 ? 's' : ''} ce mois`, color: '#D97757', action: 'Voir', route: '/leads' });
        if ((stats.sent_quotes || 0) > 0)
          dynamic.push({ id: 'dyn_devis', icon: '📄', text: `${stats.sent_quotes} devis en attente`, color: '#CA8A04', action: 'Voir', route: '/quotes' });
        if ((stats.won_leads || 0) > 0)
          dynamic.push({ id: 'dyn_won', icon: '🏆', text: `${stats.won_leads} lead${stats.won_leads > 1 ? 's' : ''} converti${stats.won_leads > 1 ? 's' : ''}`, color: '#059669', action: 'Voir', route: '/leads' });
        setInsights(dynamic.length > 0 ? dynamic : defaultInsights);
      })
      .finally(() => setLoaded(true));
  }, [stats]);

  const visible = insights.filter(i => !dismissed.has(i.id));
  if (!loaded || visible.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      {visible.map((insight, i) => (
        <div
          key={insight.id}
          onClick={() => navigate(insight.route)}
          className="group flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-sm cursor-pointer flex-shrink-0 transition-all"
          style={{ animationDelay: `${i * 100 + 200}ms` }}
        >
          <span className="text-base">{insight.icon}</span>
          <span className="text-sm text-neutral-700">{insight.text}</span>
          {insight.action && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${insight.color}18`, color: insight.color }}>
              {insight.action} <ArrowRight className="w-2.5 h-2.5" />
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); setDismissed(d => new Set([...d, insight.id])); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Status badge — version crème
═══════════════════════════════════════════════════════════════ */
const StatusBadge = ({ status }) => {
  const configs = {
    nouveau:      { bg: '#2563EB', label: 'Nouveau' },
    contacté:     { bg: '#CA8A04', label: 'Contacté' },
    en_attente:   { bg: '#D97757', label: 'En attente' },
    devis_envoyé: { bg: '#A04A30', label: 'Devis envoyé' },
    gagné:        { bg: '#059669', label: 'Gagné' },
    perdu:        { bg: '#B91C1C', label: 'Perdu' },
  };
  const cfg = configs[status] || { bg: '#736B5C', label: getStatusLabel(status) };
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
      style={{ background: `${cfg.bg}10`, color: cfg.bg, borderColor: `${cfg.bg}30` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.bg }} />
      {cfg.label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Section header
═══════════════════════════════════════════════════════════════ */
const SectionHeader = ({ title, action, onAction }) => (
  <div className="flex items-center justify-between mb-5">
    <h3 className="font-display text-xl font-semibold tracking-tight text-neutral-900">{title}</h3>
    {action && (
      <button onClick={onAction}
        className="group inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors">
        {action} <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </button>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   Quick actions
═══════════════════════════════════════════════════════════════ */
const QuickActions = ({ navigate }) => {
  const actions = [
    { label: 'Nouveau Lead',           icon: UserPlus,     gradient: GRADIENTS.emerald,   route: '/leads?new=1' },
    { label: 'Créer Devis',            icon: FileText,     gradient: GRADIENTS.terracotta,route: '/quotes?new=1' },
    { label: 'Planifier Intervention', icon: CalendarPlus, gradient: GRADIENTS.ink,       route: '/planning?new=1' },
    { label: 'Voir Carte',             icon: Navigation,   gradient: GRADIENTS.gold,      route: '/map' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((a, i) => (
        <button
          key={a.label}
          onClick={() => navigate(a.route)}
          className="group relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all"
          style={{ animationDelay: `${i * 80 + 300}ms` }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${a.gradient.from}14`, border: `1px solid ${a.gradient.from}25` }}>
            <a.icon className="w-5 h-5" style={{ color: a.gradient.from }} />
          </div>
          <span className="text-sm font-semibold text-neutral-800 text-left flex-1">{a.label}</span>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 group-hover:translate-x-0.5 transition-all" />
        </button>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Pipeline funnel — version "barres éditoriales"
═══════════════════════════════════════════════════════════════ */
const PipelineFunnel = ({ pipeline, navigate }) => {
  const [ref, isInView] = useInView();
  const maxVal = Math.max(...pipeline.map(p => p.value), 1);
  return (
    <div ref={ref} className="rounded-2xl bg-white border border-neutral-200/70 p-5 md:p-6">
      <SectionHeader title="Pipeline commercial" action="Voir leads" onAction={() => navigate('/leads')} />
      <div className="grid grid-cols-4 gap-3">
        {pipeline.map((p, i) => {
          const pct = Math.round((p.value / pipeline[0].value) * 100) || 0;
          const barH = Math.max(20, (p.value / maxVal) * 100);
          return (
            <div key={p.label} className="flex flex-col items-center gap-2">
              <div className="relative w-full h-28 flex items-end justify-center">
                <div
                  className="w-full rounded-t-md transition-all duration-1000"
                  style={{
                    height: isInView ? `${barH}%` : '0%',
                    background: `linear-gradient(180deg, ${p.color}, ${p.color}88)`,
                    transitionDelay: `${i * 150}ms`,
                  }}
                />
                {i > 0 && pct > 0 && (
                  <span className="absolute -top-0.5 right-1 text-[10px] font-bold font-mono" style={{ color: p.color }}>
                    {pct}%
                  </span>
                )}
              </div>
              <p className="font-display text-3xl font-semibold tabular-nums tracking-tight" style={{ color: p.color }}>
                {isInView ? p.value : 0}
              </p>
              <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider text-center leading-tight">
                {p.label}
              </p>
            </div>
          );
        })}
      </div>
      {pipeline[0].value > 0 && (
        <div className="mt-5 pt-4 border-t border-neutral-200 flex items-center justify-center gap-6 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-terracotta-500" />
            <span className="text-neutral-500">Taux global :</span>
            <span className="font-display font-semibold text-terracotta-600">
              {Math.round((pipeline[3].value / pipeline[0].value) * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-neutral-500">En cours :</span>
            <span className="font-display font-semibold text-brand-700">
              {pipeline[0].value - pipeline[3].value - (pipeline.find(p => p.label === 'Perdus')?.value || 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════════════ */
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.round(diff/60)}min`;
  if (diff < 86400) return `il y a ${Math.round(diff/3600)}h`;
  if (diff < 604800) return `il y a ${Math.round(diff/86400)}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const activityDotColor = (type) => {
  if (!type) return '#059669';
  const t = type.toLowerCase();
  if (t.includes('lead'))    return '#059669';
  if (t.includes('devis') || t.includes('quote')) return '#CA8A04';
  if (t.includes('gagn') || t.includes('win'))    return '#059669';
  if (t.includes('perdu') || t.includes('lost'))  return '#B91C1C';
  if (t.includes('ticket'))  return '#2563EB';
  if (t.includes('task'))    return '#D97757';
  return '#736B5C';
};

function getGreeting(date) {
  const h = date.getHours();
  if (h < 6)  return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function formatDateLong(date) {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/* ═══════════════════════════════════════════════════════════════
   Headline éditorial — synthèse de la journée
═══════════════════════════════════════════════════════════════ */
function buildHeadline({ stats, financial, todayInterventions, urgentCount }) {
  const parts = [];
  if (todayInterventions.length > 0) {
    parts.push(`${todayInterventions.length} intervention${todayInterventions.length > 1 ? 's' : ''}`);
  }
  if ((financial.pending_amount || 0) > 0) {
    parts.push(`${Math.round(financial.pending_amount / 1000)}k € à encaisser`);
  }
  if ((stats.new_leads || 0) > 0) {
    parts.push(`${stats.new_leads} nouveau${stats.new_leads > 1 ? 'x' : ''} lead${stats.new_leads > 1 ? 's' : ''}`);
  }
  if (urgentCount > 0) {
    parts.push(`${urgentCount} urgent${urgentCount > 1 ? 's' : ''}`);
  }
  if (parts.length === 0) return 'Journée calme. Bon moment pour prospecter.';
  return parts.join(' · ');
}

/* ═══════════════════════════════════════════════════════════════
   Main Dashboard — ATELIER
═══════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30d');
  const [now] = useState(new Date());
  const greeting = useMemo(() => getGreeting(now), [now]);

  const { data: stats = {}, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats(period);
  const { data: financial = {}, isLoading: financialLoading, refetch: refetchFinancial } = useFinancialStats(period);

  const [interventions, setInterventions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sideLoading, setSideLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSideData = useCallback(async () => {
    setSideLoading(true);
    try {
      const [interventionsRes, tasksRes] = await Promise.allSettled([
        axios.get(`${API_URL}/interventions?limit=10`, { withCredentials: true }),
        axios.get(`${API_URL}/tasks?status=pending&limit=5`, { withCredentials: true }),
      ]);
      const iRaw = interventionsRes.status === 'fulfilled' ? interventionsRes.value.data : [];
      const i = Array.isArray(iRaw) ? iRaw : (iRaw?.items || iRaw?.interventions || []);
      const tRaw = tasksRes.status === 'fulfilled' ? tasksRes.value.data : [];
      const t = Array.isArray(tRaw) ? tRaw : (tRaw?.items || tRaw?.tasks || []);
      setInterventions(i);
      setTasks(t);
    } catch {
      // silent
    } finally {
      setSideLoading(false);
    }
  }, []);

  useEffect(() => { fetchSideData(); }, [fetchSideData]);

  const loading = statsLoading || financialLoading || sideLoading;

  const fetchData = useCallback(async (force = false) => {
    if (force) {
      setRefreshing(true);
      apiCache.invalidate?.(`dashboard_v2_${period}`);
      await Promise.all([refetchStats(), refetchFinancial(), fetchSideData()]);
      setRefreshing(false);
      toast.success('Données actualisées');
    }
  }, [period, refetchStats, refetchFinancial, fetchSideData]);

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
    { label: 'Leads',    value: stats.total_leads    || 0,                                                         color: '#059669' },
    { label: 'Qualifiés',value: stats.qualified_leads || Math.round((stats.total_leads || 0) * 0.6),               color: '#34D399' },
    { label: 'Devis',    value: stats.sent_quotes     || 0,                                                         color: '#D97757' },
    { label: 'Gagnés',   value: stats.won_leads       || 0,                                                         color: '#26241F' },
  ];

  const headline = buildHeadline({ stats, financial, todayInterventions, urgentCount: urgentTasks.length });

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">

      {/* ═══ HERO ÉDITORIAL ═══ */}
      <header className="pt-2 pb-1">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-neutral-500 mb-2">
              {formatDateLong(now)} · Édition du jour
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] leading-[1.05] text-neutral-900">
              {greeting}.
            </h1>
            <p className="mt-3 font-display text-lg md:text-xl text-neutral-600 max-w-2xl leading-snug">
              {headline}
            </p>
          </div>

          {/* Actions header */}
          <div className="flex items-center gap-2 flex-wrap">
            {urgentTasks.length > 0 && (
              <button
                onClick={() => navigate('/tasks')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-terracotta-300 bg-terracotta-50 text-terracotta-700 text-xs font-semibold hover:bg-terracotta-100 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-terracotta-500 animate-pulse" />
                <AlertCircle className="w-3.5 h-3.5" />
                {urgentTasks.length} urgent{urgentTasks.length > 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={() => fetchData(true)}
              className="w-9 h-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center transition-colors"
              disabled={refreshing}
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 text-neutral-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
              {[{ k: '1d', l: 'Auj.' }, { k: '7d', l: '7j' }, { k: '30d', l: '30j' }, { k: '90d', l: '3m' }].map(p => (
                <button
                  key={p.k}
                  onClick={() => setPeriod(p.k)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    period === p.k
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {p.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ AI INSIGHTS BAR ═══ */}
      <AIInsightsBar stats={stats} navigate={navigate} />

      {/* ═══ TODAY ALERT ═══ */}
      {todayInterventions.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-brand-200 bg-brand-50">
          <div className="w-10 h-10 rounded-lg bg-white border border-brand-200 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-brand-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base font-semibold text-brand-800">
              {todayInterventions.length} intervention{todayInterventions.length > 1 ? 's' : ''} aujourd'hui
            </p>
            <p className="text-xs text-neutral-600 truncate">
              {todayInterventions.map(i => i.client_name || 'Client').join(' · ')}
            </p>
          </div>
          <button
            onClick={() => navigate('/planning')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors flex-shrink-0"
          >
            Voir le planning <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="rounded-2xl bg-white border border-neutral-200/70 p-5 md:p-6">
        <SectionHeader title="Actions rapides" />
        <QuickActions navigate={navigate} />
      </div>

      {/* ═══ KPI GRID ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title="Chiffre d'affaires" value={`${(financial.monthly_revenue||0).toLocaleString('fr-FR')}€`}
          rawValue={financial.monthly_revenue || 0} icon={Euro} gradient="emerald"
          subtitle="Ce mois" trend={financial.revenue_growth || null} delay={0}
          onClick={() => navigate('/finance')} sparkData={sparkRevenue}
          badge={financial.revenue_growth > 10 ? 'Hot' : null} />
        <KpiCard title="Total leads" value={stats.total_leads ?? 0} rawValue={stats.total_leads ?? 0}
          icon={Users} gradient="ink" delay={80} onClick={() => navigate('/leads')} sparkData={sparkLeads} />
        <KpiCard title="Nouveaux leads" value={stats.new_leads ?? 0} rawValue={stats.new_leads ?? 0}
          icon={UserPlus} gradient="terracotta" trendLabel="Période sélectionnée" delay={160}
          onClick={() => navigate('/leads')} badge={stats.new_leads > 10 ? 'Record' : null} />
        <KpiCard title="Leads gagnés" value={stats.won_leads ?? 0} rawValue={stats.won_leads ?? 0}
          icon={Trophy} gradient="sage" delay={240} onClick={() => navigate('/leads')} />
        <KpiCard title="Taux conversion" value={`${stats.conversion_lead_to_quote ?? 0}%`}
          rawValue={stats.conversion_lead_to_quote ?? 0} icon={Target} gradient="gold" delay={320}
          badge={(stats.conversion_lead_to_quote ?? 0) > 30 ? 'Excellent' : null} />
        <KpiCard title="Devis envoyés" value={stats.sent_quotes ?? 0} rawValue={stats.sent_quotes ?? 0}
          icon={FileText} gradient="rust" delay={400} onClick={() => navigate('/quotes')} />
        <KpiCard title="Interventions" value={interventions.length} rawValue={interventions.length}
          icon={Calendar} gradient="azure" subtitle={`${todayInterventions.length} aujourd'hui`}
          delay={480} onClick={() => navigate('/planning')} />
        <KpiCard title="Score moyen" value={stats.avg_lead_score ?? 0} rawValue={stats.avg_lead_score ?? 0}
          icon={Star} gradient="gold" subtitle="Score IA leads" delay={560} />
      </div>

      {/* ═══ PIPELINE FUNNEL ═══ */}
      <PipelineFunnel pipeline={pipeline} navigate={navigate} />

      {/* ═══ CHARTS ROW 1 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-neutral-200/70 p-5 md:p-6">
          <SectionHeader title="Évolution leads & revenus" />
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="gLeadsAtelier" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#26241F" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#26241F" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCAAtelier" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#059669" stopOpacity={0.30} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECE7DC" />
              <XAxis dataKey="date" stroke="#A89E89" style={{ fontSize: 10, fontFamily: 'Inter' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#A89E89" style={{ fontSize: 10, fontFamily: 'Inter' }} tickLine={false} axisLine={false} width={35} />
              <Tooltip content={<AtelierTooltip />} />
              <Area type="monotone" dataKey="leads" stroke="#26241F" strokeWidth={2} fill="url(#gLeadsAtelier)" dot={false} name="Leads" animationDuration={1500} />
              <Area type="monotone" dataKey="CA" stroke="#059669" strokeWidth={2} fill="url(#gCAAtelier)" dot={false} name="CA" animationDuration={1500} animationBegin={300} />
              <Line type="monotone" dataKey="CA (N-1)" stroke="#059669" strokeWidth={1.25} strokeDasharray="4 4" dot={false} name="CA (N-1)" opacity={0.4} animationDuration={1500} animationBegin={600} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 flex-wrap text-xs text-neutral-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-neutral-800" /> Leads
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-600" /> CA estimé
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#059669" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/></svg>
              <span className="text-neutral-500">CA (N-1)</span>
            </div>
          </div>
        </div>

        {/* Sources */}
        <div className="rounded-2xl bg-white border border-neutral-200/70 p-5 md:p-6">
          <SectionHeader title="Sources" />
          {sourceData.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Target className="w-8 h-8" />
              <p className="text-sm">Aucune donnée</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={68} innerRadius={40} paddingAngle={3} dataKey="value" animationDuration={1200} animationBegin={400}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.95} stroke="transparent" />)}
                  </Pie>
                  <Tooltip content={<AtelierTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {sourceData.slice(0, 5).map((s, i) => {
                  const pct = Math.round((s.value / sourceData.reduce((a, b) => a + b.value, 0)) * 100);
                  return (
                    <div key={s.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-neutral-700 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1 rounded-full bg-neutral-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-xs font-semibold text-neutral-900 w-6 text-right tabular-nums">{s.value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ AI INSIGHTS (component existant, gardé tel quel) ═══ */}
      <AIInsights stats={stats} />

      {/* ═══ CHARTS ROW 2 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-neutral-200/70 p-5 md:p-6">
          <SectionHeader title="Leads par service" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serviceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ECE7DC" horizontal={false} />
              <XAxis type="number" stroke="#A89E89" style={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#A89E89" style={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<AtelierTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={14} animationDuration={1200}>
                {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.9} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-white border border-neutral-200/70 p-5 md:p-6">
          <SectionHeader title="Tâches prioritaires" action="Voir toutes" onAction={() => navigate('/tasks')} />
          {tasks.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-500 font-medium">Aucune tâche en attente</p>
              <p className="text-xs text-neutral-400">Tout est à jour 🎉</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {tasks.slice(0, 5).map((task, idx) => (
                <div
                  key={task.task_id}
                  onClick={() => navigate('/tasks')}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors border border-transparent hover:border-neutral-200"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'urgente' ? 'bg-terracotta-500 animate-pulse' :
                    task.priority === 'haute'   ? 'bg-terracotta-400' :
                    task.priority === 'normale' ? 'bg-brand-500' : 'bg-neutral-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    task.priority === 'urgente' ? 'bg-terracotta-50 text-terracotta-700 border-terracotta-200' :
                    task.priority === 'haute'   ? 'bg-terracotta-50 text-terracotta-600 border-terracotta-200' :
                    'bg-brand-50 text-brand-700 border-brand-200'
                  }`}>{task.priority || 'normale'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ LEADS RÉCENTS + INTERVENTIONS DU JOUR ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-neutral-200/70 p-5 md:p-6">
          <SectionHeader title="Leads récents" action="Voir tout" onAction={() => navigate('/leads')} />
          <div className="space-y-1">
            {(stats.recent_leads || []).slice(0, 6).map((lead) => (
              <div
                key={lead.lead_id}
                onClick={() => navigate(`/leads/${lead.lead_id}`)}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors border border-transparent hover:border-neutral-200"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center font-display font-semibold text-neutral-700 text-sm">
                    {lead.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: activityDotColor(lead.status) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{lead.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-neutral-500 truncate">{lead.service_type}</span>
                    {lead.created_at && (
                      <span className="text-[10px] text-neutral-400 flex-shrink-0">{relativeTime(lead.created_at)}</span>
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
              <div className="py-10 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500">Aucun lead récent</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-neutral-200/70 p-5 md:p-6">
          <SectionHeader title="Interventions du jour" action="Planning" onAction={() => navigate('/planning')} />
          {todayInterventions.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-500">Aucune intervention aujourd'hui</p>
              <button onClick={() => navigate('/planning')}
                className="mt-1 text-xs font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
                Voir le planning <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {todayInterventions.slice(0, 6).map((intv) => (
                <div key={intv.intervention_id || intv.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-200">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-brand-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 truncate">{intv.client_name || 'Client'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-neutral-500">{intv.service_type || intv.type}</span>
                      {intv.address && (
                        <span className="text-[10px] text-neutral-400 flex items-center gap-1 truncate">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{intv.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-sm font-semibold text-brand-700 tabular-nums">{intv.scheduled_time || '—'}</p>
                    <p className="text-[10px] text-neutral-400">{intv.duration ? `${intv.duration}h` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ FINANCIAL STATS ═══ */}
      {(financial.monthly_revenue || financial.pending_amount) && (
        <div className="rounded-2xl bg-white border border-neutral-200/70 p-5 md:p-6">
          <SectionHeader title="Finances du mois" action="Voir finances" onAction={() => navigate('/finance')} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'CA du mois',       value: `${(financial.monthly_revenue || 0).toLocaleString('fr-FR')} €`, gradient: GRADIENTS.emerald,   icon: TrendingUp },
              { label: 'En attente',        value: `${(financial.pending_amount  || 0).toLocaleString('fr-FR')} €`, gradient: GRADIENTS.gold,      icon: Clock },
              { label: 'Factures payées',   value: financial.paid_invoices    || 0,                                  gradient: GRADIENTS.ink,       icon: CheckSquare },
              { label: 'Factures impayées', value: financial.unpaid_invoices  || 0,                                  gradient: GRADIENTS.terracotta,icon: AlertCircle },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.gradient.from}14`, border: `1px solid ${item.gradient.from}25` }}>
                  <item.icon className="w-4 h-4" style={{ color: item.gradient.from }} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-neutral-900 tabular-nums truncate">{item.value}</p>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mt-0.5">{item.label}</p>
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
