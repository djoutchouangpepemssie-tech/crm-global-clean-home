// SeoPerformance.jsx — /seo/performance
// Vue profonde Search Console : positions, clics, impressions, CTR,
// avec delta période précédente, buckets top3/10/20/50 et évolution.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowUp, BarChart3, ChevronRight, Gauge, LineChart as LineChartIcon,
  MousePointerClick, Search, Target, TrendingDown, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area,
} from 'recharts';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, fmtPct, useSeoFilter,
} from './SeoShared';
import { useSeoAnalytics as useSeoStats, useTrackerKeywords } from '../../hooks/api';

function BucketPill({ bucket, count }) {
  const map = {
    top3:  { label: 'Top 3',   tone: 'var(--emerald)' },
    top10: { label: 'Top 10',  tone: 'var(--emerald)' },
    top20: { label: 'Top 20',  tone: 'var(--gold)' },
    top50: { label: 'Top 50',  tone: 'var(--warm)' },
    hors:  { label: 'Hors 50', tone: 'var(--rouge)' },
  };
  const m = map[bucket] || map.hors;
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      border: `1px solid color-mix(in oklch, ${m.tone} 35%, var(--line))`,
      background: `color-mix(in oklch, ${m.tone} 8%, var(--paper))`,
    }}>
      <div className="seo-label" style={{ color: m.tone }}>{m.label}</div>
      <div className="seo-mono" style={{ fontSize: 26, fontWeight: 700, color: m.tone, marginTop: 4 }}>
        {fmt(count)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
        {bucket === 'top3' ? 'Visibilité maximale' :
         bucket === 'top10' ? 'Première page' :
         bucket === 'top20' ? 'Deuxième page' :
         bucket === 'top50' ? 'À optimiser' : 'Peu visible'}
      </div>
    </div>
  );
}

function DeltaTag({ delta }) {
  if (delta === null || delta === undefined || delta === 0) {
    return <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>—</span>;
  }
  const up = delta > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
      color: up ? 'var(--emerald)' : 'var(--rouge)',
    }}>
      {up ? <ArrowUp style={{ width: 10, height: 10 }} /> : <ArrowDown style={{ width: 10, height: 10 }} />}
      {up ? '+' : ''}{delta.toFixed(1)}
    </span>
  );
}

