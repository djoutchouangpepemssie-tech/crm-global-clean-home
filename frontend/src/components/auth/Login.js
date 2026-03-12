import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1725042893312-5ec0dea9e369?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHw0fHxtb2Rlcm4lMjBjbGVhbiUyMGJyaWdodCUyMGxpdmluZyUyMHJvb20lMjBpbnRlcmlvcnxlbnwwfHx8fDE3NzMzMzIwMzV8MA&ixlib=rb-4.1.0&q=85"
          alt="Modern clean interior"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/70 to-slate-900/80"></div>
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h2 className="text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Global Clean Home
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-md">
            Gérez vos leads, devis et interventions en toute simplicité.
          </p>
          <div className="flex gap-8 mt-8">
            <div>
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-white/60">Leads gérés</p>
            </div>
            <div>
              <p className="text-3xl font-bold">98%</p>
              <p className="text-sm text-white/60">Satisfaction</p>
            </div>
            <div>
              <p className="text-3xl font-bold">24h</p>
              <p className="text-sm text-white/60">Temps réponse</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Bienvenue
            </h1>
            <p className="text-slate-500 mt-2">
              Connectez-vous à votre espace CRM
            </p>
          </div>

          <button
            data-testid="google-login-button"
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50/50 transition-all duration-200 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-violet-700 transition-colors">
              Continuer avec Google
            </span>
          </button>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              Accès réservé aux membres de l'équipe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
