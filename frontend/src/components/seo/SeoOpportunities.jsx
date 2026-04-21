// SeoOpportunities.jsx — /seo/ai/opportunities
// Moteur d'opportunités priorisées : "striking distance" (pos 11-20)
// + pages page 1 avec CTR trop bas. Prédictions d'impact en clics.

import React from 'react';
import {
  ArrowRight, FileText, Flag, Lightbulb, MousePointerClick, Search,
  Target, TrendingUp, Zap,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import { useSeoOpportunities } from '../../hooks/api';

function TypeBadge({ type }) {
  if (type === 'striking_distance') {
    return (
      <span className="seo-pill" style={{ color: 'var(--warm)', background: 'var(--warm-soft)', borderColor: 'var(--warm)' }}>
        <Flag style={{ width: 11, height: 11 }} /> Striking distance
      </span>
    );
  }
  if (type === 'low_ctr_page1') {
    return (
      <span className="seo-pill" style={{ color: 'var(--navy)', background: 'var(--navy-soft)', borderColor: 'var(--navy)' }}>
        <MousePointerClick style={{ width: 11, height: 11 }} /> CTR faible page 1
      </span>
    );
  }
  return null;
}

export default function SeoOpportunities() {
  const { days } = useSeoFilter();
  const { data, isLoading, error } = useSeoOpportunities(days);

  if (isLoading && !data) return <LoadingState message="Détection des opportunités…" />;
  if (error) return <ErrorState message="Impossible de charger les opportunités." />;

  const opps = data?.opportunities || [];
  const totalGain = opps.reduce((a, o) => a + (o.potential_gain_clicks || 0), 0);

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="IA · Opportunités"
        title={<>Actions <em>à fort impact</em></>}
        subtitle="Le moteur a croisé tes positions, impressions et CTR pour identifier les gains rapides."
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Opportunités" value={fmt(data?.total_opportunities || 0)}
          tone={(data?.total_opportunities || 0) > 0 ? 'var(--emerald)' : 'var(--ink-4)'}
          icon={Lightbulb} />
        <KpiTile label="Striking distance" value={fmt(data?.striking_distance || 0)}
          tone="var(--warm)" icon={Flag} sub="Pos 11-20" />
        <KpiTile label="CTR à optimiser" value={fmt(data?.low_ctr_page1 || 0)}
          tone="var(--navy)" icon={MousePointerClick} sub="Page 1, CTR <1.5%" />
        <KpiTile label="Gain potentiel" value={`+${fmt(totalGain)}`}
          tone="var(--emerald)" icon={TrendingUp} sub="Clics mensuels estimés" />
      </div>

      {/* Explication */}
      <div className="seo-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--emerald-soft)',
            color: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Deux types d'opportunités à fort ROI
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              <b>Striking distance</b> : les requêtes où tu es en position 11-20. Un petit effort SEO
              (ajout de contenu, backlinks internes) peut faire passer en page 1 → CTR x10.
              <br /><b>CTR faible page 1</b> : tu es déjà visible mais les utilisateurs ne cliquent pas.
              Réécrire le title + meta description est l'action la moins chère et la plus rapide.
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <SectionHeader eyebrow="Plan d'action" title={`${opps.length} opportunités triées par impact`}
        subtitle="Le gain potentiel est calculé à partir d'un CTR cible conservateur." />
      {opps.length === 0 ? (
        <div className="seo-card" style={{ padding: 40 }}>
          <EmptyState
            icon={Target}
            title="Pas d'opportunité nette pour le moment"
            message="Soit tu domines déjà, soit il faut plus de volume d'impressions pour détecter."
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {opps.map((o, i) => (
            <div key={i} className="seo-card seo-card-hover" style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <TypeBadge type={o.type} />
                    <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      #{i + 1}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
                    « {o.query} »
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{o.page}</span> · position <b>#{o.current_position}</b> ·{' '}
                    {fmt(o.impressions)} impressions · CTR {o.ctr}%
                  </div>
                  <div style={{
                    padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)',
                    fontSize: 13, color: 'var(--ink-2)',
                  }}>
                    <ArrowRight style={{ width: 13, height: 13, verticalAlign: 'middle', marginRight: 6, color: 'var(--emerald)' }} />
                    {o.action}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="seo-label" style={{ color: 'var(--emerald)' }}>Gain estimé</div>
                  <div className="seo-display" style={{ fontSize: 30, color: 'var(--emerald)', fontWeight: 500, marginTop: 4 }}>
                    +{fmt(o.potential_gain_clicks)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>clics / mois</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
