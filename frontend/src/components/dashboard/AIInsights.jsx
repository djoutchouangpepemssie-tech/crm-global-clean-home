import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Target, Zap, ChevronRight, RefreshCw } from 'lucide-react';
import BACKEND_URL from '../../config.js';

const API_URL = BACKEND_URL + '/api';

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
    const wonLeads = stats.won_leads || 0;
    const totalLeads = stats.total_leads || 0;
    const bestSource = stats.best_source?.name || null;
    const sourceData = stats.leads_by_source || {};
    const serviceData = stats.leads_by_service || {};

    // Analyse taux de conversion
    if (convRate < 30) {
      items.push({
        type: 'warning',
        icon: AlertTriangle,
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.2)',
        title: 'Taux de conversion faible',
        summary: `${convRate}% de conversion — en dessous de la moyenne`,
        detail: `Votre taux de conversion de ${convRate}% est inférieur à l'objectif de 30%. Recommandations : relancez les leads à chaud dans les 2h suivant leur création, personnalisez vos devis avec des photos avant/après, et proposez une offre d'essai sans engagement.`,
        priority: 'haute',
        action: 'Voir les leads sans devis',
        link: '/leads?status=nouveau'
      });
    } else if (convRate >= 50) {
      items.push({
        type: 'success',
        icon: TrendingUp,
        color: '#34d399',
        bg: 'rgba(52,211,153,0.08)',
        border: 'rgba(52,211,153,0.2)',
        title: 'Excellent taux de conversion',
        summary: `${convRate}% — bien au-dessus de la moyenne du secteur`,
        detail: `Félicitations ! Votre taux de ${convRate}% est excellent. Pensez à documenter vos meilleures pratiques et à les partager avec votre équipe. Continuez à personnaliser vos devis.`,
        priority: 'info',
        action: 'Voir les devis gagnés',
        link: '/quotes?status=accepté'
      });
    }

    // Analyse score moyen des leads
    if (avgScore < 40) {
      items.push({
        type: 'warning',
        icon: Target,
        color: '#f43f5e',
        bg: 'rgba(244,63,94,0.08)',
        border: 'rgba(244,63,94,0.2)',
        title: 'Qualité des leads à améliorer',
        summary: `Score moyen de ${avgScore}/100 — leads peu qualifiés`,
        detail: `La majorité de vos leads ont un faible score de qualification. Pour attirer des leads plus qualifiés : concentrez votre budget pub sur Google Ads (leads +15pts vs Facebook), demandez l'adresse et la surface dès le formulaire, et ajoutez des photos obligatoires.`,
        priority: 'haute',
        action: 'Analyser les sources',
        link: '/analytics'
      });
    }

    // Analyse source principale
    if (bestSource) {
      const sourceTotal = Object.values(sourceData).reduce((a, b) => a + b, 0);
      const bestCount = sourceData[bestSource] || 0;
      const bestPct = sourceTotal > 0 ? Math.round((bestCount / sourceTotal) * 100) : 0;
      
      if (bestPct > 60) {
        items.push({
          type: 'warning',
          icon: AlertTriangle,
          color: '#f59e0b',
          bg: 'rgba(245,158,11,0.08)',
          border: 'rgba(245,158,11,0.2)',
          title: 'Dépendance à une seule source',
          summary: `${bestPct}% de vos leads viennent de ${bestSource}`,
          detail: `Votre acquisition est trop concentrée sur ${bestSource} (${bestPct}%). Si cette source venait à baisser, votre business serait impacté. Diversifiez vers : SEO local (fiche Google My Business), bouche-à-oreille (programme de parrainage +20€), et partenariats avec agences immobilières.`,
          priority: 'moyenne',
          action: 'Voir les analytics',
          link: '/analytics'
        });
      } else {
        items.push({
          type: 'success',
          icon: TrendingUp,
          color: '#60a5fa',
          bg: 'rgba(96,165,250,0.08)',
          border: 'rgba(96,165,250,0.2)',
          title: `${bestSource} — meilleure source`,
          summary: `${bestPct}% de vos leads, continuez à l'optimiser`,
          detail: `${bestSource} génère ${bestCount} leads (${bestPct}% du total). Investissez davantage sur cette source car elle performe bien. Analysez quelles annonces convertissent le mieux et doublez votre budget sur les créatifs gagnants.`,
          priority: 'info',
          action: 'Voir les leads',
          link: `/leads?source=${bestSource}`
        });
      }
    }

    // Analyse tâches en attente
    if (pendingTasks > 5) {
      items.push({
        type: 'warning',
        icon: AlertTriangle,
        color: '#f43f5e',
        bg: 'rgba(244,63,94,0.08)',
        border: 'rgba(244,63,94,0.2)',
        title: `${pendingTasks} tâches en retard`,
        summary: 'Des actions urgentes attendent votre attention',
        detail: `Vous avez ${pendingTasks} tâches en attente. Les tâches non traitées sous 48h réduisent vos chances de conversion de 60%. Priorisez les relances clients et les envois de devis en premier.`,
        priority: 'haute',
        action: 'Voir les tâches',
        link: '/tasks'
      });
    }

    // Analyse service le plus demandé
    const topService = Object.entries(serviceData).sort((a,b) => b[1]-a[1])[0];
    if (topService) {
      items.push({
        type: 'opportunity',
        icon: Zap,
        color: '#a78bfa',
        bg: 'rgba(139,92,246,0.08)',
        border: 'rgba(139,92,246,0.2)',
        title: `Opportunité — ${topService[0]}`,
        summary: `Service le plus demandé avec ${topService[1]} leads`,
        detail: `Le service "${topService[0]}" est votre plus forte demande. Optimisez votre offre sur ce service : créez des forfaits dédiés, demandez des avis clients spécifiques, et utilisez des photos avant/après pour augmenter votre taux de closing.`,
        priority: 'opportunité',
        action: 'Voir les leads',
        link: `/leads?service=${topService[0]}`
      });
    }

    // Objectif mensuel
    if (newLeads > 0) {
      const projectedMonthly = newLeads * 4;
      const target = 50;
      const progress = Math.min(100, Math.round((newLeads / (target / 4)) * 100));
      items.push({
        type: 'info',
        icon: Target,
        color: '#06b6d4',
        bg: 'rgba(6,182,212,0.08)',
        border: 'rgba(6,182,212,0.2)',
        title: 'Progression objectif mensuel',
        summary: `${newLeads} nouveaux leads · Projection : ~${projectedMonthly}/mois`,
        detail: `Avec ${newLeads} leads cette semaine, vous êtes en bonne voie pour atteindre votre objectif mensuel. Pour accélérer : activez les notifications push pour répondre en < 5 minutes, et envoyez vos devis dans l'heure qui suit le contact.`,
        priority: 'info',
        progress,
        action: 'Voir le pipeline',
        link: '/kanban'
      });
    }

    return items.slice(0, 4);
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setInsights(generateInsights());
      setLoading(false);
    }, 800);
  }, [stats]);

  const getPriorityBadge = (priority) => {
    const map = {
      'haute': { bg: 'rgba(244,63,94,0.15)', color: '#f43f5e', label: '🔴 Urgent' },
      'moyenne': { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '🟡 Moyen' },
      'opportunité': { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', label: '💜 Opportunité' },
      'info': { bg: 'rgba(6,182,212,0.15)', color: '#06b6d4', label: '🔵 Info' },
    };
    return map[priority] || map['info'];
  };

  return (
    <div className="section-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Analyse IA</h3>
            <p className="text-xs text-slate-500">Recommandations personnalisées</p>
          </div>
        </div>
        {loading && <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const badge = getPriorityBadge(insight.priority);
            const isOpen = expanded === i;
            return (
              <div key={i} className="rounded-xl p-4 cursor-pointer transition-all hover:opacity-90"
                style={{background: insight.bg, border: `1px solid ${insight.border}`}}
                onClick={() => setExpanded(isOpen ? null : i)}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{background: `${insight.color}20`}}>
                    <insight.icon className="w-4 h-4" style={{color: insight.color}} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-slate-200">{insight.title}</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{background: badge.bg, color: badge.color}}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{insight.summary}</p>
                    
                    {insight.progress !== undefined && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000"
                            style={{width: `${insight.progress}%`, background: insight.color}} />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{insight.progress}% de l'objectif</p>
                      </div>
                    )}

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-slate-300 leading-relaxed mb-3">{insight.detail}</p>
                        <a href={insight.link}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                          style={{background: `${insight.color}20`, color: insight.color}}>
                          {insight.action} <ChevronRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </div>
              </div>
            );
          })}

          {insights.length === 0 && (
            <div className="text-center py-6">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Pas assez de données pour l'analyse</p>
              <p className="text-xs text-slate-600 mt-1">Ajoutez des leads pour obtenir des insights</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsights;
