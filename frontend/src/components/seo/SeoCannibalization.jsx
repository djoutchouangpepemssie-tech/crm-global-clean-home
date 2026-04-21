// SeoCannibalization.jsx — /seo/content/cannibalization
// Détection automatique des requêtes où plusieurs pages du site
// rankent simultanément = duplication de contenu / mauvais maillage.

import React, { useState } from 'react';
import {
  AlertTriangle, ChevronDown, ChevronRight, Copy, FileText, GitBranch,
  Layers, Merge, Search, Target,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import { useCannibalization } from '../../hooks/api';

function SeverityBadge({ severity }) {
  const map = {
    high:   { tone: 'var(--rouge)', bg: 'var(--rouge-soft)', label: 'Sévère' },
    medium: { tone: 'var(--gold)', bg: 'var(--gold-soft)', label: 'Moyen' },
    low:    { tone: 'var(--navy)', bg: 'var(--navy-soft)', label: 'Léger' },
  };
  const m = map[severity] || map.low;
  return (
    <span className="seo-pill" style={{ color: m.tone, background: m.bg, borderColor: m.tone }}>
      {m.label}
    </span>
  );
}

function ConflictRow({ c }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="seo-card" style={{ padding: 0, marginBottom: 10, overflow: 'hidden' }}>
      <div onClick={() => setOpen((v) => !v)} style={{
        padding: '16px 20px', cursor: 'pointer',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 14, alignItems: 'center',
      }}>
        {open ? <ChevronDown style={{ width: 16, height: 16, color: 'var(--ink-3)' }} /> :
          <ChevronRight style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />}
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
            « {c.query} »
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
            {c.page_count} pages rankent · {fmt(c.total_impressions)} impressions total
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="seo-label" style={{ fontSize: 9 }}>Gagnant</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--emerald)' }}>
            #{c.winner.position}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="seo-label" style={{ fontSize: 9 }}>Cannibale top</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--rouge)' }}>
            #{c.cannibals[0]?.position || '—'}
          </div>
        </div>
        <SeverityBadge severity={c.severity} />
      </div>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--line-2)' }}>
          <div style={{ marginTop: 14, marginBottom: 12 }}>
            <div className="seo-label" style={{ fontSize: 9 }}>Action recommandée</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, fontFamily: 'Fraunces, serif' }}>
              Fusionner le contenu en une seule page canonique, ou différencier les intentions.
              Rediriger (301) les doublons vers la page gagnante.
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderTop: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' }}>
                <th style={th}>Page</th>
                <th style={thRight}>Clics</th>
                <th style={thRight}>Impressions</th>
                <th style={thRight}>CTR</th>
                <th style={thRight}>Position</th>
                <th style={thRight}>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {c.pages.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line-2)' }}>
                  <td style={td}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{p.page}</span>
                  </td>
                  <td style={tdRight}>{fmt(p.clicks)}</td>
                  <td style={tdRight}>{fmt(p.impressions)}</td>
                  <td style={tdRight}>{p.ctr}%</td>
                  <td style={tdRight}>#{p.position}</td>
                  <td style={tdRight}>
                    {i === 0 ? (
                      <span style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: 11 }}>GAGNANT</span>
                    ) : (
                      <span style={{ color: 'var(--rouge)', fontWeight: 700, fontSize: 11 }}>CANNIBALE</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SeoCannibalization() {
  const { days } = useSeoFilter();
  const { data, isLoading, error } = useCannibalization(days, 50);

  if (isLoading && !data) return <LoadingState message="Analyse des conflits de mots-clés…" />;
  if (error) return <ErrorState message="Impossible de détecter la cannibalisation." />;

  const conflicts = data?.conflicts || [];

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Contenu · Diagnostic"
        title={<>Cannibalisation <em>SEO</em></>}
        subtitle="Requêtes où plusieurs pages de ton site se font concurrence. Perte de ranking garantie."
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Conflits détectés" value={fmt(data?.total_conflicts || 0)}
          tone={(data?.total_conflicts || 0) === 0 ? 'var(--emerald)' : 'var(--rouge)'}
          icon={AlertTriangle} />
        <KpiTile label="Sévères" value={fmt(data?.high_severity || 0)} tone="var(--rouge)" icon={GitBranch}
          sub="À traiter en priorité" />
        <KpiTile label="Moyens" value={fmt(data?.medium_severity || 0)} tone="var(--gold)" icon={Layers} />
        <KpiTile label="Légers" value={fmt(data?.low_severity || 0)} tone="var(--navy)" icon={Merge} />
      </div>

      {/* Explication */}
      <div className="seo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--navy-soft)',
            color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Copy style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Pourquoi c'est un problème
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              Quand deux pages rankent sur la même requête, Google n'arrive pas à trancher laquelle
              est pertinente. Les deux descendent dans les résultats. <b>Solution</b> : choisir une page canonique,
              fusionner les contenus, rediriger les doublons.
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <SectionHeader eyebrow="Conflits actifs" title={`${conflicts.length} requêtes problématiques`}
        subtitle="Triées par sévérité puis par impressions. Clique pour voir les pages concernées." />
      {conflicts.length === 0 ? (
        <div className="seo-card" style={{ padding: 40 }}>
          <EmptyState
            icon={Target}
            title="Aucune cannibalisation détectée 🎉"
            message="Ton architecture SEO est saine. Chaque requête a une seule page canonique."
          />
        </div>
      ) : (
        <div>
          {conflicts.map((c, i) => <ConflictRow key={i} c={c} />)}
        </div>
      )}
    </div>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace',
             fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '10px 14px', fontSize: 13, color: 'var(--ink)' };
const tdRight = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 };