export default function SeoPerformance() {
  const { days } = useSeoFilter();
  const { data: seo, isLoading, error } = useSeoStats(days);
  const { data: kw } = useTrackerKeywords(days, 100);

  const daily = seo?.daily || [];
  const ov = seo?.overview || {};

  const avgPosition = ov.position || 0;
  const trend = useMemo(() => {
    if (!daily.length) return null;
    const mid = Math.floor(daily.length / 2);
    const first = daily.slice(0, mid);
    const second = daily.slice(mid);
    const avg = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0) / (rows.length || 1);
    return {
      clicks: avg(second, 'clicks') - avg(first, 'clicks'),
      impressions: avg(second, 'impressions') - avg(first, 'impressions'),
    };
  }, [daily]);

  if (isLoading && !seo) return <LoadingState message="Chargement Search Console…" />;
  if (error) return <ErrorState message="Impossible de charger les données Search Console." />;

  const buckets = kw?.buckets || {};
  const sortedKw = (kw?.keywords || []).slice().sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
  const rising = sortedKw.filter((k) => k.delta > 0.5).slice(0, 8);
  const falling = sortedKw.filter((k) => k.delta < -0.5).slice(0, 8);

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="SEO / Performance"
        title={<>Positions & <em>clics organiques</em></>}
        subtitle={`Google Search Console — ${days} jours, site ${seo?.site_url || 'globalcleanhome.com'}.`}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Clics" value={fmt(ov.clicks || 0)} tone="var(--emerald)" icon={Search} sub={`${days}j`} />
        <KpiTile label="Impressions" value={fmt(ov.impressions || 0)} tone="var(--navy)" icon={BarChart3} />
        <KpiTile label="CTR moyen" value={fmtPct(ov.ctr || 0, 2)} tone="var(--gold)" icon={MousePointerClick} />
        <KpiTile label="Position moyenne" value={avgPosition.toFixed(1)} tone="var(--warm)" icon={Target}
          sub={avgPosition <= 10 ? 'Première page' : avgPosition <= 20 ? 'Deuxième page' : 'À améliorer'} />
      </div>

      {/* Evolution */}
      <SectionHeader eyebrow="Évolution" title="Clics & impressions" subtitle={`Tendance sur ${days} jours.`} />
      <div className="seo-card" style={{ padding: 22, marginBottom: 24, height: 300 }}>
        {daily.length === 0 ? (
          <EmptyState icon={LineChartIcon} title="Pas encore de données d'évolution" message="Revenez après 24h de tracking." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="perfClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.010 78)" />
              <XAxis dataKey="date" stroke="oklch(0.52 0.010 60)" style={{ fontSize: 11 }} />
              <YAxis stroke="oklch(0.52 0.010 60)" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--line)', fontSize: 12 }} />
              <Area type="monotone" dataKey="clicks" stroke="oklch(0.52 0.13 165)" fill="url(#perfClicks)" strokeWidth={2} />
              <Line type="monotone" dataKey="impressions" stroke="oklch(0.35 0.08 240)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Buckets */}
      <SectionHeader eyebrow="Distribution" title="Mots-clés par bucket de position"
        subtitle="Visibilité dans les SERP Google." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
        <BucketPill bucket="top3" count={buckets.top3 || 0} />
        <BucketPill bucket="top10" count={buckets.top10 || 0} />
        <BucketPill bucket="top20" count={buckets.top20 || 0} />
        <BucketPill bucket="top50" count={buckets.top50 || 0} />
        <BucketPill bucket="hors" count={buckets.hors || 0} />
      </div>

      {/* Risers / Fallers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="seo-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="seo-label" style={{ color: 'var(--emerald)' }}>En hausse</div>
              <div className="seo-display" style={{ fontSize: 18, marginTop: 4 }}>
                <TrendingUp style={{ width: 16, height: 16, color: 'var(--emerald)', marginRight: 6, verticalAlign: 'middle' }} />
                {rising.length} mots-clés montent
              </div>
            </div>
          </div>
          {rising.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Aucune hausse notable.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {rising.map((k) => (
                <div key={k.query} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                             padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>{k.query}</span>
                  <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>#{k.position}</span>
                    <DeltaTag delta={k.delta} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="seo-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="seo-label" style={{ color: 'var(--rouge)' }}>En baisse</div>
              <div className="seo-display" style={{ fontSize: 18, marginTop: 4 }}>
                <TrendingDown style={{ width: 16, height: 16, color: 'var(--rouge)', marginRight: 6, verticalAlign: 'middle' }} />
                {falling.length} mots-clés perdent
              </div>
            </div>
          </div>
          {falling.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Aucune baisse notable.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {falling.map((k) => (
                <div key={k.query} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                             padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>{k.query}</span>
                  <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>#{k.position}</span>
                    <DeltaTag delta={k.delta} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table mots-clés complète */}
      <SectionHeader eyebrow="Top mots-clés" title="Trafic organique détaillé"
        subtitle={`${sortedKw.length} requêtes sur ${days} jours, triées par impressions.`} />
      <div className="seo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 }}>
              <tr>
                <th style={th}>Requête</th>
                <th style={thRight}>Impressions</th>
                <th style={thRight}>Clics</th>
                <th style={thRight}>CTR</th>
                <th style={thRight}>Position</th>
                <th style={thRight}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {sortedKw.slice(0, 80).map((k) => (
                <tr key={k.query} style={{ borderTop: '1px solid var(--line-2)' }}>
                  <td style={td}>{k.query}</td>
                  <td style={tdRight}>{fmt(k.impressions)}</td>
                  <td style={tdRight}>{fmt(k.clicks)}</td>
                  <td style={{ ...tdRight, color: k.ctr >= 2 ? 'var(--emerald)' : k.ctr >= 1 ? 'var(--gold)' : 'var(--rouge)' }}>
                    {k.ctr}%
                  </td>
                  <td style={{ ...tdRight, color: k.position <= 3 ? 'var(--emerald)' : k.position <= 10 ? 'var(--gold)' : 'var(--ink-2)' }}>
                    #{k.position}
                  </td>
                  <td style={tdRight}><DeltaTag delta={k.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th = { padding: '12px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace',
             fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '12px 16px', fontSize: 13, color: 'var(--ink)' };
const tdRight = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 };
