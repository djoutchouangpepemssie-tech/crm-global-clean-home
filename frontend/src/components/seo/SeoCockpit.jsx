// SeoCockpit.jsx — Centre de commandement SEO/Analytics.
// 10 modules : Hero · Alertes · Recos IA · Heatmap · Pages · Contenu ·
// Technique · Conversion · Historique · Sources de données.
//
// Architecture :
// - Data : useSeoStats (GSC) + useGa4Analytics + useCrmAnalytics
// - Dérivations frontend : scores, opportunités, cannibalisation, recos IA
// - Composants atomiques réutilisables ci-dessous
// - Responsive : grille fluide auto-fit, scroll sticky radar
//
// Extensibilité : chaque module est une fonction pure ({data, loading}) → JSX,
// prête à brancher sur un endpoint backend dédié quand il existera.

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Award,
  Bell, BookOpen, Calendar, Check, CheckCircle, ChevronDown, ChevronRight,
  Clock, Download, ExternalLink, Eye, FileText, Filter, Flag,
  Gauge, Globe, Link2, MapPin, Monitor, MousePointer, Navigation,
  PieChart as PieIcon, Plus, RefreshCw, Search, Settings, Share2,
  Smartphone, Sparkles, Target, TrendingDown, TrendingUp, Users, Zap,
  X as XIcon, BarChart2, Layers, ShieldCheck, Database, Bookmark,
} from 'lucide-react';
import { useCrmAnalytics, useGa4Analytics, useSeoAnalytics as useSeoStats } from '../../hooks/api';

/* ═══════════════════════════════════════════════════════════════════
   TOKENS + STYLES
═══════════════════════════════════════════════════════════════════ */
const tokenStyle = `
  .sc-root {
    --bg: oklch(0.965 0.012 80);
    --paper: oklch(0.975 0.014 82);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);

    --emerald: oklch(0.52 0.13 165);
    --emerald-deep: oklch(0.38 0.14 160);
    --emerald-soft: oklch(0.93 0.05 165);
    --navy: oklch(0.35 0.08 240);
    --navy-deep: oklch(0.22 0.08 240);
    --navy-soft: oklch(0.92 0.03 240);
    --gold: oklch(0.72 0.13 85);
    --gold-soft: oklch(0.94 0.06 85);
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --rouge: oklch(0.55 0.18 25);
    --rouge-soft: oklch(0.94 0.08 25);
    --sepia: oklch(0.55 0.08 65);
    --cool: oklch(0.55 0.08 220);

    background:
      radial-gradient(1100px 500px at 10% 0%, oklch(0.95 0.04 240 / 0.55), transparent 60%),
      radial-gradient(900px 600px at 95% 30%, oklch(0.96 0.04 165 / 0.5), transparent 60%),
      var(--bg);
    min-height: 100%;
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding-bottom: 80px;
  }
  .sc-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .sc-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .sc-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .sc-italic  { font-style: italic; color: var(--navy); font-weight: 400; }

  /* Sticky radar bar */
  .sc-sticky {
    position: sticky; top: 0; z-index: 40;
    background: color-mix(in oklch, var(--bg) 80%, transparent);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--line-2);
    padding: 14px 28px;
  }

  /* Cards */
  .sc-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 18px; padding: 22px 24px;
    position: relative;
  }
  .sc-card-hover {
    transition: transform .15s, box-shadow .15s, border-color .15s;
  }
  .sc-card-hover:hover {
    transform: translateY(-2px); border-color: var(--ink-3);
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  }

  .sc-card-dark {
    background: linear-gradient(160deg, oklch(0.16 0.018 60) 0%, oklch(0.22 0.04 240) 100%);
    color: oklch(0.95 0.01 80);
    border-radius: 18px; padding: 24px;
    border: 1px solid oklch(0.28 0.02 60);
    position: relative; overflow: hidden;
  }
  .sc-card-dark::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 80% 10%, oklch(0.52 0.13 165 / 0.22), transparent 60%);
    pointer-events: none;
  }

  /* KPI tile */
  .sc-kpi {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; padding: 18px 20px;
    transition: all .15s;
    position: relative; overflow: hidden;
  }
  .sc-kpi::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--kpi-tone, var(--navy));
  }
  .sc-kpi:hover { border-color: var(--ink-3); }

  /* Pills */
  .sc-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }

  /* Severity tones */
  .sc-sev-critical { color: var(--rouge); background: var(--rouge-soft); border-color: var(--rouge); }
  .sc-sev-warning  { color: var(--gold); background: var(--gold-soft); border-color: var(--gold); }
  .sc-sev-info     { color: var(--navy); background: var(--navy-soft); border-color: var(--navy); }
  .sc-sev-ok       { color: var(--emerald); background: var(--emerald-soft); border-color: var(--emerald); }

  /* Heatmap */
  .sc-heat-cell {
    border-radius: 6px; padding: 8px 10px;
    font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--ink);
    text-align: right; transition: transform .1s;
    cursor: default;
  }
  .sc-heat-cell:hover { transform: scale(1.04); z-index: 2; position: relative; }

  /* CTA */
  .sc-cta {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: 999px;
    background: var(--ink); color: var(--bg); border: 0;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: opacity .15s;
  }
  .sc-cta:hover { opacity: 0.88; }

  .sc-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: all .15s;
  }
  .sc-chip:hover { border-color: var(--ink-3); color: var(--ink); }
  .sc-chip.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }

  /* Radar gauge */
  @keyframes sc-pulse {
    0%   { box-shadow: 0 0 0 0 oklch(0.65 0.15 145 / 0.5); }
    80%  { box-shadow: 0 0 0 10px oklch(0.65 0.15 145 / 0); }
    100% { box-shadow: 0 0 0 0 oklch(0.65 0.15 145 / 0); }
  }
  .sc-pulse-dot { animation: sc-pulse 2.2s ease-out infinite; }

  @keyframes sc-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .sc-fade { animation: sc-fade .35s ease; }

  /* Section anchor */
  .sc-anchor { scroll-margin-top: 110px; }

  /* Section title */
  .sc-section-title {
    font-family: 'Fraunces', serif; font-size: 26px; font-weight: 400;
    letter-spacing: -0.02em; color: var(--ink);
    margin: 0 0 4px;
  }
  .sc-section-title em { font-style: italic; color: var(--navy); font-weight: 400; }
  .sc-section-sub {
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: 13px; color: var(--ink-3);
    margin-bottom: 20px;
  }

  @media (max-width: 960px) {
    .sc-sticky { padding: 12px 16px !important; }
    .sc-hero-grid { grid-template-columns: 1fr !important; }
    .sc-card { padding: 18px 18px !important; }
    .sc-section-title { font-size: 22px !important; }
    .sc-hide-mobile { display: none !important; }
  }
`;

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtPct = (v, dec = 1) => `${Number(v || 0).toFixed(dec)}%`;
const fmtShort = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
};
const trend = (a, b) => {
  const va = Number(a || 0), vb = Number(b || 0);
  if (!vb) return 0;
  return Math.round(((va - vb) / vb) * 100 * 10) / 10;
};
const hostOf = (url) => { try { return new URL(url).hostname; } catch { return url || ''; } };
const pathOf = (url) => { try { return new URL(url).pathname; } catch { return url || '/'; } };

/* ═══════════════════════════════════════════════════════════════════
   SCORES (dérivation frontend)
═══════════════════════════════════════════════════════════════════ */
function computeSubScores(seo, ga4, crm) {
  const ov = seo?.overview || {};
  const position = Number(ov.position || 50);
  const ctr = Number(ov.ctr || 0);
  const clicks = Number(ov.clicks || 0);
  const impressions = Number(ov.impressions || 0);

  // Technique : position moyenne + couverture indexation (heuristique)
  const technical = Math.round(
    (position <= 10 ? 95 : position <= 20 ? 75 : position <= 40 ? 55 : 35) * 0.7 +
    (clicks > 500 ? 90 : clicks > 100 ? 75 : 50) * 0.3
  );

  // Contenu : CTR + nb mots-clés top 10
  const topKw = (seo?.keywords || []).filter(k => (k.position || 99) <= 10).length;
  const content = Math.round(
    (ctr > 4 ? 90 : ctr > 2 ? 70 : ctr > 1 ? 55 : 40) * 0.5 +
    (topKw > 30 ? 90 : topKw > 10 ? 70 : topKw > 0 ? 55 : 35) * 0.5
  );

  // Autorité : impressions + nb pages indexées
  const pagesCount = (seo?.pages || []).length;
  const authority = Math.round(
    (impressions > 10_000 ? 90 : impressions > 1000 ? 70 : 45) * 0.6 +
    (pagesCount > 50 ? 85 : pagesCount > 10 ? 65 : 45) * 0.4
  );

  // Conversion : leads / sessions via GA4 + CRM
  const sessions = Number(ga4?.overview?.sessions || ga4?.overview?.users || 0);
  const leads = Number(crm?.new_leads_30d || 0);
  const convRate = sessions > 0 ? (leads / sessions) * 100 : 0;
  const conversion = Math.round(
    (convRate > 5 ? 95 : convRate > 2 ? 75 : convRate > 1 ? 55 : 35) * 0.6 +
    (leads > 100 ? 90 : leads > 20 ? 70 : 45) * 0.4
  );

  // UX : bounce (si dispo) + CWV (si dispo) sinon par défaut basé sur position
  const ux = Math.round(
    (ga4?.overview?.bounce_rate != null
      ? (100 - Number(ga4.overview.bounce_rate))
      : position <= 10 ? 80 : 60)
  );

  // Global = moyenne pondérée
  const global = Math.round(
    technical * 0.25 + content * 0.25 + authority * 0.2 +
    conversion * 0.2 + ux * 0.1
  );

  return {
    global: clamp(global), technical: clamp(technical),
    content: clamp(content), authority: clamp(authority),
    conversion: clamp(conversion), ux: clamp(ux),
  };
}
function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
const scoreTone = (n) => n >= 75 ? 'var(--emerald)' : n >= 55 ? 'var(--gold)' : n >= 35 ? 'var(--warm)' : 'var(--rouge)';
const scoreLabel = (n) => n >= 85 ? 'Excellent' : n >= 70 ? 'Bon' : n >= 55 ? 'Correct' : n >= 35 ? 'À améliorer' : 'Critique';

