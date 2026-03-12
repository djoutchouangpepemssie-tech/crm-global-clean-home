import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/auth/Login';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import LeadsList from './components/leads/LeadsList';
import LeadDetail from './components/leads/LeadDetail';
import QuotesList from './components/quotes/QuotesList';
import QuoteForm from './components/quotes/QuoteForm';
import TasksList from './components/tasks/TasksList';
import ActivityLog from './components/activity/ActivityLog';
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
      
      {/* Protected routes with sidebar layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex">
              <Sidebar />
              <div className="flex-1 ml-64">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/leads" element={<LeadsList />} />
                  <Route path="/leads/:id" element={<LeadDetail />} />
                  <Route path="/quotes" element={<QuotesList />} />
                  <Route path="/quotes/new" element={<QuoteForm />} />
                  <Route path="/tasks" element={<TasksList />} />
                  <Route path="/activity" element={<ActivityLog />} />
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
