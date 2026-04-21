// SeoTechnical.jsx — /seo/technical
// Santé technique : devices, vitesse, indexation (placeholder),
// erreurs de tracking, qualité du rendu.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertCircle, CheckCircle, ChevronRight, Gauge, Info, Link2, Monitor,
  Network, Server, Smartphone, Wifi, Wrench, Zap,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  CoreWebVitalsCard, UrlInspector,
  fmt, fmtPct, useSeoFilter,
} from './SeoShared';
import {
  useGa4Analytics, useTrackerHealth, useSeoAnalytics as useSeoStats,
  usePageSpeed, useIndexation,
} from '../../hooks/api';

const DEVICE_COLORS = {
  mobile: 'oklch(0.52 0.13 165)',
  desktop: 'oklch(0.35 0.08 240)',
  tablet: 'oklch(0.72 0.13 85)',
};

function HealthRow({ label, status, detail, icon: Icon }) {
  const colors = {
    ok: { tone: 'var(--emerald)', bg: 'var(--emerald-soft)', Icon: CheckCircle, label: 'OK' },
    partial: { tone: 'var(--gold)', bg: 'var(--gold-soft)', Icon: AlertCircle, label: 'Partiel' },
    stale: { tone: 'var(--gold)', bg: 'var(--gold-soft)', Icon: AlertCircle, label: 'Inactif' },
    disconnected: { tone: 'var(--rouge)', bg: 'var(--rouge-soft)', Icon: AlertCircle, label: 'Déconnecté' },
    error: { tone: 'var(--rouge)', bg: 'var(--rouge-soft)', Icon: AlertCircle, label: 'Erreur' },
  };
  const c = colors[status] || colors.error;
  const SIcon = c.Icon;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, alignItems: 'center',
      padding: '14px 16px', borderBottom: '1px solid var(--line-2)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: c.bg, color: c.tone,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {Icon && <Icon style={{ width: 17, height: 17 }} />}
      </div>
      <div>
        <div style={{ fontSize: 14, fontFamily: 'Fraunces, serif', fontWeight: 500 }}>{label}</div>
        {detail && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{detail}</div>}
      </div>
      <span className="seo-pill" style={{ color: c.tone, background: c.bg, borderColor: c.tone }}>
        <SIcon style={{ width: 11, height: 11 }} /> {c.label}
      </span>
    </div>
  );
}

