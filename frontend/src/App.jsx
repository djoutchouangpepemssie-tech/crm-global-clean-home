// CRM v2.1 - HTTPS enforced - build 202604141733
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { Toaster } from 'sonner';
import { LayoutDashboard, Users, FileText, MoreHorizontal, X, LogOut, Trello, CreditCard, BarChart3, CalendarDays, CheckSquare, TrendingUp, Plug, Activity, ChevronRight, Briefcase, Star, Settings, Globe, MessageSquare, Ticket, Workflow, BarChart2, UserCheck, Map, BookOpen, ThumbsUp, FolderOpen, Scroll, Search } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PWAInstallBanner, { OfflineIndicator } from './components/pwa/PWAInstallBanner';
import CommandPalette from './components/shared/CommandPalette';
import VoiceFab from './components/shared/VoiceFab';

import { startKeepAlive } from './lib/keepAlive.js';

// Démarrer le keepalive backend
startKeepAlive();
import Login from './components/auth/Login';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/auth/ProtectedRoute';
import InvitationJoin from './pages/InvitationJoin';
import Sidebar from './components/layout/Sidebar';
import { lazy, Suspense, Component, memo } from 'react';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('CRM Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg-app, #EAEEF0)',flexDirection:'column',gap:'16px',padding:'24px'}}>
          <div style={{fontSize:'48px'}}>⚠️</div>
          <h2 style={{color:'#e2e8f0',fontSize:'20px',fontWeight:'bold',margin:0}}>Erreur de chargement</h2>
          <p style={{color:'#64748b',fontSize:'14px',margin:0,textAlign:'center'}}>{this.state.error?.message || 'Une erreur est survenue'}</p>
          <button onClick={() => { this.setState({hasError:false,error:null}); window.location.href='/dashboard'; }}
            style={{background:'#7c3aed',color:'white',border:'none',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',fontWeight:'600'}}>
            Retour au dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy loading pour accélérer le chargement initial
// Notification Bell wrapper
const DirectorDashboard = lazy(() => import('./components/dashboard/DirectorDashboard'));
const SEODashboard = lazy(() => import('./components/seo/SEODashboard'));
const RentabiliteModule = lazy(() => import('./components/rentabilite/RentabiliteModule'));
const ChatCenter = lazy(() => import('./components/chat/ChatCenter'));
const NotificationBellLazy = React.lazy(() => 
  import('./components/notifications/NotificationCenter').then(m => ({default: m.NotificationBell}))
);
const NotificationBell = () => (
  <React.Suspense fallback={<div className="w-9 h-9" />}>
    <NotificationBellLazy />
  </React.Suspense>
);

// Prefetch agressif : les pages les plus visitées après le premier render
const prefetchPages = () => {
  // Priorité 1 : pages critiques (1s après load)
  import('./components/dashboard/Dashboard');
  import('./components/leads/LeadsList');
  // Priorité 2 : pages fréquentes (3s)
  setTimeout(() => {
    import('./components/quotes/QuotesList');
    import('./components/planning/PlanningCalendar');
    import('./components/tasks/TasksList');
    import('./components/kanban/KanbanBoard');
  }, 2000);
  // Priorité 3 : le reste (idle time)
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('./components/invoices/InvoicesList');
      import('./components/analytics/Analytics');
      import('./components/settings/SettingsPage');
    });
  }
};
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(prefetchPages, 1000));
}
const Dashboard = lazy(() => import('./components/dashboard/CockpitDashboard'));
const DashboardCustom = lazy(() => import('./components/dashboard/DynamicDashboard'));
const DashboardLegacy = lazy(() => import('./components/dashboard/Dashboard'));
const PipelineRiver = lazy(() => import('./components/pipeline/PipelineRiver'));
const LeadsRegister = lazy(() => import('./components/leads/LeadsRegister'));
const LeadsList = lazy(() => import('./components/leads/LeadsList'));
const LeadDossier = lazy(() => import('./components/leads/LeadDossier'));
const LeadDetail = lazy(() => import('./components/leads/LeadDetail'));
const LeadForm = lazy(() => import('./components/leads/LeadForm'));
const QuotesCahier = lazy(() => import('./components/quotes/QuotesCahier'));
const QuotesList = lazy(() => import('./components/quotes/QuotesList'));
const QuoteForm = lazy(() => import('./components/quotes/QuoteForm'));
const TasksCarnet = lazy(() => import('./components/tasks/TasksCarnet'));
const TasksList = lazy(() => import('./components/tasks/TasksList'));
const ActivityLog = lazy(() => import('./components/activity/ActivityLog'));
const ActivityChronique = lazy(() => import('./components/activity/ActivityChronique'));
const KanbanBoard = lazy(() => import('./components/kanban/KanbanBoard'));
const Analytics = lazy(() => import('./components/analytics/Analytics'));
const AnalyticsBoussole = lazy(() => import('./components/analytics/AnalyticsBoussole'));
const InvoicesGrandLivre = lazy(() => import('./components/invoices/InvoicesGrandLivre'));
const InvoicesList = lazy(() => import('./components/invoices/InvoicesList'));
const PaymentSuccess = lazy(() => import('./components/invoices/PaymentSuccess'));
const FinancialDashboard = lazy(() => import('./components/invoices/FinancialDashboard'));
const FinanceCoffre = lazy(() => import('./components/finance/FinanceCoffre'));
const QuoteView = lazy(() => import('./components/quotes/QuoteView'));
const InvoiceView = lazy(() => import('./components/invoices/InvoiceView'));
const SearchPage = lazy(() => import('./components/shared/SearchPage'));
const ClientPortal = lazy(() => import('./components/portal/ClientPortal'));
const IntervenantPortal = lazy(() => import('./components/portal/IntervenantPortal'));
const ClientPortalAtelier = lazy(() => import('./components/portal/ClientPortalAtelier'));
const IntervenantPortalAtelier = lazy(() => import('./components/portal/IntervenantPortalAtelier'));
const IntervenantsManager = lazy(() => import('./components/planning/IntervenantsManager'));
const PlanningCalendar = lazy(() => import('./components/planning/PlanningCalendar'));
const PlanningFil = lazy(() => import('./components/planning/PlanningFil'));
const Integrations = lazy(() => import('./components/integrations/Integrations'));
const AdsDashboard = lazy(() => import('./components/ads/AdsDashboard'));
const AICenter = lazy(() => import('./components/ai/AICenter'));
const WorkflowBuilder = lazy(() => import('./components/workflows/WorkflowBuilder'));
const TicketsList = lazy(() => import('./components/tickets/TicketsList'));
const ContractsList = lazy(() => import('./components/contracts/ContractsList'));
const InterventionsMap = lazy(() => import('./components/map/InterventionsMap'));
const SatisfactionDashboard = lazy(() => import('./components/satisfaction/SatisfactionDashboard'));
const SatisfactionEcho = lazy(() => import('./components/satisfaction/SatisfactionEcho'));
const DocumentsManager = lazy(() => import('./components/documents/DocumentsManager'));
const BookingManager = lazy(() => import('./components/booking/BookingManager'));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'));
const SettingsEtabli = lazy(() => import('./components/settings/SettingsEtabli'));
const InvoiceForm = lazy(() => import('./components/invoices/InvoiceForm'));
const StockTable = lazy(() => import('./components/stock/StockTable'));
const AccountingDashboard = lazy(() => import('./components/accounting/AccountingDashboard'));
const AccountingEnterprise = lazy(() => import('./components/accounting/AccountingEnterprise'));
const AccountingERP = lazy(() => import('./components/accounting/AccountingERP'));
const AccountingGrimoire = lazy(() => import('./components/accounting/AccountingGrimoire'));
const IntervenantsEquipage = lazy(() => import('./components/planning/IntervenantsEquipage'));
const DocumentsBibliotheque = lazy(() => import('./components/documents/DocumentsBibliotheque'));
const TicketsDoleances = lazy(() => import('./components/tickets/TicketsDoleances'));
const ContractsActes = lazy(() => import('./components/contracts/ContractsActes'));
const StockMagasin = lazy(() => import('./components/stock/StockMagasin'));
const BookingRegistre = lazy(() => import('./components/booking/BookingRegistre'));
const SEOAtlas = lazy(() => import('./components/seo/SEOAtlas'));
const SeoCockpit = lazy(() => import('./components/seo/SeoCockpit'));
const SeoLayout = lazy(() => import('./components/seo/SeoLayout'));
const SeoHome = lazy(() => import('./components/seo/SeoHome'));
const SeoConnect = lazy(() => import('./components/seo/SeoConnect'));
const SeoPerformance = lazy(() => import('./components/seo/SeoPerformance'));
const SeoContent = lazy(() => import('./components/seo/SeoContent'));
const SeoTechnical = lazy(() => import('./components/seo/SeoTechnical'));
const SeoConversion = lazy(() => import('./components/seo/SeoConversion'));
const SeoSources = lazy(() => import('./components/seo/SeoSources'));
const SeoGlobe = lazy(() => import('./components/seo/SeoGlobe'));
const SeoAI = lazy(() => import('./components/seo/SeoAI'));
const SeoAlerts = lazy(() => import('./components/seo/SeoAlerts'));
const SeoSettings = lazy(() => import('./components/seo/SeoSettings'));
const SeoCannibalization = lazy(() => import('./components/seo/SeoCannibalization'));
const SeoOrphans = lazy(() => import('./components/seo/SeoOrphans'));
const SeoChangelog = lazy(() => import('./components/seo/SeoChangelog'));
const SeoOpportunities = lazy(() => import('./components/seo/SeoOpportunities'));
const SeoIntent = lazy(() => import('./components/seo/SeoIntent'));
const SeoGaps = lazy(() => import('./components/seo/SeoGaps'));
const SeoInternalLinks = lazy(() => import('./components/seo/SeoInternalLinks'));
const SeoActions = lazy(() => import('./components/seo/SeoActions'));
const MapTerritoire = lazy(() => import('./components/map/MapTerritoire'));
const AdsAffichage = lazy(() => import('./components/ads/AdsAffichage'));
const RentabiliteBalance = lazy(() => import('./components/rentabilite/RentabiliteBalance'));
const AICabinet = lazy(() => import('./components/ai/AICabinet'));
const WorkflowsRouages = lazy(() => import('./components/workflows/WorkflowsRouages'));
const ChatSalon = lazy(() => import('./components/chat/ChatSalon'));
const IntegrationsConnexions = lazy(() => import('./components/integrations/IntegrationsConnexions'));
const DirectorPasserelle = lazy(() => import('./components/dashboard/DirectorPasserelle'));
const GlobalSearchFull = lazy(() =>
  import('./components/shared/GlobalSearch').then(m => ({ default: m.GlobalSearch || m.default }))
);
const GlobalSearchTrigger = () => (
  <React.Suspense fallback={<div style={{width:200,height:32}} />}>
    <GlobalSearchFull triggerOnly />
  </React.Suspense>
);
const LandingPage = lazy(() => import('./components/landing/LandingPage'));
import './App.css';
import './mobile-responsive.css';
import { requestNotificationPermission, onForegroundMessage } from './firebase';

