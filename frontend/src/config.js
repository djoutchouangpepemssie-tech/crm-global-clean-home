const BACKEND_URL = 'https://crm-global-clean-home-production.up.railway.app';
export default BACKEND_URL;

import axios from 'axios';

// Add token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
