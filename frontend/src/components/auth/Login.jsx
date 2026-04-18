import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, Zap, BarChart3, Users, CheckCircle, ArrowRight, TrendingUp, Calendar } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '839544566336-be9thftofd383siebap23mmpi9pdq6oa.apps.googleusercontent.com';

const features = [
  { icon: Users,       text: 'Gestion leads & prospects', desc: 'Pipeline intelligent' },
  { icon: BarChart3,   text: 'Analytics en temps réel',   desc: 'Tableaux de bord live' },
  { icon: Zap,         text: 'Devis & factures auto',     desc: 'Génération en 1 clic' },
  { icon: Calendar,    text: 'Planning intervenants',     desc: 'Planification optimisée' },
  { icon: TrendingUp,  text: 'Suivi rentabilité',         desc: 'Marges & performance' },
  { icon: Shield,      text: 'Portail client intégré',    desc: 'Espace dédié 24/7' },
];

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authError = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleLogin = () => {
    setIsLoading(true);
    const clientId = GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
    const scope = encodeURIComponent('openid email profile');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
  };

  return (
    <div className="min-h-screen flex bg-neutral-50" data-testid="login-page">

      {/* Panneau gauche — éditorial atelier */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-neutral-900">
        <div className="absolute inset-0"
             style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(217,119,87,0.18) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(4,120,87,0.15) 0%, transparent 55%), #1A1814' }} />

        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(245,239,227,0.8) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-terracotta-600 flex items-center justify-center shadow-accent"
                 style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.18)' }}>
              <span className="font-display text-white text-lg font-semibold tracking-tight">G</span>
            </div>
            <div>
              <span className="font-display text-white text-lg font-semibold tracking-tight block leading-none">
                Global Clean Home
              </span>
              <span className="font-mono text-neutral-400 text-[10px] uppercase tracking-[0.18em] block mt-1.5">
                Atelier · CRM
              </span>
            </div>
          </div>

          {/* Contenu principal */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-200 font-medium">
                Plateforme professionnelle
              </span>
            </div>

            <h1 className="font-display text-5xl xl:text-[64px] font-semibold text-white mb-6 leading-[1.05] tracking-[-0.025em]">
              Gérez votre
              <br />
              activité <em className="text-terracotta-300 not-italic font-medium" style={{ fontFamily: 'var(--font-display, "Fraunces", serif)', fontStyle: 'italic' }}>simplement.</em>
            </h1>

            <p className="text-neutral-300 text-[15px] leading-relaxed mb-10 max-w-md">
              Suivez vos leads, créez des devis et fidélisez vos clients depuis une seule interface, pensée pour la main-d'œuvre et la direction.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {features.map((f, i) => (
                <div key={i}
                     className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200">
                  <div className="w-9 h-9 rounded-md bg-brand-500/15 border border-brand-400/20 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-brand-300" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[12px] font-semibold text-neutral-100 block truncate">{f.text}</span>
                    <span className="text-[10px] text-neutral-400 block truncate">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-10 pt-8 border-t border-white/5">
            {[
              { value: '2 500+', label: 'Clients gérés' },
              { value: '98%',    label: 'Satisfaction' },
              { value: '< 2h',   label: 'Réponse' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="font-display text-2xl xl:text-3xl font-semibold text-white tabular-nums tracking-tight">
                  {stat.value}
                </p>
                <p className="font-mono text-[10px] text-neutral-400 mt-1 uppercase tracking-[0.12em]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit — clair */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-neutral-50 relative">

        <div className={`w-full max-w-sm relative z-10 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-lg bg-terracotta-600 flex items-center justify-center shadow-accent">
              <span className="font-display text-white text-lg font-semibold">G</span>
            </div>
            <span className="font-display text-neutral-900 text-lg font-semibold tracking-tight">
              Global Clean Home
            </span>
          </div>

          <div className="mb-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 mb-3">
              Espace équipe
            </p>
            <h1 className="font-display text-4xl font-semibold text-neutral-900 mb-2 tracking-[-0.02em]">
              Bon retour.
            </h1>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Connectez-vous à votre espace CRM avec votre compte Google professionnel.
            </p>
          </div>

          {authError === 'not_authorized' && (
            <div className="mb-6 p-4 bg-terracotta-50 border border-terracotta-200 rounded-lg flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-terracotta-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-terracotta-800">
                Accès refusé. Ce CRM est réservé à l'équipe Global Clean Home.
              </p>
            </div>
          )}

          {/* Carte login */}
          <div className="rounded-xl border border-neutral-200 bg-white p-7 mb-6 shadow-card">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500 text-center mb-5">
              Connexion sécurisée via Google
            </p>

            <button
              data-testid="google-login-button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-neutral-50 border border-neutral-300 hover:border-brand-500/40 rounded-lg transition-all duration-200 group disabled:opacity-50 hover:shadow-card-lg"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span className="text-sm font-semibold text-neutral-800 group-hover:text-neutral-900 transition-colors">
                {isLoading ? 'Connexion…' : 'Continuer avec Google'}
              </span>
              {!isLoading && <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />}
            </button>
          </div>

          {/* Séparateur */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-neutral-50 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                Ou
              </span>
            </div>
          </div>

          {/* Invitation */}
          <div className="p-4 bg-terracotta-50/60 border border-terracotta-200 rounded-lg text-center">
            <p className="text-xs text-neutral-600 mb-2">
              Vous avez reçu une invitation par email ?
            </p>
            <a
              href="/auth/join"
              className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-700 hover:text-terracotta-800 transition-colors"
            >
              Rejoindre via invitation
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Badges sécurité */}
          <div className="flex items-center justify-center gap-5 mt-8">
            {['Chiffrement SSL', 'Données sécurisées', 'Accès restreint'].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-brand-600" />
                <span className="text-[11px] text-neutral-500 font-medium">{item}</span>
              </div>
            ))}
          </div>

          {/* Retour landing */}
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/')}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-terracotta-700 transition-colors"
            >
              ← Retour au site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
