/**
 * Helpers de formatage de dates pour le CRM.
 *
 * Utilise date-fns (déjà installé) pour les dates relatives.
 * Centralisé ici pour que toutes les pages affichent "il y a 3 heures"
 * de manière identique.
 */
import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

/** Parse sécurisé — accepte string ISO, Date, number */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'number') return new Date(value);
  try {
    const d = parseISO(String(value));
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/** "il y a 3 heures" / "dans 2 jours" */
export function relativeTime(value, options = {}) {
  const d = toDate(value);
  if (!d) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: fr, ...options });
}

/** "12 avr. 2026" */
export function shortDate(value) {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, 'd MMM yyyy', { locale: fr });
}

/** "12 avr. 2026 · 14:32" */
export function shortDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, 'd MMM yyyy · HH:mm', { locale: fr });
}

/** "14:32" */
export function timeOnly(value) {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, 'HH:mm', { locale: fr });
}

/** "mardi 12 avril 2026" — pour les dates d'intervention */
export function longDate(value) {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, 'EEEE d MMMM yyyy', { locale: fr });
}

/** Nombre de jours depuis une date (utile pour scoring, alertes...) */
export function daysSince(value) {
  const d = toDate(value);
  if (!d) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