const menuCategories = [
  {
    label: '🎯 Commercial',
    color: '#8b5cf6',
    items: [
      { to: '/leads',    icon: Users,        label: 'Leads' },
      { to: '/quotes',   icon: FileText,     label: 'Devis' },
      { to: '/invoices', icon: CreditCard,   label: 'Factures' },
      { to: '/finance',  icon: BarChart3,    label: 'Finance' },
      { to: '/accounting-erp', icon: BookOpen,  label: '💎 Comptabilité ERP' },
      { to: '/accounting', icon: BarChart3,  label: 'Comptabilité' },
      { to: '/accounting-enterprise', icon: BookOpen, label: 'Compta Enterprise' },
      { to: '/stock',    icon: Briefcase,    label: 'Stocks' },
      { to: '/kanban',   icon: Trello,       label: 'Kanban' },
    ]
  },
  {
    label: '📅 Opérations',
    color: '#10b981',
    items: [
      { to: '/planning',     icon: CalendarDays, label: 'Planning' },
      { to: '/intervenants', icon: UserCheck,    label: 'Intervenants' },
      { to: '/tasks',        icon: CheckSquare,  label: 'Tâches' },
      { to: '/tickets',      icon: Ticket,       label: 'Tickets' },
      { to: '/bookings',     icon: BookOpen,     label: 'Réservations' },
      { to: '/map',          icon: Map,          label: 'Carte' },
    ]
  },
  {
    label: '📊 Analytics',
    color: '#f59e0b',
    items: [
      { to: '/analytics',  icon: TrendingUp, label: 'Analytics' },
      { to: '/rentabilite',icon: BarChart2,  label: 'Rentabilité' },
      { to: '/ads',        icon: Globe,      label: 'Publicité' },
      { to: '/activity',   icon: Activity,   label: 'Journal' },
    ]
  },
  {
    label: '📋 Gestion',
    color: '#06b6d4',
    items: [
      { to: '/contracts',    icon: Scroll,        label: 'Contrats' },
      { to: '/satisfaction', icon: ThumbsUp,      label: 'Satisfaction' },
      { to: '/documents',    icon: FolderOpen,    label: 'Documents' },
    ]
  },
  {
    label: '⚙️ Outils',
    color: '#60a5fa',
    items: [
      { to: '/workflows',    icon: Workflow,      label: 'Workflows' },
      { to: '/integrations', icon: Plug,          label: 'Intégrations' },
      { to: '/ai',           icon: Star,          label: 'IA' },
      { to: '/chat',         icon: MessageSquare, label: 'Messages' },
      { to: '/settings',     icon: Settings,      label: 'Paramètres' },
    ]
  },
];

