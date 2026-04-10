import axios from 'axios';

// Backend URL configuration
// Production: Use Railway domain with HTTPS (FORCE HTTPS)
// Local: Use localhost:8000 with HTTP
// Force HTTPS - build v2
const BACKEND_URL = (() => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  // FORCE HTTPS for all production domains - never HTTP
  const base = 'https://crm-global-clean-home-production.up.railway.app';
  return base.replace('http://', 'https://');
})();

console.log('[Config] BACKEND_URL:', BACKEND_URL);

// Force HTTPS interceptor
axios.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('http://')) {
    config.url = config.url.replace('http://', 'https://');
  }
  if (config.baseURL && config.baseURL.startsWith('http://')) {
    config.baseURL = config.baseURL.replace('http://', 'https://');
  }
  return config;
});

// Request interceptor: Add token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const API_BASE_URL = BACKEND_URL;

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

export default BACKEND_URL;
