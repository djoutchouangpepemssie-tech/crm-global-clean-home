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
  // 30s : marge de sécurité pour les endpoints qui agrègent beaucoup de
  // données (journeys avec géoloc batch, dashboard stats sur 90j, etc.).
  // Au-delà, c'est qu'il y a un vrai problème backend, pas un retard normal.
  timeout: 30000,
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

// Normalise `data.detail` en STRING. FastAPI/Pydantic renvoie un ARRAY pour les
// erreurs de validation (422) — ex: [{type, loc, msg, input, ctx, url}, …].
// Si on passe ce tableau à un JSX {error.message}, React crash (« Objects are
// not valid as a React child »). On le sérialise proprement.
function normalizeDetailToString(detail) {
  if (detail == null) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object') {
        const loc = Array.isArray(e.loc) ? e.loc.slice(1).join('.') : '';
        return loc ? `${loc} : ${e.msg || 'erreur'}` : (e.msg || JSON.stringify(e));
      }
      return String(e);
    }).join(' · ');
  }
  if (typeof detail === 'object') {
    if (detail.msg) return detail.msg;
    if (detail.message) return detail.message;
    return JSON.stringify(detail);
  }
  return String(detail);
}

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
    const message = normalizeDetailToString(data.detail)
      || normalizeDetailToString(data.message)
      || error.message
      || 'Erreur inconnue';
    return Promise.reject({
      status: error.response.status,
      message,        // ← TOUJOURS une string, safe pour JSX
      detail: data,   // ← l'objet brut si besoin
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
