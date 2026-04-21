// SeoGaps.jsx — /seo/content/gaps
// Content Gap : requêtes avec volume mais où aucune page du site ne
// matche correctement → besoin d'un nouveau contenu.

import React from 'react';
import {
  ArrowRight, FileText, Lightbulb, Plus, Search, Sparkles, Target, TrendingUp,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import { useContentGap, useCreateSeoAction } from '../../hooks/api';

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

export default function SeoGaps() {
  const { days } = useSeoFilter();
  const { data, isLoading, error } = useContentGap(days, 100);
  const createAction = useCreateSeoAction();

  if (isLoading && !data) return <LoadingState message="Détection des gaps de contenu…" />;
  if (error) return <ErrorState message="Impossible d'analyser les gaps." />;

  const gaps = data?.gaps || [];
  const totalPotential = gaps.reduce((a, g) => a + (g.potential_monthly_clicks || 0), 0);

  const addAsAction = async (gap) => {
    try {
      await createAction.mutateAsync({
        title: `Créer page : « ${gap.query} »`,
        description: `Nouvelle page dédiée à l'intention "${gap.query}". Suggestion URL : ${gap.suggested_url}`,
        type: 'content',
        priority: gap.severity === 'high' ? 'high' : gap.severity === 'medium' ? 'medium' : 'low',
        url: gap.suggested_url,
        query: gap.query,
        impact_estimate: `+${gap.potential_monthly_clicks} clics/mois`,
        impact_clicks: gap.potential_monthly_clicks,
        status: 'todo',
        notes: `${gap.impressions} impressions sur cette requête sans page dédiée. Position actuelle : #${gap.best_position}.`,
        tags: ['content-gap', 'new-page'],
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Contenu · Stratégie"
        title={<>Content <em>Gap</em></>}
        subtitle="Requêtes qui ont du volume de recherche mais où ton site n'a pas de page vraiment adaptée."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Gaps détectés" value={fmt(data?.total_gaps || 0)}
          tone={(data?.total_gaps || 0) > 0 ? 'var(--warm)' : 'var(--emerald)'}
          icon={Target} />
        <KpiTile label="Critiques" value={fmt(data?.high_severity || 0)} tone="var(--rouge)" icon={Sparkles}
          sub="Volume important" />
        <KpiTile label="Potentiel mensuel" value={`+${fmt(totalPotential)}`} tone="var(--emerald)"
          icon={TrendingUp} sub="Clics estimés" />
        <KpiTile label="Période analysée" value={`${days}j`} tone="var(--ink-4)" icon={FileText} />
      </div>

      <div className="seo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--gold-soft)',
            color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Lightbulb style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Comment on détecte un gap
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              Une requête avec ≥{data?.min_impressions_threshold || 100} impressions où ta meilleure page
              est positionnée <b>au-delà du top 15</b> ET contient peu des tokens de la requête dans son URL.
              C'est un <b>signal fort</b> que Google n'a pas trouvé de page pertinente chez toi → crée-la.
            </div>
          </div>
        </div>
      </div>

      <SectionHeader eyebrow="Opportunités" title={`${gaps.length} pages à créer`}
        subtitle="Triées par gap_score = impressions × (1 − match_score). Plus fort = plus rentable." />
      {gaps.length === 0 ? (
        <div className="seo-card" style={{ padding: 40 }}>
          <EmptyState icon={Search} title="Pas de gap détecté 🎉"
            message="Ton architecture de contenu couvre bien les requêtes avec volume." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {gaps.map((g, i) => (
            <div key={i} className="seo-card seo-card-hover" style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <SeverityBadge severity={g.severity} />
                    <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      Gap score {g.gap_score}
                    </span>
                  </div>

                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
                    « {g.query} »
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>
                    Meilleure page actuelle : <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{g.best_page || '—'}</span>{' '}
                    (#{g.best_position}) · match score {g.match_score}
                  </div>

                  <div style={{
                    padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)',
                    fontSize: 13, color: 'var(--ink-2)',
                  }}>
                    <ArrowRight style={{ width: 13, height: 13, verticalAlign: 'middle', marginRight: 6, color: 'var(--emerald)' }} />
                    URL suggérée : <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{g.suggested_url}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="seo-label" style={{ color: 'var(--emerald)' }}>Potentiel</div>
                  <div className="seo-display" style={{ fontSize: 26, color: 'var(--emerald)', fontWeight: 500, marginTop: 4 }}>
                    +{fmt(g.potential_monthly_clicks)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>clics/mois</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>
                    {fmt(g.impressions)} impressions actuelles
                  </div>
                </div>

                <button onClick={() => addAsAction(g)} disabled={createAction.isPending}
                  className="seo-chip" style={{ alignSelf: 'flex-start' }}
                  title="Ajouter à la bibliothèque d'actions">
                  <Plus style={{ width: 13, height: 13 }} />
                  Action
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
