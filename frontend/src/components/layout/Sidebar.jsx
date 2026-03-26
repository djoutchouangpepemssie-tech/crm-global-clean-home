import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, CheckSquare, Activity, LogOut,
  TrendingUp, Trello, CreditCard, Zap, BarChart3, CalendarDays, Plug,
  Sparkles, ChevronLeft, ChevronRight, Bell, Search, MessageSquare,
  Ticket, UserCheck, Globe, Star, BarChart2, Home, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navGroups = [
  {
    label: '🏠 Principal',
    color: '#8b5cf6',
    defaultOpen: true,
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/director',   icon: Sparkles,        label: 'Vue Directeur' },
      { to: '/leads',      icon: Users,           label: 'Leads' },
      { to: '/kanban',     icon: Trello,          label: 'Pipeline Kanban' },
    ]
  },
  {
    label: '💼 Commercial',
    color: '#f97316',
    defaultOpen: false,
    items: [
      { to: '/quotes',   icon: FileText,  label: 'Devis' },
      { to: '/invoices', icon: CreditCard,label: 'Factures' },
      { to: '/finance',  icon: BarChart3, label: 'Finance' },
    ]
  },
  {
    label: '📅 Opérations',
    color: '#10b981',
    defaultOpen: false,
    items: [
      { to: '/planning',     icon: CalendarDays, label: 'Planning' },
      { to: '/intervenants', icon: UserCheck,    label: 'Intervenants' },
      { to: '/tasks',        icon: CheckSquare,  label: 'Tâches' },
      { to: '/tickets',      icon: Ticket,       label: 'Tickets SAV' },
    ]
  },
  {
    label: '📊 Analytics',
    color: '#f59e0b',
    defaultOpen: false,
    items: [
      { to: '/analytics',   icon: TrendingUp, label: 'Analytics' },
      { to: '/rentabilite', icon: BarChart2,  label: 'Rentabilité' },
      { to: '/ads',         icon: Globe,      label: 'Publicités' },
      { to: '/seo',         icon: Search,     label: 'SEO' },
    ]
  },
  {
    label: '⚙️ Outils',
    color: '#60a5fa',
    defaultOpen: false,
    items: [
      { to: '/workflows',    icon: Zap,          label: 'Workflows Auto' },
      { to: '/ai',           icon: Star,         label: 'Centre IA' },
      { to: '/chat',         icon: MessageSquare,label: 'Messages' },
      { to: '/integrations', icon: Plug,         label: 'Intégrations' },
      { to: '/activity',     icon: Activity,     label: 'Journal' },
    ]
  },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState(
    navGroups.reduce((acc, g) => ({ ...acc, [g.label]: g.defaultOpen }), {})
  );

  const toggleGroup = (label) => {
    setOpenGroups(p => ({ ...p, [label]: !p[label] }));
  };

  const isGroupActive = (group) =>
    group.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'));

  return (
    <aside
      className={`flex flex-col h-screen transition-all duration-300 ease-in-out flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}
      style={{background:'linear-gradient(180deg,hsl(224,71%,5%) 0%,hsl(224,71%,4%) 100%)',borderRight:'1px solid rgba(255,255,255,0.05)'}}>

      {/* Logo */}
      <div className={`flex items-center h-14 px-3 border-b border-white/5 flex-shrink-0 ${collapsed?'justify-center':'gap-3'}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 0 15px rgba(249,115,22,0.3)'}}>
          <span className="text-lg">🏠</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-black text-slate-100 truncate" style={{fontFamily:'Manrope,sans-serif'}}>Global Clean Home</p>
            <p className="text-[10px] text-emerald-500/70 truncate font-semibold">CRM Pro</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1 hide-scrollbar">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label];
          const isActive = isGroupActive(group);

          return (
            <div key={group.label}>
              {/* Bouton catégorie */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all mb-0.5 ${
                    isActive ? 'text-slate-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={{background: isActive || isOpen ? `${group.color}12` : 'transparent',
                           border: isActive || isOpen ? `1px solid ${group.color}20` : '1px solid transparent'}}>
                  <span className="text-xs font-black">{group.label}</span>
                  <div className="flex items-center gap-1.5">
                    {isActive && <div className="w-1.5 h-1.5 rounded-full" style={{background:group.color}}/>}
                    <ChevronDown
                      className="w-3.5 h-3.5 transition-transform duration-200"
                      style={{transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: group.color}}/>
                  </div>
                </button>
              ) : (
                <div className="flex justify-center py-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background: isActive ? group.color : 'rgba(255,255,255,0.1)'}}/>
                </div>
              )}

              {/* Items */}
              {(isOpen || collapsed) && (
                <div className={`space-y-0.5 ${!collapsed ? 'ml-2 pl-2 border-l' : ''}`}
                  style={{borderColor: !collapsed ? `${group.color}25` : 'transparent'}}>
                  {group.items.map((item) => {
                    const isItemActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all group relative text-xs font-medium ${
                          isItemActive ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/4'
                        } ${collapsed ? 'justify-center' : ''}`}
                        style={isItemActive ? {background:`${group.color}20`,color:group.color} : {}}>
                        {isItemActive && !collapsed && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r" style={{background:group.color}}/>
                        )}
                        <item.icon className="w-4 h-4 flex-shrink-0"
                          style={{color: isItemActive ? group.color : ''}}/>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t border-white/5 p-2 space-y-1">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/3 mb-2 border border-white/5">
            {user.picture ? (
              <img src={user.picture} alt="" className="w-7 h-7 rounded-full ring-1 ring-orange-500/30 flex-shrink-0"/>
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                <span className="text-white text-xs font-black">{user.name?.[0]||'U'}</span>
              </div>
            )}
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-300 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Portails */}
        {!collapsed && (
          <div className="space-y-1 mb-1">
            <a href="/portal" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all text-xs border border-transparent hover:border-orange-500/20">
              <Home className="w-3.5 h-3.5 flex-shrink-0"/>
              <span>Portail client</span>
            </a>
            <a href="/intervenant" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs border border-transparent hover:border-emerald-500/20">
              <UserCheck className="w-3.5 h-3.5 flex-shrink-0"/>
              <span>Portail intervenant</span>
            </a>
          </div>
        )}

        <button onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all text-xs ${collapsed?'justify-center':''}`}>
          {collapsed ? <ChevronRight className="w-4 h-4"/> : <><ChevronLeft className="w-4 h-4"/><span>Réduire</span></>}
        </button>

        <button onClick={logout}
          className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/5 transition-all text-xs ${collapsed?'justify-center':''}`}>
          <LogOut className="w-4 h-4 flex-shrink-0"/>
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
