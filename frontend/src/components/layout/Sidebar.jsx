import React, { useState } from 'react';
import { NotificationBell } from '../notifications/NotificationCenter';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, CheckSquare, Activity, LogOut, 
  TrendingUp, Trello, CreditCard, Zap, BarChart3, CalendarDays, Plug, Ticket,
  Sparkles, ChevronLeft, ChevronRight, Bell, Settings, Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { to: '/director', icon: Sparkles, label: 'Vue Directeur', testId: 'nav-director' },
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-dashboard' },
      { to: '/kanban', icon: Trello, label: 'Pipeline', testId: 'nav-kanban' },
      { to: '/leads', icon: Users, label: 'Leads', testId: 'nav-leads', badge: null },
    ]
  },
  {
    label: 'Commercial',
    items: [
      { to: '/quotes', icon: FileText, label: 'Devis', testId: 'nav-quotes' },
      { to: '/invoices', icon: CreditCard, label: 'Factures', testId: 'nav-invoices' },
      { to: '/finance', icon: BarChart3, label: 'Finance', testId: 'nav-finance' },
    ]
  },
  {
    label: 'Opérations',
    items: [
      { to: '/planning', icon: CalendarDays, label: 'Planning', testId: 'nav-planning' },
      { to: '/tasks', icon: CheckSquare, label: 'Tâches', testId: 'nav-tasks' },
      { to: '/analytics', icon: TrendingUp, label: 'Analytics', testId: 'nav-analytics' },
      { to: '/ads', icon: BarChart3, label: 'Publicites', testId: 'nav-ads' },
      { to: '/seo', icon: Search, label: 'SEO', testId: 'nav-seo' },
      { to: '/rentabilite', icon: TrendingUp, label: 'Rentabilite', testId: 'nav-rentabilite' },
      { to: '/ai', icon: Sparkles, label: 'Centre IA', testId: 'nav-ai' },
      { to: '/workflows', icon: Zap, label: 'Workflows', testId: 'nav-workflows' },
      { to: '/tickets', icon: Ticket, label: 'Tickets', testId: 'nav-tickets' },
      { to: '/notifications', icon: Bell, label: 'Notifications', testId: 'nav-notifs' },
    ]
  },
  {
    label: 'Système',
    items: [
      { to: '/integrations', icon: Plug, label: 'Intégrations', testId: 'nav-integrations' },
      { to: '/activity', icon: Activity, label: 'Journal', testId: 'nav-activity' },
    ]
  }
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={`flex flex-col h-screen transition-all duration-300 ease-in-out flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
      style={{
        background: 'linear-gradient(180deg, hsl(224,71%,5%) 0%, hsl(224,71%,4%) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-3 border-b border-white/5 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{boxShadow: '0 0 15px rgba(139,92,246,0.3)'}}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-100 truncate" style={{fontFamily:'Manrope,sans-serif'}}>
              Global Clean
            </p>
            <p className="text-[10px] text-slate-500 truncate">CRM Pro</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 hide-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-testid={item.testId}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150 group relative ${
                      isActive
                        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/4'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400 rounded-r" />
                    )}
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {!collapsed && (
                      <span className="text-xs font-medium truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t border-white/5 p-2 space-y-1">
        {/* User */}
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/3 mb-2">
            {user.picture ? (
              <img src={user.picture} alt="" className="w-7 h-7 rounded-full ring-1 ring-violet-500/30 flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-violet-400 text-xs font-bold">{user.name?.[0] || 'U'}</span>
              </div>
            )}
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Portail client */}
        <a href="/portal" target="_blank" rel="noopener noreferrer"
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-slate-500 hover:text-violet-300 hover:bg-violet-500/10 transition-all text-xs border border-transparent hover:border-violet-500/20 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Portail client' : undefined}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {!collapsed && <span>Portail client</span>}
        </a>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all text-xs ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Réduire</span></>}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          data-testid="logout-button"
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/5 transition-all text-xs ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
