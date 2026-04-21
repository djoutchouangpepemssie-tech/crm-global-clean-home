// SeoOrphans.jsx — /seo/content/orphans
// Détection des pages vues par GA4 mais invisibles dans Search Console.
// Ces pages ont du trafic direct/referral mais ne convertissent pas en SEO.

import React from 'react';
import {
  AlertCircle, Ban, ExternalLink, FileX, Search, TrendingDown, Users,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import { useOrphans } from '../../hooks/api';

function SeverityBadge({ severity }) {
  const map = {
    high:   { tone: 'var(--rouge)', bg: 'var(--rouge-soft)', label: 'Critique' },
    medium: { tone: 'var(--gold)', bg: 'var(--gold-soft)', label: 'Moyen' },
    low:    { tone: 'var(--navy)', bg: 'var(--navy-soft)', label: 'Faible' },
  };
  const m = map[severity] || map.low;
  return (
    <span className="seo-pill" style={{ color: m.tone, background: m.bg, borderColor: m.tone }}>
      {m.label}
    </span>
  );
}

export default function SeoOrphans() {
  const { days } = useSeoFilter();
  const { data, isLoading, error } = useOrphans(days, 20);

  if (isLoading && !data) return <LoadingState message="Recherche de pages orphelines…" />;
  if (error) return <ErrorState message="Impossible d'analyser les pages orphelines." />;

  const orphans = data?.orphans || [];
  const totalViews = orphans.reduce((a, o) => a + (o.views || 0), 0);

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Contenu · Diagnostic"
        title={<>Pages <em>orphelines</em> SEO</>}
        subtitle="Pages qui reçoivent du trafic mais n'apparaissent pas ou très peu dans Google."
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Pages orphelines" value={fmt(data?.total_orphans || 0)}
          tone={(data?.total_orphans || 0) === 0 ? 'var(--emerald)' : 'var(--rouge)'}
          icon={FileX} />
        <KpiTile label="Critiques" value={fmt(data?.high_severity || 0)} tone="var(--rouge)" icon={Ban}
          sub="0 impression + vues élevées" />
        <KpiTile label="Vues totales" value={fmt(totalViews)} tone="var(--navy)" icon={Users}
          sub="Trafic non exploité" />
        <KpiTile label="Seuil vues min" value={fmt(data?.min_views_threshold || 20)}
          tone="var(--ink-4)" icon={TrendingDown} sub="Configurable" />
      </div>

      {/* Explication */}
      <div className="seo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--rouge-soft)',
            color: 'var(--rouge)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertCircle style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Pourquoi c'est un problème
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              Ces pages sont visitées mais jamais via Google. Causes possibles : pas d'indexation (noindex,
              robots.txt, canonical externe), aucun maillage interne, contenu duplicate d'une autre page.
              <b> Chaque page orpheline = potentiel SEO gaspillé.</b>
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <SectionHeader eyebrow="Détection" title={`${orphans.length} pages à examiner`}
        subtitle="Triées par volume de vues. La colonne impressions GSC montre la visibilité organique réelle." />
      {orphans.length === 0 ? (
        <div className="seo-card" style={{ padding: 40 }}>
          <EmptyState
            icon={Search}
            title="Aucune page orpheline détectée 🎉"
            message="Toutes tes pages visitées sont aussi présentes dans Google. Bon maillage !"
          />
        </div>
      ) : (
        <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={th}>Page</th>
                <th style={thRight}>Vues GA4</th>
                <th style={thRight}>Durée</th>
                <th style={thRight}>Impressions GSC</th>
                <th style={thRight}>Sévérité</th>
                <th style={thRight}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orphans.map((o, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                  <td style={td}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{o.path}</span>
                  </td>
                  <td style={tdRight}>{fmt(o.views)}</td>
                  <td style={tdRight}>{o.duration_s}s</td>
                  <td style={{ ...tdRight, color: o.gsc_impressions === 0 ? 'var(--rouge)' : 'var(--ink-3)' }}>
                    {fmt(o.gsc_impressions)}
                  </td>
                  <td style={tdRight}><SeverityBadge severity={o.severity} /></td>
                  <td style={tdRight}>
                    <a href={o.path} target="_blank" rel="noreferrer" className="seo-chip"
                       style={{ fontSize: 10, padding: '4px 10px', display: 'inline-flex' }}>
                      Voir <ExternalLink style={{ width: 10, height: 10, marginLeft: 4 }} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Checklist */}
      <div style={{ marginTop: 28 }}>
        <SectionHeader eyebrow="Checklist" title="Pour chaque page orpheline, vérifier :" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { t: 'Balise <meta name="robots">', d: 'Pas de "noindex" accidentel.' },
            { t: 'Canonical', d: 'Ne pointe pas vers une autre URL.' },
            { t: 'robots.txt', d: 'Le chemin n\'est pas bloqué.' },
            { t: 'Sitemap.xml', d: 'L\'URL y est présente.' },
            { t: 'Maillage interne', d: 'Au moins 1 lien depuis le menu ou un article.' },
            { t: 'Contenu unique', d: 'Pas de duplication avec une autre page mieux positionnée.' },
          ].map((x, i) => (
            <div key={i} className="seo-card" style={{ padding: 14 }}>
              <div className="seo-label" style={{ fontSize: 9 }}>{x.t}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, fontFamily: 'Fraunces, serif' }}>
                {x.d}
              </div>
            </div>
          ))}
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
