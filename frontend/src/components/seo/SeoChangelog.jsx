// SeoChangelog.jsx — /seo/alerts/changelog
// Historique des évolutions SEO par URL (snapshots quotidiens GSC).
// Permet de voir qui a monté/descendu et avec quelle amplitude.

import React from 'react';
import {
  ArrowDown, ArrowUp, Calendar, Camera, Database, Minus, Play,
  TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import { useChangelog, useTakeSnapshot } from '../../hooks/api';

function DirectionBadge({ direction }) {
  if (direction === 'up') {
    return (
      <span className="seo-pill" style={{ color: 'var(--emerald)', background: 'var(--emerald-soft)', borderColor: 'var(--emerald)' }}>
        <TrendingUp style={{ width: 11, height: 11 }} /> Hausse
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="seo-pill" style={{ color: 'var(--rouge)', background: 'var(--rouge-soft)', borderColor: 'var(--rouge)' }}>
        <TrendingDown style={{ width: 11, height: 11 }} /> Baisse
      </span>
    );
  }
  return (
    <span className="seo-pill" style={{ color: 'var(--ink-3)', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
      <Minus style={{ width: 11, height: 11 }} /> Stable
    </span>
  );
}

function Delta({ value, kind = 'int', inverse = false }) {
  if (value === null || value === undefined || value === 0) {
    return <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>—</span>;
  }
  // Pour position, une baisse du chiffre = gain
  const isPositive = inverse ? value < 0 : value > 0;
  const color = isPositive ? 'var(--emerald)' : 'var(--rouge)';
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  const display = kind === 'pct' ? `${Math.abs(value).toFixed(2)}%`
                : kind === 'dec' ? Math.abs(value).toFixed(1)
                : fmt(Math.abs(value));
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color,
                   fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700 }}>
      <Icon style={{ width: 10, height: 10 }} />
      {value > 0 ? '+' : '−'}{display}
    </span>
  );
}

export default function SeoChangelog() {
  const { days } = useSeoFilter();
  const changelogDays = Math.min(days, 14); // limite 14j pour la lisibilité
  const { data, isLoading, error, refetch } = useChangelog(changelogDays, 50);
  const snapshot = useTakeSnapshot();

  if (isLoading && !data) return <LoadingState message="Chargement de l'historique SEO…" />;
  if (error) return <ErrorState message="Impossible de charger le changelog." />;

  const changes = data?.changes || [];
  const risers = changes.filter((c) => c.direction === 'up').length;
  const fallers = changes.filter((c) => c.direction === 'down').length;

  const onSnapshot = async () => {
    try {
      await snapshot.mutateAsync(1);
      setTimeout(() => refetch?.(), 500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Historique"
        title={<>Changelog <em>SEO</em></>}
        subtitle={`Évolutions par URL sur les ${changelogDays} derniers jours. Basé sur des snapshots quotidiens Search Console.`}
        actions={
          <button onClick={onSnapshot} className="seo-cta" disabled={snapshot.isPending}>
            <Camera style={{ width: 14, height: 14 }} />
            {snapshot.isPending ? 'Capture…' : 'Prendre un snapshot'}
          </button>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="URLs suivies" value={fmt(data?.total_tracked_urls || 0)} tone="var(--navy)" icon={Database}
          sub={`${fmt(data?.total_snapshots_in_db || 0)} snapshots total`} />
        <KpiTile label="En hausse" value={fmt(risers)} tone="var(--emerald)" icon={TrendingUp} />
        <KpiTile label="En baisse" value={fmt(fallers)} tone="var(--rouge)" icon={TrendingDown} />
        <KpiTile label="Période" value={`${changelogDays}j`} tone="var(--ink-4)" icon={Calendar}
          sub="Ajustée via le filtre global" />
      </div>

      {/* Info setup */}
      {(data?.total_tracked_urls || 0) === 0 && (
        <div className="seo-card" style={{ padding: 24, marginBottom: 24, background: 'var(--navy-soft)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Zap style={{ width: 20, height: 20, color: 'var(--navy)', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                Premier snapshot à prendre
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                Le changelog a besoin d'au moins 2 snapshots sur 2 jours différents pour calculer des deltas.
                Clique « Prendre un snapshot » ci-dessus pour capturer les données GSC d'hier.
                Idéalement, cette opération sera automatisée quotidiennement en tâche de fond.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      <SectionHeader eyebrow="Évolutions" title={`${changes.length} URLs avec changement significatif`}
        subtitle="Triées par impact (combinaison clics + impressions + position). Les plus gros changements en premier." />
      {changes.length === 0 ? (
        <div className="seo-card" style={{ padding: 40 }}>
          <EmptyState
            icon={Play}
            title="Pas encore de données d'évolution"
            message={(data?.total_snapshots_in_db || 0) < 2
              ? "Prends ton premier snapshot et reviens dans 24-48h pour voir les deltas."
              : "Les snapshots existent mais aucune évolution notable n'a été détectée."} />
        </div>
      ) : (
        <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={th}>URL</th>
                <th style={thRight}>Δ Position</th>
                <th style={thRight}>Δ Clics</th>
                <th style={thRight}>Δ Impressions</th>
                <th style={thRight}>Δ CTR</th>
                <th style={thRight}>Direction</th>
                <th style={thRight}>Impact</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                  <td style={td}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{c.path}</span>
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                      #{c.current.position} · {fmt(c.current.clicks)} clics · {c.current.ctr}% CTR
                    </div>
                  </td>
                  <td style={tdRight}><Delta value={c.delta.position} kind="dec" inverse /></td>
                  <td style={tdRight}><Delta value={c.delta.clicks} /></td>
                  <td style={tdRight}><Delta value={c.delta.impressions} /></td>
                  <td style={tdRight}><Delta value={c.delta.ctr} kind="pct" /></td>
                  <td style={tdRight}><DirectionBadge direction={c.direction} /></td>
                  <td style={{ ...tdRight, fontWeight: 700, color: 'var(--ink)' }}>{c.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: '12px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace',
             fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '11px 14px', fontSize: 13, color: 'var(--ink)' };
const tdRight = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' };
