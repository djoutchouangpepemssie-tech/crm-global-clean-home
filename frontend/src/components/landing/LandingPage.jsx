import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Shield, Zap, BarChart3, Users, CheckCircle, Star,
  ArrowRight, Phone, Mail, Clock, Award, TrendingUp, Calendar,
  ChevronRight, Building2, Leaf, SprayCan
} from 'lucide-react';

// ─── Data ───────────────────────────────────────────────────
const services = [
  {
    icon: Building2,
    title: 'Nettoyage Bureaux',
    desc: 'Entretien professionnel quotidien ou hebdomadaire de vos espaces de travail.',
    color: '#8b5cf6',
  },
  {
    icon: Leaf,
    title: 'Nettoyage Écologique',
    desc: 'Produits 100% bio et certifiés pour un environnement sain et responsable.',
    color: '#10b981',
  },
  {
    icon: SprayCan,
    title: 'Fin de Chantier',
    desc: 'Remise en état complète après travaux, prêt à emménager.',
    color: '#f59e0b',
  },
  {
    icon: Calendar,
    title: 'Contrats Réguliers',
    desc: 'Formules sur-mesure avec planification automatisée et suivi qualité.',
    color: '#60a5fa',
  },
];

const stats = [
  { value: '2 500+', label: 'Clients satisfaits' },
  { value: '98%', label: 'Taux de satisfaction' },
  { value: '15 000+', label: 'Interventions / an' },
  { value: '< 2h', label: 'Temps de réponse' },
];

const testimonials = [
  {
    name: 'Sophie Martin',
    role: 'Directrice, Agence Immo Paris',
    text: "Global Clean Home a transformé la gestion de nos biens. Réactivité exceptionnelle et qualité irréprochable. Nos locataires sont ravis.",
    rating: 5,
    avatar: 'SM',
  },
  {
    name: 'Marc Dubois',
    role: 'Gérant, Restaurant Le Cèdre',
    text: "Depuis 2 ans avec eux, jamais une seule plainte. L'équipe est ponctuelle, discrète et ultra-professionnelle. Je recommande les yeux fermés.",
    rating: 5,
    avatar: 'MD',
  },
  {
    name: 'Claire Fontaine',
    role: 'Office Manager, Tech Startup',
    text: "Le portail client est un vrai plus : on suit tout en temps réel, on planifie en 2 clics. C'est le prestataire le plus moderne qu'on ait eu.",
    rating: 5,
    avatar: 'CF',
  },
];

const steps = [
  { num: '01', title: 'Demande de devis', desc: 'Décrivez vos besoins en 2 minutes via notre formulaire.' },
  { num: '02', title: 'Devis sur-mesure', desc: 'Recevez une proposition détaillée sous 2 heures.' },
  { num: '03', title: 'Intervention', desc: 'Notre équipe qualifiée intervient selon votre planning.' },
  { num: '04', title: 'Suivi qualité', desc: 'Suivez et évaluez chaque prestation en temps réel.' },
];

const faqs = [
  { q: 'Quels types de locaux nettoyez-vous ?', a: 'Bureaux, commerces, restaurants, copropriétés, chantiers, résidences — nous nous adaptons à tous les environnements professionnels et particuliers.' },
  { q: 'Vos produits sont-ils écologiques ?', a: "Oui, nous proposons une gamme 100% éco-responsable certifiée Ecolabel. C'est notre formule par défaut pour tous les contrats." },
  { q: 'Comment fonctionne le suivi des prestations ?', a: "Chaque client dispose d'un portail en ligne pour suivre les interventions, consulter les rapports qualité et communiquer avec son équipe dédiée." },
  { q: 'Quel est le délai pour obtenir un devis ?', a: 'Nous nous engageons à vous envoyer un devis détaillé et personnalisé sous 2 heures ouvrées.' },
];

// ─── IntersectionObserver hook ──────────────────────────────
function useInView() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el); }
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, isVisible];
}

