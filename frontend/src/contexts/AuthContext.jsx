import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

import BACKEND_URL from '../config.js';
const API_URL = BACKEND_URL + '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('session_token');
      if (!token) { setUser(null); setLoading(false); return; }
      const headers = { Authorization: `Bearer ${token}` };
      // Retry avec backoff pour gérer le cold start Railway
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            withCredentials: true,
            headers,
            timeout: 10000,
          });
          setUser(response.data);
          return;
        } catch (error) {
          lastErr = error;
          // Si 401/403, pas la peine de retry
          if (error?.response?.status === 401 || error?.response?.status === 403) break;
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
      console.warn('Auth check failed after retries:', lastErr?.message);
      setUser(null);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    // Skip /me check si on arrive du callback OAuth (access_token ou session_id dans le hash)
    if (window.location.hash?.includes('access_token=') || window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true, headers });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('session_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
