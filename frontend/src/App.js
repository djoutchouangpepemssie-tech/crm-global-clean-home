import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/auth/Login';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
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
import './App.css';

function AppRouter() {
  const location = useLocation();

  // Check URL fragment (not query params) for session_id BEFORE any routing
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal" element={<ClientPortal />} />
      
      {/* Protected routes with sidebar layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex">
              <Sidebar />
              <div className="flex-1 ml-64 min-h-screen bg-slate-50">
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
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
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