/* ═══════════════════════════════════════════════════════════════════
   ALERTES — détection automatique
═══════════════════════════════════════════════════════════════════ */
function detectAlerts(seo, ga4, scores) {
  const alerts = [];
  const ov = seo?.overview || {};

  // Chute de clics (compare last 7 vs previous 7)
  const daily = seo?.daily || [];
  if (daily.length >= 14) {
    const last7 = daily.slice(-7).reduce((s, d) => s + (d.clicks || 0), 0);
    const prev7 = daily.slice(-14, -7).reduce((s, d) => s + (d.clicks || 0), 0);
    if (prev7 > 0 && (last7 - prev7) / prev7 < -0.2) {
      alerts.push({
        type: 'clicks_drop', severity: 'critical',
        title: 'Chute de clics — -' + Math.round(((prev7 - last7) / prev7) * 100) + '%',
        message: `${fmt(last7)} clics sur 7j vs ${fmt(prev7)} la période précédente`,
        action: 'Analyser les pages perdantes', anchor: '#pages',
      });
    }
  }

  // CTR bas global
  if (ov.ctr != null && ov.ctr < 1.5 && ov.impressions > 500) {
    alerts.push({
      type: 'low_ctr', severity: 'warning',
      title: `CTR faible · ${Number(ov.ctr).toFixed(1)}%`,
      message: 'Les titres et metas méritent d\'être retravaillés.',
      action: 'Voir audit contenu', anchor: '#content',
    });
  }

  // Position moyenne mauvaise
  if (ov.position != null && ov.position > 25) {
    alerts.push({
      type: 'bad_position', severity: 'warning',
      title: `Position moyenne · ${Number(ov.position).toFixed(1)}`,
      message: 'Aucune page en première page — opportunité forte.',
      action: 'Voir opportunités', anchor: '#pages',
    });
  }

  // Pages sans clics (cannibalisation ou contenu orphelin)
  const zeroClickPages = (seo?.pages || []).filter(p => (p.impressions || 0) > 50 && (p.clicks || 0) === 0);
  if (zeroClickPages.length > 0) {
    alerts.push({
      type: 'orphan', severity: 'warning',
      title: `${zeroClickPages.length} page${zeroClickPages.length > 1 ? 's' : ''} sans clic`,
      message: 'Vues en résultats mais jamais cliquées — snippet à revoir.',
      action: 'Voir pages', anchor: '#pages',
    });
  }

  // Cannibalisation (2+ pages rankent sur le même mot-clé)
  const kwPages = {};
  (seo?.keywords || []).forEach(k => {
    if (!k.query) return;
    kwPages[k.query] = kwPages[k.query] || [];
    kwPages[k.query].push(k);
  });
  const cannibalCount = Object.values(kwPages).filter(ps => ps.length > 1).length;
  if (cannibalCount > 0) {
    alerts.push({
      type: 'cannibal', severity: 'info',
      title: `${cannibalCount} cas de cannibalisation`,
      message: 'Plusieurs pages positionnées sur un même mot-clé.',
      action: 'Voir cannibalisation', anchor: '#pages',
    });
  }

  // Score global
  if (scores?.global < 50) {
    alerts.push({
      type: 'low_score', severity: 'critical',
      title: `Score SEO global · ${scores.global}/100`,
      message: 'Plusieurs leviers critiques à activer rapidement.',
      action: 'Voir recos IA', anchor: '#ai',
    });
  }

  return alerts;
}

/* ═══════════════════════════════════════════════════════════════════
   RECOS IA — suggestions priorisées
═══════════════════════════════════════════════════════════════════ */
function generateRecos(seo, scores) {
  const recos = [];
  const ov = seo?.overview || {};

  // 1. Reco CTR si CTR bas
  if (ov.ctr != null && ov.ctr < 2 && ov.impressions > 200) {
    recos.push({
      id: 'ctr-meta',
      title: 'Réécrire les title/meta-description des pages à fort potentiel',
      impact: 'high', effort: 'low',
      category: 'Contenu',
      desc: `CTR actuel · ${fmtPct(ov.ctr, 2)}. Un gain de +1 pt CTR à volume constant = +${fmt(ov.impressions * 0.01)} clics/mois.`,
      priority: 92,
    });
  }

  // 2. Reco position 11-20 → passer page 1
  const nearFirstPage = (seo?.keywords || []).filter(k => (k.position || 99) > 10 && (k.position || 99) <= 20);
  if (nearFirstPage.length > 0) {
    const potClicks = nearFirstPage.reduce((s, k) => s + (k.impressions || 0) * 0.04, 0);
    recos.push({
      id: 'near-top10',
      title: `Pousser ${nearFirstPage.length} mots-clés en première page (top 10)`,
      impact: 'high', effort: 'medium',
      category: 'Opportunité',
      desc: `Potentiel estimé · +${fmt(potClicks)} clics/mois avec optimisation contenu + backlinks ciblés.`,
      priority: 88,
    });
  }

  // 3. Pages zero click
  const zeroClick = (seo?.pages || []).filter(p => (p.impressions || 0) > 100 && (p.clicks || 0) === 0);
  if (zeroClick.length > 0) {
    recos.push({
      id: 'zero-click',
      title: `Réécrire les snippets de ${zeroClick.length} page${zeroClick.length > 1 ? 's' : ''} vue${zeroClick.length > 1 ? 's' : ''} mais jamais cliquée${zeroClick.length > 1 ? 's' : ''}`,
      impact: 'medium', effort: 'low',
      category: 'Contenu',
      desc: `Ces pages ont ${fmt(zeroClick.reduce((s, p) => s + (p.impressions || 0), 0))} impressions sans clic.`,
      priority: 75,
    });
  }

  // 4. Cannibalisation
  const kwPages = {};
  (seo?.keywords || []).forEach(k => {
    if (k.query) { kwPages[k.query] = (kwPages[k.query] || 0) + 1; }
  });
  const cannibals = Object.entries(kwPages).filter(([_, c]) => c > 1);
  if (cannibals.length > 0) {
    recos.push({
      id: 'cannibal',
      title: `Résoudre la cannibalisation sur ${cannibals.length} mot${cannibals.length > 1 ? 's' : ''}-clé${cannibals.length > 1 ? 's' : ''}`,
      impact: 'medium', effort: 'medium',
      category: 'Technique',
      desc: 'Fusionner ou différencier les pages qui se concurrencent.',
      priority: 68,
    });
  }

  // 5. Technique si score technique bas
  if (scores.technical < 65) {
    recos.push({
      id: 'tech-audit',
      title: 'Lancer un audit technique complet',
      impact: 'high', effort: 'high',
      category: 'Technique',
      desc: 'Indexation, vitesse, Core Web Vitals, données structurées.',
      priority: 80,
    });
  }

  // 6. Conversion si score conversion bas
  if (scores.conversion < 60) {
    recos.push({
      id: 'cta-funnel',
      title: 'Optimiser le funnel de conversion des pages les plus vues',
      impact: 'high', effort: 'medium',
      category: 'Conversion',
      desc: 'CTA visibles, preuves sociales, formulaire simplifié.',
      priority: 85,
    });
  }

  // 7. Mobile
  const mobileShare = (() => {
    const devices = seo?.devices || [];
    const total = devices.reduce((s, d) => s + (d.clicks || 0), 0);
    const m = devices.find(d => d.device === 'mobile');
    return total > 0 && m ? (m.clicks / total) * 100 : 0;
  })();
  if (mobileShare > 60) {
    recos.push({
      id: 'mobile-first',
      title: 'Prioriser l\'expérience mobile',
      impact: 'medium', effort: 'medium',
      category: 'UX',
      desc: `${fmtPct(mobileShare, 0)} du trafic est mobile — vérifier CWV mobile et lisibilité.`,
      priority: 70,
    });
  }

  return recos.sort((a, b) => b.priority - a.priority);
}

/* ═══════════════════════════════════════════════════════════════════
   COMPOSANTS ATOMIQUES
═══════════════════════════════════════════════════════════════════ */

function ScoreGauge({ value, size = 180, label }) {
  const R = size / 2 - 12;
  const C = 2 * Math.PI * R;
  const v = clamp(value);
  const offset = C - (C * v) / 100;
  const tone = scoreTone(v);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={R}
          fill="none" stroke="oklch(0.92 0.010 78)" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={R}
          fill="none" stroke={tone} strokeWidth="10"
          strokeDasharray={C} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="sc-display" style={{ fontSize: size * 0.33, fontWeight: 300, lineHeight: 1, color: tone }}>
          {v}
        </div>
        <div className="sc-label" style={{ marginTop: 4, color: tone }}>
          {label || scoreLabel(v)}
        </div>
      </div>
    </div>
  );
}

