import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Shield, Zap, BarChart3, Users, CheckCircle } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 
  '839544566336-be9thftofd383siebap23mmpi9pdq6oa.apps.googleusercontent.com';

const features = [
  { icon: Users, text: 'Gestion leads & prospects' },
  { icon: BarChart3, text: 'Analytics en temps réel' },
  { icon: Zap, text: 'Devis & factures automatiques' },
  { icon: Shield, text: 'Emails & relances auto' },
];

const Login = () => {
  const [searchParams] = useSearchParams();
  const authError = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = () => {
    setIsLoading(true);
    const clientId = GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
    const scope = encodeURIComponent('openid email profile');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
  };

  return (
    <div className="min-h-screen flex bg-dark-1" data-testid="login-page">
      
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-slate-900 to-slate-950" />
        
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg" style={{fontFamily: 'Manrope, sans-serif'}}>
              Global Clean Home
            </span>
          </div>
          
          {/* Main content */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-full text-violet-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              CRM Professionnel
            </div>
            
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight" style={{fontFamily: 'Manrope, sans-serif'}}>
              Gérez votre
              <span className="block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                activité
              </span>
              simplement
            </h1>
            
            <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-sm">
              Suivez vos leads, créez des devis et fidélisez vos clients depuis une seule interface.
            </p>
            
            {/* Features */}
            <div className="space-y-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex gap-8">
            {[
              { value: '500+', label: 'Leads gérés' },
              { value: '98%', label: 'Satisfaction' },
              { value: '24h', label: 'Réponse' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-2xl font-bold text-white" style={{fontFamily: 'Manrope, sans-serif'}}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-dark-1">
        <div className={`w-full max-w-sm transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-200" style={{fontFamily: 'Manrope, sans-serif'}}>
              Global Clean Home
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-100 mb-2" style={{fontFamily: 'Manrope, sans-serif'}}>
              Bienvenue 👋
            </h1>
            <p className="text-slate-400 text-sm">
              Connectez-vous à votre espace CRM
            </p>
          </div>

          {authError === 'not_authorized' && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-400 text-xs">!</span>
              </div>
              <p className="text-sm text-red-400">
                Accès refusé. Ce CRM est réservé à l'équipe Global Clean Home.
              </p>
            </div>
          )}

          {/* Login card */}
          <div className="gradient-border p-6 mb-6">
            <p className="text-xs text-slate-500 text-center mb-4">Connexion sécurisée via Google</p>
            
            <button
              data-testid="google-login-button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 rounded-xl transition-all duration-200 group disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span className="text-sm font-semibold text-slate-300 group-hover:text-slate-100 transition-colors">
                {isLoading ? 'Connexion...' : 'Continuer avec Google'}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-dark-1 text-slate-600">Ou</span>
            </div>
          </div>

          {/* Invitation link */}
          <div className="p-4 bg-violet-500/5 border border-violet-500/30 rounded-xl text-center">
            <p className="text-xs text-slate-500 mb-3">
              Vous avez reçu une invitation par email ?
            </p>
            <a
              href="/auth/join"
              className="inline-block text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              Rejoindre via invitation →
            </a>
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {['Chiffrement SSL', 'Données sécurisées', 'Accès restreint'].map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-xs text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
