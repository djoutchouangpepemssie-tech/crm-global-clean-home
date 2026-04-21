// SeoAI.jsx — /seo/ai
// Recos IA priorisées + question box (moteur local) + explications.
// Toutes les recos sont issues du compute local generateRecos()
// et enrichies par un scoring d'impact estimé (clics, leads, revenue).

import React, { useMemo, useState } from 'react';
import {
  Brain, ChevronRight, ExternalLink, Flag, Lightbulb, MessageSquare, Send,
  Sparkles, Target, TrendingUp, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PageHeader, SectionHeader, LoadingState, ErrorState, EmptyState,
  KpiTile, AIRecoCard,
  computeSubScores, detectAlerts, generateRecos,
  fmt, fmtPct, useSeoFilter,
} from './SeoShared';
import {
  useSeoAnalytics as useSeoStats, useGa4Analytics, useCrmAnalytics,
} from '../../hooks/api';

// ─────────── Moteur de questions simples en local ───────────
function answerQuestion(q, ctx) {
  const text = (q || '').toLowerCase().trim();
  if (!text) return null;

  const { seo, ga4, crm, scores } = ctx;
  const ov = seo?.overview || {};
  const kpi = ga4?.kpis || {};

  if (/score|global|note/.test(text)) {
    return {
      type: 'score',
      title: `Ton score SEO global est ${scores.global}/100`,
      body: `SEO organique ${scores.seo} · Trafic ${scores.traffic} · Conversion ${scores.conversion} · Technique ${scores.technical}.`,
      link: '/seo',
    };
  }
  if (/clic|click/.test(text)) {
    return {
      type: 'data',
      title: `${fmt(ov.clicks || 0)} clics organiques`,
      body: `Sur ${fmt(ov.impressions || 0)} impressions, soit un CTR de ${ov.ctr || 0}%.`,
      link: '/seo/performance',
    };
  }
  if (/conversion|lead/.test(text)) {
    return {
      type: 'data',
      title: `${fmt(kpi.conversions?.value || 0)} conversions GA4`,
      body: `Sur ${fmt(kpi.sessions?.value || 0)} sessions. Pour l'attribution détaillée par canal, voir Conversion.`,
      link: '/seo/conversion',
    };
  }
  if (/ctr|taux/.test(text)) {
    return {
      type: 'data',
      title: `CTR moyen Search Console : ${ov.ctr || 0}%`,
      body: `Position moyenne ${ov.position || 0}. Focus sur les pages impressionnées >100 fois mais avec CTR <1%.`,
      link: '/seo/content',
    };
  }
  if (/position|top/.test(text)) {
    return {
      type: 'data',
      title: `Position moyenne Google : ${ov.position || 0}`,
      body: ov.position <= 3 ? 'Excellent — top 3.' : ov.position <= 10 ? 'Bon — première page.' :
            ov.position <= 20 ? 'Deuxième page — à pousser.' : 'À optimiser.',
      link: '/seo/performance',
    };
  }
  if (/tech|vitesse|rapid|perfo/.test(text)) {
    return {
      type: 'score',
      title: `Score technique : ${scores.technical}/100`,
      body: 'Core Web Vitals, taux de rebond, devices. Voir Technique pour le détail.',
      link: '/seo/technical',
    };
  }
  if (/source|canal|canaux/.test(text)) {
    return {
      type: 'data',
      title: 'Analyse des canaux',
      body: `${ga4?.sources?.length || 0} canaux détectés par GA4. Attribution détaillée dans Sources.`,
      link: '/seo/sources',
    };
  }
  if (/priorit|action|faire|quoi/.test(text)) {
    return {
      type: 'action',
      title: 'Ton plan d\'action prioritaire',
      body: `${generateRecos(seo, scores).length} recos identifiées, triées par impact. Voir ci-dessous.`,
      link: null,
    };
  }
  return {
    type: 'unknown',
    title: 'Je n\'ai pas compris la question.',
    body: 'Essaie : "Comment augmenter les clics ?", "Quel est mon score ?", "Quelle est ma priorité ?"',
    link: null,
  };
}

const SUGGESTIONS = [
  'Quel est mon score global ?',
  'Combien de clics ce mois-ci ?',
  'Quelle est ma priorité SEO ?',
  'Comment est mon CTR ?',
  'Quels canaux convertissent le mieux ?',
];

