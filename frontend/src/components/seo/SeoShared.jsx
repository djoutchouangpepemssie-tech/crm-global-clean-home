// SeoShared.jsx — tokens, helpers, atoms réutilisables par toutes les
// sous-pages du module SEO. Architecture SaaS modulaire.
//
// Exports :
//   Tokens/CSS: seoTokenStyle
//   Helpers:    fmt, fmtPct, fmtShort, clamp, scoreTone, scoreLabel, hostOf, pathOf
//   Compute:    computeSubScores, detectAlerts, generateRecos
//   Atoms:      ScoreGauge, SubScoreRow, KpiTile, SectionHeader, Pill
//   Molecules:  PageHeader, EmptyState, LoadingState, ErrorState
//   Context:    SeoFilterContext (days, setDays)

import React, { useContext, createContext, useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import {
  AlertCircle, AlertTriangle, ArrowDown, ArrowUp, Bell, Check, CheckCircle,
  Download, ExternalLink, Flag, Gauge, Globe, Info, Loader2, Search,
  TrendingUp,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   DESIGN SYSTEM — TOKENS
═══════════════════════════════════════════════════════════════════ */
export const seoTokenStyle = `
  .seo-root {
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

    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    color: var(--ink);
  }

  .seo-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .seo-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .seo-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .seo-italic  { font-style: italic; color: var(--navy); font-weight: 400; }

  .seo-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 18px; padding: 22px 24px;
    position: relative;
  }
  .seo-card-hover {
    transition: transform .15s, box-shadow .15s, border-color .15s;
  }
  .seo-card-hover:hover {
    transform: translateY(-2px); border-color: var(--ink-3);
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  }
  .seo-card-dark {
    background: linear-gradient(160deg, oklch(0.16 0.018 60) 0%, oklch(0.22 0.04 240) 100%);
    color: oklch(0.95 0.01 80);
    border-radius: 18px; padding: 24px;
    border: 1px solid oklch(0.28 0.02 60);
    position: relative; overflow: hidden;
  }
  .seo-card-dark::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 80% 10%, oklch(0.52 0.13 165 / 0.22), transparent 60%);
    pointer-events: none;
  }

  .seo-kpi {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; padding: 18px 20px;
    position: relative; overflow: hidden;
    transition: border-color .15s;
  }
  .seo-kpi::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--kpi-tone, var(--navy));
  }
  .seo-kpi:hover { border-color: var(--ink-3); }

  .seo-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }
  .seo-sev-critical { color: var(--rouge); background: var(--rouge-soft); border-color: var(--rouge); }
  .seo-sev-warning  { color: var(--gold); background: var(--gold-soft); border-color: var(--gold); }
  .seo-sev-info     { color: var(--navy); background: var(--navy-soft); border-color: var(--navy); }
  .seo-sev-ok       { color: var(--emerald); background: var(--emerald-soft); border-color: var(--emerald); }

  .seo-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: all .15s; text-decoration: none;
  }
  .seo-chip:hover { border-color: var(--ink-3); color: var(--ink); }
  .seo-chip.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }

  .seo-cta {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: 999px;
    background: var(--ink); color: var(--bg); border: 0;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: opacity .15s;
  }
  .seo-cta:hover { opacity: 0.88; }

  @keyframes seo-pulse {
    0%   { box-shadow: 0 0 0 0 oklch(0.65 0.15 145 / 0.5); }
    80%  { box-shadow: 0 0 0 10px oklch(0.65 0.15 145 / 0); }
    100% { box-shadow: 0 0 0 0 oklch(0.65 0.15 145 / 0); }
  }
  .seo-pulse-dot { animation: seo-pulse 2.2s ease-out infinite; }

  @keyframes seo-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .seo-fade { animation: seo-fade .35s ease; }

  .seo-section-title {
    font-family: 'Fraunces', serif; font-size: 26px; font-weight: 400;
    letter-spacing: -0.02em; color: var(--ink); margin: 0 0 4px;
  }
  .seo-section-title em { font-style: italic; color: var(--navy); font-weight: 400; }
  .seo-section-sub {
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: 13px; color: var(--ink-3); margin-bottom: 20px;
  }
`;

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
export const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
export const fmtPct = (v, dec = 1) => `${Number(v || 0).toFixed(dec)}%`;
export const fmtShort = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
};
export const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
export const scoreTone = (n) =>
  n >= 75 ? 'var(--emerald)' :
  n >= 55 ? 'var(--gold)' :
  n >= 35 ? 'var(--warm)' : 'var(--rouge)';
export const scoreLabel = (n) =>
  n >= 85 ? 'Excellent' :
  n >= 70 ? 'Bon' :
  n >= 55 ? 'Correct' :
  n >= 35 ? 'À améliorer' : 'Critique';
export const hostOf = (url) => { try { return new URL(url).hostname; } catch { return url || ''; } };
export const pathOf = (url) => { try { return new URL(url).pathname; } catch { return url || '/'; } };

/* ═══════════════════════════════════════════════════════════════════
   CALCULS MÉTIER
═══════════════════════════════════════════════════════════════════ */
export function computeSubScores(seo, ga4, crm) {
  const ov = seo?.overview || {};
  const position = Number(ov.position || 50);
  const ctr = Number(ov.ctr || 0);
  const clicks = Number(ov.clicks || 0);
  const impressions = Number(ov.impressions || 0);

  const technical = Math.round(
    (position <= 10 ? 95 : position <= 20 ? 75 : position <= 40 ? 55 : 35) * 0.7 +
    (clicks > 500 ? 90 : clicks > 100 ? 75 : 50) * 0.3
  );

  const topKw = (seo?.keywords || []).filter(k => (k.position || 99) <= 10).length;
  const content = Math.round(
    (ctr > 4 ? 90 : ctr > 2 ? 70 : ctr > 1 ? 55 : 40) * 0.5 +
    (topKw > 30 ? 90 : topKw > 10 ? 70 : topKw > 0 ? 55 : 35) * 0.5
  );

  const pagesCount = (seo?.pages || []).length;
  const authority = Math.round(
    (impressions > 10_000 ? 90 : impressions > 1000 ? 70 : 45) * 0.6 +
    (pagesCount > 50 ? 85 : pagesCount > 10 ? 65 : 45) * 0.4
  );

  const sessions = Number(ga4?.overview?.sessions || ga4?.overview?.users || 0);
  const leads = Number(crm?.new_leads_30d || 0);
  const convRate = sessions > 0 ? (leads / sessions) * 100 : 0;
  const conversion = Math.round(
    (convRate > 5 ? 95 : convRate > 2 ? 75 : convRate > 1 ? 55 : 35) * 0.6 +
    (leads > 100 ? 90 : leads > 20 ? 70 : 45) * 0.4
  );

  const ux = Math.round(
    (ga4?.overview?.bounce_rate != null
      ? (100 - Number(ga4.overview.bounce_rate))
      : position <= 10 ? 80 : 60)
  );

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

export function detectAlerts(seo, ga4, scores) {
  const alerts = [];
  const ov = seo?.overview || {};
  const daily = seo?.daily || [];

  if (daily.length >= 14) {
    const last7 = daily.slice(-7).reduce((s, d) => s + (d.clicks || 0), 0);
    const prev7 = daily.slice(-14, -7).reduce((s, d) => s + (d.clicks || 0), 0);
    if (prev7 > 0 && (last7 - prev7) / prev7 < -0.2) {
      alerts.push({
        type: 'clicks_drop', severity: 'critical',
        title: 'Chute de clics — -' + Math.round(((prev7 - last7) / prev7) * 100) + '%',
        message: `${fmt(last7)} clics sur 7j vs ${fmt(prev7)} la période précédente`,
        action: 'Analyser les pages perdantes', href: '/seo/performance',
      });
    }
  }
  if (ov.ctr != null && ov.ctr < 1.5 && ov.impressions > 500) {
    alerts.push({
      type: 'low_ctr', severity: 'warning',
      title: `CTR faible · ${Number(ov.ctr).toFixed(1)}%`,
      message: 'Les titres et metas méritent d\'être retravaillés.',
      action: 'Voir audit contenu', href: '/seo/content',
    });
  }
  if (ov.position != null && ov.position > 25) {
    alerts.push({
      type: 'bad_position', severity: 'warning',
      title: `Position moyenne · ${Number(ov.position).toFixed(1)}`,
      message: 'Aucune page en première page — opportunité forte.',
      action: 'Voir opportunités', href: '/seo/performance',
    });
  }
  const zeroClickPages = (seo?.pages || []).filter(p => (p.impressions || 0) > 50 && (p.clicks || 0) === 0);
  if (zeroClickPages.length > 0) {
    alerts.push({
      type: 'orphan', severity: 'warning',
      title: `${zeroClickPages.length} page${zeroClickPages.length > 1 ? 's' : ''} sans clic`,
      message: 'Vues en résultats mais jamais cliquées — snippet à revoir.',
      action: 'Voir pages', href: '/seo/performance',
    });
  }
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
      action: 'Voir contenu', href: '/seo/content',
    });
  }
  if (scores?.global < 50) {
    alerts.push({
      type: 'low_score', severity: 'critical',
      title: `Score SEO global · ${scores.global}/100`,
      message: 'Plusieurs leviers critiques à activer rapidement.',
      action: 'Voir recos IA', href: '/seo/ai',
    });
  }
  return alerts;
}

