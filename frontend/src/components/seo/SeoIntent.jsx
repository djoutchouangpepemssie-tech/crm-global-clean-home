// SeoIntent.jsx — /seo/content/intent
// Intent Matcher : compare les tokens d'une requête Search Console avec
// le path de l'URL qui ranke. Si peu de recouvrement, Google choisit
// "au hasard" → mauvais signal SEO.

import React from 'react';
import {
  AlertCircle, Check, CheckCircle, FileSearch, MinusCircle, Target,
  TrendingUp, X,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import { useIntentMatch } from '../../hooks/api';

function VerdictBadge({ verdict }) {
  const map = {
    perfect:  { tone: 'var(--emerald)',      bg: 'var(--emerald-soft)',  label: 'Parfait',   icon: CheckCircle },
    good:     { tone: 'var(--navy)',         bg: 'var(--navy-soft)',     label: 'Bon',       icon: Check },
    partial:  { tone: 'var(--gold)',         bg: 'var(--gold-soft)',     label: 'Partiel',   icon: MinusCircle },
    mismatch: { tone: 'var(--rouge)',        bg: 'var(--rouge-soft)',    label: 'Mismatch',  icon: X },
  };
  const m = map[verdict] || map.mismatch;
  const Icon = m.icon;
  return (
    <span className="seo-pill" style={{ color: m.tone, background: m.bg, borderColor: m.tone }}>
      <Icon style={{ width: 11, height: 11 }} /> {m.label}
    </span>
  );
}

function TokenChip({ text, matched }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', margin: '2px 4px 2px 0',
      borderRadius: 999, fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
      letterSpacing: '0.04em',
      color: matched ? 'var(--emerald)' : 'var(--rouge)',
      background: matched ? 'var(--emerald-soft)' : 'var(--rouge-soft)',
      border: `1px solid ${matched ? 'var(--emerald)' : 'var(--rouge)'}`,
    }}>
      {matched ? '✓' : '✗'} {text}
    </span>
  );
}

export default function SeoIntent() {
  const { days } = useSeoFilter();
  const { data, isLoading, error } = useIntentMatch(days, 50);

  if (isLoading && !data) return <LoadingState message="Analyse des intentions…" />;
  if (error) return <ErrorState message="Impossible de charger l'intent matcher." />;

  const matches = data?.matches || [];
  const mismatches = matches.filter((m) => m.verdict === 'mismatch');
  const totalMismatchImpressions = mismatches.reduce((a, m) => a + m.impressions, 0);

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Contenu · Intelligence"
        title={<>Intent <em>Matcher</em></>}
        subtitle="Mesure l'adéquation entre les requêtes utilisateur et les pages qui rankent. Gap d'intention = SEO fragile."
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Requêtes analysées" value={fmt(data?.total_analyzed || 0)}
          tone="var(--navy)" icon={FileSearch} />
        <KpiTile label="Parfaits" value={fmt(data?.perfect || 0)} tone="var(--emerald)" icon={CheckCircle} />
        <KpiTile label="Partiels" value={fmt(data?.partial || 0)} tone="var(--gold)" icon={MinusCircle} />
        <KpiTile label="Mismatches" value={fmt(data?.mismatches || 0)}
          tone={(data?.mismatches || 0) > 0 ? 'var(--rouge)' : 'var(--ink-4)'}
          icon={AlertCircle} sub={`${fmt(totalMismatchImpressions)} imp. gaspillées`} />
      </div>

      {/* Explication */}
      <div className="seo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--navy-soft)',
            color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Target style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Comment se lit cette page
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              Chaque ligne compare les mots d'une requête avec les mots du chemin de l'URL qui ranke.
              <b> Match score ≥0.7 = parfait</b>, <b>&lt;0.4 = mismatch</b>. Un mismatch signifie que ta page
              ranke par hasard — Google peut la déclasser à tout moment. Solution : créer une page dédiée
              avec un path qui contient les mots clés de la requête.
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <SectionHeader eyebrow="Analyse" title={`${matches.length} requêtes scorées`}
        subtitle="Mismatches en premier (à traiter)." />
      {matches.length === 0 ? (
        <div className="seo-card" style={{ padding: 40 }}>
          <EmptyState icon={Target} title="Pas encore de données à analyser"
            message="Attends quelques jours d'impressions Search Console." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {matches.map((m, i) => (
            <div key={i} className="seo-card" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 14, alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500 }}>« {m.query} »</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                    → {m.page}
                  </div>
                </div>
                <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  #{m.position}
                </span>
                <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {fmt(m.impressions)} imp.
                </span>
                <span className="seo-mono" style={{
                  fontSize: 13, fontWeight: 700,
                  color: m.match_score >= 0.7 ? 'var(--emerald)' :
                         m.match_score >= 0.4 ? 'var(--gold)' : 'var(--rouge)',
                }}>
                  {m.match_score}
                </span>
                <VerdictBadge verdict={m.verdict} />
              </div>

              <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 10 }}>
                {m.matched_tokens.map((t) => <TokenChip key={t} text={t} matched />)}
                {m.missing_from_url.map((t) => <TokenChip key={t} text={t} matched={false} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
