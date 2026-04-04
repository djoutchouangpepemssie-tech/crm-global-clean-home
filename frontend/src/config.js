import axios from 'axios';

// Backend URL configuration
// Production: Use Railway domain (CORS now allows it)
// Local: Use localhost:8000
const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000'
  : 'https://crm-global-clean-home-production.up.railway.app';

// Add token to all requests automatically
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default BACKEND_URL;