export default function SeoAI() {
  const { days } = useSeoFilter();
  const { data: seo, isLoading, error } = useSeoStats(days);
  const { data: ga4 } = useGa4Analytics(days);
  const { data: crm } = useCrmAnalytics();

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);

  const scores = useMemo(() => computeSubScores(seo || {}, ga4, crm), [seo, ga4, crm]);
  const alerts = useMemo(() => detectAlerts(seo || {}, ga4, scores), [seo, ga4, scores]);
  const recos = useMemo(() => generateRecos(seo || {}, scores), [seo, scores]);

  if (isLoading && !seo) return <LoadingState message="Analyse IA en cours…" />;
  if (error) return <ErrorState message="Impossible de générer les recommandations." />;

  const onAsk = (q) => {
    const qq = q || question;
    if (!qq) return;
    const result = answerQuestion(qq, { seo, ga4, crm, scores });
    setAnswer(result);
    setQuestion(qq);
  };

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Intelligence"
        title={<>Recos <em>IA</em> priorisées</>}
        subtitle="Analyse automatique de tes données SEO, GA4 et CRM pour identifier les actions à impact."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/seo/ai/opportunities" className="seo-chip">
              <Flag style={{ width: 13, height: 13 }} />
              Opportunités
            </Link>
            <Link to="/seo/ai/actions" className="seo-cta">
              <ChevronRight style={{ width: 14, height: 14 }} />
              Bibliothèque d'actions
            </Link>
          </div>
        }
      />

      {/* KPIs recos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Actions identifiées" value={fmt(recos.length)} tone="var(--emerald)" icon={Lightbulb} />
        <KpiTile label="Alertes actives" value={fmt(alerts.length)}
          tone={alerts.length === 0 ? 'var(--emerald)' : 'var(--rouge)'} icon={Zap} />
        <KpiTile label="Score opportunité" value={Math.max(100 - scores.global, 0) + '/100'}
          tone="var(--warm)" icon={Target} sub="Marge d'amélioration" />
        <KpiTile label="Score actuel" value={`${scores.global}/100`}
          tone={scores.global >= 70 ? 'var(--emerald)' : 'var(--gold)'} icon={TrendingUp} />
      </div>

      {/* Question box */}
      <div className="seo-card-dark" style={{ padding: 28, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Brain style={{ width: 20, height: 20, color: 'oklch(0.72 0.13 145)' }} />
          <div className="seo-display" style={{ fontSize: 22, color: 'oklch(0.97 0.01 80)', fontStyle: 'italic' }}>
            Pose-moi une question
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onAsk(); }}
            placeholder='Ex: "Comment augmenter les clics ?" ou "Quelle est ma priorité ?"'
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              background: 'oklch(0.22 0.04 240)', color: 'oklch(0.97 0.01 80)',
              border: '1px solid oklch(0.32 0.04 240)',
              fontFamily: 'Inter, sans-serif', fontSize: 14, outline: 'none',
            }}
          />
          <button onClick={() => onAsk()} className="seo-cta" style={{
            background: 'oklch(0.72 0.13 145)', color: 'oklch(0.15 0.02 60)',
          }}>
            <Send style={{ width: 14, height: 14 }} /> Analyser
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: answer ? 20 : 0 }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => onAsk(s)}
              style={{
                padding: '6px 12px', borderRadius: 999,
                background: 'oklch(0.22 0.04 240)', color: 'oklch(0.85 0.02 80)',
                border: '1px solid oklch(0.32 0.04 240)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                letterSpacing: '0.04em', cursor: 'pointer',
              }}>
              {s}
            </button>
          ))}
        </div>

        {answer && (
          <div style={{
            padding: 18, borderRadius: 12,
            background: answer.type === 'unknown' ? 'oklch(0.22 0.04 25)' : 'oklch(0.22 0.08 160)',
            border: `1px solid ${answer.type === 'unknown' ? 'oklch(0.4 0.1 25)' : 'oklch(0.4 0.1 160)'}`,
          }}>
            <div className="seo-display" style={{ fontSize: 18, color: 'oklch(0.97 0.01 80)', marginBottom: 6 }}>
              {answer.title}
            </div>
            <div style={{ fontSize: 13, color: 'oklch(0.85 0.02 80)', lineHeight: 1.6 }}>{answer.body}</div>
            {answer.link && (
              <Link to={answer.link} className="seo-chip" style={{
                marginTop: 12, background: 'transparent', color: 'oklch(0.85 0.02 80)',
                borderColor: 'oklch(0.5 0.1 160)',
              }}>
                Explorer <ChevronRight style={{ width: 12, height: 12 }} />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Recos triées */}
      <SectionHeader eyebrow="Plan d'action" title="Recommandations priorisées"
        subtitle="Triées par impact estimé (clics, leads, revenue gagnés)." />
      {recos.length === 0 ? (
        <div className="seo-card" style={{ padding: 24 }}>
          <EmptyState icon={Sparkles} title="Pas de reco active"
            message="Ton cockpit est en bon état ! Continue à suivre les KPIs." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {recos.map((reco, i) => <AIRecoCard key={i} reco={reco} index={i} />)}
        </div>
      )}
    </div>
  );
}
