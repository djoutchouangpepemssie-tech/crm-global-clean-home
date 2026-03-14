import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LayoutDashboard, Users, FileText, MoreHorizontal, X, LogOut, Trello, CreditCard, BarChart3, CalendarDays, CheckSquare, TrendingUp, Plug, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import LeadsList from './components/leads/LeadsList';
import LeadDetail from './components/leads/LeadDetail';
import LeadForm from './components/leads/LeadForm';
import QuotesList from './components/quotes/QuotesList';
import QuoteForm from './components/quotes/QuoteForm';
import TasksList from './components/tasks/TasksList';
import ActivityLog from './components/activity/ActivityLog';
import KanbanBoard from './components/kanban/KanbanBoard';
import Analytics from './components/analytics/Analytics';
import InvoicesList from './components/invoices/InvoicesList';
import PaymentSuccess from './components/invoices/PaymentSuccess';
import FinancialDashboard from './components/invoices/FinancialDashboard';
import ClientPortal from './components/portal/ClientPortal';
import PlanningCalendar from './components/planning/PlanningCalendar';
import Integrations from './components/integrations/Integrations';
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
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl pb-safe animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Menu</h3>
              <button onClick={() => setMoreOpen(false)} className="p-2 rounded-lg hover:bg-slate-100" data-testid="more-menu-close">
                <X className="w-5 h-5 text-slate-500" />
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
                      isActive ? 'bg-violet-50 text-violet-700' : 'text-slate-600 active:bg-slate-100'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="px-3 pb-4 pt-1 border-t border-slate-100 mt-1">
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
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors touch-manipulation"
              >
                <LogOut className="w-4 h-4" />
                Deconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-slate-200 safe-bottom" data-testid="mobile-tab-bar">
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
    requestNotificationPermission().then(token => {
      if (token) {
        console.log('Push notifications enabled');
        localStorage.setItem('fcm_token', token);
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
            <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden">
              <Sidebar />
              <div className="flex-1 w-0 lg:ml-64 min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
                {/* Mobile header */}
                <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center">
                  <h1 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    <span className="text-violet-600">Global</span> Clean Home
                  </h1>
                </div>
                <div className="flex-1 pb-16 lg:pb-0">
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
                    <Route path="/" element={<Navigate to="/login" replace />} />
                  </Routes>
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
