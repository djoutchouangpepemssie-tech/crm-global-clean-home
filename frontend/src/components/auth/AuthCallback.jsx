import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import BACKEND_URL from '../../config.js';

const API_URL = BACKEND_URL + '/api';

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

        console.log('Access token found:', !!accessToken);

        if (!accessToken) {
          console.error('No access_token found in hash:', hash);
          navigate('/login');
          return;
        }

        console.log('Calling /api/auth/session...');
        const response = await axios.post(
          `${API_URL}/auth/session`,
          { session_id: accessToken },
          { withCredentials: true }
        );

        console.log('Session response:', response.data);
        console.log('Session token:', response.data?.session_token);

        if (response.data?.session_token) {
          localStorage.setItem('session_token', response.data.session_token);
          console.log('Token saved to localStorage');
        } else {
          console.error('No session_token in response!');
        }

        login(response.data);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        console.error('Error response:', error?.response?.data);
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
