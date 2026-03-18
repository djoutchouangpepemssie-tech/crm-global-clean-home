import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LayoutDashboard, Users, FileText, MoreHorizontal, X, LogOut, Trello, CreditCard, BarChart3, CalendarDays, CheckSquare, TrendingUp, Plug, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

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
const PlanningCalendar = lazy(() => import('./components/planning/PlanningCalendar'));
const Integrations = lazy(() => import('./components/integrations/Integrations'));
const AdsDashboard = lazy(() => import('./components/ads/AdsDashboard'));
const AICenter = lazy(() => import('./components/ai/AICenter'));
const WorkflowBuilder = lazy(() => import('./components/workflows/WorkflowBuilder'));
const TicketsList = lazy(() => import('./components/tickets/TicketsList'));
import './App.css';
import { requestNotificationPermission, onMessageListener } from './firebase';

const moreNavItems = [
  { to: '/kanban', icon: Trello, label: 'Kanban' },
  { to: '/invoices', icon: CreditCard, label: 'Factures' },
  { to: '/finance', icon: BarChart3, label: 'Finance' },
  { to: '/planning', icon: CalendarDays, label: 'Planning' },
  { to: '/tasks', icon: CheckSquare, label: 'Taches' },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/integrations', icon: Plug, label: 'Integrations' },
  { to: '/activity', icon: Activity, label: 'Journal' },
];

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
            <nav className="grid grid-cols-3 gap-1 p-3">
              {moreNavItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  data-testid={`more-nav-${item.to.slice(1)}`}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors touch-manipulation ${
                      isActive ? "bg-violet-500/10 text-violet-300" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-white/5 safe-bottom" style={{background:"hsl(224,71%,5%)"}} data-testid="mobile-tab-bar">
        <div className="flex items-stretch justify-around h-14">
          <NavLink to="/dashboard" data-testid="tab-dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors touch-manipulation ${
                isActive ? 'text-violet-600' : 'text-slate-400'
              }`
            }>
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/leads" data-testid="tab-leads"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors touch-manipulation ${
                isActive ? 'text-violet-600' : 'text-slate-400'
              }`
            }>
            <Users className="w-5 h-5" />
            <span>Leads</span>
          </NavLink>
          <NavLink to="/quotes" data-testid="tab-quotes"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors touch-manipulation ${
                isActive ? 'text-violet-600' : 'text-slate-400'
              }`
            }>
            <FileText className="w-5 h-5" />
            <span>Devis</span>
          </NavLink>
          <button onClick={() => setMoreOpen(true)} data-testid="tab-more"
            className="flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium text-slate-400 touch-manipulation">
            <MoreHorizontal className="w-5 h-5" />
            <span>Menu</span>
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
                <div className="lg:hidden flex-shrink-0 sticky top-0 z-30 border-b border-white/5 px-4 py-3 flex items-center justify-between"
                  style={{background:'hsl(224,71%,5%)'}}>
                  <h1 className="text-base font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>
                    <span className="text-violet-400">Global</span> Clean Home
                  </h1>
                  <div className="flex items-center gap-2">
                    <NotificationBell />
                    <button onClick={() => setMobileMenuOpen(true)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Mobile drawer */}
                {mobileMenuOpen && (
                  <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <div className="relative flex-shrink-0" onClick={() => setMobileMenuOpen(false)}>
                      <Sidebar />
                    </div>
                  </div>
                )}
                {/* Desktop header avec cloche */}
                <div className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-white/5 flex-shrink-0" style={{background:'hsl(224,71%,5%)'}}>

                  <NotificationBell />
                </div>
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
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
