import axios from 'axios';

const BACKEND_URL = 'https://crm-global-clean-home-production.up.railway.app';

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