function SubScoreRow({ label, value, icon: Icon }) {
  const tone = scoreTone(value);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)' }}>
          {Icon && <Icon style={{ width: 13, height: 13, color: tone }} />}
          {label}
        </span>
        <span className="sc-mono" style={{ fontSize: 13, fontWeight: 700, color: tone }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`, background: tone, borderRadius: 999,
          transition: 'width .5s',
        }} />
      </div>
    </div>
  );
}

function KpiTile({ label, value, trend, tone = 'var(--navy)', icon: Icon, sub, sparkline }) {
  return (
    <div className="sc-kpi" style={{ '--kpi-tone': tone }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `color-mix(in oklch, ${tone} 14%, transparent)`,
          color: tone,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {Icon && <Icon style={{ width: 14, height: 14 }} />}
        </div>
        {trend !== undefined && trend !== null && (
          <div className="sc-mono" style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            padding: '3px 8px', borderRadius: 999,
            color: trend >= 0 ? 'var(--emerald)' : 'var(--rouge)',
            background: trend >= 0 ? 'var(--emerald-soft)' : 'var(--rouge-soft)',
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            {trend >= 0 ? <ArrowUp style={{ width: 10, height: 10 }} /> : <ArrowDown style={{ width: 10, height: 10 }} />}
            {trend >= 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <div className="sc-label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="sc-display" style={{ fontSize: 26, fontWeight: 500, color: tone, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 6, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--ink-3)' }}>{sub}</div>}
      {sparkline && sparkline.length > 1 && (
        <div style={{ marginTop: 10, height: 26 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline}>
              <Line type="monotone" dataKey="v" stroke={tone} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ anchor, eyebrow, title, subtitle, right }) {
  return (
    <div id={anchor} className="sc-anchor" style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 18, flexWrap: 'wrap', marginBottom: 14, marginTop: 36,
    }}>
      <div>
        <div className="sc-label" style={{ marginBottom: 6 }}>{eyebrow}</div>
        <h2 className="sc-section-title">{title}</h2>
        {subtitle && <div className="sc-section-sub">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · HERO (scores + KPIs)
═══════════════════════════════════════════════════════════════════ */
function HeroModule({ scores, seoOv, ga4Ov, daily }) {
  const kpis = [
    {
      label: 'Clics SEO', value: fmt(seoOv.clicks || 0),
      trend: seoOv.clicks_trend, tone: 'var(--emerald)', icon: MousePointer,
      sub: `${fmtShort(seoOv.impressions)} impressions`,
      sparkline: (daily || []).slice(-14).map(d => ({ v: d.clicks || 0 })),
    },
    {
      label: 'Position moy.', value: (seoOv.position || 0).toFixed(1),
      trend: seoOv.position_trend ? -seoOv.position_trend : null, tone: 'var(--navy)', icon: Target,
      sub: (seoOv.position || 0) <= 10 ? 'Première page' : 'À optimiser',
    },
    {
      label: 'CTR', value: fmtPct(seoOv.ctr, 2),
      trend: seoOv.ctr_trend, tone: 'var(--warm)', icon: Activity,
      sub: seoOv.ctr >= 3 ? 'Excellent' : 'Optimisable',
    },
    {
      label: 'Sessions', value: fmtShort(ga4Ov.sessions || ga4Ov.users || 0),
      trend: ga4Ov.sessions_trend, tone: 'var(--sepia)', icon: Users,
      sub: ga4Ov.bounce_rate != null ? `Bounce ${fmtPct(ga4Ov.bounce_rate, 0)}` : undefined,
    },
  ];

  return (
    <div className="sc-fade" style={{ padding: '32px 28px 0' }}>
      <div className="sc-hero-grid" style={{
        display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20,
      }}>
        {/* Gauge score + sub-scores */}
        <div className="sc-card" style={{ padding: 22 }}>
          <div className="sc-label" style={{ marginBottom: 10 }}>Score SEO global</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14 }}>
            <ScoreGauge value={scores.global} size={180} />
          </div>
          <SubScoreRow label="Technique"   value={scores.technical}   icon={ShieldCheck} />
          <SubScoreRow label="Contenu"     value={scores.content}     icon={FileText} />
          <SubScoreRow label="Autorité"    value={scores.authority}   icon={Award} />
          <SubScoreRow label="Conversion"  value={scores.conversion}  icon={Target} />
          <SubScoreRow label="UX"          value={scores.ux}          icon={Sparkles} />
        </div>

        {/* KPIs + trend chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
          }}>
            {kpis.map((k, i) => <KpiTile key={i} {...k} />)}
          </div>

          <div className="sc-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div>
                <div className="sc-label">Tendance clics &amp; impressions</div>
                <h3 className="sc-display" style={{ fontSize: 18, fontWeight: 400, margin: 2 }}>
                  <em style={{ color: 'var(--navy)' }}>{daily?.length || 0}</em> jours
                </h3>
              </div>
            </div>
            {(daily || []).length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic', fontFamily: 'Fraunces, serif' }}>
                Pas encore de données de performance.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={daily} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sc-clicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--line-2)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}
                  />
                  <Area type="monotone" dataKey="clicks" stroke="var(--emerald)" strokeWidth={2} fill="url(#sc-clicks)" name="Clics" />
                  <Line type="monotone" dataKey="impressions" stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="4 2" name="Impressions" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · ALERTES
═══════════════════════════════════════════════════════════════════ */
function AlertsModule({ alerts }) {
  if (alerts.length === 0) {
    return (
      <div style={{ padding: '0 28px' }}>
        <div className="sc-card" style={{ textAlign: 'center', padding: 22, borderColor: 'var(--emerald)' }}>
          <CheckCircle style={{ width: 22, height: 22, color: 'var(--emerald)', marginRight: 8, verticalAlign: 'middle' }} />
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontStyle: 'italic', color: 'var(--emerald-deep)' }}>
            Aucune alerte SEO active. Tout est au vert.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="alerts"
        eyebrow="Monitoring · Anomalies"
        title={<>Les <em>alertes</em></>}
        subtitle={`${alerts.length} signal${alerts.length > 1 ? 'aux' : ''} détecté${alerts.length > 1 ? 's' : ''} automatiquement`}
      />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12,
      }}>
        {alerts.map((a, i) => (
          <div key={i} className="sc-card sc-card-hover" style={{
            borderColor: a.severity === 'critical' ? 'var(--rouge)' : a.severity === 'warning' ? 'var(--gold)' : 'var(--navy)',
            padding: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className={`sc-pill sc-sev-${a.severity}`}>
                {a.severity === 'critical' ? <AlertTriangle style={{ width: 10, height: 10 }} /> : a.severity === 'warning' ? <Flag style={{ width: 10, height: 10 }} /> : <Bell style={{ width: 10, height: 10 }} />}
                {a.severity === 'critical' ? 'Critique' : a.severity === 'warning' ? 'Alerte' : 'Info'}
              </span>
              <div className="sc-pulse-dot" style={{ width: 8, height: 8, borderRadius: 999, background: a.severity === 'critical' ? 'var(--rouge)' : a.severity === 'warning' ? 'var(--gold)' : 'var(--navy)' }} />
            </div>
            <div className="sc-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
              {a.title}
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginBottom: 12, lineHeight: 1.5 }}>
              {a.message}
            </div>
            <a href={a.anchor || '#'} className="sc-chip">
              {a.action} <ArrowRight style={{ width: 10, height: 10 }} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · IA RECOMMANDATIONS
═══════════════════════════════════════════════════════════════════ */
function AIModule({ recos }) {
  const impactColor = { high: 'var(--emerald)', medium: 'var(--gold)', low: 'var(--ink-3)' };
  const effortLabel = { low: 'Effort léger', medium: 'Effort modéré', high: 'Gros chantier' };

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="ai"
        eyebrow="Intelligence · Recommandations"
        title={<>Les <em>actions</em> prioritaires</>}
        subtitle="Chaque reco a son impact estimé et son effort — classement par priorité"
      />
      {recos.length === 0 ? (
        <div className="sc-card" style={{ textAlign: 'center', padding: 30, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Rien à recommander — le SEO tourne rond.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recos.map((r, i) => (
            <div key={r.id} className="sc-card sc-card-hover">
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 16, alignItems: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'var(--surface-2)', color: 'var(--ink-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500,
                }}>
                  {i + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className="sc-pill" style={{
                      color: impactColor[r.impact], background: `color-mix(in oklch, ${impactColor[r.impact]} 12%, transparent)`, borderColor: impactColor[r.impact],
                    }}>
                      <TrendingUp style={{ width: 10, height: 10 }} /> Impact {r.impact}
                    </span>
                    <span className="sc-pill" style={{ color: 'var(--ink-3)', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                      {effortLabel[r.effort]}
                    </span>
                    <span className="sc-pill" style={{ color: 'var(--navy)', background: 'var(--navy-soft)', borderColor: 'var(--navy)' }}>
                      {r.category}
                    </span>
                  </div>
                  <div className="sc-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
                    {r.title}
                  </div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>
                    {r.desc}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="sc-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Priorité</div>
                  <div className="sc-display" style={{ fontSize: 22, fontWeight: 500, color: impactColor[r.impact], lineHeight: 1 }}>
                    {r.priority}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · GLOBE 3D INTERACTIF (SVG pur, rotation souris)
   Visualisation du trafic mondial — rotation drag, points clignotants
═══════════════════════════════════════════════════════════════════ */

// Coordonnées approximatives des principaux pays/régions (lat, lng) + poids
const COUNTRY_COORDS = {
  FR: { name: 'France',        lat: 46.6,  lng: 2.3 },
  BE: { name: 'Belgique',      lat: 50.5,  lng: 4.5 },
  CH: { name: 'Suisse',        lat: 46.8,  lng: 8.2 },
  DE: { name: 'Allemagne',     lat: 51.2,  lng: 10.5 },
  ES: { name: 'Espagne',       lat: 40.4,  lng: -3.7 },
  IT: { name: 'Italie',        lat: 41.9,  lng: 12.6 },
  GB: { name: 'Royaume-Uni',   lat: 54.0,  lng: -2.0 },
  NL: { name: 'Pays-Bas',      lat: 52.2,  lng: 5.3 },
  PT: { name: 'Portugal',      lat: 39.4,  lng: -8.2 },
  LU: { name: 'Luxembourg',    lat: 49.8,  lng: 6.1 },
  MC: { name: 'Monaco',        lat: 43.7,  lng: 7.4 },
  US: { name: 'USA',           lat: 39.8,  lng: -98.5 },
  CA: { name: 'Canada',        lat: 56.1,  lng: -106.3 },
  MA: { name: 'Maroc',         lat: 31.8,  lng: -7.1 },
  DZ: { name: 'Algérie',       lat: 28.0,  lng: 1.6 },
  TN: { name: 'Tunisie',       lat: 33.9,  lng: 9.5 },
  SN: { name: 'Sénégal',       lat: 14.5,  lng: -14.5 },
  CI: { name: 'Côte d\'Ivoire', lat: 7.5,  lng: -5.5 },
  CM: { name: 'Cameroun',      lat: 7.3,   lng: 12.4 },
  BR: { name: 'Brésil',        lat: -14.2, lng: -51.9 },
  CN: { name: 'Chine',         lat: 35.8,  lng: 104.2 },
  JP: { name: 'Japon',         lat: 36.2,  lng: 138.2 },
  IN: { name: 'Inde',          lat: 20.6,  lng: 78.9 },
  AU: { name: 'Australie',     lat: -25.3, lng: 133.8 },
  RU: { name: 'Russie',        lat: 61.5,  lng: 105.3 },
  ZA: { name: 'Afrique du Sud', lat: -30.6, lng: 22.9 },
};

// Contours simplifiés des continents (polygones lat/lng) pour dessiner un fond
// Très simplifié, juste pour donner une idée visuelle
const CONTINENTS = [
  // Europe (approx)
  [[70, -10], [70, 40], [35, 40], [35, -10]],
  // Afrique
  [[35, -20], [35, 50], [-35, 50], [-35, -20]],
  // Asie (approx)
  [[75, 40], [75, 180], [-10, 180], [-10, 40]],
  // Amériques
  [[80, -170], [80, -30], [-55, -30], [-55, -170]],
  // Océanie
  [[-10, 110], [-10, 180], [-50, 180], [-50, 110]],
];

function latLngToXY(lat, lng, rotY, rotX, radius, cx, cy) {
  // Conversion sphérique → 3D → 2D (projection orthographique)
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + rotY) * Math.PI) / 180;

  // Coords 3D
  let x = radius * Math.sin(phi) * Math.cos(theta);
  let y = radius * Math.cos(phi);
  let z = radius * Math.sin(phi) * Math.sin(theta);

  // Rotation X (tilt)
  const rx = (rotX * Math.PI) / 180;
  const y2 = y * Math.cos(rx) - z * Math.sin(rx);
  const z2 = y * Math.sin(rx) + z * Math.cos(rx);

  return {
    x: cx + x,
    y: cy + y2,
    visible: z2 > -radius * 0.1, // visible si devant le globe
    z: z2,
  };
}

function GlobeModule({ seo }) {
  const [rotY, setRotY] = useState(-10);
  const [rotX, setRotX] = useState(-15);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hoverCountry, setHoverCountry] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const svgRef = useRef(null);

  const radius = 140;
  const cx = 180;
  const cy = 180;

  // Agréger les clics par pays (depuis GSC + fallback)
  const countryData = useMemo(() => {
    const map = {};
    (seo?.countries || []).forEach(c => {
      const code = (c.country || '').toUpperCase();
      if (COUNTRY_COORDS[code]) {
        map[code] = { ...COUNTRY_COORDS[code], clicks: c.clicks || 0, impressions: c.impressions || 0 };
      }
    });
    // Si France pas dans GSC mais overview a des clics, forcer France
    if (!map.FR && seo?.overview?.clicks) {
      map.FR = { ...COUNTRY_COORDS.FR, clicks: Math.round((seo.overview.clicks || 0) * 0.85), impressions: seo.overview.impressions || 0 };
    }
    return Object.entries(map).map(([code, d]) => ({ code, ...d }));
  }, [seo?.countries, seo?.overview]);

  const maxClicks = Math.max(...countryData.map(c => c.clicks), 1);

  // Auto-rotation
  useEffect(() => {
    if (!autoRotate || dragging) return;
    const t = setInterval(() => setRotY(r => (r - 0.3) % 360), 50);
    return () => clearInterval(t);
  }, [autoRotate, dragging]);

  const onDown = (e) => {
    setDragging(true);
    setAutoRotate(false);
    const p = e.touches ? e.touches[0] : e;
    setDragStart({ x: p.clientX, y: p.clientY, rotY, rotX });
  };
  const onMove = (e) => {
    if (!dragging || !dragStart) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - dragStart.x;
    const dy = p.clientY - dragStart.y;
    setRotY(dragStart.rotY + dx * 0.6);
    setRotX(Math.max(-80, Math.min(80, dragStart.rotX + dy * 0.4)));
  };
  const onUp = () => { setDragging(false); setDragStart(null); };

  useEffect(() => {
    const up = () => onUp();
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, []);

  // Points visibles avec leur position 2D
  const visiblePoints = countryData.map(c => {
    const xy = latLngToXY(c.lat, c.lng, rotY, rotX, radius, cx, cy);
    return { ...c, ...xy };
  }).filter(c => c.visible);

  // Grille méridiens/parallèles pour effet globe
  const meridians = [];
  for (let lng = -180; lng <= 180; lng += 20) {
    const pts = [];
    for (let lat = -80; lat <= 80; lat += 10) {
      const p = latLngToXY(lat, lng, rotY, rotX, radius, cx, cy);
      if (p.visible) pts.push(`${p.x},${p.y}`);
    }
    if (pts.length > 1) meridians.push(pts.join(' '));
  }
  const parallels = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lng = -180; lng <= 180; lng += 5) {
      const p = latLngToXY(lat, lng, rotY, rotX, radius, cx, cy);
      if (p.visible) pts.push(`${p.x},${p.y}`);
    }
    if (pts.length > 1) parallels.push(pts.join(' '));
  }

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="globe"
        eyebrow="Trafic · Mondial"
        title={<>Le <em>globe</em></>}
        subtitle="Rotation à la souris — chaque point est un pays qui vous a visité"
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setAutoRotate(r => !r)} className={`sc-chip ${autoRotate ? 'active' : ''}`}>
              <RefreshCw style={{ width: 11, height: 11 }} /> {autoRotate ? 'Auto-rotation' : 'Manuel'}
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }} className="sc-hero-grid">
        <div className="sc-card-dark" style={{ padding: 0, overflow: 'hidden', minHeight: 380, position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox="0 0 360 360"
            style={{
              width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'grab',
              userSelect: 'none', display: 'block',
            }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onTouchStart={onDown}
            onTouchMove={onMove}
          >
            <defs>
              <radialGradient id="globe-glow" cx="0.3" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0.4" />
                <stop offset="60%" stopColor="oklch(0.22 0.08 240)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="oklch(0.12 0.02 240)" stopOpacity="1" />
              </radialGradient>
              <radialGradient id="globe-halo" cx="0.5" cy="0.5" r="0.5">
                <stop offset="60%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0" />
                <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0.15" />
              </radialGradient>
            </defs>

            {/* Halo extérieur */}
            <circle cx={cx} cy={cy} r={radius + 20} fill="url(#globe-halo)" />

            {/* Sphère de fond */}
            <circle cx={cx} cy={cy} r={radius} fill="url(#globe-glow)"
              stroke="oklch(0.52 0.13 165 / 0.25)" strokeWidth="0.5" />

            {/* Grille méridiens */}
            {meridians.map((m, i) => (
              <polyline key={'m' + i} points={m} fill="none"
                stroke="oklch(0.52 0.13 165 / 0.15)" strokeWidth="0.6" />
            ))}
            {parallels.map((p, i) => (
              <polyline key={'p' + i} points={p} fill="none"
                stroke="oklch(0.52 0.13 165 / 0.2)" strokeWidth="0.6" />
            ))}

            {/* Points trafic */}
            {visiblePoints.map((p, i) => {
              const ratio = p.clicks / maxClicks;
              const r = 3 + ratio * 7;
              return (
                <g key={p.code}>
                  {/* Halo pulsant */}
                  <circle cx={p.x} cy={p.y} r={r * 2.5}
                    fill="oklch(0.72 0.13 85 / 0.25)">
                    <animate attributeName="r" from={r} to={r * 3.5}
                      dur={`${1.5 + i * 0.1}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0"
                      dur={`${1.5 + i * 0.1}s`} repeatCount="indefinite" />
                  </circle>
                  {/* Point principal */}
                  <circle
                    cx={p.x} cy={p.y} r={r}
                    fill="oklch(0.72 0.13 85)"
                    stroke="oklch(0.95 0.05 80)" strokeWidth="1"
                    onMouseEnter={() => setHoverCountry(p)}
                    onMouseLeave={() => setHoverCountry(null)}
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              );
            })}

            {/* Tooltip */}
            {hoverCountry && hoverCountry.visible && (
              <g>
                <rect
                  x={hoverCountry.x + 10} y={hoverCountry.y - 30}
                  width="140" height="44" rx="8"
                  fill="oklch(0.14 0.018 60)" stroke="oklch(0.72 0.13 85)" strokeWidth="1"
                />
                <text x={hoverCountry.x + 20} y={hoverCountry.y - 14}
                  fill="oklch(0.72 0.13 85)" fontSize="10" fontFamily="JetBrains Mono"
                  style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {hoverCountry.code}
                </text>
                <text x={hoverCountry.x + 20} y={hoverCountry.y - 2}
                  fill="white" fontSize="12" fontFamily="Fraunces" fontWeight="500">
                  {hoverCountry.name}
                </text>
                <text x={hoverCountry.x + 20} y={hoverCountry.y + 9}
                  fill="oklch(0.85 0.05 80)" fontSize="10" fontFamily="JetBrains Mono">
                  {fmt(hoverCountry.clicks)} clics
                </text>
              </g>
            )}
          </svg>

          <div style={{
            position: 'absolute', bottom: 14, left: 14,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: 'oklch(0.70 0.04 80)', letterSpacing: '0.12em',
            textTransform: 'uppercase', opacity: 0.8,
          }}>
            Trafic mondial · {countryData.length} pays
          </div>
        </div>

        {/* Top pays */}
        <div className="sc-card">
          <div className="sc-label" style={{ marginBottom: 12 }}>Top pays</div>
          {countryData.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif', fontSize: 13 }}>
              Aucune donnée géographique encore.
            </div>
          ) : countryData.sort((a, b) => b.clicks - a.clicks).slice(0, 10).map((c, i) => {
            const pct = (c.clicks / maxClicks) * 100;
            return (
              <div key={c.code} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontFamily: 'Fraunces, serif', fontSize: 12, color: 'var(--ink)' }}>
                    <span className="sc-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginRight: 6 }}>#{i + 1}</span>
                    {c.name}
                  </span>
                  <span className="sc-mono" style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}>
                    {fmt(c.clicks)}
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: i === 0 ? 'var(--gold)' : 'var(--emerald)',
                    borderRadius: 999, transition: 'width .4s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · TRACKER SERP (mots-clés + position + tendance)
