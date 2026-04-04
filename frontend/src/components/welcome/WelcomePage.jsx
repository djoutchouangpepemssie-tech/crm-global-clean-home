import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, ArrowRight, Users, TrendingUp, Zap, BarChart3,
  CheckCircle, Lock, Smartphone, Rocket
} from 'lucide-react';

/**
 * Welcome/Onboarding Page - Ultra-Premium
 * Shows when user first logs in
 */

const WelcomePage = ({ user }) => {
  const navigate = useNavigate();
  const [selectedFeature, setSelectedFeature] = useState(null);

  const features = [
    {
      icon: Users,
      title: 'Gestion des Leads',
      description: 'Pipeline Kanban ultra-fluide, scoring IA, auto-enrichissement',
      color: '#8b5cf6',
      link: '/leads',
      stats: '245 leads en cours'
    },
    {
      icon: FileText,
      title: 'Devis & Factures',
      description: 'Génération auto, suivi de paiement, reminders intégrés',
      color: '#f97316',
      link: '/quotes',
      stats: '12 devis en attente'
    },
    {
      icon: CalendarDays,
      title: 'Planning & Interventions',
      description: 'Calendrier optimisé, géolocalisation, assignation auto',
      color: '#10b981',
      link: '/planning',
      stats: '8 interventions demain'
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Reports',
      description: 'Dashboards en temps réel, KPIs personnalisés, exports',
      color: '#f59e0b',
      link: '/analytics',
      stats: 'CA mois: 45.2k€'
    },
    {
      icon: Zap,
      title: 'Workflows Automatisés',
      description: 'Automations intelligentes, triggers avancés, intégrations',
      color: '#06b6d4',
      link: '/workflows',
      stats: '12 workflows actifs'
    },
    {
      icon: Star,
      title: 'Centre IA',
      description: 'Scoring prédictif, suggestions, email generation, insights',
      color: '#a78bfa',
      link: '/ai',
      stats: 'IA en apprentissage...'
    }
  ];

  const benefits = [
    { icon: Lock, text: 'Sécurisé & Confidentiel' },
    { icon: Smartphone, text: 'Mobile-Friendly' },
    { icon: Rocket, text: 'Ultra-Rapide' },
    { icon: CheckCircle, text: '100% Français' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="pt-8 px-6 sm:pt-12 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: 'Manrope' }}>
              Global Clean CRM
            </h1>
          </div>
          <div className="text-sm text-slate-400">
            Bienvenue, <span className="text-violet-400 font-bold">{user?.name || 'Utilisateur'}</span> 👋
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-6 sm:px-8 py-12 sm:py-20">
          {/* Hero section */}
          <div className="text-center mb-16 sm:mb-24 animate-fade-in">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4" style={{ fontFamily: 'Manrope' }}>
              Bienvenue dans votre
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">
                CRM Ultra-Premium
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              Gérez vos clients, leads, devis et interventions avec une plateforme hyper-moderne, rapide et intelligente.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-violet-500/50"
            >
              Commencer <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Features grid */}
          <div className="mb-16 sm:mb-24">
            <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">
              Modules Principaux
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={i}
                    onClick={() => navigate(feature.link)}
                    className="group cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 h-full hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/20">
                      {/* Top accent */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
                        style={{
                          backgroundImage: `linear-gradient(90deg, ${feature.color}, transparent)`
                        }}
                      />
                      
                      {/* Icon */}
                      <div
                        className="p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300"
                        style={{ background: `${feature.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: feature.color }} />
                      </div>

                      {/* Content */}
                      <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                      <p className="text-sm text-slate-400 mb-4">{feature.description}</p>
                      
                      {/* Stats */}
                      <div className="text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                        {feature.stats}
                      </div>

                      {/* Arrow */}
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Benefits section */}
          <div className="mb-16 sm:mb-24">
            <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">
              Pourquoi choisir notre CRM ?
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="p-3 rounded-xl bg-violet-600/20 mb-3">
                      <Icon className="w-5 h-5 text-violet-400" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200">
                      {benefit.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA section */}
          <div className="text-center py-12 px-6 rounded-3xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/20 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-white mb-4">
              Prêt à transformer votre gestion client ?
            </h3>
            <p className="text-slate-400 mb-6">
              Explorez tous les modules et découvrez la puissance de notre CRM ultra-moderne.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all duration-200 transform hover:scale-105"
              >
                Aller au Dashboard
              </button>
              <button
                onClick={() => navigate('/leads')}
                className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 transition-all duration-200 transform hover:scale-105"
              >
                Explorer les Leads
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-8 text-slate-600 text-sm border-t border-white/5">
          <p>Global Clean Home © 2026 • CRM Ultra-Premium</p>
        </footer>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default WelcomePage;
