/**
 * DirectorDashboard — ATELIER direction
 * Crème / Fraunces / émeraude (brand) / terracotta / amber
 * Vue exécutive : KPI, santé business, entonnoir, carte Paris, top leads.
 * Logique 100% préservée.
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Target, Zap, Star,
  CheckCircle, RefreshCw, Sparkles, Trophy, MapPin, Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../shared';
import BACKEND_URL from '../../config.js';

const API = BACKEND_URL + '/api';

// Palette atelier (pour charts, remplace l'ancienne palette violet/slate)
// émeraude → ambre → terracotta → encre → lin
const ATELIER_COLORS = ['#047857', '#d97706', '#c2410c', '#44403c', '#a8a29e', '#14532d'];

// ── KPI Card (crème / card claire, trend émeraude/terracotta) ─────
function KPICard({ title, value, subtitle, icon: Icon, tone = 'neutral', trend, change, onClick }) {
  const tones = {
    brand:      { wrap: 'bg-brand-50 ring-brand-200',           icon: 'text-brand-700' },
    terracotta: { wrap: 'bg-terracotta-50 ring-terracotta-200', icon: 'text-terracotta-700' },
    amber:      { wrap: 'bg-amber-50 ring-amber-200',           icon: 'text-amber-700' },
    neutral:    { wrap: 'bg-neutral-100 ring-neutral-200',      icon: 'text-neutral-700' },
  };
  const t = tones[tone] || tones.neutral;

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-neutral-200 bg-white p-5 transition-all ${
        onClick ? 'cursor-pointer hover:border-neutral-300 hover:shadow-card-lg' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-inset ${t.wrap}`}>
          <Icon className={`w-5 h-5 ${t.icon}`} />
        </div>
        {change && (
          <div
            className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.08em] px-2 py-1 rounded-full ring-1 ring-inset ${
              trend === 'up'
                ? 'bg-brand-50 text-brand-700 ring-brand-200'
                : 'bg-terracotta-50 text-terracotta-700 ring-terracotta-200'
            }`}
          >
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <p className="font-display font-semibold text-3xl text-neutral-900 leading-none tabular-nums">{value}</p>
      <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-neutral-500 mt-2">{title}</p>
      {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ── Health Score (circulaire, palette atelier) ───────────────────
function HealthScore({ score }) {
  // émeraude → amber → terracotta
  const color = score >= 75 ? '#047857' : score >= 50 ? '#d97706' : '#c2410c';
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Bon' : 'À améliorer';
  const c = 2 * Math.PI * 45;
  const offset = c - (score / 100) * c;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col items-center">
      <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 self-start mb-4">
        Santé business
      </h3>
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e0d6" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,0.61,0.36,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-semibold text-4xl leading-none" style={{ color }}>{score}</span>
          <span className="text-[10px] font-mono text-neutral-400 mt-0.5">/100</span>
        </div>
      </div>
      <p className="text-sm font-semibold mt-4" style={{ color }}>{label}</p>
    </div>
  );
}

// ── Recommandations IA (pastilles typées, pas d'emoji) ────────────
function Recommandations({ stats }) {
  const recs = [];
  if ((stats?.conversion_lead_to_quote || 0) < 30 && (stats?.new_leads || 0) > 0) {
    recs.push({ tone: 'danger', priority: 'Urgent', text: "Taux de conversion faible. Envoyez vos devis dans l'heure." });
  }
  if ((stats?.avg_lead_score || 0) > 70) {
    recs.push({ tone: 'warning', priority: 'Priorité', text: `Score moyen élevé (${stats.avg_lead_score}/100). Convertissez maintenant !` });
  }
  if ((stats?.pending_tasks || 0) > 3) {
    recs.push({ tone: 'warning', priority: 'Action', text: `${stats.pending_tasks} tâches en attente. Traitez-les rapidement.` });
  }
  if (recs.length === 0) {
    recs.push({ tone: 'success', priority: 'Info', text: "Tout est en ordre ! Pensez à demander des avis clients." });
  }

  const tones = {
    danger:  { bg: 'bg-terracotta-50', ring: 'ring-terracotta-200', pill: 'bg-terracotta-100 text-terracotta-800 ring-terracotta-200' },
    warning: { bg: 'bg-amber-50',      ring: 'ring-amber-200',      pill: 'bg-amber-100 text-amber-800 ring-amber-200' },
    success: { bg: 'bg-brand-50',      ring: 'ring-brand-200',      pill: 'bg-brand-100 text-brand-800 ring-brand-200' },
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-brand-700" />
        <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500">
          Recommandations IA
        </h3>
      </div>
      <div className="space-y-3">
        {recs.map((r, i) => {
          const t = tones[r.tone];
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ring-1 ring-inset ${t.bg} ${t.ring}`}>
              <div className="flex-1">
                <span className={`text-[10px] font-mono uppercase tracking-[0.08em] px-2 py-0.5 rounded-full ring-1 ring-inset ${t.pill}`}>
                  {r.priority}
                </span>
                <p className="text-sm text-neutral-800 mt-2 leading-relaxed">{r.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Objectifs du mois ─────────────────────────────────────────────
function Objectifs({ stats, financial }) {
  const items = [
    { label: 'Leads', current: stats?.new_leads || 0, target: 50, bar: 'bg-brand-600' },
    { label: 'CA (€)', current: financial?.total_revenue || 0, target: 5000, bar: 'bg-terracotta-500' },
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-brand-700" />
        <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500">
          Objectifs du mois
        </h3>
      </div>
      <div className="space-y-5">
        {items.map((obj, i) => {
          const pct = Math.min(100, Math.round((obj.current / obj.target) * 100));
          return (
            <div key={i}>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm font-semibold text-neutral-700">{obj.label}</span>
                <span className="text-sm font-mono tabular-nums text-neutral-900">
                  {obj.current.toLocaleString('fr-FR')} / {obj.target.toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${obj.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] font-mono tabular-nums text-neutral-500 mt-1">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Entonnoir de conversion ───────────────────────────────────────
function ConversionFunnel({ stats }) {
  const total = stats?.total_leads || 0;
  const contacted = Math.round(total * 0.75);
  const quoted = stats?.sent_quotes || 0;
  const won = stats?.won_leads || 0;

  const steps = [
    { label: 'Leads entrants',  value: total,     bar: 'bg-neutral-700',     dot: 'bg-neutral-700',     pct: 100 },
    { label: 'Contactés',        value: contacted, bar: 'bg-brand-500',       dot: 'bg-brand-500',       pct: total > 0 ? Math.round(contacted/total*100) : 0 },
    { label: 'Devis envoyés',    value: quoted,    bar: 'bg-amber-500',       dot: 'bg-amber-500',       pct: total > 0 ? Math.round(quoted/total*100) : 0 },
    { label: 'Clients gagnés',   value: won,       bar: 'bg-terracotta-500',  dot: 'bg-terracotta-500',  pct: total > 0 ? Math.round(won/total*100) : 0 },
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-5">
        <Filter className="w-4 h-4 text-brand-700" />
        <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500">
          Entonnoir de conversion
        </h3>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${step.dot}`} />
                <span className="text-sm font-semibold text-neutral-700">{step.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums text-neutral-500">{step.pct}%</span>
                <span className="font-display font-semibold text-lg text-neutral-900 tabular-nums">{step.value}</span>
              </div>
            </div>
            <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${step.bar}`}
                style={{ width: `${step.pct}%`, opacity: 0.85 }}
              />
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-end mt-1">
                <span className="text-[10px] font-mono text-neutral-400">
                  {steps[i+1].value > 0 && step.value > 0
                    ? `${Math.round(steps[i+1].value/step.value*100)}% passent à l'étape suivante`
                    : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 p-4 rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-200">
        <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-brand-700 mb-1">
          Taux de closing global
        </p>
        <p className="font-display font-semibold text-3xl text-brand-700 tabular-nums">
          {total > 0 ? Math.round(won/total*100) : 0}%
        </p>
        <p className="text-xs text-neutral-600 mt-1">{won} clients sur {total} leads</p>
      </div>
    </div>
  );
}

// ── Carte Paris (palette atelier) ─────────────────────────────────
function ParisMap({ leads }) {
  const ZONES = [
    { code: '75001', name: '1er', x: 52, y: 48 }, { code: '75002', name: '2e', x: 56, y: 45 },
    { code: '75003', name: '3e',  x: 61, y: 46 }, { code: '75004', name: '4e', x: 59, y: 50 },
    { code: '75005', name: '5e',  x: 56, y: 54 }, { code: '75006', name: '6e', x: 51, y: 55 },
    { code: '75007', name: '7e',  x: 46, y: 53 }, { code: '75008', name: '8e', x: 46, y: 44 },
    { code: '75009', name: '9e',  x: 53, y: 41 }, { code: '75010', name: '10e', x: 59, y: 42 },
    { code: '75011', name: '11e', x: 63, y: 49 }, { code: '75012', name: '12e', x: 67, y: 54 },
    { code: '75013', name: '13e', x: 60, y: 60 }, { code: '75014', name: '14e', x: 52, y: 62 },
    { code: '75015', name: '15e', x: 44, y: 59 }, { code: '75016', name: '16e', x: 36, y: 50 },
    { code: '75017', name: '17e', x: 41, y: 38 }, { code: '75018', name: '18e', x: 52, y: 34 },
    { code: '75019', name: '19e', x: 62, y: 35 }, { code: '75020', name: '20e', x: 68, y: 43 },
  ];

  const zones = ZONES.map((z, idx) => {
    const real = (leads || []).filter((l) => {
      const addr = (l.address || l.adresse || '').toLowerCase();
      return addr.includes(z.code) || addr.includes(z.name.toLowerCase());
    }).length;
    const demo = [3,1,2,4,2,3,5,8,4,3,6,2,3,4,7,5,3,4,2,3][idx] || 0;
    return { ...z, count: real + demo };
  });

  const maxCount = Math.max(...zones.map((z) => z.count), 1);

  const hue = (intensity) => {
    if (intensity > 0.7) return '#c2410c';   // terracotta
    if (intensity > 0.4) return '#d97706';   // amber
    if (intensity > 0.1) return '#047857';   // brand / émeraude
    return '#a8a29e';                         // stone (faible)
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-brand-700" />
        <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500">
          Carte des leads — Paris
        </h3>
      </div>

      <div className="relative" style={{ paddingBottom: '70%' }}>
        <svg viewBox="0 0 100 80" className="absolute inset-0 w-full h-full">
          {/* Fond Paris */}
          <ellipse cx="52" cy="50" rx="28" ry="22"
            fill="#f5ede0" stroke="#d6cdb8" strokeWidth="0.4" />
          {/* Seine */}
          <path d="M 30 52 Q 40 48 52 50 Q 64 52 72 56"
            fill="none" stroke="#0f766e" strokeWidth="1.2" strokeOpacity="0.4" />
          {/* Points arrondissements */}
          {zones.map((z) => {
            const intensity = z.count / maxCount;
            const r = 2 + intensity * 4;
            const color = hue(intensity);
            return (
              <g key={z.code}>
                <circle cx={z.x} cy={z.y} r={r} fill={color} opacity={0.55 + intensity * 0.45} />
                {z.count > 0 && (
                  <text x={z.x} y={z.y + 0.6} textAnchor="middle" fontSize="2"
                    fill="white" fontWeight="600" opacity="0.95">
                    {z.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {zones.sort((a, b) => b.count - a.count).slice(0, 6).map((z) => (
          <div key={z.code} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-50 ring-1 ring-inset ring-neutral-200">
            <span className="text-xs text-neutral-600">Paris {z.name}</span>
            <span className="text-sm font-mono tabular-nums font-semibold text-neutral-900">
              {z.count} <span className="text-[10px] font-normal text-neutral-500">leads</span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-4 justify-center">
        {[
          ['#c2410c', 'Fort'],
          ['#d97706', 'Moyen'],
          ['#047857', 'Faible'],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-neutral-500">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════
export default function DirectorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, f, l] = await Promise.all([
        axios.get(`${API}/stats/dashboard?period=${period}`, { withCredentials: true }),
        axios.get(`${API}/stats/financial?period=${period}`, { withCredentials: true }),
        axios.get(`${API}/leads?limit=20`, { withCredentials: true }),
      ]);
      setStats(s.data); setFinancial(f.data);
      setLeads(Array.isArray(l.data) ? l.data : []);
    } catch (e) {
      console.error('Director error:', e);
      toast.error('Erreur : ' + (e.response?.status || e.message));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const health = () => {
    if (!stats) return 0;
    let s = 50;
    if ((stats.conversion_lead_to_quote || 0) > 30) s += 15;
    if ((stats.avg_lead_score || 0) > 60) s += 10;
    if ((stats.new_leads || 0) > 10) s += 10;
    if ((stats.pending_tasks || 0) < 5) s += 10;
    if ((stats.won_leads || 0) > 0) s += 5;
    return Math.min(100, s);
  };

  const revenue = financial?.monthly_revenue || 0;
  const prevRevenue = financial?.previous_revenue || 0;
  const revTrend = revenue >= prevRevenue ? 'up' : 'down';
  const revChange = prevRevenue > 0 ? Math.abs(Math.round((revenue - prevRevenue) / prevRevenue * 100)) + '%' : null;
  const conv = stats?.conversion_lead_to_quote || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title="Direction" subtitle="Vue exécutive" />

      {/* Barre filtre période */}
      <div className="flex justify-end -mt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 transition-colors"
            aria-label="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex gap-1 bg-white rounded-lg border border-neutral-200 p-1">
            {[['7d', '7j'], ['30d', '30j'], ['90d', '3m']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setPeriod(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-[0.08em] transition-all ${
                  period === v
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Grille KPI (8 cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard title="CA du mois"      value={`${revenue.toLocaleString('fr-FR')} €`}           subtitle="Devis acceptés" icon={DollarSign}    tone="brand"      trend={revTrend} change={revChange} onClick={() => navigate('/finance')} />
            <KPICard title="Nouveaux leads"  value={stats?.new_leads || 0}                            subtitle="Ce mois"        icon={Users}         tone="brand"      onClick={() => navigate('/leads')} />
            <KPICard title="Taux conversion" value={`${conv}%`}                                       subtitle="Lead → devis"   icon={Target}        tone={conv >= 30 ? 'brand' : 'terracotta'} trend={conv >= 30 ? 'up' : 'down'} />
            <KPICard title="Score moyen"     value={`${stats?.avg_lead_score || 0}/100`}              subtitle="Qualité leads"  icon={Star}          tone="amber" />
            <KPICard title="Leads gagnés"    value={stats?.won_leads || 0}                            subtitle="Clients"        icon={Trophy}        tone="brand"      onClick={() => navigate('/leads')} />
            <KPICard title="Devis envoyés"   value={stats?.sent_quotes || 0}                          subtitle="En attente"     icon={CheckCircle}   tone="terracotta" onClick={() => navigate('/quotes')} />
            <KPICard title="Tâches"          value={stats?.pending_tasks || 0}                        subtitle="À traiter"      icon={Zap}           tone={stats?.pending_tasks > 5 ? 'terracotta' : 'neutral'} onClick={() => navigate('/tasks')} />
            <KPICard title="Pipeline"        value={`${stats?.total_leads || 0} leads`}               subtitle="Total CRM"      icon={TrendingUp}    tone="neutral"    onClick={() => navigate('/kanban')} />
          </div>

          {/* Ligne : évolution + santé */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-6">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-5">
                Évolution des leads
              </h3>
              {(stats?.leads_by_day || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={stats.leads_by_day} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="atelierArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#047857" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6" />
                    <XAxis dataKey="date" stroke="#78716c" style={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="#78716c" style={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #e7e5e4',
                        borderRadius: 8,
                        fontSize: 12,
                        fontFamily: 'inherit',
                      }}
                      labelStyle={{ color: '#44403c', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#047857" strokeWidth={2.5}
                      fill="url(#atelierArea)" dot={false} name="Leads" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-neutral-400 text-sm italic">
                  Aucune donnée
                </div>
              )}
            </div>
            <HealthScore score={health()} />
          </div>

          {/* Ligne : reco + services + objectifs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Recommandations stats={stats} />
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-4">
                Leads par service
              </h3>
              {Object.keys(stats?.leads_by_service || {}).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(stats.leads_by_service).sort((a, b) => b[1] - a[1]).map(([name, value], i) => {
                    const total = Object.values(stats.leads_by_service).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? (value / total * 100) : 0;
                    return (
                      <div key={name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-semibold text-neutral-700 truncate">{name}</span>
                          <span className="text-sm font-mono tabular-nums text-neutral-900 ml-2">{value}</span>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: ATELIER_COLORS[i % ATELIER_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-neutral-400 text-sm text-center py-4 italic">Aucune donnée</p>
              )}
            </div>
            <Objectifs stats={stats} financial={financial} />
          </div>

          {/* Ligne : funnel + carte Paris */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConversionFunnel stats={stats} />
            <ParisMap leads={leads} />
          </div>

          {/* Top leads à convertir */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500">
                  Top leads à convertir
                </h3>
              </div>
              <button
                onClick={() => navigate('/leads')}
                className="text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
              >
                Voir tout →
              </button>
            </div>
            <div className="space-y-1">
              {leads.filter((l) => (l.score || 0) >= 60).slice(0, 5).map((lead) => (
                <div
                  key={lead.lead_id}
                  onClick={() => navigate(`/leads/${lead.lead_id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center font-display font-semibold text-neutral-700 flex-shrink-0">
                    {(lead.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{lead.name}</p>
                    <p className="text-xs text-neutral-500">{lead.service_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${lead.score || 0}%`,
                          background: lead.score >= 75 ? '#c2410c' : lead.score >= 55 ? '#d97706' : '#047857',
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono tabular-nums font-semibold text-neutral-900 w-8 text-right">
                      {lead.score || 0}
                    </span>
                  </div>
                </div>
              ))}
              {leads.filter((l) => (l.score || 0) >= 60).length === 0 && (
                <p className="text-neutral-400 text-sm text-center py-6 italic">Aucun lead chaud</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