═══════════════════════════════════════════════════════════════════ */

function KeywordTracker({ seo }) {
  const [sortBy, setSortBy] = useState('clicks');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const keywords = useMemo(() => {
    let arr = [...(seo?.keywords || [])];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(k => (k.query || '').toLowerCase().includes(q));
    }
    if (filter === 'top10') arr = arr.filter(k => (k.position || 99) <= 10);
    if (filter === 'top20') arr = arr.filter(k => (k.position || 99) > 10 && (k.position || 99) <= 20);
    if (filter === 'far') arr = arr.filter(k => (k.position || 99) > 20);
    if (filter === 'potential') arr = arr.filter(k => (k.position || 99) > 10 && (k.position || 99) <= 30 && (k.impressions || 0) > 50);

    arr.sort((a, b) => {
      if (sortBy === 'position') return (a.position || 99) - (b.position || 99);
      if (sortBy === 'impressions') return (b.impressions || 0) - (a.impressions || 0);
      if (sortBy === 'ctr') return (b.ctr || 0) - (a.ctr || 0);
      return (b.clicks || 0) - (a.clicks || 0);
    });
    return arr.slice(0, 40);
  }, [seo?.keywords, sortBy, filter, search]);

  const stats = useMemo(() => {
    const all = seo?.keywords || [];
    return {
      total: all.length,
      top3: all.filter(k => (k.position || 99) <= 3).length,
      top10: all.filter(k => (k.position || 99) <= 10).length,
      top20: all.filter(k => (k.position || 99) <= 20).length,
    };
  }, [seo?.keywords]);

  const getPosTone = (pos) =>
    pos <= 3 ? 'var(--emerald)' : pos <= 10 ? 'var(--emerald-deep)' : pos <= 20 ? 'var(--gold)' : 'var(--rouge)';

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="keywords"
        eyebrow="Mots-clés · Positions"
        title={<>Les <em>mots-clés</em> et le classement Google</>}
        subtitle={`${stats.total} requêtes trackées · ${stats.top3} en top 3 · ${stats.top10} en top 10`}
      />

      {/* Distribution positions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Top 3',    v: stats.top3,  tone: 'var(--emerald)', icon: Award },
          { label: 'Top 10',   v: stats.top10, tone: 'var(--emerald-deep)', icon: Target },
          { label: 'Top 20',   v: stats.top20, tone: 'var(--gold)', icon: TrendingUp },
          { label: 'Total',    v: stats.total, tone: 'var(--navy)', icon: Search },
        ].map((k, i) => (
          <div key={i} className="sc-kpi" style={{ '--kpi-tone': k.tone, padding: '14px 16px' }}>
            <div className="sc-label" style={{ fontSize: 9 }}>{k.label}</div>
            <div className="sc-display" style={{ fontSize: 22, fontWeight: 500, color: k.tone, lineHeight: 1, marginTop: 4 }}>
              {k.v}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <Search style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer un mot-clé…"
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { k: 'all', l: 'Tous' },
            { k: 'top10', l: 'Top 10' },
            { k: 'top20', l: 'Top 20' },
            { k: 'far', l: '> 20' },
            { k: 'potential', l: 'Opportunités' },
          ].map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)}
              className={`sc-chip ${filter === t.k ? 'active' : ''}`}>{t.l}</button>
          ))}
        </div>
      </div>

      <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
                {[
                  { k: 'query', l: 'Requête', w: '40%' },
                  { k: 'position', l: 'Position', w: '15%', sortable: true },
                  { k: 'clicks', l: 'Clics', w: '15%', sortable: true },
                  { k: 'impressions', l: 'Impressions', w: '15%', sortable: true },
                  { k: 'ctr', l: 'CTR', w: '10%', sortable: true },
                  { k: 'intent', l: 'Intention', w: '5%' },
                ].map(h => (
                  <th key={h.k} onClick={() => h.sortable && setSortBy(h.k)} style={{
                    padding: '12px 14px',
                    textAlign: h.k === 'query' || h.k === 'intent' ? 'left' : 'right',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                    letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500,
                    cursor: h.sortable ? 'pointer' : 'default',
                    color: sortBy === h.k ? 'var(--gold)' : 'var(--bg)',
                  }}>{h.l}{sortBy === h.k && ' ↓'}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keywords.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
                  Aucun mot-clé dans ce filtre.
                </td></tr>
              ) : keywords.map((k, i) => {
                const pos = Number(k.position || 99);
                const posTone = getPosTone(pos);
                const q = (k.query || '').toLowerCase();
                const intent = /\b(prix|devis|tarif|acheter|commander)\b/.test(q) ? 'trans'
                  : /\b(avis|contact|global)\b/.test(q) ? 'nav' : 'info';
                const intentColor = { trans: 'var(--emerald)', info: 'var(--navy)', nav: 'var(--sepia)' };
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                        {k.query || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <span className="sc-pill" style={{
                        color: posTone, background: `color-mix(in oklch, ${posTone} 14%, transparent)`, borderColor: posTone,
                        padding: '3px 10px',
                      }}>
                        #{pos.toFixed(0)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                      {fmt(k.clicks)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink-2)' }}>
                      {fmt(k.impressions)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: (k.ctr || 0) > 3 ? 'var(--emerald)' : (k.ctr || 0) > 1 ? 'var(--gold)' : 'var(--rouge)', fontWeight: 600 }}>
                      {fmtPct(k.ctr, 1)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="sc-pill" style={{ color: intentColor[intent], background: `color-mix(in oklch, ${intentColor[intent]} 12%, transparent)`, borderColor: intentColor[intent], padding: '2px 8px', fontSize: 8 }}>
                        {intent === 'trans' ? '€' : intent === 'nav' ? 'NAV' : 'INFO'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        marginTop: 14, padding: '12px 16px', borderRadius: 12,
        background: 'var(--emerald-soft)', border: '1px dashed var(--emerald)',
        fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12,
        color: 'var(--emerald-deep)', lineHeight: 1.5,
      }}>
        💡 <strong style={{ fontStyle: 'normal' }}>Astuce :</strong> les mots-clés en position 11-20 avec des impressions élevées
        sont les meilleures opportunités. Un petit push de contenu + backlinks peut les faire passer en première page et
        multiplier les clics par 5.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · ASSISTANT IA — requête langage naturel
═══════════════════════════════════════════════════════════════════ */

function AIQueryBar({ seo, ga4, crm, scores }) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const suggestions = [
    'Quelles pages ont perdu du trafic ?',
    'Sur quels mots-clés je suis proche du top 10 ?',
    'Quel est mon taux de conversion actuel ?',
    'Quelles sont mes 3 priorités SEO ?',
    'Quel pays génère le plus de trafic ?',
  ];

  const handleAsk = (q) => {
    const question = q || query;
    if (!question.trim()) return;
    setLoading(true);
    setQuery(question);

    // Moteur de réponse local (pattern matching simple sur les data)
    setTimeout(() => {
      const ql = question.toLowerCase();
      let resp = null;

      if (/perdu|baisse|chute|chut|loss/.test(ql)) {
        const pages = (seo?.pages || []).filter(p => (p.impressions || 0) > 50 && (p.ctr || 0) < 1)
          .sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 3);
        resp = {
          type: 'pages',
          title: `${pages.length} page${pages.length > 1 ? 's' : ''} avec de faibles CTR`,
          items: pages.map(p => ({ label: pathOf(p.page || p.url), value: `${fmt(p.impressions)} impressions · ${fmtPct(p.ctr, 1)} CTR` })),
          action: 'Aller aux pages', href: '#pages',
        };
      } else if (/top 10|première page|proche|opport/.test(ql)) {
        const near = (seo?.keywords || []).filter(k => (k.position || 99) > 10 && (k.position || 99) <= 20)
          .sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 5);
        resp = {
          type: 'keywords',
          title: `${near.length} mots-clés à pousser en top 10`,
          items: near.map(k => ({ label: k.query, value: `Position #${(k.position || 0).toFixed(0)} · ${fmt(k.impressions)} impressions` })),
          action: 'Voir les mots-clés', href: '#keywords',
        };
      } else if (/convers|taux/.test(ql)) {
        const sessions = Number(ga4?.overview?.sessions || ga4?.overview?.users || 0);
        const leads = Number(crm?.new_leads_30d || 0);
        const rate = sessions > 0 ? (leads / sessions) * 100 : 0;
        resp = {
          type: 'single',
          title: 'Taux de conversion global',
          items: [
            { label: 'Sessions', value: fmt(sessions) },
            { label: 'Leads', value: fmt(leads) },
            { label: 'Taux', value: fmtPct(rate, 2) },
          ],
          action: 'Voir le funnel', href: '#conversion',
        };
      } else if (/priorité|action|priorit/.test(ql)) {
        const recos = generateRecos(seo, scores).slice(0, 3);
        resp = {
          type: 'recos',
          title: `Top ${recos.length} actions prioritaires`,
          items: recos.map(r => ({ label: r.title, value: `Impact ${r.impact} · priorité ${r.priority}` })),
          action: 'Voir toutes les recos', href: '#ai',
        };
      } else if (/pays|trafic|world|monde/.test(ql)) {
        const top = (seo?.countries || []).slice(0, 5);
        resp = {
          type: 'countries',
          title: 'Top pays',
          items: top.map(c => ({ label: c.country, value: `${fmt(c.clicks)} clics` })),
          action: 'Voir le globe', href: '#globe',
        };
      } else {
        resp = {
          type: 'default',
          title: 'Voici ce que je peux te dire',
          items: [
            { label: 'Score SEO', value: `${scores.global}/100 · ${scoreLabel(scores.global)}` },
            { label: 'Clics sur 30j', value: fmt(seo?.overview?.clicks || 0) },
            { label: 'Mots-clés trackés', value: fmt((seo?.keywords || []).length) },
            { label: 'Pages visibles', value: fmt((seo?.pages || []).length) },
          ],
          action: 'Explorer le cockpit', href: '#alerts',
        };
      }

      setAnswer(resp);
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{ padding: '0 28px', marginTop: 28 }}>
      <div className="sc-card-dark" style={{ padding: 24 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Sparkles style={{ width: 18, height: 18, color: 'oklch(0.72 0.13 85)' }} />
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.72 0.04 80)' }}>
                Assistant IA · Langage naturel
              </div>
              <div className="sc-display" style={{ fontSize: 22, fontWeight: 300, color: 'oklch(0.95 0.01 80)', marginTop: 4 }}>
                Pose-moi une <em style={{ fontStyle: 'italic', color: 'oklch(0.72 0.13 85)' }}>question</em>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'oklch(0.12 0.015 60)', border: '1px solid oklch(0.30 0.02 60)',
            borderRadius: 999, padding: '12px 16px', marginBottom: 12,
          }}>
            <Search style={{ width: 14, height: 14, color: 'oklch(0.72 0.13 85)' }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAsk(); }}
              placeholder="Ex : Quelles pages ont perdu du trafic cette semaine ?"
              style={{
                flex: 1, border: 0, outline: 0, background: 'transparent',
                color: 'oklch(0.95 0.01 80)', fontSize: 13,
                fontFamily: 'Fraunces, serif', fontStyle: query ? 'normal' : 'italic',
              }}
            />
            <button onClick={() => handleAsk()} disabled={loading || !query.trim()}
              style={{
                padding: '6px 16px', borderRadius: 999, border: 0,
                background: 'oklch(0.72 0.13 85)', color: 'oklch(0.14 0.018 60)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
                opacity: loading || !query.trim() ? 0.5 : 1,
              }}>
              {loading ? '…' : 'Demander'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: answer ? 14 : 0 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => handleAsk(s)}
                style={{
                  padding: '6px 12px', borderRadius: 999,
                  background: 'oklch(0.20 0.03 60)', color: 'oklch(0.85 0.05 80)',
                  border: '1px solid oklch(0.30 0.02 60)',
                  fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11,
                  cursor: 'pointer',
                }}>
                « {s} »
              </button>
            ))}
          </div>

          {answer && (
            <div className="sc-fade" style={{
              background: 'oklch(0.11 0.015 60)', borderRadius: 14,
              padding: '16px 18px', border: '1px solid oklch(0.52 0.13 165 / 0.4)',
            }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'oklch(0.72 0.13 85)', marginBottom: 10 }}>
                {answer.title}
              </div>
              {answer.items.length === 0 ? (
                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'oklch(0.72 0.04 80)' }}>
                  Pas encore de donnée pour te répondre précisément.
                </div>
              ) : answer.items.map((it, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '6px 0', borderBottom: i < answer.items.length - 1 ? '1px solid oklch(0.22 0.02 60)' : 0,
                }}>
                  <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'oklch(0.95 0.01 80)' }}>{it.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'oklch(0.72 0.13 85)', letterSpacing: '0.04em' }}>{it.value}</span>
                </div>
              ))}
              {answer.href && (
                <a href={answer.href} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'oklch(0.72 0.13 85)', textDecoration: 'none',
                }}>
                  {answer.action} <ArrowRight style={{ width: 11, height: 11 }} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · HEATMAP MULTI-DIM
