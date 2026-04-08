import axios from 'axios';

// Backend URL configuration
// Production: Use Railway domain with HTTPS (FORCE HTTPS)
// Local: Use localhost:8000 with HTTP
const BACKEND_URL = (() => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  // FORCE HTTPS for all production domains
  return 'https://crm-global-clean-home-production.up.railway.app';
})();

console.log('[Config] BACKEND_URL:', BACKEND_URL);

// Request interceptor: Add token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors gracefully (JSON parse errors, 401, 503, etc.)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors, timeouts, etc.
    if (!error.response) {
      console.error('[Axios] Network error:', error.message);
      return Promise.reject({
        status: 0,
        statusText: 'Network Error',
        data: { detail: error.message || 'Erreur réseau. Vérifiez votre connexion.' }
      });
    }

    // Handle JSON parse errors (server returned HTML instead of JSON)
    if (error.response.status === 401) {
      console.error('[Axios] Unauthorized (401) - token may be invalid');
      // Optionally redirect to login
    }
    if (error.response.status === 503) {
      console.error('[Axios] Service Unavailable (503) - server is restarting');
    }
    if (error.response.status >= 500) {
      console.error('[Axios] Server error:', error.response.status, error.response.statusText);
    }

    return Promise.reject(error);
  }
);

export default BACKEND_URL;
