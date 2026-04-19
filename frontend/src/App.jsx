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
const Dashboard = lazy(() => import('./components/dashboard/DynamicDashboard'));
const DashboardLegacy = lazy(() => import('./components/dashboard/Dashboard'));
const LeadsList = lazy(() => import('./components/leads/LeadsList'));
const LeadDetail = lazy(() => import('./components/leads/LeadDetail'));
const LeadForm = lazy(() => import('./components/leads/LeadForm'));
const QuotesList = lazy(() => import('./components/quotes/QuotesList'));
const QuoteForm = lazy(() => import('./components/quotes/QuoteForm'));
const TasksList = lazy(() => import('./components/tasks/TasksList'));
const ActivityLog = lazy(() => import('./components/activity/ActivityLog'));
const KanbanBoard = lazy(() => import('./components/kanban/KanbanBoard'));
const Analytics = lazy(() => import('./components/analytics/Analytics'));
const InvoicesList = lazy(() => import('./components/invoices/InvoicesList'));
const PaymentSuccess = lazy(() => import('./components/invoices/PaymentSuccess'));
const FinancialDashboard = lazy(() => import('./components/invoices/FinancialDashboard'));
const ClientPortal = lazy(() => import('./components/portal/ClientPortal'));
const IntervenantPortal = lazy(() => import('./components/portal/IntervenantPortal'));
const IntervenantsManager = lazy(() => import('./components/planning/IntervenantsManager'));
const PlanningCalendar = lazy(() => import('./components/planning/PlanningCalendar'));
const Integrations = lazy(() => import('./components/integrations/Integrations'));
const AdsDashboard = lazy(() => import('./components/ads/AdsDashboard'));
const AICenter = lazy(() => import('./components/ai/AICenter'));
const WorkflowBuilder = lazy(() => import('./components/workflows/WorkflowBuilder'));
const TicketsList = lazy(() => import('./components/tickets/TicketsList'));
const ContractsList = lazy(() => import('./components/contracts/ContractsList'));
const InterventionsMap = lazy(() => import('./components/map/InterventionsMap'));
const SatisfactionDashboard = lazy(() => import('./components/satisfaction/SatisfactionDashboard'));
const DocumentsManager = lazy(() => import('./components/documents/DocumentsManager'));
const BookingManager = lazy(() => import('./components/booking/BookingManager'));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'));
const InvoiceForm = lazy(() => import('./components/invoices/InvoiceForm'));
const StockTable = lazy(() => import('./components/stock/StockTable'));
const AccountingDashboard = lazy(() => import('./components/accounting/AccountingDashboard'));
const AccountingEnterprise = lazy(() => import('./components/accounting/AccountingEnterprise'));
const AccountingERP = lazy(() => import('./components/accounting/AccountingERP'));
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

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="more-menu-overlay">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl pb-safe animate-slide-up" style={{background:"hsl(224,71%,7%)",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 -10px 40px rgba(0,0,0,0.5)"}}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 className="text-base font-bold text-slate-100" style={{fontFamily:"Manrope,sans-serif"}}>Menu</h3>
              <button onClick={() => setMoreOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition-all" data-testid="more-menu-close">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <AccordionMenu setMoreOpen={setMoreOpen} />
            <div className="px-3 pb-4 pt-1 border-t border-white/5 mt-1">
              <a
                href="/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-slate-400 hover:text-violet-600 py-2"
              >
                Portail client
              </a>
              <button
                onClick={logout}
                data-testid="mobile-logout-btn"
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors touch-manipulation"
              >
                <LogOut className="w-4 h-4" />
                Deconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t safe-bottom"
        style={{background:"rgba(9,15,35,0.97)",borderColor:"rgba(255,255,255,0.08)",backdropFilter:"blur(20px)"}}>
        <div className="flex items-stretch justify-around h-16">
          {[
            {to:"/dashboard", icon:LayoutDashboard, label:"Dashboard", testId:"tab-dashboard"},
            {to:"/leads",     icon:Users,            label:"Leads",     testId:"tab-leads"},
            {to:"/planning",  icon:CalendarDays,     label:"Planning",  testId:"tab-planning"},
            {to:"/tasks",     icon:CheckSquare,      label:"Tâches",    testId:"tab-tasks"},
          ].map(tab => (
            <NavLink key={tab.to} to={tab.to} data-testid={tab.testId}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-semibold transition-all touch-manipulation rounded-xl mx-0.5 my-1 ${
                  isActive ? 'text-violet-400' : 'text-slate-600'
                }`
              }
              style={({isActive}) => isActive ? {background:"rgba(139,92,246,0.12)"} : {}}>
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(true)} data-testid="tab-more"
            className="flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-semibold text-slate-600 touch-manipulation rounded-xl mx-0.5 my-1 hover:text-slate-400 hover:bg-white/5 transition-all">
            <MoreHorizontal className="w-5 h-5" />
            <span>Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
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
      <Route path="/portal" element={<ClientPortal />} />
      <Route path="/intervenant" element={<IntervenantPortal />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex h-screen w-full overflow-hidden" style={{background:"var(--bg-app)"}}>
              {/* Sidebar - hidden on mobile */}
              <div className="hidden lg:flex flex-shrink-0">
                <Sidebar />
              </div>
              {/* Main content */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile header */}
                <div className="lg:hidden flex-shrink-0 sticky top-0 border-b border-white/5 px-4 py-3 flex items-center justify-between" style={{background:"hsl(224,71%,5%)",zIndex:9000,position:"sticky"}}>
                  <h1 className="text-base font-bold text-slate-100" style={{fontFamily:"Manrope,sans-serif"}}>
                    <span className="text-violet-400">Global</span> Clean Home
                  </h1>
                  <div className="flex items-center gap-2">
                    <NotificationBell />
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      className="p-2 rounded-lg text-slate-400 border border-white/10"
                      style={{background:"rgba(255,255,255,0.05)",zIndex:9001,position:"relative",touchAction:"manipulation"}}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Desktop header avec notifications */}
                <div className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-white/5 flex-shrink-0" style={{background:"hsl(224,71%,5%)",zIndex:9000,position:"relative"}}>
                  <React.Suspense fallback={null}>
                    <GlobalSearchTrigger />
                  </React.Suspense>
                  <NotificationBell />
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0" style={{background:"var(--bg-app)"}}>
                  <PWAInstallBanner />
                  <CommandPalette />
        <ErrorBoundary>
        <Suspense fallback={
          <div style={{padding:'24px',minHeight:'100vh',opacity:0.5}} />
        }>
        <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/legacy" element={<DashboardLegacy />} />
                    <Route path="/director" element={<DirectorDashboard />} />
                    <Route path="/seo" element={<SEODashboard />} />
                    <Route path="/rentabilite" element={<RentabiliteModule />} />
                    <Route path="/chat" element={<ChatCenter />} />
                    <Route path="/leads/new" element={<LeadForm />} />
                    <Route path="/leads/:id" element={<LeadDetail />} />
                    <Route path="/leads" element={<LeadsList />} />
                    <Route path="/quotes/new" element={<QuoteForm />} />
                    {/* Legacy : /quotes/premium redirige vers /quotes/new (même composant unifié) */}
                    <Route path="/quotes/premium" element={<QuoteForm />} />
                    <Route path="/quotes" element={<QuotesList />} />
                    <Route path="/tasks" element={<TasksList />} />
                    <Route path="/activity" element={<ActivityLog />} />
                    <Route path="/kanban" element={<KanbanBoard />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/invoices" element={<InvoicesList />} />
                    <Route path="/invoices/new" element={<InvoiceForm />} />
                    <Route path="/invoices/:invoiceId/success" element={<PaymentSuccess />} />
                    {/* Legacy : /invoices/premium redirige vers /invoices/new */}
                    <Route path="/invoices/premium" element={<InvoiceForm />} />
                    <Route path="/finance" element={<FinancialDashboard />} />
                    <Route path="/accounting-erp" element={<AccountingERP />} />
                    <Route path="/accounting" element={<AccountingDashboard />} />
                    <Route path="/accounting-enterprise" element={<AccountingEnterprise />} />
                    {/* PayrollModule moved to AccountingERP/payroll-rh */}
                    <Route path="/stock" element={<StockTable />} />
                    <Route path="/planning" element={<PlanningCalendar />} />
                    <Route path="/intervenants" element={<IntervenantsManager />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/ads" element={<AdsDashboard />} />
                    <Route path="/ai" element={<AICenter />} />
                    <Route path="/workflows" element={<WorkflowBuilder />} />
                    <Route path="/tickets" element={<TicketsList />} />
                    <Route path="/contracts" element={<ContractsList />} />
                    <Route path="/map" element={<InterventionsMap />} />
                    <Route path="/satisfaction" element={<SatisfactionDashboard />} />
                    <Route path="/documents" element={<DocumentsManager />} />
                    <Route path="/bookings" element={<BookingManager />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
        </Suspense>
        </ErrorBoundary>
                </div>
                <MobileTabBar />
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
