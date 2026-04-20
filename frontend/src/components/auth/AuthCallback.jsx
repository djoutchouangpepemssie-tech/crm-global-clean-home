import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import BACKEND_URL from '../../config.js';

const API_URL = BACKEND_URL + '/api';

// Attendre que le backend soit up (retry ping avec backoff)
const waitForBackend = async (maxAttempts = 8) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BACKEND_URL}/ping`, { method: 'GET', signal: AbortSignal.timeout(5000) });
      if (res.ok) return true;
    } catch {}
    // Backoff: 500ms, 1s, 1.5s, 2s...
    await new Promise(r => setTimeout(r, 500 + i * 500));
  }
  return false;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const hasProcessed = useRef(false);
  const [status, setStatus] = useState('Connexion en cours...');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        const hash = location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');

        if (!accessToken) {
          console.error('No access_token found in hash');
          navigate('/login');
          return;
        }

        // Étape 1 : Attendre que le backend soit prêt
        setStatus('Réveil du serveur...');
        const isUp = await waitForBackend();
        if (!isUp) {
          setStatus('Serveur indisponible. Nouvelle tentative...');
          // Dernier essai forcé
          await new Promise(r => setTimeout(r, 2000));
        }

        // Étape 2 : Appel auth avec retry
        setStatus('Authentification...');
        let response;
        let lastError;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            response = await axios.post(
              `${API_URL}/auth/session`,
              { session_id: accessToken },
              { withCredentials: true, timeout: 15000 }
            );
            break;
          } catch (err) {
            lastError = err;
            setRetryCount(attempt + 1);
            if (attempt < 2) {
              setStatus(`Tentative ${attempt + 2}/3...`);
              await new Promise(r => setTimeout(r, 1500));
            }
          }
        }

        if (!response) {
          throw lastError || new Error('Impossible de se connecter au serveur');
        }

        if (response.data?.session_token) {
          localStorage.setItem('session_token', response.data.session_token);
        }

        login(response.data);
        // Respecte la page d'accueil choisie dans Paramètres · Apparence
        let startPage = '/dashboard';
        try {
          const saved = localStorage.getItem('crm_start_page');
          if (saved && saved.startsWith('/')) startPage = saved;
        } catch {}
        navigate(startPage, { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        if (error?.response?.status === 403) {
          navigate('/login?error=not_authorized', { replace: true });
        } else {
          setStatus('Erreur de connexion');
          // Redirect après 3s
          setTimeout(() => navigate('/login?error=network', { replace: true }), 3000);
        }
      }
    };

    processAuth();
  }, [location, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #047857, #14532d)', boxShadow: '0 0 30px rgba(4,120,87,0.3)' }}>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-700">{status}</p>
          {retryCount > 0 && (
            <p className="text-xs text-neutral-500 mt-1">Tentative {retryCount + 1}/3</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
