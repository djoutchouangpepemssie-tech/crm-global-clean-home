// Shared status configurations used across components
export const LEAD_STATUS = {
  nouveau: { label: 'Nouveau', color: '#60a5fa', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  contacté: { label: 'Contacté', color: '#a78bfa', bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/20' },
  qualifié: { label: 'Qualifié', color: '#22d3ee', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'devis envoyé': { label: 'Devis envoyé', color: '#fbbf24', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  'devis_envoyé': { label: 'Devis envoyé', color: '#fbbf24', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  négociation: { label: 'Négociation', color: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
  gagné: { label: 'Gagné', color: '#34d399', bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/20' },
  perdu: { label: 'Perdu', color: '#f87171', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' },
  archivé: { label: 'Archivé', color: '#64748b', bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/20' },
};

export const QUOTE_STATUS = {
  brouillon: { label: 'Brouillon', color: '#64748b', bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/20' },
  envoyé: { label: 'Envoyé', color: '#60a5fa', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  accepté: { label: 'Accepté', color: '#34d399', bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/20' },
  refusé: { label: 'Refusé', color: '#f87171', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' },
  expiré: { label: 'Expiré', color: '#fbbf24', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
};

export const PRIORITY_CONFIG = {
  haute: { label: 'Haute', color: '#f87171', bg: 'bg-red-500/15', text: 'text-red-400' },
  moyenne: { label: 'Moyenne', color: '#fbbf24', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  basse: { label: 'Basse', color: '#34d399', bg: 'bg-green-500/15', text: 'text-green-400' },
};

export function getStatusConfig(status, type = 'lead') {
  const config = type === 'quote' ? QUOTE_STATUS : LEAD_STATUS;
  return config[status?.toLowerCase()] || { label: status || 'Inconnu', color: '#64748b', bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/20' };
}
