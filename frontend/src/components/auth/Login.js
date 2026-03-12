import React from 'react';
import { Sparkles } from 'lucide-react';

const Login = () => {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1725042893312-5ec0dea9e369?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHw0fHxtb2Rlcm4lMjBjbGVhbiUyMGJyaWdodCUyMGxpdmluZyUyMHJvb20lMjBpbnRlcmlvcnxlbnwwfHx8fDE3NzMzMzIwMzV8MA&ixlib=rb-4.1.0&q=85')"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/40 to-rose-600/40"></div>
        <div className="relative z-10 p-12 flex flex-col justify-end text-white">
          <h2 className="text-4xl font-bold mb-4">Global Clean Home</h2>
          <p className="text-lg opacity-90">Gérez vos leads et devis en toute simplicité</p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 mb-6">
              <Sparkles className="w-8 h-8 text-violet-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">CRM Global Clean Home</h1>
            <p className="text-slate-600">Connectez-vous pour accéder à votre dashboard</p>
          </div>

          <div className="space-y-6">
            <button
              data-testid="google-login-button"
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm font-medium text-base"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Se connecter avec Google
            </button>

            <div className="text-center text-sm text-slate-500">
              <p>En vous connectant, vous acceptez nos conditions d'utilisation</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-slate-900">Leads</div>
                <div className="text-slate-600">Gestion complète</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900">Devis</div>
                <div className="text-slate-600">Suivi & envoi</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900">Stats</div>
                <div className="text-slate-600">Temps réel</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