export function generateRecos(seo, scores) {
  const recos = [];
  const ov = seo?.overview || {};

  if (ov.ctr != null && ov.ctr < 2 && ov.impressions > 200) {
    recos.push({
      id: 'ctr-meta',
      title: 'Réécrire les title/meta-description des pages à fort potentiel',
      impact: 'high', effort: 'low', category: 'Contenu',
      desc: `CTR actuel · ${fmtPct(ov.ctr, 2)}. Un gain de +1 pt CTR à volume constant = +${fmt(ov.impressions * 0.01)} clics/mois.`,
      priority: 92, href: '/seo/content',
    });
  }
  const nearFirstPage = (seo?.keywords || []).filter(k => (k.position || 99) > 10 && (k.position || 99) <= 20);
  if (nearFirstPage.length > 0) {
    const potClicks = nearFirstPage.reduce((s, k) => s + (k.impressions || 0) * 0.04, 0);
    recos.push({
      id: 'near-top10',
      title: `Pousser ${nearFirstPage.length} mots-clés en première page (top 10)`,
      impact: 'high', effort: 'medium', category: 'Opportunité',
      desc: `Potentiel estimé · +${fmt(potClicks)} clics/mois avec optimisation contenu + backlinks ciblés.`,
      priority: 88, href: '/seo/performance',
    });
  }
  const zeroClick = (seo?.pages || []).filter(p => (p.impressions || 0) > 100 && (p.clicks || 0) === 0);
  if (zeroClick.length > 0) {
    recos.push({
      id: 'zero-click',
      title: `Réécrire les snippets de ${zeroClick.length} page${zeroClick.length > 1 ? 's' : ''} vue${zeroClick.length > 1 ? 's' : ''} mais jamais cliquée${zeroClick.length > 1 ? 's' : ''}`,
      impact: 'medium', effort: 'low', category: 'Contenu',
      desc: `Ces pages ont ${fmt(zeroClick.reduce((s, p) => s + (p.impressions || 0), 0))} impressions sans clic.`,
      priority: 75, href: '/seo/performance',
    });
  }
  const kwPages = {};
  (seo?.keywords || []).forEach(k => { if (k.query) kwPages[k.query] = (kwPages[k.query] || 0) + 1; });
  const cannibals = Object.entries(kwPages).filter(([_, c]) => c > 1);
  if (cannibals.length > 0) {
    recos.push({
      id: 'cannibal',
      title: `Résoudre la cannibalisation sur ${cannibals.length} mot${cannibals.length > 1 ? 's' : ''}-clé${cannibals.length > 1 ? 's' : ''}`,
      impact: 'medium', effort: 'medium', category: 'Technique',
      desc: 'Fusionner ou différencier les pages qui se concurrencent.',
      priority: 68, href: '/seo/content',
    });
  }
  if (scores.technical < 65) {
    recos.push({
      id: 'tech-audit',
      title: 'Lancer un audit technique complet',
      impact: 'high', effort: 'high', category: 'Technique',
      desc: 'Indexation, vitesse, Core Web Vitals, données structurées.',
      priority: 80, href: '/seo/technical',
    });
  }
  if (scores.conversion < 60) {
    recos.push({
      id: 'cta-funnel',
      title: 'Optimiser le funnel de conversion des pages les plus vues',
      impact: 'high', effort: 'medium', category: 'Conversion',
      desc: 'CTA visibles, preuves sociales, formulaire simplifié.',
      priority: 85, href: '/seo/conversion',
    });
  }
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
      impact: 'medium', effort: 'medium', category: 'UX',
      desc: `${fmtPct(mobileShare, 0)} du trafic est mobile — vérifier CWV mobile et lisibilité.`,
      priority: 70, href: '/seo/technical',
    });
  }

  return recos.sort((a, b) => b.priority - a.priority);
}