export default function SeoTechnical() {
  const { days } = useSeoFilter();
  const { data: ga4, isLoading } = useGa4Analytics(days);
  const { data: seo } = useSeoStats(days);
  const { data: health } = useTrackerHealth();
  const [cwvUrl, setCwvUrl] = React.useState('/');
  const [cwvStrategy, setCwvStrategy] = React.useState('mobile');
  const cwv = usePageSpeed(cwvUrl, cwvStrategy);

  const devices = ga4?.devices || [];
  const seoDevices = seo?.devices || [];

  const bounce = ga4?.kpis?.bounce_rate?.value || 0;
  const avgDur = ga4?.kpis?.avg_duration?.value || 0;

  if (isLoading && !ga4) return <LoadingState message="Audit technique en cours…" />;

  const sourcesHealth = health?.sources || {};

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Technique"
        title={<>Santé <em>technique</em> du site</>}
        subtitle="Indexation, devices, erreurs tracking, qualité du rendu côté utilisateur."
        actions={
          <Link to="/seo/technical/internal-links" className="seo-cta">
            <Network style={{ width: 14, height: 14 }} />
            Maillage interne
          </Link>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile
          label="Taux de rebond"
          value={fmtPct(bounce, 1)}
          tone={bounce < 40 ? 'var(--emerald)' : bounce < 60 ? 'var(--gold)' : 'var(--rouge)'}
          icon={Activity}
          sub={bounce < 40 ? 'Excellent' : bounce < 60 ? 'Correct' : 'À améliorer'}
        />
        <KpiTile
          label="Durée moy. session"
          value={`${Math.round(avgDur)}s`}
          tone={avgDur >= 60 ? 'var(--emerald)' : avgDur >= 30 ? 'var(--gold)' : 'var(--rouge)'}
          icon={Gauge}
          sub={avgDur >= 60 ? 'Engagement fort' : 'À améliorer'}
        />
        <KpiTile
          label="Events 24h (tracker)"
          value={fmt(sourcesHealth.tracker?.events_24h || 0)}
          tone="var(--navy)"
          icon={Zap}
          sub={sourcesHealth.tracker?.events_7d ? `${fmt(sourcesHealth.tracker.events_7d)} sur 7j` : '—'}
        />
        <KpiTile
          label="Sources connectées"
          value={`${health?.ok_count || 0}/${health?.total || 4}`}
          tone={health?.status === 'ok' ? 'var(--emerald)' : 'var(--gold)'}
          icon={Wifi}
          sub={health?.status === 'ok' ? 'Toutes actives' : 'À vérifier'}
        />
      </div>

      {/* État des intégrations */}
      <SectionHeader eyebrow="Intégrations" title="État des flux de données"
        subtitle="Connexion temps réel avec GA4, Search Console, Tracker custom et plateformes Ads." />
      <div className="seo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <HealthRow label="Google Analytics 4" icon={Activity} status={sourcesHealth.ga4?.status}
          detail={sourcesHealth.ga4?.status === 'ok' ? `Property ${sourcesHealth.ga4?.property} · ${fmt(sourcesHealth.ga4?.sessions_last_48h || 0)} sessions 48h` : sourcesHealth.ga4?.detail} />
        <HealthRow label="Search Console" icon={Server} status={sourcesHealth.gsc?.status}
          detail={sourcesHealth.gsc?.status === 'ok' ? `${fmt(sourcesHealth.gsc?.clicks_7d || 0)} clics / ${fmt(sourcesHealth.gsc?.impressions_7d || 0)} impressions (7j)` : sourcesHealth.gsc?.detail} />
        <HealthRow label="Tracker custom" icon={Zap} status={sourcesHealth.tracker?.status}
          detail={sourcesHealth.tracker?.events_24h ? `${fmt(sourcesHealth.tracker.events_24h)} events 24h · ${fmt(sourcesHealth.tracker.visitors_24h || 0)} visiteurs` : sourcesHealth.tracker?.detail} />
        <HealthRow label="Google / Meta Ads" icon={Wrench} status={sourcesHealth.ads?.status}
          detail={sourcesHealth.ads?.status === 'ok' ? `${sourcesHealth.ads?.campaigns} campagnes · ${sourcesHealth.ads?.spends_entries_30d} entrées dépenses` : sourcesHealth.ads?.detail} />
      </div>

      {/* Devices */}
      <SectionHeader eyebrow="Devices" title="Répartition du trafic par appareil"
        subtitle="Garantir une expérience mobile impeccable si >60% mobile." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="seo-card" style={{ padding: 22 }}>
          <div className="seo-label" style={{ marginBottom: 8 }}>GA4 — Sessions par device</div>
          {devices.length === 0 ? (
            <EmptyState icon={Smartphone} title="Pas encore de données GA4" message="Collecte en cours." />
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={devices} dataKey="sessions" nameKey="device" outerRadius={90} label={(d) => `${d.device}: ${fmt(d.sessions)}`}>
                    {devices.map((d, i) => (
                      <Cell key={i} fill={DEVICE_COLORS[d.device] || 'oklch(0.55 0.08 220)'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="seo-card" style={{ padding: 22 }}>
          <div className="seo-label" style={{ marginBottom: 8 }}>Search Console — Clics par device</div>
          {seoDevices.length === 0 ? (
            <EmptyState icon={Monitor} title="Pas encore de données GSC" message="Agrégation 24-48h." />
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seoDevices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.010 78)" />
                  <XAxis dataKey="device" stroke="oklch(0.52 0.010 60)" style={{ fontSize: 11 }} />
                  <YAxis stroke="oklch(0.52 0.010 60)" style={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="clicks" fill="oklch(0.35 0.08 240)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="impressions" fill="oklch(0.72 0.13 85)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Core Web Vitals */}
      <SectionHeader eyebrow="Core Web Vitals" title="Qualité perçue de l'expérience"
        subtitle="LCP, INP, CLS et scores Lighthouse via PageSpeed Insights. Analyse par URL." />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={cwvUrl}
          onChange={(e) => setCwvUrl(e.target.value)}
          placeholder="URL à analyser (ex: /)"
          style={{
            flex: 1, minWidth: 240, maxWidth: 400,
            padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--line)', background: 'var(--paper)',
            fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
          }}
        />
        <button onClick={() => cwv.refetch()} className="seo-chip">Analyser</button>
      </div>
      <div style={{ marginBottom: 28 }}>
        <CoreWebVitalsCard
          data={cwv.data}
          isLoading={cwv.isLoading}
          error={cwv.error}
          onRetry={() => cwv.refetch()}
          strategy={cwvStrategy}
          onStrategyChange={setCwvStrategy}
        />
      </div>

      {/* URL Inspector */}
      <SectionHeader eyebrow="Indexation" title="Inspecteur d'URL Google"
        subtitle="Vérifier si une page est indexée, son canonical, son dernier crawl et son état mobile." />
      <div style={{ marginBottom: 28 }}>
        <UrlInspector useIndexation={useIndexation} />
      </div>
    </div>
  );
}
