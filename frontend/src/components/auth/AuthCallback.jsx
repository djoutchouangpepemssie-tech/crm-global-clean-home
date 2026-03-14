import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        const hash = location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');

        if (!accessToken) {
          console.error('No access_token found');
          navigate('/login');
          return;
        }

        const response = await axios.post(
          `${API_URL}/auth/session`,
          { session_id: accessToken },
          { withCredentials: true }
        );

        login(response.data);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        if (error?.response?.status === 403) {
          navigate('/login?error=not_authorized', { replace: true });
        } else {
          navigate('/login');
        }
      }
    };

    processAuth();
  }, [location, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-slate-600">Connexion en cours...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
