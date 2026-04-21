// SeoHome.jsx — vue d'entrée /seo (dashboard compact)
// Synthèse : score global, KPIs GA4/GSC, funnel tracker, santé sources.

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, BarChart3, Cable, ChevronRight, Eye, Globe2, MousePointerClick,
  Search, Send, Sparkles, Target, TrendingUp, Users,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, LoadingState, ErrorState,
  KpiTile, ScoreGauge, SubScoreRow, AlertCard, AIRecoCard,
  computeSubScores, detectAlerts, generateRecos,
  fmt, fmtPct,
  useSeoFilter,
} from './SeoShared';
import {
  useSeoAnalytics as useSeoStats,
  useGa4Analytics,
  useCrmAnalytics,
  useTrackerHealth,
  useTrackerFunnel,
} from '../../hooks/api';

function StatusDot({ status }) {
  const color =
    status === 'ok' ? 'var(--emerald)' :
    (status === 'partial' || status === 'stale') ? 'var(--gold)' :
    'var(--rouge)';
  return <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }} />;
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="seo-label" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{label}</div>
      <div className="seo-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

export default function SeoHome() {
  const { days } = useSeoFilter();

  const { data: seo, isLoading: seoLoading, error: seoError } = useSeoStats(days);
  const { data: ga4 } = useGa4Analytics(days);
  const { data: crm } = useCrmAnalytics();
  const { data: health } = useTrackerHealth();
  const period = days <= 7 ? '7d' : days >= 90 ? '90d' : '30d';
  const { data: funnel } = useTrackerFunnel(period);

  if (seoLoading && !seo) return <LoadingState message="Chargement du cockpit SEO…" />;
  if (seoError) return <ErrorState message="Impossible de charger les données Search Console." />;

  const scores = computeSubScores(seo, ga4, crm);
  const alerts = detectAlerts(seo, ga4, scores).slice(0, 4);
  const recos = generateRecos(seo, scores).slice(0, 3);

  const gscOverview = seo?.overview || {};
  const ga4Kpi = ga4?.kpis || {};

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Vue d'ensemble"
        title={<>Cockpit <em>SEO & Analytics</em></>}
        subtitle={`Données réelles ${health?.site?.replace(/^https?:\/\//, '') || 'globalcleanhome.com'} — période ${days} jours.`}
        actions={
          <Link to="/seo/connect" className="seo-cta">
            <Cable style={{ width: 14, height: 14 }} />
            Connexion & Tracking
          </Link>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, marginBottom: 28 }}>
        <div className="seo-card-dark" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <ScoreGauge value={scores.global} size={160} />
          <div>
            <div className="seo-label" style={{ color: 'oklch(0.85 0.02 80 / 0.8)' }}>Score global</div>
            <div className="seo-display" style={{ fontSize: 30, color: 'oklch(0.97 0.01 80)', fontStyle: 'italic', marginTop: 4 }}>
              {scores.globalLabel || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'oklch(0.85 0.02 80 / 0.7)', marginTop: 6 }}>
              Agrégat pondéré SEO + Trafic + Conversion + Technique.
            </div>
          </div>
        </div>

        <div className="seo-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div className="seo-label">Sous-scores</div>
              <div className="seo-display" style={{ fontSize: 18, marginTop: 4 }}>Quatre piliers</div>
            </div>
            <Link to="/seo/connect" className="seo-chip">
              <StatusDot status={health?.status} />
              {health?.status === 'ok' ? 'Tous systèmes OK' :
               health?.status === 'partial' ? `${health?.ok_count}/${health?.total} sources actives` :
               'Voir la santé'}
              <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
          <SubScoreRow label="SEO organique"   value={scores.seo}         icon={Search} />
          <SubScoreRow label="Trafic"          value={scores.traffic}     icon={TrendingUp} />
          <SubScoreRow label="Conversion"      value={scores.conversion}  icon={Target} />
          <SubScoreRow label="Technique"       value={scores.technical}   icon={Activity} />
        </div>
      </div>

      <SectionHeader
        eyebrow="KPIs"
        title="Signaux clés"
        subtitle="Vue consolidée Search Console + GA4 + funnel tracker."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile
          label="Clics organiques"
          value={fmt(gscOverview.clicks || 0)}
          tone="var(--emerald)"
          icon={Search}
          sub={`${fmt(gscOverview.impressions || 0)} impressions`}
        />
        <KpiTile
          label="CTR moyen"
          value={fmtPct(gscOverview.ctr || 0, 2)}
          tone="var(--gold)"
          icon={MousePointerClick}
          sub={`Position moy. ${gscOverview.position || 0}`}
        />
        <KpiTile
          label="Sessions GA4"
          value={fmt(ga4Kpi.sessions?.value || 0)}
          trend={ga4Kpi.sessions?.change}
          tone="var(--navy)"
          icon={Users}
          sub={`${fmt(ga4Kpi.users?.value || 0)} utilisateurs`}
        />
        <KpiTile
          label="Conversions"
          value={fmt(ga4Kpi.conversions?.value || 0)}
          trend={ga4Kpi.conversions?.change}
          tone="var(--warm)"
          icon={Target}
          sub={funnel?.revenue ? `${fmt(funnel.revenue)} € attribué` : '—'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="seo-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div className="seo-label">Funnel bout-en-bout</div>
              <div className="seo-display" style={{ fontSize: 20, marginTop: 4 }}>
                Visite → <em style={{ color: 'var(--navy)', fontStyle: 'italic' }}>Facture</em>
              </div>
            </div>
            <Link to="/seo/conversion" className="seo-chip">
              Détail <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
          {funnel?.funnel ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {funnel.funnel.map((step, i) => {
                const max = Math.max(...funnel.funnel.map((f) => f.value), 1);
                const pct = (step.value / max) * 100;
                const tone = i <= 2 ? 'var(--cool)' : i <= 4 ? 'var(--gold)' : i <= 6 ? 'var(--warm)' : 'var(--emerald)';
                return (
                  <div key={step.step}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--ink-2)', fontFamily: 'Fraunces, serif' }}>{step.step}</span>
                      <span className="seo-mono" style={{ fontWeight: 700 }}>{fmt(step.value)}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: tone, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <LoadingState message="Calcul du funnel…" />
          )}
          {funnel?.rates?.visit_to_lead !== undefined && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16,
                          padding: 14, background: 'var(--surface-2)', borderRadius: 10 }}>
              <Stat label="Visite → Lead" value={fmtPct(funnel.rates.visit_to_lead, 2)} />
              <Stat label="Lead → Devis"  value={fmtPct(funnel.rates.lead_to_quote, 1)} />
              <Stat label="Devis → Gagné" value={fmtPct(funnel.rates.quote_to_won, 1)} />
            </div>
          )}
        </div>

        <div>
          <div className="seo-card" style={{ padding: 22, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div>
                <div className="seo-label">Alertes</div>
                <div className="seo-display" style={{ fontSize: 18, marginTop: 4 }}>
                  {alerts.length} signal{alerts.length > 1 ? 's' : ''}
                </div>
              </div>
              <Link to="/seo/alerts" className="seo-chip">
                Voir tout <ChevronRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>
            {alerts.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Aucune alerte. 🎉</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
              </div>
            )}
          </div>

          <div className="seo-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div>
                <div className="seo-label">Recos IA</div>
                <div className="seo-display" style={{ fontSize: 18, marginTop: 4 }}>Top priorités</div>
              </div>
              <Link to="/seo/ai" className="seo-chip">
                <Sparkles style={{ width: 12, height: 12 }} />
                Détail
              </Link>
            </div>
            {recos.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Pas de reco pour le moment.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {recos.map((r, i) => <AIRecoCard key={i} reco={r} index={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <SectionHeader eyebrow="Explorer" title="Toutes les sections" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { to: '/seo/performance', label: 'Performance SEO', icon: TrendingUp, desc: 'Positions, clics, impressions' },
          { to: '/seo/content', label: 'Contenu', icon: Eye, desc: 'Pages, CTR, cannibalisation' },
          { to: '/seo/technical', label: 'Technique', icon: Activity, desc: 'CWV, crawl, erreurs' },
          { to: '/seo/conversion', label: 'Conversion', icon: Target, desc: 'Funnel, attribution' },
          { to: '/seo/sources', label: 'Sources', icon: BarChart3, desc: 'UTM, canaux, Ads' },
          { to: '/seo/globe', label: 'Globe 3D', icon: Globe2, desc: 'Trafic monde interactif' },
          { to: '/seo/ai', label: 'IA & Recos', icon: Sparkles, desc: 'Plan d’action généré' },
          { to: '/seo/alerts', label: 'Alertes', icon: Send, desc: 'Monitoring' },
          { to: '/seo/connect', label: 'Connexion', icon: Cable, desc: 'Santé & snippet' },
        ].map((x) => (
          <Link key={x.to} to={x.to} className="seo-card seo-card-hover"
            style={{ padding: 16, textDecoration: 'none', color: 'var(--ink)', display: 'block' }}>
            <x.icon style={{ width: 18, height: 18, color: 'var(--navy)' }} />
            <div className="seo-display" style={{ fontSize: 15, fontWeight: 500, marginTop: 8 }}>{x.label}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{x.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
