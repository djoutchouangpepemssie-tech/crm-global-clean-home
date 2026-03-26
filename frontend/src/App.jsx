import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LayoutDashboard, Users, FileText, MoreHorizontal, X, LogOut, Trello, CreditCard, BarChart3, CalendarDays, CheckSquare, TrendingUp, Plug, Activity, ChevronRight, Briefcase, Star, Settings, Globe, MessageSquare, Ticket, Workflow, BarChart2, UserCheck } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PWAInstallBanner, { OfflineIndicator } from './components/pwa/PWAInstallBanner';

import { startKeepAlive } from './lib/keepAlive.js';

// Démarrer le keepalive backend
startKeepAlive();
import Login from './components/auth/Login';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import { lazy, Suspense, Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('CRM Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'hsl(224,71%,4%)',flexDirection:'column',gap:'16px',padding:'24px'}}>
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

// Prefetch les pages les plus visitées après le premier render
const prefetchPages = () => {
  import('./components/leads/LeadsList');
  import('./components/dashboard/Dashboard');
  import('./components/quotes/QuotesList');
};
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(prefetchPages, 2000));
}
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
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
import './App.css';
import { requestNotificationPermission, onMessageListener } from './firebase';

const menuCategories = [
  {
    label: '🎯 Commercial',
    color: '#8b5cf6',
    items: [
      { to: '/leads',    icon: Users,        label: 'Leads' },
      { to: '/quotes',   icon: FileText,     label: 'Devis' },
      { to: '/invoices', icon: CreditCard,   label: 'Factures' },
      { to: '/finance',  icon: BarChart3,    label: 'Finance' },
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
    label: '⚙️ Outils',
    color: '#60a5fa',
    items: [
      { to: '/workflows',    icon: Workflow,      label: 'Workflows' },
      { to: '/integrations', icon: Plug,          label: 'Intégrations' },
      { to: '/ai',           icon: Star,          label: 'IA' },
      { to: '/chat',         icon: MessageSquare, label: 'Messages' },
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
        console.log('Push notifications enabled:', token);
        localStorage.setItem('fcm_token', token);
        // Save token to backend
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
        } catch(e) { console.log('FCM token save failed:', e); }
      }
    });
    onMessageListener().then(payload => {
      console.log('Notification received:', payload);
    });
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
      <Route path="/login" element={<Login />} />
      <Route path="/portal" element={<ClientPortal />} />
      <Route path="/intervenant" element={<IntervenantPortal />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex h-screen w-full overflow-hidden bg-dark-1">
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
                <div className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-white/5 flex-shrink-0" style={{background:"hsl(224,71%,5%)",zIndex:9000,position:"relative"}}>
                  <NotificationBell />
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
                  <PWAInstallBanner />
        <ErrorBoundary>
        <Suspense fallback={
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'hsl(224,71%,4%)',flexDirection:'column',gap:'12px'}}>
            <div style={{width:'40px',height:'40px',border:'2px solid rgba(139,92,246,0.3)',borderTop:'2px solid #8b5cf6',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
            <p style={{color:'#64748b',fontSize:'14px'}}>Chargement...</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        }>
        <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/director" element={<DirectorDashboard />} />
                    <Route path="/seo" element={<SEODashboard />} />
                    <Route path="/rentabilite" element={<RentabiliteModule />} />
                    <Route path="/chat" element={<ChatCenter />} />
                    <Route path="/leads/new" element={<LeadForm />} />
                    <Route path="/leads/:id" element={<LeadDetail />} />
                    <Route path="/leads" element={<LeadsList />} />
                    <Route path="/quotes/new" element={<QuoteForm />} />
                    <Route path="/quotes" element={<QuotesList />} />
                    <Route path="/tasks" element={<TasksList />} />
                    <Route path="/activity" element={<ActivityLog />} />
                    <Route path="/kanban" element={<KanbanBoard />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/invoices" element={<InvoicesList />} />
                    <Route path="/invoices/:invoiceId/success" element={<PaymentSuccess />} />
                    <Route path="/finance" element={<FinancialDashboard />} />
                    <Route path="/planning" element={<PlanningCalendar />} />
                    <Route path="/intervenants" element={<IntervenantsManager />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/ads" element={<AdsDashboard />} />
                    <Route path="/ai" element={<AICenter />} />
                    <Route path="/workflows" element={<WorkflowBuilder />} />
                    <Route path="/tickets" element={<TicketsList />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />
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
    <BrowserRouter>
      <AuthProvider>
        <NotificationHandler />
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
    </BrowserRouter>
  );
}

export default App;
