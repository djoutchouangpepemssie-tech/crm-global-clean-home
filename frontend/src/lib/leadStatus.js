/**
 * State machine des statuts de lead.
 *
 * Source de vérité partagée avec le backend (server.py LEAD_STATE_TRANSITIONS).
 * Empêche le frontend d'envoyer des transitions invalides
 * (ex: gagné → nouveau) et donne au composant UI la liste des statuts
 * cibles autorisés pour afficher un menu contextuel.
 */

export const LEAD_STATUSES = [
  'nouveau',
  'contacté',
  'qualifié',
  'devis_envoyé',
  'devis_accepté',
  'gagné',
  'perdu',
  'archivé',
];

/** Labels lisibles (à afficher à l'utilisateur) */
export const LEAD_STATUS_LABELS = {
  nouveau: 'Nouveau',
  contacté: 'Contacté',
  qualifié: 'Qualifié',
  devis_envoyé: 'Devis envoyé',
  devis_accepté: 'Devis accepté',
  gagné: 'Gagné',
  perdu: 'Perdu',
  archivé: 'Archivé',
};

/**
 * Transitions autorisées.
 * Miroir du LEAD_STATE_TRANSITIONS de server.py.
 * L'état courant peut toujours "rester lui-même" implicitement.
 */
export const LEAD_STATE_TRANSITIONS = {
  nouveau: ['contacté', 'qualifié', 'perdu', 'archivé'],
  contacté: ['qualifié', 'devis_envoyé', 'perdu', 'archivé'],
  qualifié: ['devis_envoyé', 'perdu', 'archivé'],
  devis_envoyé: ['devis_accepté', 'gagné', 'perdu', 'archivé'],
  devis_accepté: ['gagné', 'perdu', 'archivé'],
  gagné: ['archivé'],
  perdu: ['archivé'],
  archivé: [],
};

/** Vérifie qu'une transition est autorisée. */
export function canTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  const allowed = LEAD_STATE_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/** Retourne la liste des statuts cibles autorisés pour un statut donné. */
export function getAllowedNextStatuses(currentStatus) {
  return LEAD_STATE_TRANSITIONS[currentStatus] || [];
}

/** Filtres rapides — groupes de statuts pour la vue liste */
export const LEAD_STATUS_GROUPS = [
  { id: 'ALL', label: 'Tous', statuses: LEAD_STATUSES },
  { id: 'active', label: 'Actifs', statuses: ['nouveau', 'contacté', 'qualifié', 'devis_envoyé', 'devis_accepté'] },
  { id: 'won', label: 'Gagnés', statuses: ['gagné'] },
  { id: 'lost', label: 'Perdus', statuses: ['perdu'] },
];
