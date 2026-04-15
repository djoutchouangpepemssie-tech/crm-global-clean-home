import axios from 'axios';

// ══════════════════════════════════════════════════════════════
// BACKEND URL — Hardcodé HTTPS en production, localhost en dev.
// Le navigateur refuse les requêtes http:// depuis une page https://
// (Mixed Content). Toute requête non-HTTPS est upgradée ici.
// ══════════════════════════════════════════════════════════════
const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BACKEND_URL = isLocal
  ? 'http://localhost:8000'
  : 'https://crm-global-clean-home-production.up.railway.app';

// Double sécurité : si on n'est pas en local, forcer HTTPS de toute manière
const SAFE_BACKEND_URL = isLocal
  ? BACKEND_URL
  : BACKEND_URL.replace(/^http:\/\//i, 'https://');

console.log('[Config] BACKEND_URL:', SAFE_BACKEND_URL);

// ══════════════════════════════════════════════════════════════
// INTERCEPTEURS AXIOS — Force HTTPS + auth bearer
// ══════════════════════════════════════════════════════════════
axios.interceptors.request.use((config) => {
  // Force HTTPS sur url
  if (config.url && typeof config.url === 'string' && !isLocal) {
    config.url = config.url.replace(/^http:\/\//i, 'https://');
  }
  // Force HTTPS sur baseURL
  if (config.baseURL && typeof config.baseURL === 'string' && !isLocal) {
    config.baseURL = config.baseURL.replace(/^http:\/\//i, 'https://');
  }
  return config;
});

// ══════════════════════════════════════════════════════════════
// FETCH NATIF — monkey-patch pour forcer HTTPS aussi
// Couvre les appels qui n'utilisent pas axios (firebase, keepAlive...)
// ══════════════════════════════════════════════════════════════
if (typeof window !== 'undefined' && !isLocal && !window.__fetchPatched) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      if (typeof input === 'string') {
        input = input.replace(/^http:\/\/crm-global-clean-home-production\.up\.railway\.app/i,
                              'https://crm-global-clean-home-production.up.railway.app');
      } else if (input && typeof input === 'object' && input.url) {
        const safeUrl = input.url.replace(/^http:\/\/crm-global-clean-home-production\.up\.railway\.app/i,
                                          'https://crm-global-clean-home-production.up.railway.app');
        if (safeUrl !== input.url) {
          input = new Request(safeUrl, input);
        }
      }
    } catch {}
    return originalFetch(input, init);
  };
  window.__fetchPatched = true;
}

// Request interceptor: Add token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const API_BASE_URL = SAFE_BACKEND_URL;

axios.defaults.timeout = 15000; // 15s timeout

// Response interceptor: gestion erreurs réseau, 401, 503
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        status: 0,
        statusText: 'Network Error',
        data: { detail: 'Erreur réseau. Vérifiez votre connexion.' }
      });
    }
    return Promise.reject(error);
  }
);

export default SAFE_BACKEND_URL;
