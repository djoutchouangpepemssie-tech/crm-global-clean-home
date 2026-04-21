// SeoAlerts.jsx — /seo/alerts
// Alertes détectées par detectAlerts() + filtres par sévérité.
// Monitoring temps réel + historique (la base, enrichie en Phase 2 avec le changelog).

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, Bell, Camera, CheckCircle, Filter, Info, Shield,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  AlertCard, computeSubScores, detectAlerts,
  fmt, useSeoFilter,
} from './SeoShared';
import {
  useSeoAnalytics as useSeoStats, useGa4Analytics, useCrmAnalytics,
  useTrackerHealth,
} from '../../hooks/api';

const FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'critical', label: 'Critiques' },
  { value: 'warning', label: 'Avertissements' },
  { value: 'info', label: 'Infos' },
];

export default function SeoAlerts() {
  const { days } = useSeoFilter();
  const { data: seo, isLoading, error } = useSeoStats(days);
  const { data: ga4 } = useGa4Analytics(days);
  const { data: crm } = useCrmAnalytics();
  const { data: health } = useTrackerHealth();

  const [filter, setFilter] = useState('all');

  const scores = useMemo(() => computeSubScores(seo || {}, ga4, crm), [seo, ga4, crm]);
  const alerts = useMemo(() => detectAlerts(seo || {}, ga4, scores), [seo, ga4, scores]);

  // Alertes d'infrastructure (connexions)
  const infraAlerts = useMemo(() => {
    const out = [];
    const src = health?.sources || {};
    Object.entries(src).forEach(([k, v]) => {
      if (v.status && v.status !== 'ok') {
        const sev = v.status === 'disconnected' || v.status === 'down' ? 'critical' : 'warning';
        out.push({
          id: `infra-${k}`,
          severity: sev,
          title: `${k.toUpperCase()} ${v.status === 'ok' ? 'connecté' : 'à vérifier'}`,
          message: v.detail || `État ${v.status}.`,
          href: '/seo/connect',
        });
      }
    });
    return out;
  }, [health]);

  if (isLoading && !seo) return <LoadingState message="Détection des alertes…" />;
  if (error) return <ErrorState message="Impossible de charger les alertes." />;

  const allAlerts = [...infraAlerts, ...alerts];
  const filtered = filter === 'all' ? allAlerts : allAlerts.filter((a) => a.severity === filter);

  const counts = {
    critical: allAlerts.filter((a) => a.severity === 'critical').length,
    warning: allAlerts.filter((a) => a.severity === 'warning').length,
    info: allAlerts.filter((a) => a.severity === 'info').length,
  };

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Monitoring"
        title={<>Alertes & <em>anomalies</em></>}
        subtitle="Détection automatique basée sur les seuils, les comparaisons de période et la santé d'infrastructure."
        actions={
          <Link to="/seo/alerts/changelog" className="seo-cta">
            <Camera style={{ width: 14, height: 14 }} />
            Changelog SEO
          </Link>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Alertes totales" value={fmt(allAlerts.length)}
          tone={allAlerts.length === 0 ? 'var(--emerald)' : 'var(--navy)'} icon={Bell} />
        <KpiTile label="Critiques" value={fmt(counts.critical)}
          tone={counts.critical > 0 ? 'var(--rouge)' : 'var(--ink-4)'} icon={AlertCircle}
          sub={counts.critical > 0 ? 'Action immédiate' : 'Aucune'} />
        <KpiTile label="Avertissements" value={fmt(counts.warning)}
          tone={counts.warning > 0 ? 'var(--gold)' : 'var(--ink-4)'} icon={AlertTriangle} />
        <KpiTile label="Infos" value={fmt(counts.info)}
          tone="var(--cool)" icon={Info} />
      </div>

      {/* Filtres */}
      <div className="seo-card" style={{
        padding: '14px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Filter style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
        <span className="seo-label">Filtrer</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count = f.value === 'all' ? allAlerts.length : counts[f.value] || 0;
            return (
              <button key={f.value} onClick={() => setFilter(f.value)}
                style={{
                  padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                  border: '1px solid var(--line)',
                  background: active ? 'var(--ink)' : 'var(--paper)',
                  color: active ? 'var(--bg)' : 'var(--ink-2)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                  letterSpacing: '0.06em',
                }}>
                {f.label} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="seo-card" style={{ padding: 40 }}>
          <EmptyState
            icon={Shield}
            title={allAlerts.length === 0 ? 'Aucune alerte active 🎉' : 'Aucune alerte dans ce filtre'}
            message={allAlerts.length === 0
              ? 'Ton cockpit est sain. Reviens demain, les alertes se rafraîchissent automatiquement.'
              : 'Essaie un autre filtre ou regarde toutes les alertes.'}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((a, i) => <AlertCard key={a.id || i} alert={a} />)}
        </div>
      )}

      {/* Règles de détection */}
      <SectionHeader eyebrow="Règles actives" title="Ce que je surveille"
        subtitle="Seuils de détection — seront configurables en Phase 2." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { title: 'Chute de trafic', rule: 'Clics -20% vs période précédente' },
          { title: 'CTR faible', rule: 'CTR moyen < 1.5% sur 28j' },
          { title: 'Position faible', rule: 'Position moyenne > 15' },
          { title: 'Taux de rebond', rule: 'Bounce rate > 70%' },
          { title: 'Conversion', rule: 'Conversion rate < 1% avec trafic > 500' },
          { title: 'Santé intégrations', rule: 'GA4 / GSC / Tracker / Ads en erreur' },
        ].map((r) => (
          <div key={r.title} className="seo-card" style={{ padding: 14 }}>
            <div className="seo-label" style={{ fontSize: 10 }}>{r.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, fontFamily: 'Fraunces, serif' }}>
              {r.rule}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
