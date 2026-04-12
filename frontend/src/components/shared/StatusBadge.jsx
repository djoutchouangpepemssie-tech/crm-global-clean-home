/**
 * StatusBadge — badges de statut unifiés par domaine métier.
 *
 * Aujourd'hui chaque page définit ses propres couleurs de statut.
 * Résultat : le statut "nouveau" est vert dans LeadsList et bleu dans
 * le Dashboard. Ce composant centralise tout.
 *
 * Usage :
 *   <StatusBadge domain="lead" status="nouveau" />
 *   <StatusBadge domain="quote" status="envoyé" />
 *   <StatusBadge domain="invoice" status="payée" />
 *   <StatusBadge domain="task" status="pending" />
 *   <StatusBadge domain="intervention" status="en_cours" />
 */
import React from 'react';

// ── Définition centrale des statuts ──────────────────────────

const STATUS_MAP = {
  lead: {
    nouveau: {
      label: 'Nouveau',
      classes: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    },
    contacté: {
      label: 'Contacté',
      classes: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
    },
    qualifié: {
      label: 'Qualifié',
      classes: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800',
    },
    devis_envoyé: {
      label: 'Devis envoyé',
      classes: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800',
    },
    devis_accepté: {
      label: 'Devis accepté',
      classes: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-800',
    },
    gagné: {
      label: 'Gagné',
      classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    },
    perdu: {
      label: 'Perdu',
      classes: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    },
    archivé: {
      label: 'Archivé',
      classes: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700',
    },
  },
  quote: {
    brouillon: {
      label: 'Brouillon',
      classes: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700',
    },
    envoyé: {
      label: 'Envoyé',
      classes: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    },
    accepté: {
      label: 'Accepté',
      classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    },
    refusé: {
      label: 'Refusé',
      classes: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    },
    expiré: {
      label: 'Expiré',
      classes: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
    },
  },
  invoice: {
    en_attente: {
      label: 'En attente',
      classes: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
    },
    payée: {
      label: 'Payée',
      classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    },
    en_retard: {
      label: 'En retard',
      classes: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    },
    annulée: {
      label: 'Annulée',
      classes: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700',
    },
  },
  task: {
    pending: {
      label: 'À faire',
      classes: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
    },
    in_progress: {
      label: 'En cours',
      classes: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    },
    completed: {
      label: 'Terminée',
      classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    },
    cancelled: {
      label: 'Annulée',
      classes: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700',
    },
  },
  intervention: {
    planifiée: {
      label: 'Planifiée',
      classes: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    },
    en_cours: {
      label: 'En cours',
      classes: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800',
    },
    terminée: {
      label: 'Terminée',
      classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    },
    annulée: {
      label: 'Annulée',
      classes: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    },
  },
  booking: {
    confirmed: {
      label: 'Confirmé',
      classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    },
    pending: {
      label: 'En attente',
      classes: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
    },
    cancelled: {
      label: 'Annulé',
      classes: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    },
    completed: {
      label: 'Terminé',
      classes: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    },
  },
  contract: {
    active: {
      label: 'Actif',
      classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    },
    paused: {
      label: 'En pause',
      classes: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
    },
    cancelled: {
      label: 'Annulé',
      classes: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    },
    expired: {
      label: 'Expiré',
      classes: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700',
    },
  },
  priority: {
    low: {
      label: 'Basse',
      classes: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700',
    },
    medium: {
      label: 'Moyenne',
      classes: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    },
    high: {
      label: 'Haute',
      classes: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
    },
    urgent: {
      label: 'Urgent',
      classes: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    },
  },
};

const FALLBACK = {
  label: null,
  classes: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-700',
};

export function StatusBadge({ domain = 'lead', status, label: customLabel, size = 'sm', className = '' }) {
  const domainMap = STATUS_MAP[domain] || {};
  const config = domainMap[status] || { ...FALLBACK, label: customLabel || status || '—' };
  const label = customLabel || config.label || status;

  const sizeClasses = {
    xs: 'text-[11px] px-1.5 py-0.5 h-5',
    sm: 'text-xs px-2 py-0.5 h-6',
    md: 'text-sm px-2.5 py-1 h-7',
  }[size] || 'text-xs px-2 py-0.5 h-6';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-medium whitespace-nowrap
        ${config.classes} ${sizeClasses} ${className}
      `}
    >
      {label}
    </span>
  );
}

/** Récupérer juste la config (label + classes) sans rendre le composant */
export function getStatusConfig(domain, status) {
  const domainMap = STATUS_MAP[domain] || {};
  return domainMap[status] || FALLBACK;
}

export default StatusBadge;
