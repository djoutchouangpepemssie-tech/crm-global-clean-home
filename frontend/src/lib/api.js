/**
 * Client API centralisé du CRM.
 *
 * Toutes les requêtes vers le backend passent par ici. Ça nous donne :
 *   - Un seul endroit pour changer l'URL, le timeout, les headers
 *   - Une instance axios dédiée qui n'affecte pas le global
 *   - Des helpers typés en sortie (api.get, api.post...)
 *   - Une normalisation des erreurs pour React Query
 *
 * Note : config.js applique déjà des interceptors sur l'axios global
 * (forçage HTTPS + auth Bearer). Notre instance en hérite indirectement via
 * la même logique, mais on garde un objet axios séparé pour isoler le CRM.
 */
import axios from 'axios';
import BACKEND_URL from '../config';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`.replace('http://', 'https://'),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token à chaque requête (cookie HttpOnly + Bearer fallback)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalisation des erreurs pour que React Query ait toujours un objet cohérent
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        status: 0,
        message: 'Erreur réseau. Vérifiez votre connexion.',
        detail: null,
      });
    }
    const data = error.response.data || {};
    return Promise.reject({
      status: error.response.status,
      message: data.detail || data.message || error.message || 'Erreur inconnue',
      detail: data,
    });
  }
);

/**
 * Query keys centralisés — la colonne vertébrale de l'invalidation croisée.
 *
 * Quand on modifie un lead, on invalide [leads.all] ET [dashboard.stats]
 * pour que le dashboard se mette à jour automatiquement sans reload.
 */
export const queryKeys = {
  // Leads
  leads: {
    all: ['leads'],
    list: (filters = {}) => ['leads', 'list', filters],
    detail: (id) => ['leads', 'detail', id],
    recent: () => ['leads', 'recent'],
  },
  // Devis
  quotes: {
    all: ['quotes'],
    list: (filters = {}) => ['quotes', 'list', filters],
    detail: (id) => ['quotes', 'detail', id],
    byLead: (leadId) => ['quotes', 'byLead', leadId],
  },
  // Factures
  invoices: {
    all: ['invoices'],
    list: (filters = {}) => ['invoices', 'list', filters],
    detail: (id) => ['invoices', 'detail', id],
    byLead: (leadId) => ['invoices', 'byLead', leadId],
  },
  // Tâches
  tasks: {
    all: ['tasks'],
    list: (filters = {}) => ['tasks', 'list', filters],
    byLead: (leadId) => ['tasks', 'byLead', leadId],
    urgent: () => ['tasks', 'urgent'],
  },
  // Interactions (historique)
  interactions: {
    all: ['interactions'],
    byLead: (leadId) => ['interactions', 'byLead', leadId],
  },
  // Dashboard
  dashboard: {
    stats: (period = '30d') => ['dashboard', 'stats', period],
    financial: (period = '30d') => ['dashboard', 'financial', period],
  },
  // Planning
  planning: {
    calendar: (month) => ['planning', 'calendar', month],
    interventions: (filters = {}) => ['planning', 'interventions', filters],
    teams: () => ['planning', 'teams'],
  },
  // Utilisateur courant
  auth: {
    me: () => ['auth', 'me'],
  },
  // Paramètres
  settings: {
    all: () => ['settings'],
    team: () => ['settings', 'team'],
    apiKeys: () => ['settings', 'apiKeys'],
  },
};

// Force HTTPS sur toutes les requêtes de cette instance
api.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('http://')) {
    config.url = config.url.replace('http://', 'https://');
  }
  if (config.baseURL && config.baseURL.startsWith('http://')) {
    config.baseURL = config.baseURL.replace('http://', 'https://');
  }
  return config;
});

export default api;
