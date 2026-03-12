import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

export function getStatusColor(status) {
  const colors = {
    'nouveau': 'bg-blue-100 text-blue-800',
    'contacté': 'bg-yellow-100 text-yellow-800',
    'en_attente': 'bg-orange-100 text-orange-800',
    'devis_envoyé': 'bg-purple-100 text-purple-800',
    'gagné': 'bg-green-100 text-green-800',
    'perdu': 'bg-red-100 text-red-800',
    'brouillon': 'bg-gray-100 text-gray-800',
    'envoyé': 'bg-purple-100 text-purple-800',
    'accepté': 'bg-green-100 text-green-800',
    'refusé': 'bg-red-100 text-red-800',
    'expiré': 'bg-gray-100 text-gray-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status) {
  const labels = {
    'nouveau': 'Nouveau',
    'contacté': 'Contacté',
    'en_attente': 'En attente',
    'devis_envoyé': 'Devis envoyé',
    'gagné': 'Gagné',
    'perdu': 'Perdu',
    'brouillon': 'Brouillon',
    'envoyé': 'Envoyé',
    'accepté': 'Accepté',
    'refusé': 'Refusé',
    'expiré': 'Expiré',
    'pending': 'En attente',
    'completed': 'Complété',
    'cancelled': 'Annulé'
  };
  return labels[status] || status;
}
