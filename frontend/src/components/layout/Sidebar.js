import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, CheckSquare, Activity, LogOut, TrendingUp, Trello, CreditCard, BarChart3, CalendarDays, Plug, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout } = useAuth();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-dashboard' },
    { to: '/kanban', icon: Trello, label: 'Kanban', testId: 'nav-kanban' },
    { to: '/leads', icon: Users, label: 'Leads', testId: 'nav-leads' },
    { to: '/quotes', icon: FileText, label: 'Devis', testId: 'nav-quotes' },
    { to: '/invoices', icon: CreditCard, label: 'Factures', testId: 'nav-invoices' },
    { to: '/finance', icon: BarChart3, label: 'Finance', testId: 'nav-finance' },
    { to: '/planning', icon: CalendarDays, label: 'Planning', testId: 'nav-planning' },
    { to: '/tasks', icon: CheckSquare, label: 'Taches', testId: 'nav-tasks' },
    { to: '/analytics', icon: TrendingUp, label: 'Analytics', testId: 'nav-analytics' },
    { to: '/integrations', icon: Plug, label: 'Integrations', testId: 'nav-integrations' },
    { to: '/activity', icon: Activity, label: 'Journal', testId: 'nav-activity' }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={`w-64 h-screen fixed left-0 top-0 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        data-testid="sidebar"
      >
        {/* Logo + close btn */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <span className="text-violet-600">Global</span> Clean Home
            </h1>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 uppercase tracking-widest">CRM Pro</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            data-testid="sidebar-close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testId}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 nav-active'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0 transition-colors" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-100">
          <a
            href="/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors mb-2"
          >
            Portail client
          </a>
          <button
            data-testid="logout-button"
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors w-full"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Deconnexion
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