// Garder pour compatibilité
const moreNavItems = menuCategories.flatMap(c => c.items);


function AccordionMenu({ setMoreOpen }) {
  const [openCat, setOpenCat] = useState(null);

  return (
    <nav className="p-3 space-y-2 overflow-y-auto max-h-[65vh]">
      {menuCategories.map(cat => (
        <div key={cat.label} className="rounded-2xl overflow-hidden border" style={{borderColor:`${cat.color}20`}}>
          {/* Bouton catégorie */}
          <button
            onClick={() => setOpenCat(openCat === cat.label ? null : cat.label)}
            className="w-full flex items-center justify-between px-4 py-3.5 transition-all"
            style={{background: openCat === cat.label ? `${cat.color}15` : 'rgba(255,255,255,0.02)'}}>
            <span className="text-sm font-black text-slate-100">{cat.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:`${cat.color}20`,color:cat.color}}>
                {cat.items.length}
              </span>
              <ChevronRight
                className="w-4 h-4 text-slate-500 transition-transform duration-200"
                style={{transform: openCat === cat.label ? 'rotate(90deg)' : 'rotate(0deg)'}}
              />
            </div>
          </button>

          {/* Sous-pages */}
          {openCat === cat.label && (
            <div className="border-t" style={{borderColor:`${cat.color}15`}}>
              {cat.items.map((item, idx) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-5 py-3.5 transition-all ${
                      idx < cat.items.length - 1 ? 'border-b' : ''
                    } ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? `${cat.color}12` : 'rgba(255,255,255,0.01)',
                    borderColor: 'rgba(255,255,255,0.05)'
                  })}>
                  {({ isActive }) => (
                    <>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{background: isActive ? `${cat.color}25` : 'rgba(255,255,255,0.05)'}}>
                        <item.icon className="w-4 h-4" style={{color: isActive ? cat.color : '#64748b'}}/>
                      </div>
                      <span className="text-sm font-semibold" style={{color: isActive ? cat.color : ''}}>{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{background:cat.color}}/>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useAuth();

  // Mobile nav retiré : on utilise exclusivement la sidebar (avec hamburger)
  // sur toutes les tailles d'écran.
  return null;
}

function NotificationHandler() {
  useEffect(() => {
    requestNotificationPermission().then(async token => {
      if (token) {
        console.warn('[FCM] Push notifications enabled');
        localStorage.setItem('fcm_token', token);
        try {
          const BACKEND_URL = 'https://crm-global-clean-home-production.up.railway.app';
          await fetch(`${BACKEND_URL}/api/auth/fcm-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('session_token')}`
            },
            body: JSON.stringify({ token })
          });
        } catch(e) { console.warn('[FCM] Token save failed:', e); }
      }
    });

    // ⚠️ CORRECTIF CRITIQUE : invalider le cache React Query à chaque
    // notification FCM. Sinon les nouveaux leads arrivent en DB mais
    // la page /leads ne les affiche pas (cache périmé).
    const handleFcmMessage = (payload) => {
      console.warn('[FCM] Notification received', payload?.data?.type);
      const type = payload?.data?.type || '';
      // Nouveau lead / hot lead → rafraîchir toutes les queries leads + dashboard
      if (type.includes('lead') || type === 'new_lead' || type === 'hot_lead') {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
      // Devis accepté / facture payée → rafraîchir les listes financières
      if (type.includes('quote') || type.includes('invoice') || type.includes('payment')) {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
      // Tâche, intervention, ticket → idem pour leur domaine
      if (type.includes('task')) queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (type.includes('intervention')) queryClient.invalidateQueries({ queryKey: ['planning'] });
      if (type.includes('ticket')) queryClient.invalidateQueries({ queryKey: ['tickets'] });
      // Fallback sûr : si le type n'est pas reconnu, on invalide les leads
      // (90% des notifications concernent des leads)
      if (!type) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    };

    // Écouteur continu (plus de Promise one-shot) — chaque message FCM
    // déclenche handleFcmMessage qui invalide les queries concernées.
    const unsubscribe = onForegroundMessage(handleFcmMessage);

    // Filet de sécurité : polling toutes les 60s sur les leads pour couvrir
    // le cas où FCM n'a pas pu être configuré (Safari iOS, Firefox strict,
    // utilisateur qui a refusé les notifications...). Pas de polling si FCM
    // marche car React Query gère déjà refetchOnWindowFocus.
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' });
      }
    }, 60_000);

    return () => {
      clearInterval(pollInterval);
      try { if (typeof unsubscribe === 'function') unsubscribe(); } catch {}
    };
  }, []);
  return null;
}

function AppRouter() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (location.hash?.includes('access_token=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Suspense fallback={<div className="min-h-screen" style={{background:"var(--bg-app)"}} />}><LandingPage /></Suspense>} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/join" element={<InvitationJoin />} />
      <Route path="/portal" element={<ClientPortalAtelier />} />
      <Route path="/portal/legacy" element={<ClientPortal />} />
      <Route path="/intervenant" element={<IntervenantPortalAtelier />} />
      <Route path="/intervenant/legacy" element={<IntervenantPortal />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex h-screen w-full overflow-hidden" style={{background:"var(--bg-app)"}}>
              {/* Sidebar — visible partout (gère son mode mobile via hamburger interne) */}
              <Sidebar />
              {/* Main content — plus de header top bar : Cmd+K remplace GlobalSearch, VoiceFab remplace NotificationBell (stubs) */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{background:"var(--bg-app)"}}>
                  <PWAInstallBanner />
                  <CommandPalette />
                  <VoiceFab />
        <ErrorBoundary>
        <Suspense fallback={
          <div style={{padding:'24px',minHeight:'100vh',opacity:0.5}} />
        }>
        <Routes>
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/custom" element={<DashboardCustom />} />
                    <Route path="/dashboard/legacy" element={<DashboardLegacy />} />
                    <Route path="/pipeline" element={<PipelineRiver />} />
                    <Route path="/director" element={<DirectorPasserelle />} />
                    <Route path="/director/legacy" element={<DirectorDashboard />} />
                    <Route path="/seo" element={<SeoLayout />}>
                      <Route index element={<SeoHome />} />
                      <Route path="connect" element={<SeoConnect />} />
                      <Route path="performance" element={<SeoPerformance />} />
                      <Route path="content" element={<SeoContent />} />
                      <Route path="technical" element={<SeoTechnical />} />
                      <Route path="conversion" element={<SeoConversion />} />
                      <Route path="sources" element={<SeoSources />} />
                      <Route path="globe" element={<SeoGlobe />} />
                      <Route path="ai" element={<SeoAI />} />
                      <Route path="alerts" element={<SeoAlerts />} />
                      <Route path="alerts/changelog" element={<SeoChangelog />} />
                      <Route path="content/cannibalization" element={<SeoCannibalization />} />
                      <Route path="content/orphans" element={<SeoOrphans />} />
                      <Route path="content/intent" element={<SeoIntent />} />
                      <Route path="content/gaps" element={<SeoGaps />} />
                      <Route path="technical/internal-links" element={<SeoInternalLinks />} />
                      <Route path="ai/opportunities" element={<SeoOpportunities />} />
                      <Route path="ai/actions" element={<SeoActions />} />
                      <Route path="settings" element={<SeoSettings />} />
                      <Route path="exploration" element={<SeoCockpit />} />
                    </Route>
                    <Route path="/seo/atlas" element={<SEOAtlas />} />
                    <Route path="/seo/cockpit" element={<SeoCockpit />} />
                    <Route path="/seo/legacy" element={<SEODashboard />} />
                    <Route path="/rentabilite" element={<RentabiliteBalance />} />
                    <Route path="/rentabilite/legacy" element={<RentabiliteModule />} />
                    <Route path="/chat" element={<ChatSalon />} />
                    <Route path="/chat/legacy" element={<ChatCenter />} />
                    <Route path="/leads/new" element={<LeadForm />} />
                    <Route path="/leads/:id" element={<LeadDossier />} />
                    <Route path="/leads/:id/legacy" element={<LeadDetail />} />
                    <Route path="/leads" element={<LeadsRegister />} />
                    <Route path="/leads/legacy" element={<LeadsList />} />
                    <Route path="/quotes/new" element={<QuoteForm />} />
                    {/* Legacy : /quotes/premium redirige vers /quotes/new (même composant unifié) */}
                    <Route path="/quotes/premium" element={<QuoteForm />} />
                    <Route path="/quotes" element={<QuotesCahier />} />
                    <Route path="/quotes/legacy" element={<QuotesList />} />
                    <Route path="/quotes/:id/edit" element={<QuoteForm />} />
                    <Route path="/quotes/:id" element={<QuoteView />} />
                    <Route path="/tasks" element={<TasksCarnet />} />
                    <Route path="/tasks/legacy" element={<TasksList />} />
                    <Route path="/activity" element={<ActivityChronique />} />
                    <Route path="/activity/legacy" element={<ActivityLog />} />
                    <Route path="/kanban" element={<KanbanBoard />} />
                    <Route path="/analytics" element={<AnalyticsBoussole />} />
                    <Route path="/analytics/legacy" element={<Analytics />} />
                    <Route path="/invoices" element={<InvoicesGrandLivre />} />
                    <Route path="/invoices/legacy" element={<InvoicesList />} />
                    <Route path="/invoices/new" element={<InvoiceForm />} />
                    <Route path="/invoices/:invoiceId/success" element={<PaymentSuccess />} />
                    <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
                    <Route path="/invoices/:id" element={<InvoiceView />} />
                    {/* Legacy : /invoices/premium redirige vers /invoices/new */}
                    <Route path="/invoices/premium" element={<InvoiceForm />} />
                    <Route path="/finance" element={<FinanceCoffre />} />
                    <Route path="/finance/legacy" element={<FinancialDashboard />} />
                    <Route path="/accounting-erp" element={<AccountingGrimoire />} />
                    <Route path="/accounting-erp/legacy" element={<AccountingERP />} />
                    <Route path="/accounting" element={<AccountingDashboard />} />
                    <Route path="/accounting-enterprise" element={<AccountingEnterprise />} />
                    {/* PayrollModule moved to AccountingERP/payroll-rh */}
                    <Route path="/stock" element={<StockMagasin />} />
                    <Route path="/stock/legacy" element={<StockTable />} />
                    <Route path="/planning" element={<PlanningFil />} />
                    <Route path="/planning/calendar" element={<PlanningCalendar />} />
                    <Route path="/intervenants" element={<IntervenantsEquipage />} />
                    <Route path="/intervenants/legacy" element={<IntervenantsManager />} />
                    <Route path="/integrations" element={<IntegrationsConnexions />} />
                    <Route path="/integrations/legacy" element={<Integrations />} />
                    <Route path="/ads" element={<AdsAffichage />} />
                    <Route path="/ads/legacy" element={<AdsDashboard />} />
                    <Route path="/ai" element={<AICabinet />} />
                    <Route path="/ai/legacy" element={<AICenter />} />
                    <Route path="/workflows" element={<WorkflowsRouages />} />
                    <Route path="/workflows/legacy" element={<WorkflowBuilder />} />
                    <Route path="/tickets" element={<TicketsDoleances />} />
                    <Route path="/tickets/legacy" element={<TicketsList />} />
                    <Route path="/contracts" element={<ContractsActes />} />
                    <Route path="/contracts/legacy" element={<ContractsList />} />
                    <Route path="/map" element={<MapTerritoire />} />
                    <Route path="/map/legacy" element={<InterventionsMap />} />
                    <Route path="/satisfaction" element={<SatisfactionEcho />} />
                    <Route path="/satisfaction/legacy" element={<SatisfactionDashboard />} />
                    <Route path="/documents" element={<DocumentsBibliotheque />} />
                    <Route path="/documents/legacy" element={<DocumentsManager />} />
                    <Route path="/bookings" element={<BookingRegistre />} />
                    <Route path="/bookings/legacy" element={<BookingManager />} />
                    <Route path="/settings" element={<SettingsEtabli />} />
                    <Route path="/settings/legacy" element={<SettingsPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
        </Suspense>
        </ErrorBoundary>
                </div>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <NotificationHandler />
            <React.Suspense fallback={null}>
              <GlobalSearchFull />
            </React.Suspense>
            <AppRouter />
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                style: {
                  fontFamily: 'Inter, sans-serif'
                }
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}

export default App;