function AnimatedSection({ children, className = '', delay = 0 }) {
  const [ref, isVisible] = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.08] rounded-2xl overflow-hidden transition-all hover:border-violet-500/30">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left">
        <span className="text-sm font-semibold text-slate-200 pr-4">{q}</span>
        <ChevronRight className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pb-5' : 'max-h-0'}`}>
        <p className="px-6 text-sm text-slate-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ─── Landing Page ───────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen text-slate-200 overflow-x-hidden" style={{background:"#0a0f23"}}>

      {/* ═══════ NAVBAR ═══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ background: 'rgba(9,15,35,0.8)', backdropFilter: 'blur(24px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-white text-base tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <span className="text-violet-400">Global</span> Clean Home
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[['Services', 'services'], ['Process', 'process'], ['Avis', 'testimonials'], ['FAQ', 'faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm text-slate-400 hover:text-white transition-colors font-medium hidden sm:block">
              Connexion
            </button>
            <button
              onClick={() => scrollTo('cta')}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-violet-600/30 hover:shadow-violet-500/50 hover:-translate-y-0.5"
            >
              Devis gratuit
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-600/[0.12] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-blue-600/[0.08] rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
          backgroundSize: '48px 48px'
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className={`inline-flex items-center gap-2.5 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
              </span>
              <span className="text-xs font-semibold text-violet-300 tracking-wide uppercase">Service professionnel de nettoyage</span>
            </div>

            <h1
              className={`text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.05] mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Des espaces
              <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent pb-1">
                impeccables,
              </span>
              sans effort.
            </h1>

            <p className={`text-lg sm:text-xl text-slate-400 max-w-xl mx-auto mb-12 leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              Nettoyage professionnel pour bureaux, commerces et résidences.
              Devis en 2h, suivi en temps réel, satisfaction garantie.
            </p>

            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <button
                onClick={() => scrollTo('cta')}
                className="group w-full sm:w-auto px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-2xl shadow-violet-600/30 hover:shadow-violet-500/50 hover:-translate-y-1.5 flex items-center justify-center gap-2.5 text-base"
              >
                Demander un devis gratuit
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => scrollTo('services')}
                className="w-full sm:w-auto px-8 py-4 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 text-base"
              >
                Découvrir nos services
              </button>
            </div>

            {/* Stats */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              {stats.map((stat, i) => (
                <div key={i} className="text-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>{stat.value}</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ LOGOS ═══════ */}
      <section className="py-14 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[10px] text-slate-600 font-bold tracking-[0.2em] uppercase mb-8">Ils nous font confiance</p>
          <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-4 opacity-40">
            {['Nexity', 'Foncia', 'Century 21', 'Sodexo', 'Bouygues', 'AccorHotels'].map((name, i) => (
              <span key={i} className="text-lg font-black text-slate-500 tracking-widest uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SERVICES ═══════ */}
      <section id="services" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">Nos services</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Des solutions pour chaque besoin
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-base">
              Du nettoyage quotidien aux interventions spécialisées, nous couvrons l'ensemble de vos besoins.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((s, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="group h-full p-7 rounded-3xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/20">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg"
                    style={{ background: `${s.color}12`, border: `1px solid ${s.color}20`, boxShadow: `0 0 0 0 ${s.color}00` }}
                  >
                    <s.icon className="w-7 h-7" style={{ color: s.color }} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2.5" style={{ fontFamily: 'Manrope, sans-serif' }}>{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PROCESS ═══════ */}
      <section id="process" className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.03] to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">Comment ça marche</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Simple, rapide, efficace
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              En 4 étapes, passez de la demande à des locaux impeccables.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <AnimatedSection key={i} delay={i * 120}>
                <div className="relative p-7 rounded-3xl border border-white/[0.06] bg-white/[0.02] h-full">
                  <span className="text-6xl font-black text-violet-500/10 absolute top-3 right-4" style={{ fontFamily: 'Manrope, sans-serif' }}>{step.num}</span>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-5">
                    <span className="text-sm font-black text-violet-400">{step.num}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3.5 text-violet-500/30">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section id="testimonials" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">Témoignages</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ce que disent nos clients
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              Plus de 2 500 professionnels nous font confiance au quotidien.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <AnimatedSection key={i} delay={i * 150}>
                <div className="h-full p-7 rounded-3xl border border-white/[0.06] bg-white/[0.02] hover:border-violet-500/20 transition-all duration-500 flex flex-col group hover:-translate-y-1">
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-7 flex-1 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3.5 pt-5 border-t border-white/5">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg shadow-violet-500/20">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ WHY US ═══════ */}
      <section className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.02] to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-8 sm:p-12 lg:p-16 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/[0.06] rounded-full blur-[100px]" />
              <div className="relative grid lg:grid-cols-2 gap-14 items-center">
                <div>
                  <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">Pourquoi nous choisir</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    La qualité professionnelle, la technologie en plus
                  </h2>
                  <p className="text-slate-400 mb-10 leading-relaxed">
                    Global Clean Home combine expertise terrain et outils digitaux pour un service moderne, transparent et fiable.
                  </p>
                  <div className="space-y-5">
                    {[
                      { icon: Shield, text: 'Équipes vérifiées et assurées', color: '#10b981' },
                      { icon: Clock, text: 'Interventions planifiées à la minute', color: '#60a5fa' },
                      { icon: TrendingUp, text: 'Portail client avec suivi temps réel', color: '#8b5cf6' },
                      { icon: Award, text: 'Garantie satisfaction ou reprise gratuite', color: '#f59e0b' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}12`, border: `1px solid ${item.color}20` }}>
                          <item.icon className="w-5 h-5" style={{ color: item.color }} />
                        </div>
                        <span className="text-sm font-medium text-slate-300">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {[
                    { val: '98%', label: 'Satisfaction client', color: '#8b5cf6' },
                    { val: '< 2h', label: 'Temps de réponse', color: '#10b981' },
                    { val: '4.9/5', label: 'Note moyenne', color: '#f59e0b' },
                    { val: '0', label: 'Engagement minimum', color: '#60a5fa' },
                  ].map((s, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center hover:border-white/[0.12] transition-all duration-300">
                      <p className="text-3xl sm:text-4xl font-black mb-1.5" style={{ fontFamily: 'Manrope, sans-serif', color: s.color }}>{s.val}</p>
                      <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section id="faq" className="py-24 lg:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Questions fréquentes
            </h2>
          </AnimatedSection>
          <AnimatedSection>
            <div className="space-y-3">
              {faqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════ CTA FINAL ═══════ */}
      <section id="cta" className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-500/[0.06] to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-violet-600/[0.15] rounded-full blur-[180px]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-8">
              <Zap className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Réponse en moins de 2 heures</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-7 leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Prêt pour des locaux
              <span className="block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent pb-1">
                toujours impeccables ?
              </span>
            </h2>

            <p className="text-lg text-slate-400 max-w-lg mx-auto mb-12 leading-relaxed">
              Obtenez votre devis personnalisé gratuitement. Sans engagement, réponse garantie sous 2h.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a
                href="tel:+33100000000"
                className="group w-full sm:w-auto px-9 py-4.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-2xl shadow-violet-600/30 hover:shadow-violet-500/50 hover:-translate-y-1.5 flex items-center justify-center gap-3 text-base"
              >
                <Phone className="w-5 h-5" />
                Appelez-nous maintenant
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="mailto:contact@globalcleanhome.fr"
                className="w-full sm:w-auto px-9 py-4 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-3 text-base"
              >
                <Mail className="w-5 h-5" />
                Envoyer un email
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8">
              {[
                { icon: CheckCircle, text: 'Devis 100% gratuit' },
                { icon: Shield, text: 'Sans engagement' },
                { icon: Clock, text: 'Réponse < 2h' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-400 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-white/5 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-white text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Global Clean Home
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
                Service professionnel de nettoyage. Qualité, fiabilité et transparence depuis 2018.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.15em] mb-5">Services</h4>
              <ul className="space-y-2.5">
                {['Nettoyage bureaux', 'Nettoyage écologique', 'Fin de chantier', 'Contrats réguliers'].map((s) => (
                  <li key={s}><button onClick={() => scrollTo('services')} className="text-xs text-slate-500 hover:text-violet-400 transition-colors">{s}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.15em] mb-5">Entreprise</h4>
              <ul className="space-y-2.5">
                {['À propos', 'Carrières', 'Blog', 'Contact'].map((s) => (
                  <li key={s}><span className="text-xs text-slate-500 hover:text-violet-400 transition-colors cursor-pointer">{s}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.15em] mb-5">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-slate-400">01 00 00 00 00</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-slate-400">contact@globalcleanhome.fr</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-600">&copy; {new Date().getFullYear()} Global Clean Home. Tous droits réservés.</p>
            <div className="flex gap-6">
              {['Mentions légales', 'Confidentialité', 'CGV'].map((s) => (
                <span key={s} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
