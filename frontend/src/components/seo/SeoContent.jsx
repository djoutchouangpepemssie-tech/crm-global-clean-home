// SeoContent.jsx — /seo/content
// Analyse contenu : pages les plus performantes, CTR, durée, bounce,
// mix GSC (impressions/clicks/position) + GA4 (views/duration/bounce).

import React, { useMemo } from 'react';
import {
  Clock, Eye, FileText, MousePointerClick, Search, Target, TrendingUp,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, fmtPct, pathOf, useSeoFilter,
} from './SeoShared';
import { useSeoAnalytics as useSeoStats, useGa4Analytics } from '../../hooks/api';

function TruncatedPath({ path }) {
  const p = pathOf(path);
  const short = p.length > 60 ? '…' + p.slice(-57) : p;
  return <span title={p} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{short}</span>;
}

export default function SeoContent() {
  const { days } = useSeoFilter();
  const { data: seo, isLoading, error } = useSeoStats(days);
  const { data: ga4 } = useGa4Analytics(days);

  const gscPages = seo?.pages || [];
  const ga4Pages = ga4?.pages || [];

  // Merge GSC (par URL absolue) + GA4 (par path)
  const merged = useMemo(() => {
    const map = new Map();
    gscPages.forEach((p) => {
      const path = pathOf(p.page) || p.page;
      map.set(path, { path, impressions: p.impressions, clicks: p.clicks, ctr: p.ctr, position: p.position });
    });
    ga4Pages.forEach((p) => {
      const path = p.path || '/';
      const prev = map.get(path) || { path };
      map.set(path, {
        ...prev,
        views: p.views,
        avg_duration: p.avg_duration,
        bounce_rate: p.bounce_rate,
      });
    });
    return Array.from(map.values()).sort((a, b) => (b.impressions || b.views || 0) - (a.impressions || a.views || 0));
  }, [gscPages, ga4Pages]);

  if (isLoading && !seo) return <LoadingState message="Chargement de l'analyse contenu…" />;
  if (error) return <ErrorState message="Impossible de charger les pages." />;

  const topCtr = merged.filter((p) => p.ctr !== undefined).slice(0, 5);
  const opportunities = merged.filter((p) => p.impressions >= 100 && (p.ctr || 0) < 1).slice(0, 8);
  const bestConverters = merged.filter((p) => p.clicks).slice(0, 5);

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Contenu"
        title={<>Pages <em>qui performent</em></>}
        subtitle={`Analyse croisée Search Console + GA4 sur ${days} jours.`}
      />

      {/* KPIs globaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Pages indexées actives" value={fmt(gscPages.length)} tone="var(--navy)" icon={FileText} />
        <KpiTile label="Pages avec trafic GA4" value={fmt(ga4Pages.length)} tone="var(--emerald)" icon={Eye} />
        <KpiTile label="Pages GSC + GA4" value={fmt(merged.filter(p => p.ctr !== undefined && p.views).length)}
          tone="var(--gold)" icon={TrendingUp} sub="Cross-référencées" />
        <KpiTile label="Opportunités CTR <1%" value={fmt(opportunities.length)} tone="var(--rouge)" icon={Target}
          sub="Impressions élevées, CTR faible" />
      </div>

      {/* Opportunités CTR */}
      <SectionHeader eyebrow="Opportunités" title="Pages à impressions élevées mais faible CTR"
        subtitle="Titres / meta descriptions à retravailler pour capter plus de clics." />
      <div className="seo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        {opportunities.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState icon={Target} title="Aucune opportunité évidente"
              message="Toutes les pages visibles convertissent raisonnablement." />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={th}>Page</th>
                <th style={thRight}>Impressions</th>
                <th style={thRight}>CTR</th>
                <th style={thRight}>Position</th>
                <th style={thRight}>Clics perdus*</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((p) => {
                const expectedCtr = p.position <= 3 ? 20 : p.position <= 10 ? 5 : 2;
                const lostClicks = Math.round((p.impressions * (expectedCtr - (p.ctr || 0))) / 100);
                return (
                  <tr key={p.path} style={{ borderTop: '1px solid var(--line-2)' }}>
                    <td style={td}><TruncatedPath path={p.path} /></td>
                    <td style={tdRight}>{fmt(p.impressions)}</td>
                    <td style={{ ...tdRight, color: 'var(--rouge)' }}>{p.ctr}%</td>
                    <td style={tdRight}>#{p.position}</td>
                    <td style={{ ...tdRight, color: 'var(--warm)', fontWeight: 700 }}>+{fmt(lostClicks)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Top performeurs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="seo-card" style={{ padding: 22 }}>
          <div className="seo-label" style={{ color: 'var(--emerald)' }}>Meilleurs CTR</div>
          <div className="seo-display" style={{ fontSize: 18, marginTop: 4, marginBottom: 14 }}>
            <MousePointerClick style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6, color: 'var(--emerald)' }} />
            Pages qui accrochent
          </div>
          {topCtr.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Pas encore de données.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {topCtr.map((p) => (
                <div key={p.path} style={{ display: 'flex', justifyContent: 'space-between',
                                           padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <TruncatedPath path={p.path} />
                  <span className="seo-mono" style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 700 }}>{p.ctr}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="seo-card" style={{ padding: 22 }}>
          <div className="seo-label" style={{ color: 'var(--navy)' }}>Top clics organiques</div>
          <div className="seo-display" style={{ fontSize: 18, marginTop: 4, marginBottom: 14 }}>
            <Search style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6, color: 'var(--navy)' }} />
            Pages qui attirent
          </div>
          {bestConverters.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Pas encore de données.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {bestConverters.map((p) => (
                <div key={p.path} style={{ display: 'flex', justifyContent: 'space-between',
                                           padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <TruncatedPath path={p.path} />
                  <span className="seo-mono" style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 700 }}>{fmt(p.clicks)} clics</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table complète */}
      <SectionHeader eyebrow="Catalogue" title="Toutes les pages"
        subtitle="Vue croisée performance organique + engagement on-site." />
      <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 }}>
              <tr>
                <th style={th}>Page</th>
                <th style={thRight}>Impressions</th>
                <th style={thRight}>Clics</th>
                <th style={thRight}>CTR</th>
                <th style={thRight}>Position</th>
                <th style={thRight}>Vues GA4</th>
                <th style={thRight}><Clock style={{ width: 11, height: 11, display: 'inline', verticalAlign: 'middle' }} /> Durée</th>
                <th style={thRight}>Rebond</th>
              </tr>
            </thead>
            <tbody>
              {merged.slice(0, 100).map((p) => (
                <tr key={p.path} style={{ borderTop: '1px solid var(--line-2)' }}>
                  <td style={td}><TruncatedPath path={p.path} /></td>
                  <td style={tdRight}>{p.impressions ? fmt(p.impressions) : '—'}</td>
                  <td style={tdRight}>{p.clicks ? fmt(p.clicks) : '—'}</td>
                  <td style={tdRight}>{p.ctr !== undefined ? `${p.ctr}%` : '—'}</td>
                  <td style={tdRight}>{p.position ? `#${p.position}` : '—'}</td>
                  <td style={tdRight}>{p.views ? fmt(p.views) : '—'}</td>
                  <td style={tdRight}>{p.avg_duration ? `${Math.round(p.avg_duration)}s` : '—'}</td>
                  <td style={{ ...tdRight, color: p.bounce_rate > 60 ? 'var(--rouge)' : p.bounce_rate > 40 ? 'var(--gold)' : 'var(--emerald)' }}>
                    {p.bounce_rate !== undefined ? `${p.bounce_rate}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th = { padding: '12px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace',
             fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '11px 14px', fontSize: 13, color: 'var(--ink)' };
const tdRight = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 };
