// SeoInternalLinks.jsx — /seo/technical/internal-links
// Maillage interne effectif, dérivé des sessions du tracker.
// Identifie les hubs, les culs-de-sac et les pages sans lien entrant.

import React from 'react';
import {
  AlertTriangle, ArrowRight, Layers, Link2, MapPin, Network,
  SignalZero, TrendingUp, Users,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import { useInternalLinks } from '../../hooks/api';

export default function SeoInternalLinks() {
  const { days } = useSeoFilter();
  // Maillage : on prend 7 jours max pour éviter la dilution
  const d = Math.min(days, 14);
  const { data, isLoading, error } = useInternalLinks(d);

  if (isLoading && !data) return <LoadingState message="Analyse du maillage interne…" />;
  if (error) return <ErrorState message="Impossible d'analyser le maillage." />;

  const edges = data?.edges || [];
  const hubs = data?.hubs || [];

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Technique · Maillage"
        title={<>Internal <em>Linking</em></>}
        subtitle={`Graphe effectif des liens internes, construit à partir des ${fmt(data?.total_sessions || 0)} sessions tracker sur ${d} jours.`}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Pages touchées" value={fmt(data?.total_pages || 0)} tone="var(--navy)" icon={MapPin} />
        <KpiTile label="Transitions" value={fmt(data?.total_transitions || 0)} tone="var(--gold)" icon={ArrowRight}
          sub={`${fmt(data?.unique_edges || 0)} edges uniques`} />
        <KpiTile label="Culs-de-sac" value={fmt((data?.dead_ends || []).length)}
          tone={(data?.dead_ends || []).length > 0 ? 'var(--warm)' : 'var(--emerald)'}
          icon={SignalZero} sub="Pages sans lien sortant" />
        <KpiTile label="Sans lien entrant" value={fmt((data?.no_inbound || []).length)}
          tone={(data?.no_inbound || []).length > 0 ? 'var(--rouge)' : 'var(--emerald)'}
          icon={AlertTriangle} sub="Pages isolées" />
      </div>

      {/* Explication */}
      <div className="seo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--navy-soft)',
            color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Network style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Maillage réel, pas déclaré
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              Ce graphe reflète ce que les visiteurs <b>font vraiment</b> sur ton site (ordre des pageviews par session),
              pas juste les &lt;a href&gt; présents dans le HTML. Si une page n'a aucun lien entrant, elle
              est invisible au crawler Google aussi. Ajouter des liens depuis les hubs les plus visités.
            </div>
          </div>
        </div>
      </div>

      {/* Hubs */}
      <SectionHeader eyebrow="Hubs" title="Pages les plus connectées"
        subtitle="Inbound + outbound combinés. Les hubs sont le cœur de ton architecture SEO." />
      <div className="seo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        {hubs.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState icon={Layers} title="Pas encore de données de maillage" /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={th}>Page</th>
                <th style={thRight}>Entrants</th>
                <th style={thRight}>Sortants</th>
                <th style={thRight}>Total</th>
              </tr>
            </thead>
            <tbody>
              {hubs.map((h, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                  <td style={td}>
                    <Link2 style={{ width: 12, height: 12, color: 'var(--navy)', marginRight: 6, verticalAlign: 'middle' }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{h.path}</span>
                  </td>
                  <td style={tdRight}>{fmt(h.inbound)}</td>
                  <td style={tdRight}>{fmt(h.outbound)}</td>
                  <td style={{ ...tdRight, color: 'var(--emerald)', fontWeight: 700 }}>{fmt(h.inbound + h.outbound)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edges */}
      <SectionHeader eyebrow="Flux" title="Top transitions entre pages"
        subtitle="Les parcours les plus fréquents des visiteurs." />
      <div className="seo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        {edges.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState icon={ArrowRight} title="Pas encore de transitions" /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={th}>De</th>
                <th style={th}>Vers</th>
                <th style={thRight}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {edges.slice(0, 30).map((e, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                  <td style={td}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{e.from}</span>
                  </td>
                  <td style={td}>
                    <ArrowRight style={{ width: 12, height: 12, color: 'var(--ink-3)', marginRight: 6, verticalAlign: 'middle' }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{e.to}</span>
                  </td>
                  <td style={{ ...tdRight, fontWeight: 700 }}>{fmt(e.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Problems */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="seo-card" style={{ padding: 22 }}>
          <div className="seo-label" style={{ color: 'var(--rouge)', marginBottom: 4 }}>Pages isolées</div>
          <div className="seo-display" style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>
            <AlertTriangle style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6, color: 'var(--rouge)' }} />
            Sans lien entrant
          </div>
          {(data?.no_inbound || []).length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>🎉 Toutes les pages reçoivent au moins un visiteur venu d'une autre page.</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {(data?.no_inbound || []).map((p) => (
                <div key={p} style={{
                  padding: '8px 12px', background: 'var(--rouge-soft)', borderRadius: 8,
                  fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                }}>{p}</div>
              ))}
            </div>
          )}
        </div>

        <div className="seo-card" style={{ padding: 22 }}>
          <div className="seo-label" style={{ color: 'var(--warm)', marginBottom: 4 }}>Culs-de-sac</div>
          <div className="seo-display" style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>
            <SignalZero style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6, color: 'var(--warm)' }} />
            Sans lien sortant
          </div>
          {(data?.dead_ends || []).length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>🎉 Aucun cul-de-sac.</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {(data?.dead_ends || []).map((p) => (
                <div key={p} style={{
                  padding: '8px 12px', background: 'var(--warm-soft)', borderRadius: 8,
                  fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                }}>{p}</div>
              ))}
            </div>
          )}
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
