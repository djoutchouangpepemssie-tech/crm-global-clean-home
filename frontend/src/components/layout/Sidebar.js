import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, FileText, CheckSquare, Activity, LogOut, TrendingUp, Trello } from 'lucide-react';
import { cn } from '../../lib/utils';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-dashboard' },
    { to: '/kanban', icon: Trello, label: 'Kanban', testId: 'nav-kanban' },
    { to: '/leads', icon: Users, label: 'Leads', testId: 'nav-leads' },
    { to: '/quotes', icon: FileText, label: 'Devis', testId: 'nav-quotes' },
    { to: '/tasks', icon: CheckSquare, label: 'Tâches', testId: 'nav-tasks' },
    { to: '/analytics', icon: TrendingUp, label: 'Analytics', testId: 'nav-analytics' },
    { to: '/activity', icon: Activity, label: 'Journal', testId: 'nav-activity' }
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <img 
            src="https://customer-assets.emergentagent.com/job_crm-clean-home/artifacts/2asd8rqs_GLOBAL%20CLEAN%20logo%202%20%281%29.png"
            alt="Global Clean Home"
            className="h-10 object-contain"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.testId}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={user?.picture || 'https://ui-avatars.com/api/?background=7C3AED&color=fff&name=' + encodeURIComponent(user?.name || 'User')}
            alt={user?.name}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          data-testid="logout-button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