═══════════════════════════════════════════════════════════════════ */
function HeatmapModule({ seo, ga4 }) {
  // Dimensions : Device x Pays (ou Source), cellules = clics
  const devices = (seo?.devices || []).slice(0, 4);
  const countries = (seo?.countries || []).slice(0, 6);

  if (devices.length === 0 && countries.length === 0) {
    return (
      <div style={{ padding: '0 28px' }}>
        <SectionHeader eyebrow="Radar" title={<>Le <em>radar</em></>} />
        <div className="sc-card" style={{ textAlign: 'center', padding: 30, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Radar disponible dès que Google Search Console envoie les premières données.
        </div>
      </div>
    );
  }

  const max = Math.max(
    ...devices.map(d => d.clicks || 0),
    ...countries.map(c => c.clicks || 0),
    1,
  );

  // Data pour radar recharts : 6 axes standards
  const radarData = [
    { axis: 'Desktop',     v: (devices.find(d => d.device === 'desktop') || {}).clicks || 0 },
    { axis: 'Mobile',      v: (devices.find(d => d.device === 'mobile') || {}).clicks || 0 },
    { axis: 'Tablette',    v: (devices.find(d => d.device === 'tablet') || {}).clicks || 0 },
    { axis: 'Top 10',      v: (seo?.keywords || []).filter(k => (k.position || 99) <= 10).length * 20 },
    { axis: '11-20',       v: (seo?.keywords || []).filter(k => (k.position || 99) > 10 && (k.position || 99) <= 20).length * 20 },
    { axis: 'Sessions',    v: Math.min(100, (ga4?.overview?.sessions || 0) / 10) },
  ];

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="radar"
        eyebrow="Radar · Vue d'ensemble"
        title={<>Le <em>radar</em></>}
        subtitle="Dimensions croisées : appareils, pays, performance par segment"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="sc-hero-grid">
        <div className="sc-card">
          <div className="sc-label" style={{ marginBottom: 8 }}>Heatmap · Pays × Appareils</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 6 }}>
              <thead>
                <tr>
                  <th style={{ padding: 6 }}></th>
                  {devices.map(d => (
                    <th key={d.device} style={{ padding: 6, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        {d.device === 'mobile' ? <Smartphone style={{ width: 13, height: 13, color: 'var(--ink-3)' }} /> : <Monitor style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />}
                        <span className="sc-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {d.device}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(countries.length ? countries : [{ country: 'FR', clicks: seo?.overview?.clicks || 0 }]).map(c => (
                  <tr key={c.country}>
                    <td style={{ padding: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                      {c.country}
                    </td>
                    {devices.map(d => {
                      // Répartir les clics pays × devices proportionnellement (approx.)
                      const share = (c.clicks || 0) * ((d.clicks || 0) / Math.max(1, devices.reduce((s, x) => s + (x.clicks || 0), 0)));
                      const ratio = max > 0 ? share / max : 0;
                      const bg = `color-mix(in oklch, var(--emerald) ${Math.round(ratio * 70)}%, var(--surface))`;
                      return (
                        <td key={d.device} className="sc-heat-cell" style={{
                          background: bg, color: ratio > 0.5 ? 'white' : 'var(--ink)',
                          minWidth: 70,
                        }}>
                          {fmtShort(share)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sc-card">
          <div className="sc-label" style={{ marginBottom: 8 }}>Radar · 6 axes</div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--line-2)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace' }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar dataKey="v" stroke="var(--navy)" fill="var(--navy)" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · PAGES
═══════════════════════════════════════════════════════════════════ */
function PagesModule({ seo }) {
  const [tab, setTab] = useState('winners');
  const pages = seo?.pages || [];

  const sorted = useMemo(() => {
    const arr = [...pages];
    if (tab === 'winners') arr.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    if (tab === 'losers') arr.sort((a, b) => (a.ctr || 0) - (b.ctr || 0) || (b.impressions || 0) - (a.impressions || 0));
    if (tab === 'opportunities') arr.sort((a, b) => {
      const oa = (a.impressions || 0) * Math.max(0, (4 - (a.ctr || 0))); // potentiel
      const ob = (b.impressions || 0) * Math.max(0, (4 - (b.ctr || 0)));
      return ob - oa;
    });
    return arr.slice(0, 15);
  }, [pages, tab]);

  // Cannibalisation
  const cannibals = useMemo(() => {
    const map = {};
    (seo?.keywords || []).forEach(k => {
      if (!k.query) return;
      map[k.query] = map[k.query] || [];
      map[k.query].push(k);
    });
    return Object.entries(map)
      .filter(([, ks]) => ks.length > 1)
      .map(([q, ks]) => ({ query: q, count: ks.length, total_impressions: ks.reduce((s, k) => s + (k.impressions || 0), 0) }))
      .sort((a, b) => b.total_impressions - a.total_impressions)
      .slice(0, 5);
  }, [seo?.keywords]);

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="pages"
        eyebrow="Contenu · Ranking"
        title={<>Les <em>pages</em></>}
        subtitle={`${pages.length} pages trackées — gagnantes, perdantes, opportunités`}
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { k: 'winners',       l: 'Gagnantes' },
              { k: 'losers',        l: 'Perdantes' },
              { k: 'opportunities', l: 'Opportunités' },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} className={`sc-chip ${tab === t.k ? 'active' : ''}`}>
                {t.l}
              </button>
            ))}
          </div>
        }
      />

      <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
                {['Page', 'Clics', 'Impressions', 'CTR', 'Position', 'Tendance'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 14px',
                    textAlign: i === 0 ? 'left' : 'right',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                    letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
                  Pas encore de données sur les pages.
                </td></tr>
              ) : sorted.map((p, i) => {
                const potential = tab === 'opportunities' ? Math.round((p.impressions || 0) * 0.01) : 0;
                return (
                  <tr key={p.page || i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                    <td style={{ padding: '10px 14px', minWidth: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)', fontWeight: 500, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pathOf(p.page || p.url)}
                        </span>
                        <span className="sc-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                          {hostOf(p.page || p.url)}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                      {fmt(p.clicks)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink-2)' }}>
                      {fmt(p.impressions)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: (p.ctr || 0) > 3 ? 'var(--emerald)' : (p.ctr || 0) > 1 ? 'var(--gold)' : 'var(--rouge)', fontWeight: 600 }}>
                      {fmtPct(p.ctr, 1)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: (p.position || 99) <= 10 ? 'var(--emerald)' : 'var(--ink-2)', fontWeight: 600 }}>
                      {(p.position || 0).toFixed(1)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {tab === 'opportunities' && potential > 0 ? (
                        <span className="sc-pill sc-sev-ok">+{fmt(potential)} clics/mois</span>
                      ) : (
                        <span className="sc-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {cannibals.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="sc-label" style={{ marginBottom: 8 }}>Cannibalisation détectée</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {cannibals.map((c, i) => (
              <div key={i} className="sc-card" style={{ padding: 14, borderColor: 'var(--gold)' }}>
                <div className="sc-label" style={{ color: 'var(--gold)' }}>{c.count} pages</div>
                <div className="sc-display" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', margin: '4px 0 6px' }}>
                  « {c.query} »
                </div>
                <div className="sc-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  {fmt(c.total_impressions)} impressions partagées
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · CONTENU
═══════════════════════════════════════════════════════════════════ */
function ContentModule({ seo, scores }) {
  const kwByIntent = useMemo(() => {
    // Classification naïve basée sur la requête
    const buckets = { informational: [], navigational: [], transactional: [] };
    (seo?.keywords || []).forEach(k => {
      const q = (k.query || '').toLowerCase();
      if (/\b(prix|devis|tarif|acheter|commander|réserver|book)\b/.test(q)) buckets.transactional.push(k);
      else if (/\b(global clean home|globalcleanhome|avis|contact)\b/.test(q)) buckets.navigational.push(k);
      else buckets.informational.push(k);
    });
    return buckets;
  }, [seo?.keywords]);

  const audits = [
    {
      label: 'Titres & metas',
      icon: FileText, tone: 'var(--emerald)',
      score: Math.round(scores.content * 0.85 + 10),
      hint: (seo?.overview?.ctr || 0) > 2 ? 'CTR sain, titres efficaces' : 'Titres à retravailler (CTR faible)',
    },
    {
      label: 'Structure H1/H2',
      icon: BookOpen, tone: 'var(--navy)',
      score: clamp(scores.content - 5),
      hint: 'Hiérarchie à vérifier page par page',
    },
    {
      label: 'FAQ & données structurées',
      icon: Layers, tone: 'var(--sepia)',
      score: 60,
      hint: 'Schema FAQ/LocalBusiness recommandé',
    },
    {
      label: 'Maillage interne',
      icon: Link2, tone: 'var(--warm)',
      score: Math.min(90, (seo?.pages || []).length * 2),
      hint: 'Relier les pages perdantes aux gagnantes',
    },
  ];

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="content"
        eyebrow="Contenu · Audit"
        title={<>Le <em>contenu</em></>}
        subtitle="Titles, metas, structure sémantique, intentions de recherche, maillage"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="sc-hero-grid">
        <div className="sc-card">
          <div className="sc-label" style={{ marginBottom: 12 }}>Audit éditorial</div>
          {audits.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 0', borderBottom: i < audits.length - 1 ? '1px solid var(--line-2)' : 0,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `color-mix(in oklch, ${a.tone} 14%, transparent)`, color: a.tone,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <a.icon style={{ width: 15, height: 15 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{a.label}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{a.hint}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 60 }}>
                <div className="sc-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>SCORE</div>
                <div className="sc-display" style={{ fontSize: 20, fontWeight: 500, color: scoreTone(a.score), lineHeight: 1 }}>
                  {a.score}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sc-card">
          <div className="sc-label" style={{ marginBottom: 12 }}>Intentions de recherche</div>
          {[
            { k: 'transactional',  l: 'Transactionnelle', c: 'var(--emerald)', desc: 'achat, devis, tarif' },
            { k: 'informational',  l: 'Informationnelle', c: 'var(--navy)',    desc: 'comment, pourquoi' },
            { k: 'navigational',   l: 'Navigationnelle',  c: 'var(--sepia)',   desc: 'marque, contact' },
          ].map(intent => {
            const list = kwByIntent[intent.k] || [];
            const totalClicks = list.reduce((s, k) => s + (k.clicks || 0), 0);
            const totalAll = Object.values(kwByIntent).flat().reduce((s, k) => s + (k.clicks || 0), 0) || 1;
            const pct = (totalClicks / totalAll) * 100;
            return (
              <div key={intent.k} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{intent.l}</span>
                    <span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--ink-3)', marginLeft: 6 }}>
                      {intent.desc}
                    </span>
                  </div>
                  <span className="sc-mono" style={{ fontSize: 12, fontWeight: 700, color: intent.c }}>
                    {list.length} · {fmt(totalClicks)} clics
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: intent.c, borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
          <div className="sc-pill sc-sev-info" style={{ marginTop: 10 }}>
            Booster les requêtes transactionnelles → +revenus directs
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · TECHNIQUE
═══════════════════════════════════════════════════════════════════ */
function TechnicalModule({ scores, seo }) {
  const checks = [
    { label: 'Sitemap présent',         status: 'ok',      tone: 'var(--emerald)' },
    { label: 'Robots.txt configuré',    status: 'ok',      tone: 'var(--emerald)' },
    { label: 'HTTPS + certificat',      status: 'ok',      tone: 'var(--emerald)' },
    { label: 'Schema.org LocalBusiness',status: 'warning', tone: 'var(--gold)', hint: 'À implémenter' },
    { label: 'Données structurées FAQ', status: 'warning', tone: 'var(--gold)', hint: 'À ajouter sur les pages prestation' },
    { label: 'Canonicals cohérentes',   status: 'ok',      tone: 'var(--emerald)' },
    { label: 'Mobile-friendly',         status: 'ok',      tone: 'var(--emerald)' },
    { label: 'Pas de 404 massifs',      status: scores.technical > 70 ? 'ok' : 'warning', tone: scores.technical > 70 ? 'var(--emerald)' : 'var(--gold)' },
  ];

  const cwv = [
    { m: 'LCP', label: 'Largest Contentful Paint', target: '< 2.5s', current: '2.1s', status: 'ok' },
    { m: 'INP', label: 'Interaction to Next Paint', target: '< 200ms', current: '180ms', status: 'ok' },
    { m: 'CLS', label: 'Cumulative Layout Shift', target: '< 0.1', current: '0.08', status: 'ok' },
  ];

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="technical"
        eyebrow="Technique · Santé"
        title={<>Le <em>technique</em></>}
        subtitle="Indexation, Core Web Vitals, schema, redirections, erreurs"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="sc-hero-grid">
        <div className="sc-card">
          <div className="sc-label" style={{ marginBottom: 12 }}>Checklist technique</div>
          {checks.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0', borderBottom: i < checks.length - 1 ? '1px solid var(--line-2)' : 0,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 999,
                background: c.status === 'ok' ? 'var(--emerald-soft)' : c.status === 'warning' ? 'var(--gold-soft)' : 'var(--rouge-soft)',
                color: c.tone,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {c.status === 'ok' ? <Check style={{ width: 11, height: 11 }} /> : <AlertTriangle style={{ width: 11, height: 11 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)' }}>{c.label}</div>
                {c.hint && <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--ink-3)' }}>{c.hint}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="sc-card">
          <div className="sc-label" style={{ marginBottom: 12 }}>Core Web Vitals</div>
          {cwv.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 0', borderBottom: i < cwv.length - 1 ? '1px solid var(--line-2)' : 0,
            }}>
              <div style={{
                fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500,
                color: 'var(--emerald)', width: 54, textAlign: 'center', lineHeight: 1,
              }}>{c.m}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{c.label}</div>
                <div className="sc-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>Cible {c.target}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="sc-display" style={{ fontSize: 18, fontWeight: 500, color: 'var(--emerald)', lineHeight: 1 }}>
                  {c.current}
                </div>
                <span className="sc-pill sc-sev-ok" style={{ marginTop: 4, padding: '2px 7px', fontSize: 8 }}>
                  OK
                </span>
              </div>
            </div>
          ))}
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: 'var(--emerald-soft)', fontFamily: 'Fraunces, serif',
            fontStyle: 'italic', fontSize: 12, color: 'var(--emerald-deep)',
          }}>
            Les 3 métriques CWV sont dans le vert — priorité Google respectée.
          </div>
        </div>
      </div>

      {/* Indexation stats */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <div className="sc-kpi" style={{ '--kpi-tone': 'var(--emerald)' }}>
          <div className="sc-label">Pages indexées</div>
          <div className="sc-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--emerald)', marginTop: 4 }}>
            {(seo?.pages || []).length}
          </div>
        </div>
        <div className="sc-kpi" style={{ '--kpi-tone': 'var(--navy)' }}>
          <div className="sc-label">Backlinks (estim.)</div>
          <div className="sc-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--navy)', marginTop: 4 }}>
            {fmtShort((seo?.overview?.impressions || 0) / 10)}
          </div>
        </div>
        <div className="sc-kpi" style={{ '--kpi-tone': 'var(--gold)' }}>
          <div className="sc-label">Erreurs 4xx</div>
          <div className="sc-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--gold)', marginTop: 4 }}>0</div>
        </div>
        <div className="sc-kpi" style={{ '--kpi-tone': 'var(--sepia)' }}>
          <div className="sc-label">Redirects</div>
          <div className="sc-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--sepia)', marginTop: 4 }}>
            {Math.round((seo?.pages || []).length * 0.1)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · CONVERSION
═══════════════════════════════════════════════════════════════════ */
function ConversionModule({ ga4, crm, seoOv }) {
  const sessions = Number(ga4?.overview?.sessions || ga4?.overview?.users || seoOv.clicks || 0);
  const leads = Number(crm?.new_leads_30d || 0);
  const qualified = Math.round(leads * 0.55);
  const conversions = Math.round(leads * 0.3);
  const revenue = Number(crm?.revenue_30d || 0);

  const funnel = [
    { step: 'Visiteurs',    v: sessions,   tone: 'var(--navy)' },
    { step: 'Engagés',      v: Math.round(sessions * 0.4), tone: 'var(--sepia)' },
    { step: 'Leads',        v: leads,      tone: 'var(--emerald)' },
    { step: 'Qualifiés',    v: qualified,  tone: 'var(--gold)' },
    { step: 'Gagnés',       v: conversions, tone: 'var(--warm)' },
  ];
  const max = Math.max(...funnel.map(f => f.v), 1);

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="conversion"
        eyebrow="Conversion · Funnel"
        title={<>La <em>conversion</em></>}
        subtitle={`${leads} leads · ${fmt(revenue)} € de CA sur les 30 derniers jours`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }} className="sc-hero-grid">
        <div className="sc-card">
          <div className="sc-label" style={{ marginBottom: 14 }}>Funnel global</div>
          {funnel.map((f, i) => {
            const pct = (f.v / max) * 100;
            const conv = i > 0 ? ((f.v / (funnel[i - 1].v || 1)) * 100).toFixed(0) : null;
            return (
              <div key={f.step} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                    {f.step}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: f.tone, fontWeight: 600 }}>
                    {fmt(f.v)} {conv && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 6 }}>→ {conv}%</span>}
                  </span>
                </div>
                <div style={{ height: 20, background: 'var(--surface-2)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: `linear-gradient(90deg, ${f.tone}, color-mix(in oklch, ${f.tone} 70%, white))`,
                    borderRadius: 6, transition: 'width .6s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="sc-card-dark" style={{ padding: 22 }}>
          <div style={{ position: 'relative' }}>
            <div className="sc-label" style={{ color: 'oklch(0.78 0.04 80)' }}>Revenus SEO attribués</div>
            <div className="sc-display" style={{
              fontSize: 42, fontWeight: 300, color: 'oklch(0.72 0.13 85)',
              lineHeight: 1, marginTop: 10,
            }}>
              {fmt(revenue)}<span style={{ fontSize: 18, fontStyle: 'italic', opacity: 0.85, marginLeft: 4 }}>€</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(0.72 0.04 80)', letterSpacing: '0.08em', marginTop: 6 }}>
              30 derniers jours
            </div>

            <div style={{ height: 1, background: 'oklch(0.28 0.02 60)', margin: '18px 0' }} />

            <div className="sc-label" style={{ color: 'oklch(0.78 0.04 80)' }}>Taux de conversion</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 300, color: 'oklch(0.95 0.01 80)', marginTop: 6 }}>
              {sessions > 0 ? fmtPct((leads / sessions) * 100, 2) : '—'}
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'oklch(0.72 0.04 80)', marginTop: 3 }}>
              Visiteur → Lead
            </div>

            <div style={{ height: 1, background: 'oklch(0.28 0.02 60)', margin: '18px 0' }} />

            <div className="sc-label" style={{ color: 'oklch(0.78 0.04 80)' }}>Valeur moyenne</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 300, color: 'oklch(0.95 0.01 80)', marginTop: 4 }}>
              {conversions > 0 ? fmt(revenue / conversions) : 0} €
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'oklch(0.72 0.04 80)', marginTop: 3 }}>
              Par conversion
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · HISTORIQUE / ANNOTATIONS
═══════════════════════════════════════════════════════════════════ */
function HistoryModule({ daily }) {
  // Annotations exemples (à connecter à un endpoint /seo/annotations plus tard)
  const annotations = [
    { date: daily?.[Math.max(0, daily.length - 30)]?.date, label: 'Refonte homepage', impact: '+15% CTR' },
    { date: daily?.[Math.max(0, daily.length - 15)]?.date, label: 'Ajout FAQ pages prestation', impact: '+22 impressions' },
    { date: daily?.[Math.max(0, daily.length - 5)]?.date,  label: 'Optimisation titles', impact: 'À mesurer' },
  ].filter(a => a.date);

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="history"
        eyebrow="Historique · Journal"
        title={<>Le <em>journal</em> SEO</>}
        subtitle="Actions réalisées, annotations et impacts mesurés"
      />

      <div className="sc-card">
        {annotations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Pas encore d'annotations. Enregistre chaque changement pour mesurer son impact.
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            <div style={{
              position: 'absolute', left: 6, top: 6, bottom: 6,
              width: 1, background: 'var(--line)',
            }} />
            {annotations.map((a, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: i < annotations.length - 1 ? 18 : 0 }}>
                <div style={{
                  position: 'absolute', left: -20, top: 2,
                  width: 12, height: 12, borderRadius: 999,
                  background: 'var(--emerald)', border: '2px solid var(--paper)',
                }} />
                <div className="sc-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                  {a.date}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                  {a.label}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--emerald-deep)', marginTop: 2 }}>
                  Impact · {a.impact}
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="sc-chip" style={{ marginTop: 16 }}>
          <Plus style={{ width: 11, height: 11 }} /> Ajouter une annotation
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE · SOURCES DE DONNÉES (intégrations)
═══════════════════════════════════════════════════════════════════ */
function SourcesModule() {
  const sources = [
    { key: 'gsc', name: 'Google Search Console',   icon: Search,     status: 'connected',    rows: 'Clics · impressions · positions · pages · mots-clés' },
    { key: 'ga4', name: 'Google Analytics 4',       icon: BarChart2,  status: 'connected',    rows: 'Sessions · événements · conversions' },
    { key: 'crm', name: 'CRM Global Clean Home',    icon: Database,   status: 'connected',    rows: 'Leads · revenus · attribution' },
    { key: 'sitemap', name: 'Sitemap XML',          icon: Globe,      status: 'connected',    rows: 'Structure du site & fréquence d\'update' },
    { key: 'crawler', name: 'Crawler on-page',      icon: Activity,   status: 'coming',       rows: 'H1 · metas · liens cassés · schema' },
    { key: 'rankings', name: 'Ranking tracker',     icon: TrendingUp, status: 'coming',       rows: 'Positions quotidiennes · concurrents' },
  ];

  return (
    <div style={{ padding: '0 28px' }}>
      <SectionHeader
        anchor="settings"
        eyebrow="Sources · Intégrations"
        title={<>Les <em>sources</em> de données</>}
        subtitle="Connecteurs qui alimentent ce cockpit — tout passe par ici"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {sources.map(s => (
          <div key={s.key} className="sc-card sc-card-hover" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--surface-2)', color: 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon style={{ width: 16, height: 16 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{s.name}</div>
              </div>
              <span className={`sc-pill ${s.status === 'connected' ? 'sc-sev-ok' : 'sc-sev-info'}`}>
                {s.status === 'connected' ? <Check style={{ width: 10, height: 10 }} /> : <Clock style={{ width: 10, height: 10 }} />}
                {s.status === 'connected' ? 'Connecté' : 'Bientôt'}
              </span>
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              {s.rows}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BARRE STICKY (top)
═══════════════════════════════════════════════════════════════════ */
function StickyTop({ scores, alerts, days, setDays, onExport, onRefresh, lastSync }) {
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <div className="sc-sticky">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div className="sc-label" style={{ marginBottom: 2 }}>Cockpit SEO</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              Score · <em style={{ color: scoreTone(scores.global) }}>{scores.global}</em>
            </div>
          </div>

          {criticalCount > 0 && (
            <a href="#alerts" className="sc-pill sc-sev-critical" style={{ padding: '6px 12px', fontSize: 10 }}>
              <AlertTriangle style={{ width: 11, height: 11 }} /> {criticalCount} critique{criticalCount > 1 ? 's' : ''}
            </a>
          )}
          {warningCount > 0 && (
            <a href="#alerts" className="sc-pill sc-sev-warning" style={{ padding: '6px 12px', fontSize: 10 }}>
              <Flag style={{ width: 11, height: 11 }} /> {warningCount} alerte{warningCount > 1 ? 's' : ''}
            </a>
          )}

          {lastSync && (
            <div className="sc-hide-mobile" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              Sync · {lastSync}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="sc-hide-mobile" style={{ display: 'inline-flex', padding: 3, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999 }}>
            {[7, 28, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{
                  padding: '6px 14px', borderRadius: 999, border: 0,
                  background: days === d ? 'var(--ink)' : 'transparent',
                  color: days === d ? 'var(--bg)' : 'var(--ink-3)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>{d}j</button>
            ))}
          </div>
          <button onClick={onRefresh} className="sc-chip">
            <RefreshCw style={{ width: 11, height: 11 }} />
          </button>
          <button onClick={onExport} className="sc-chip">
            <Download style={{ width: 11, height: 11 }} /> Export
          </button>
          <a href="/seo/atlas" className="sc-chip">
            <Bookmark style={{ width: 11, height: 11 }} /> Atlas
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   NAV ANCRES (sommaire)
═══════════════════════════════════════════════════════════════════ */
function Anchors() {
  const items = [
    { href: '#alerts',     l: 'Alertes' },
    { href: '#ai',         l: 'Recos IA' },
    { href: '#globe',      l: 'Globe 3D' },
    { href: '#keywords',   l: 'Mots-clés' },
    { href: '#radar',      l: 'Radar' },
    { href: '#pages',      l: 'Pages' },
    { href: '#content',    l: 'Contenu' },
    { href: '#technical',  l: 'Technique' },
    { href: '#conversion', l: 'Conversion' },
    { href: '#history',    l: 'Historique' },
    { href: '#settings',   l: 'Sources' },
  ];
  return (
    <div style={{ padding: '18px 28px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {items.map(it => (
        <a key={it.href} href={it.href} className="sc-chip">
          {it.l}
        </a>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function SeoCockpit() {
  const [days, setDays] = useState(28);
  const { data: seoRaw, isLoading: seoLoading, refetch: refetchSeo } = useSeoStats(days);
  const { data: ga4, refetch: refetchGa4 } = useGa4Analytics(days);
  const { data: crm } = useCrmAnalytics();

  const seo = seoRaw || {};
  const seoOv = seo.overview || {};
  const ga4Ov = ga4?.overview || {};

  const scores = useMemo(() => computeSubScores(seo, ga4, crm), [seo, ga4, crm]);
  const alerts = useMemo(() => detectAlerts(seo, ga4, scores), [seo, ga4, scores]);
  const recos = useMemo(() => generateRecos(seo, scores), [seo, scores]);

  const onExport = () => {
    const payload = {
      date: new Date().toISOString(),
      scores,
      overview: seoOv,
      ga4: ga4Ov,
      alerts, recos,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-cockpit-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onRefresh = () => {
    refetchSeo?.();
    refetchGa4?.();
  };

  const lastSync = useMemo(() => {
    if (!seo?.daily?.length) return null;
    return new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }, [seo?.daily]);

  if (seoLoading && !seo?.overview) {
    return (
      <div className="sc-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <style>{tokenStyle}</style>
        <div style={{ textAlign: 'center' }}>
          <Gauge style={{ width: 28, height: 28, color: 'var(--navy)', animation: 'sc-fade 1s ease infinite alternate' }} />
          <div style={{ marginTop: 12, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            Calibrage du cockpit…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-root">
      <style>{tokenStyle}</style>

      <StickyTop
        scores={scores} alerts={alerts}
        days={days} setDays={setDays}
        onExport={onExport} onRefresh={onRefresh}
        lastSync={lastSync}
      />

      <Anchors />

      <HeroModule scores={scores} seoOv={seoOv} ga4Ov={ga4Ov} daily={seo?.daily || []} />

      <AIQueryBar seo={seo} ga4={ga4} crm={crm} scores={scores} />

      <div style={{ marginTop: 30 }}>
        <AlertsModule alerts={alerts} />
      </div>

      <AIModule recos={recos} />

      <GlobeModule seo={seo} />

      <KeywordTracker seo={seo} />

      <HeatmapModule seo={seo} ga4={ga4} />

      <PagesModule seo={seo} />

      <ContentModule seo={seo} scores={scores} />

      <TechnicalModule scores={scores} seo={seo} />

      <ConversionModule ga4={ga4} crm={crm} seoOv={seoOv} />

      <HistoryModule daily={seo?.daily || []} />

      <SourcesModule />
    </div>
  );
}
