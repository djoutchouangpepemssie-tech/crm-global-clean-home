/**
 * AIInsights — ATELIER direction
 * Crème / Fraunces / émeraude (brand) / terracotta / amber
 * Logique 100% préservée (génération d'insights à partir des stats).
 */
import React, { useState, useEffect } from 'react';
import {
  Sparkles, TrendingUp, AlertTriangle, Target, Zap, ChevronRight,
} from 'lucide-react';

const AIInsights = ({ stats }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const generateInsights = () => {
    if (!stats || Object.keys(stats).length === 0) return [];

    const items = [];
    const convRate = stats.conversion_lead_to_quote || 0;
    const newLeads = stats.new_leads || 0;
    const avgScore = stats.avg_lead_score || 0;
    const pendingTasks = stats.pending_tasks || 0;
    const totalLeads = stats.total_leads || 0;
    const bestSource = stats.best_source?.name || null;
    const sourceData = stats.leads_by_source || {};
    const serviceData = stats.leads_by_service || {};

    // Palette atelier (tokens Tailwind + tons discrets)
    const tones = {
      warning:     { ring: 'ring-amber-200',      bg: 'bg-amber-50',      icon: 'text-amber-700',      bar: 'bg-amber-500' },
      danger:      { ring: 'ring-terracotta-200', bg: 'bg-terracotta-50', icon: 'text-terracotta-700', bar: 'bg-terracotta-500' },
      success:     { ring: 'ring-brand-200',      bg: 'bg-brand-50',      icon: 'text-brand-700',      bar: 'bg-brand-600' },
      opportunity: { ring: 'ring-terracotta-200', bg: 'bg-terracotta-50/60', icon: 'text-terracotta-700', bar: 'bg-terracotta-500' },
      info:        { ring: 'ring-neutral-200',    bg: 'bg-neutral-50',    icon: 'text-neutral-700',    bar: 'bg-neutral-700' },
    };

    // Taux de conversion
    if (convRate < 30) {
      items.push({
        tone: 'danger', Icon: AlertTriangle,
        title: 'Taux de conversion faible',
        summary: `${convRate}% de conversion — en dessous de l'objectif`,
        detail: `Votre taux de conversion de ${convRate}% est inférieur à l'objectif de 30%. Recommandations : relancez les leads à chaud dans les 2h suivant leur création, personnalisez vos devis avec des photos avant/après, et proposez une offre d'essai sans engagement.`,
        priority: 'haute',
        action: 'Voir les leads sans devis',
        link: '/leads?status=nouveau',
      });
    } else if (convRate >= 50) {
      items.push({
        tone: 'success', Icon: TrendingUp,
        title: 'Excellent taux de conversion',
        summary: `${convRate}% — bien au-dessus de la moyenne du secteur`,
        detail: `Félicitations ! Votre taux de ${convRate}% est excellent. Pensez à documenter vos meilleures pratiques et à les partager avec votre équipe.`,
        priority: 'info',
        action: 'Voir les devis gagnés',
        link: '/quotes?status=accepté',
      });
    }

    // Qualité leads
    if (avgScore < 40) {
      items.push({
        tone: 'danger', Icon: Target,
        title: 'Qualité des leads à améliorer',
        summary: `Score moyen de ${avgScore}/100 — leads peu qualifiés`,
        detail: `La majorité de vos leads ont un faible score. Concentrez votre budget pub sur Google Ads (leads +15pts vs Meta), demandez l'adresse et la surface dès le formulaire, et ajoutez des photos obligatoires.`,
        priority: 'haute',
        action: 'Analyser les sources',
        link: '/analytics',
      });
    }

    // Source principale
    if (bestSource) {
      const sourceTotal = Object.values(sourceData).reduce((a, b) => a + b, 0);
      const bestCount = sourceData[bestSource] || 0;
      const bestPct = sourceTotal > 0 ? Math.round((bestCount / sourceTotal) * 100) : 0;

      if (bestPct > 60) {
        items.push({
          tone: 'warning', Icon: AlertTriangle,
          title: 'Dépendance à une seule source',
          summary: `${bestPct}% de vos leads viennent de ${bestSource}`,
          detail: `Votre acquisition est trop concentrée sur ${bestSource} (${bestPct}%). Diversifiez vers : SEO local (fiche Google My Business), bouche-à-oreille (parrainage +20€), partenariats avec agences immobilières.`,
          priority: 'moyenne',
          action: 'Voir les analytics',
          link: '/analytics',
        });
      } else {
        items.push({
          tone: 'success', Icon: TrendingUp,
          title: `${bestSource} — meilleure source`,
          summary: `${bestPct}% de vos leads, continuez à l'optimiser`,
          detail: `${bestSource} génère ${bestCount} leads (${bestPct}% du total). Analysez quelles annonces convertissent le mieux et doublez votre budget sur les créatifs gagnants.`,
          priority: 'info',
          action: 'Voir les leads',
          link: `/leads?source=${bestSource}`,
        });
      }
    }

    // Tâches en retard
    if (pendingTasks > 5) {
      items.push({
        tone: 'danger', Icon: AlertTriangle,
        title: `${pendingTasks} tâches en retard`,
        summary: 'Des actions urgentes attendent votre attention',
        detail: `Les tâches non traitées sous 48h réduisent vos chances de conversion de 60%. Priorisez les relances clients et les envois de devis en premier.`,
        priority: 'haute',
        action: 'Voir les tâches',
        link: '/tasks',
      });
    }

    // Service le plus demandé
    const topService = Object.entries(serviceData).sort((a, b) => b[1] - a[1])[0];
    if (topService) {
      items.push({
        tone: 'opportunity', Icon: Zap,
        title: `Opportunité — ${topService[0]}`,
        summary: `Service le plus demandé avec ${topService[1]} leads`,
        detail: `Le service "${topService[0]}" est votre plus forte demande. Créez des forfaits dédiés, demandez des avis clients spécifiques, et utilisez des photos avant/après pour augmenter votre taux de closing.`,
        priority: 'opportunité',
        action: 'Voir les leads',
        link: `/leads?service=${topService[0]}`,
      });
    }

    // Objectif mensuel
    if (newLeads > 0) {
      const projectedMonthly = newLeads * 4;
      const target = 50;
      const progress = Math.min(100, Math.round((newLeads / (target / 4)) * 100));
      items.push({
        tone: 'info', Icon: Target,
        title: 'Progression objectif mensuel',
        summary: `${newLeads} nouveaux leads · Projection : ~${projectedMonthly}/mois`,
        detail: `Avec ${newLeads} leads cette semaine, vous êtes en bonne voie. Pour accélérer : activez les notifications push pour répondre en < 5 minutes, et envoyez vos devis dans l'heure qui suit le contact.`,
        priority: 'info',
        progress,
        action: 'Voir le pipeline',
        link: '/kanban',
      });
    }

    return items.slice(0, 4).map((it) => ({ ...it, ...tones[it.tone] }));
  };

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setInsights(generateInsights());
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  // Badge priorité — palette atelier, pas d'emoji
  const priorityBadge = (priority) => {
    const map = {
      haute:        { cls: 'bg-terracotta-100 text-terracotta-800 ring-terracotta-200', label: 'Urgent' },
      moyenne:      { cls: 'bg-amber-100 text-amber-800 ring-amber-200',                label: 'Moyen' },
      opportunité:  { cls: 'bg-terracotta-50 text-terracotta-700 ring-terracotta-200',  label: 'Opportunité' },
      info:         { cls: 'bg-neutral-100 text-neutral-700 ring-neutral-200',          label: 'Info' },
    };
    return map[priority] || map.info;
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-50 ring-1 ring-inset ring-brand-200 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-brand-700" />
          </div>
          <div>
            <h3 className="font-display text-base text-neutral-900 leading-tight">Analyse IA</h3>
            <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-neutral-500 mt-0.5">
              Recommandations personnalisées
            </p>
          </div>
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const badge = priorityBadge(insight.priority);
            const isOpen = expanded === i;
            const Icon = insight.Icon;

            return (
              <div
                key={i}
                onClick={() => setExpanded(isOpen ? null : i)}
                className={`rounded-xl p-4 cursor-pointer transition-all ring-1 ring-inset hover:shadow-sm ${insight.bg} ${insight.ring}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-white/60 ring-1 ring-inset ring-white">
                    <Icon className={`w-4 h-4 ${insight.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-neutral-900">{insight.title}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.08em] ring-1 ring-inset ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600">{insight.summary}</p>

                    {insight.progress !== undefined && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-white/70 rounded-full overflow-hidden ring-1 ring-inset ring-white">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${insight.bar}`}
                            style={{ width: `${insight.progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-1 font-mono tabular-nums">
                          {insight.progress}% de l'objectif
                        </p>
                      </div>
                    )}

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-neutral-200/60">
                        <p className="text-xs text-neutral-700 leading-relaxed mb-3 font-display">
                          {insight.detail}
                        </p>
                        <a
                          href={insight.link}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all bg-white ring-1 ring-inset ${insight.ring} ${insight.icon} hover:shadow-sm`}
                        >
                          {insight.action} <ChevronRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>
            );
          })}

          {insights.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-600">Pas assez de données pour l'analyse</p>
              <p className="text-xs text-neutral-400 mt-1">Ajoutez des leads pour obtenir des insights</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsights;
