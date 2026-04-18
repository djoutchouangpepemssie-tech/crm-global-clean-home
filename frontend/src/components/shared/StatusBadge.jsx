/**
 * StatusBadge — badges de statut unifiés par domaine métier.
 * SKIN ATELIER v2.0 — émeraude / terracotta / amber / neutral (crème)
 *
 * Usage :
 *   <StatusBadge domain="lead" status="nouveau" />
 *   <StatusBadge domain="quote" status="envoyé" />
 *   <StatusBadge domain="invoice" status="payée" />
 */
import React from 'react';

const P = {
  brand:      'bg-brand-50 text-brand-700 ring-brand-200',
  brandSoft:  'bg-brand-50 text-brand-600 ring-brand-200',
  amber:      'bg-amber-50 text-amber-700 ring-amber-200',
  terracotta: 'bg-terracotta-50 text-terracotta-700 ring-terracotta-200',
  neutral:    'bg-neutral-100 text-neutral-600 ring-neutral-200',
  neutralDim: 'bg-neutral-50 text-neutral-500 ring-neutral-200',
  ink:        'bg-neutral-200 text-neutral-800 ring-neutral-300',
};

const STATUS_MAP = {
  lead: {
    nouveau:        { label: 'Nouveau',        classes: P.ink },
    contacté:       { label: 'Contacté',       classes: P.amber },
    qualifié:       { label: 'Qualifié',       classes: P.ink },
    devis_envoyé:   { label: 'Devis envoyé',   classes: P.amber },
    devis_accepté:  { label: 'Devis accepté',  classes: P.brandSoft },
    gagné:          { label: 'Gagné',          classes: P.brand },
    perdu:          { label: 'Perdu',          classes: P.terracotta },
    archivé:        { label: 'Archivé',        classes: P.neutralDim },
  },
  quote: {
    brouillon: { label: 'Brouillon', classes: P.neutralDim },
    envoyé:    { label: 'Envoyé',    classes: P.amber },
    accepté:   { label: 'Accepté',   classes: P.brand },
    refusé:    { label: 'Refusé',    classes: P.terracotta },
    expiré:    { label: 'Expiré',    classes: P.terracotta },
  },
  invoice: {
    en_attente: { label: 'En attente', classes: P.amber },
    payée:      { label: 'Payée',      classes: P.brand },
    en_retard:  { label: 'En retard',  classes: P.terracotta },
    annulée:    { label: 'Annulée',    classes: P.neutralDim },
  },
  task: {
    pending:     { label: 'À faire',   classes: P.amber },
    in_progress: { label: 'En cours',  classes: P.ink },
    completed:   { label: 'Terminée',  classes: P.brand },
    cancelled:   { label: 'Annulée',   classes: P.neutralDim },
  },
  intervention: {
    planifiée: { label: 'Planifiée', classes: P.ink },
    en_cours:  { label: 'En cours',  classes: P.amber },
    terminée:  { label: 'Terminée',  classes: P.brand },
    annulée:   { label: 'Annulée',   classes: P.terracotta },
  },
  booking: {
    confirmed: { label: 'Confirmé',   classes: P.brand },
    pending:   { label: 'En attente', classes: P.amber },
    cancelled: { label: 'Annulé',     classes: P.terracotta },
    completed: { label: 'Terminé',    classes: P.ink },
  },
  contract: {
    active:    { label: 'Actif',    classes: P.brand },
    paused:    { label: 'En pause', classes: P.amber },
    cancelled: { label: 'Annulé',   classes: P.terracotta },
    expired:   { label: 'Expiré',   classes: P.neutralDim },
  },
  priority: {
    low:    { label: 'Basse',   classes: P.neutralDim },
    medium: { label: 'Moyenne', classes: P.ink },
    high:   { label: 'Haute',   classes: P.amber },
    urgent: { label: 'Urgent',  classes: P.terracotta },
  },
};

const FALLBACK = { label: null, classes: P.neutralDim };

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

export function getStatusConfig(domain, status) {
  const domainMap = STATUS_MAP[domain] || {};
  return domainMap[status] || FALLBACK;
}

export default StatusBadge;
