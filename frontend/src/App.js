import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Menu } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
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

function MobileHeader({ onMenuToggle }) {
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        data-testid="mobile-menu-btn"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>
      <h1 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
        <span className="text-violet-600">Global</span> Clean Home
      </h1>
    </div>
  );
}

function AppRouter() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (location.hash?.includes('session_id=')) {
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
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              <div className="flex-1 w-0 lg:ml-64 min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
                <MobileHeader onMenuToggle={() => setSidebarOpen(true)} />
                <div className="flex-1">
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
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
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
    <BrowserRouter>
      <AuthProvider>
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