/* ═══════════════════════════════════════════════════════════════════
   CONTEXT — filtres globaux partagés entre toutes les pages
═══════════════════════════════════════════════════════════════════ */
export const SeoFilterContext = createContext({ days: 28, setDays: () => {} });
export const useSeoFilter = () => useContext(SeoFilterContext);

/* ═══════════════════════════════════════════════════════════════════
   ATOMS
═══════════════════════════════════════════════════════════════════ */

export function ScoreGauge({ value, size = 180, label }) {
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
        <div className="seo-display" style={{ fontSize: size * 0.33, fontWeight: 300, lineHeight: 1, color: tone }}>
          {v}
        </div>
        <div className="seo-label" style={{ marginTop: 4, color: tone }}>
          {label || scoreLabel(v)}
        </div>
      </div>
    </div>
  );
}

export function SubScoreRow({ label, value, icon: Icon }) {
  const tone = scoreTone(value);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)' }}>
          {Icon && <Icon style={{ width: 13, height: 13, color: tone }} />}
          {label}
        </span>
        <span className="seo-mono" style={{ fontSize: 13, fontWeight: 700, color: tone }}>{value}</span>
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

export function KpiTile({ label, value, trend, tone = 'var(--navy)', icon: Icon, sub, sparkline }) {
  return (
    <div className="seo-kpi" style={{ '--kpi-tone': tone }}>
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
          <div className="seo-mono" style={{
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
      <div className="seo-label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="seo-display" style={{ fontSize: 26, fontWeight: 500, color: tone, lineHeight: 1 }}>
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

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="seo-fade" style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 18, flexWrap: 'wrap', marginBottom: 28,
    }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        {eyebrow && <div className="seo-label" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h1 className="seo-display" style={{
          fontSize: 38, fontWeight: 300, lineHeight: 0.95, margin: 0, color: 'var(--ink)',
        }}>
          {title}
        </h1>
        {subtitle && (
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', marginTop: 8 }}>
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function SectionHeader({ id, eyebrow, title, subtitle, right }) {
  return (
    <div id={id} style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap', marginBottom: 14, marginTop: 8, scrollMarginTop: 90,
    }}>
      <div>
        {eyebrow && <div className="seo-label" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h2 className="seo-section-title">{title}</h2>
        {subtitle && <div className="seo-section-sub">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

/* ─── États ─── */
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="seo-card" style={{
      textAlign: 'center', padding: '40px 32px',
      border: '1px dashed var(--line)',
    }}>
      {Icon && <Icon style={{ width: 32, height: 32, color: 'var(--ink-4)', marginBottom: 14 }} />}
      <div className="seo-display" style={{ fontSize: 20, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 4 }}>
        {title}
      </div>
      {message && (
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 440, margin: '0 auto' }}>
          {message}
        </div>
      )}
      {action}
    </div>
  );
}

export function LoadingState({ message = 'Chargement…' }) {
  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <Gauge style={{ width: 28, height: 28, color: 'var(--navy)', animation: 'seo-fade 1s ease infinite alternate' }} />
      <div style={{ marginTop: 12, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
        {message}
      </div>
    </div>
  );
}

export function ErrorState({ message = 'Erreur de chargement', onRetry }) {
  return (
    <div className="seo-card" style={{ textAlign: 'center', padding: 40, borderColor: 'var(--rouge)' }}>
      <AlertTriangle style={{ width: 28, height: 28, color: 'var(--rouge)', marginBottom: 12 }} />
      <div className="seo-display" style={{ fontSize: 18, fontStyle: 'italic', color: 'var(--rouge)', marginBottom: 10 }}>
        {message}
      </div>
      {onRetry && <button onClick={onRetry} className="seo-cta">Réessayer</button>}
    </div>
  );
}

/* ─── Alert card ─── */
export function AlertCard({ alert }) {
  const toneVar = alert.severity === 'critical' ? 'var(--rouge)' : alert.severity === 'warning' ? 'var(--gold)' : 'var(--navy)';
  const Icon = alert.severity === 'critical' ? AlertTriangle : alert.severity === 'warning' ? Flag : Bell;
  return (
    <div className="seo-card seo-card-hover" style={{ borderColor: toneVar, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className={`seo-pill seo-sev-${alert.severity}`}>
          <Icon style={{ width: 10, height: 10 }} />
          {alert.severity === 'critical' ? 'Critique' : alert.severity === 'warning' ? 'Alerte' : 'Info'}
        </span>
        <div className="seo-pulse-dot" style={{ width: 8, height: 8, borderRadius: 999, background: toneVar }} />
      </div>
      <div className="seo-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
        {alert.title}
      </div>
      <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginBottom: 12, lineHeight: 1.5 }}>
        {alert.message}
      </div>
      {alert.href && (
        <a href={alert.href} className="seo-chip">
          {alert.action} →
        </a>
      )}
    </div>
  );
}

/* ─── AI reco card ─── */
export function AIRecoCard({ reco, index }) {
  const impactColor = { high: 'var(--emerald)', medium: 'var(--gold)', low: 'var(--ink-3)' };
  const effortLabel = { low: 'Effort léger', medium: 'Effort modéré', high: 'Gros chantier' };
  return (
    <div className="seo-card seo-card-hover">
      <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 16, alignItems: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'var(--surface-2)', color: 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500,
        }}>
          {index + 1}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span className="seo-pill" style={{
              color: impactColor[reco.impact], background: `color-mix(in oklch, ${impactColor[reco.impact]} 12%, transparent)`, borderColor: impactColor[reco.impact],
            }}>
              <TrendingUp style={{ width: 10, height: 10 }} /> Impact {reco.impact}
            </span>
            <span className="seo-pill" style={{ color: 'var(--ink-3)', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
              {effortLabel[reco.effort]}
            </span>
            <span className="seo-pill" style={{ color: 'var(--navy)', background: 'var(--navy-soft)', borderColor: 'var(--navy)' }}>
              {reco.category}
            </span>
          </div>
          <div className="seo-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
            {reco.title}
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>
            {reco.desc}
          </div>
          {reco.href && (
            <a href={reco.href} className="seo-chip" style={{ marginTop: 10 }}>
              Ouvrir la section →
            </a>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="seo-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Priorité</div>
          <div className="seo-display" style={{ fontSize: 22, fontWeight: 500, color: impactColor[reco.impact], lineHeight: 1 }}>
            {reco.priority}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Check/OK marker ─── */
export function OkCheck({ size = 14 }) {
  return (
    <div style={{
      width: size + 6, height: size + 6, borderRadius: 999,
      background: 'var(--emerald-soft)', color: 'var(--emerald)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Check style={{ width: size - 2, height: size - 2 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORT CSV — composant universel (Phase 4)
═══════════════════════════════════════════════════════════════════ */
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows, columns) {
  if (!rows?.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const header = cols.map((c) => escapeCsv(c.label || c.key || c)).join(';');
  const body = rows.map((r) => cols.map((c) => {
    const key = typeof c === 'string' ? c : c.key;
    const getter = typeof c === 'object' && typeof c.get === 'function' ? c.get : null;
    return escapeCsv(getter ? getter(r) : r[key]);
  }).join(';')).join('\n');
  return header + '\n' + body;
}

export function ExportButton({ rows, columns, filename = 'export.csv', label = 'Exporter CSV', className = 'seo-chip' }) {
  const onExport = () => {
    try {
      const csv = toCsv(rows || [], columns);
      if (!csv) return;
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 800);
    } catch (e) {
      console.error('Export CSV error:', e);
    }
  };
  return (
    <button onClick={onExport} disabled={!rows?.length} className={className}
      title={rows?.length ? `Exporter ${rows.length} lignes` : 'Aucune donnée à exporter'}>
      <Download style={{ width: 13, height: 13 }} />
      {label}{rows?.length ? ` · ${rows.length}` : ''}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   URL INSPECTOR — widget indexation Google (Phase 4)
═══════════════════════════════════════════════════════════════════ */
export function UrlInspector({ url, useIndexation }) {
  const [open, setOpen] = useState(!!url);
  const [probe, setProbe] = useState(url || '');
  const query = useIndexation?.(open && probe ? probe : '');

  const data = query?.data;
  const loading = query?.isLoading;
  const error = query?.error;

  if (!useIndexation) {
    return <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>Hook useIndexation manquant.</div>;
  }

  const verdictMap = {
    PASS:    { tone: 'var(--emerald)', bg: 'var(--emerald-soft)', label: 'Indexée', Icon: CheckCircle },
    PARTIAL: { tone: 'var(--gold)',    bg: 'var(--gold-soft)',    label: 'Partiel', Icon: AlertCircle },
    FAIL:    { tone: 'var(--rouge)',   bg: 'var(--rouge-soft)',   label: 'Non indexée', Icon: AlertCircle },
    NEUTRAL: { tone: 'var(--ink-3)',   bg: 'var(--surface-2)',    label: 'Inconnu', Icon: Info },
  };
  const v = verdictMap[data?.verdict] || verdictMap.NEUTRAL;

  return (
    <div className="seo-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Search style={{ width: 16, height: 16, color: 'var(--navy)' }} />
        <div className="seo-display" style={{ fontSize: 16, fontWeight: 500 }}>Inspecteur d'URL</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={probe}
          onChange={(e) => setProbe(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') setOpen(true); }}
          placeholder="/page-à-inspecter/"
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--line)', background: 'var(--surface)',
            fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
          }}
        />
        <button onClick={() => { setOpen(true); }} className="seo-cta" style={{ padding: '8px 14px' }}>
          Inspecter
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 12 }}>
          <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          Appel à Google Search Console…
        </div>
      )}
      {error && <div style={{ color: 'var(--rouge)', fontSize: 12 }}>Erreur : {error.message}</div>}

      {data && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <span className="seo-pill" style={{ color: v.tone, background: v.bg, borderColor: v.tone }}>
              <v.Icon style={{ width: 11, height: 11 }} /> {v.label}
            </span>
            <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{data.verdict}</span>
          </div>
          <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            <InspectorRow label="Couverture" value={data.coverage || '—'} />
            <InspectorRow label="Canonical Google" value={data.canonical_google || '—'} mono />
            <InspectorRow label="Canonical déclaré" value={data.canonical_user || '—'} mono />
            <InspectorRow label="Crawlé le" value={data.last_crawl ? new Date(data.last_crawl).toLocaleString('fr-FR') : '—'} />
            <InspectorRow label="Crawler" value={data.crawl_as || '—'} />
            <InspectorRow label="État robots.txt" value={data.robots_state || '—'} />
            <InspectorRow label="Mobile" value={data.mobile_verdict || '—'} />
          </div>
          {data.url && (
            <a href={data.url} target="_blank" rel="noreferrer" className="seo-chip" style={{ marginTop: 12 }}>
              Voir page <ExternalLink style={{ width: 11, height: 11 }} />
            </a>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function InspectorRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '6px 0', borderBottom: '1px solid var(--line-2)' }}>
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{
        color: 'var(--ink)', fontWeight: 500,
        fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
        maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CORE WEB VITALS — widget PageSpeed (Phase 4)
═══════════════════════════════════════════════════════════════════ */
function cwvTone(score) {
  if (score >= 0.9) return 'var(--emerald)';
  if (score >= 0.5) return 'var(--gold)';
  return 'var(--rouge)';
}

function CwvMetric({ label, metric }) {
  const tone = cwvTone(metric?.score || 0);
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: `color-mix(in oklch, ${tone} 8%, var(--paper))`,
      border: `1px solid color-mix(in oklch, ${tone} 35%, var(--line))`,
      flex: 1, minWidth: 0,
    }}>
      <div className="seo-label" style={{ color: tone, fontSize: 9 }}>{label}</div>
      <div className="seo-mono" style={{ fontSize: 18, fontWeight: 700, color: tone, marginTop: 3 }}>
        {metric?.display || '—'}
      </div>
    </div>
  );
}

export function CoreWebVitalsCard({ data, isLoading, error, onRetry, strategy = 'mobile', onStrategyChange }) {
  if (isLoading) {
    return (
      <div className="seo-card" style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 style={{ width: 22, height: 22, color: 'var(--navy)', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-3)' }}>Analyse PageSpeed en cours (30-60s)…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (error) {
    return (
      <div className="seo-card" style={{ padding: 20 }}>
        <div style={{ color: 'var(--rouge)', fontSize: 13 }}>
          Erreur PageSpeed : {error.message}
          {onRetry && <button onClick={onRetry} className="seo-chip" style={{ marginLeft: 10 }}>Réessayer</button>}
        </div>
      </div>
    );
  }
  if (!data) return null;

  const cwv = data.core_web_vitals || {};
  const scores = data.scores || {};

  return (
    <div className="seo-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="seo-label">PageSpeed Insights</div>
          <div className="seo-display" style={{ fontSize: 18, marginTop: 4 }}>
            Core Web Vitals · <span style={{ color: 'var(--navy)', fontStyle: 'italic' }}>{strategy}</span>
          </div>
        </div>
        {onStrategyChange && (
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 999, border: '1px solid var(--line)' }}>
            {['mobile', 'desktop'].map((s) => (
              <button key={s} onClick={() => onStrategyChange(s)}
                style={{
                  padding: '5px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: strategy === s ? 'var(--ink)' : 'transparent',
                  color: strategy === s ? 'var(--bg)' : 'var(--ink-3)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.06em',
                }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scores Lighthouse */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          ['Performance', scores.performance],
          ['SEO', scores.seo],
          ['Accessibilité', scores.accessibility],
          ['Best practices', scores.best_practices],
        ].map(([name, score]) => {
          const tone = score >= 90 ? 'var(--emerald)' : score >= 50 ? 'var(--gold)' : 'var(--rouge)';
          return (
            <div key={name} style={{ padding: 12, borderRadius: 10, background: 'var(--surface-2)', textAlign: 'center' }}>
              <div className="seo-label" style={{ fontSize: 9 }}>{name}</div>
              <div className="seo-mono" style={{ fontSize: 22, fontWeight: 700, color: tone, marginTop: 4 }}>
                {score ?? '—'}
              </div>
            </div>
          );
        })}
      </div>

      {/* CWV metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        <CwvMetric label="LCP" metric={cwv.lcp} />
        <CwvMetric label="INP" metric={cwv.inp} />
        <CwvMetric label="CLS" metric={cwv.cls} />
        <CwvMetric label="FCP" metric={cwv.fcp} />
        <CwvMetric label="TTFB" metric={cwv.ttfb} />
      </div>

      {/* Opportunities */}
      {data.opportunities?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="seo-label" style={{ marginBottom: 8 }}>Pistes d'optimisation prioritaires</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {data.opportunities.slice(0, 5).map((o, i) => (
              <div key={i} style={{
                padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 12, fontFamily: 'Fraunces, serif' }}>{o.title}</span>
                <span className="seo-mono" style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 700 }}>
                  −{(o.saving_ms / 1000).toFixed(1)}s possibles
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
