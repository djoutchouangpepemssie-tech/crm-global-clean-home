import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, CheckSquare, Activity, LogOut,
  TrendingUp, Trello, CreditCard, Zap, BarChart3, CalendarDays, Plug, BookOpen,
  Sparkles, ChevronLeft, ChevronRight, Bell, Search, MessageSquare,
  Ticket, UserCheck, Globe, Star, BarChart2, Home, ChevronDown,
  RefreshCw, MapPin, CalendarCheck, Heart, FolderOpen, Settings,
  AlertCircle, Clock, Package, DollarSign, Receipt
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import BACKEND_URL from '../../config.js';
import { useTheme } from '../../contexts/ThemeContext';
import { useTheme } from '../../contexts/ThemeContext';
const API_URL = BACKEND_URL + '/api';

/* ────────────────────────────────────────
   Nav structure
──────────────────────────────────────── */
const navGroups = [
  {
    label: '🏠 Principal',
    color: '#8b5cf6',
    defaultOpen: true,
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',       shortcut: null },
      { to: '/director',  icon: Sparkles,        label: 'Vue Directeur',   shortcut: null },
      { to: '/leads',     icon: Users,           label: 'Leads',           shortcut: null, badge: 'leads' },
      { to: '/kanban',    icon: Trello,          label: 'Pipeline Kanban', shortcut: null },
    ]
  },
  {
    label: '💼 Commercial',
    color: '#f97316',
    defaultOpen: false,
    items: [
      { to: '/quotes',       icon: FileText,     label: 'Devis',         badge: 'devis' },
      { to: '/quotes/premium',   icon: Receipt,     label: 'Devis Premium' },
      { to: '/invoices',     icon: CreditCard,   label: 'Factures',      badge: 'factures' },
      { to: '/invoices/premium', icon: CreditCard,   label: 'Factures Premium' },
      { to: '/finance',      icon: BarChart3,    label: 'Finance' },
      { to: '/bookings',     icon: CalendarCheck,label: 'Réservations' },
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
      { to: '/tickets',      icon: Ticket,       label: 'Tickets SAV',   badge: 'tickets' },
      { to: '/contracts',    icon: RefreshCw,    label: 'Contrats' },
      { to: '/map',          icon: MapPin,       label: 'Carte' },
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
    label: '💰 Comptabilité & Stocks',
    color: '#8b5cf6',
    defaultOpen: false,
    items: [
      { to: '/accounting-erp', icon: BookOpen,   label: '📊 ERP Financier' },
      { to: '/accounting',     icon: DollarSign, label: 'Comptabilité' },
      { to: '/stock',          icon: Package,    label: 'Gestion Stock' },
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
      { to: '/satisfaction', icon: Heart,        label: 'Satisfaction' },
      { to: '/documents',    icon: FolderOpen,   label: 'Documents' },
      { to: '/integrations', icon: Plug,         label: 'Intégrations' },
      { to: '/activity',     icon: Activity,     label: 'Journal' },
      { to: '/settings',     icon: Settings,     label: 'Paramètres' },
    ]
  },
];

/* ────────────────────────────────────────
   Tooltip (shown when sidebar is collapsed)
──────────────────────────────────────── */
const Tooltip = ({ label, color }) => (
  <div
    className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none
               px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl
               border border-white/10 text-slate-100"
    style={{ background: 'rgba(10,6,20,0.97)', boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 10px ${color}30` }}
  >
    {label}
    <div
      className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent"
      style={{ borderRightColor: 'rgba(10,6,20,0.97)' }}
    />
  </div>
);

/* ────────────────────────────────────────
   Badge counter pill
──────────────────────────────────────── */
const CountBadge = ({ count, color }) => {
  if (!count) return null;
  return (
    <span
      className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

/* ────────────────────────────────────────
   Main Sidebar component
──────────────────────────────────────── */
const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  /* ── State ── */
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; }
    catch { return false; }
  });

  const [openGroups, setOpenGroups] = useState(
    navGroups.reduce((acc, g) => ({ ...acc, [g.label]: g.defaultOpen }), {})
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [badges, setBadges] = useState({});
  const searchRef = useRef(null);

  /* ── Persist collapsed state ── */
  useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', String(collapsed)); }
    catch {}
  }, [collapsed]);

  /* ── Auto-open group that contains the active route ── */
  useEffect(() => {
    navGroups.forEach(g => {
      const isActive = g.items.some(
        item => location.pathname === item.to || location.pathname.startsWith(item.to + '/')
      );
      if (isActive) {
        setOpenGroups(prev => ({ ...prev, [g.label]: true }));
      }
    });
  }, [location.pathname]);

  /* ── Fetch live counters ── */
  const { prefs, updateTheme } = useTheme();
  const isDark = prefs.theme === 'dark';
  const toggleTheme = () => updateTheme('theme', isDark ? 'light' : 'dark');

  const { prefs, updateTheme } = useTheme();
  const isDark = prefs.theme === 'dark';
  const toggleTheme = () => updateTheme('theme', isDark ? 'light' : 'dark');

  const fetchBadges = useCallback(async () => {
    try {
      const [leadsRes, devisRes, facturesRes, ticketsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/leads?status=nouveau&limit=1`, { withCredentials: true }),
        axios.get(`${API_URL}/quotes?status=pending&limit=1`, { withCredentials: true }),
        axios.get(`${API_URL}/invoices?status=overdue&limit=1`, { withCredentials: true }),
        axios.get(`${API_URL}/tickets?status=open&limit=1`, { withCredentials: true }),
      ]);

      const getCount = (res, paths) => {
        if (res.status !== 'fulfilled') return null;
        const d = res.value.data;
        for (const p of paths) {
          if (d?.[p] !== undefined) return d[p];
        }
        if (Array.isArray(d)) return d.length || null;
        return null;
      };

      setBadges({
        leads:    getCount(leadsRes,    ['total','count','totalCount']),
        devis:    getCount(devisRes,    ['total','count','totalCount']),
        factures: getCount(facturesRes, ['total','count','totalCount']),
        tickets:  getCount(ticketsRes,  ['total','count','totalCount']),
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchBadges]);

  /* ── Search filter ── */
  const allItems = navGroups.flatMap(g => g.items.map(i => ({ ...i, groupColor: g.color, groupLabel: g.label })));
  const filteredItems = searchQuery.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const toggleGroup = (label) => setOpenGroups(p => ({ ...p, [label]: !p[label] }));

  const isGroupActive = (group) =>
    group.items.some(item =>
      location.pathname === item.to || location.pathname.startsWith(item.to + '/')
    );

  /* ── Role badge ── */
  const roleBadge = user?.role === 'admin' ? { label: 'Admin', color: '#f97316' }
    : user?.role === 'manager' ? { label: 'Manager', color: '#8b5cf6' }
    : { label: 'Membre', color: '#60a5fa' };

  return (
    <aside
      className="flex flex-col h-screen transition-all duration-300 ease-in-out flex-shrink-0"
      style={{
        width: collapsed ? '4rem' : '15rem',
        background: 'linear-gradient(180deg,hsl(224,71%,5%) 0%,hsl(224,71%,4%) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className={`flex items-center h-14 px-3 border-b border-white/5 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 0 15px rgba(249,115,22,0.3)' }}
        >
          <span className="text-lg">🏠</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-sm font-black text-slate-100 truncate" style={{ fontFamily: 'Manrope,sans-serif' }}>
              Global Clean Home
            </p>
            <p className="text-[10px] text-emerald-500/70 truncate font-semibold">CRM Pro</p>
          </div>
        )}
      </div>

      {/* ── Quick Search ── */}
      {!collapsed && (
        <div className="px-2.5 pt-3 pb-1 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
              className="w-full pl-7 pr-8 py-1.5 rounded-xl text-xs text-slate-300 placeholder-slate-600
                         bg-white/5 border border-white/8 focus:outline-none focus:ring-1 focus:ring-violet-500/60
                         focus:border-violet-500/40 transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 pointer-events-none font-mono">
              ⌘K
            </kbd>
          </div>

          {/* Search results dropdown */}
          {filteredItems.length > 0 && (
            <div
              className="mt-1.5 rounded-xl border border-white/8 overflow-hidden shadow-2xl"
              style={{ background: 'rgba(15,10,30,0.97)', zIndex: 100 }}
            >
              {filteredItems.map(item => (
                <button
                  key={item.to}
                  onClick={() => { navigate(item.to); setSearchQuery(''); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400
                             hover:bg-violet-500/10 hover:text-slate-200 transition-all"
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: item.groupColor }} />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px] text-slate-600">{item.groupLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <nav
        aria-label="Navigation principale"
        className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5 hide-scrollbar"
      >
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label];
          const isActive = isGroupActive(group);

          return (
            <div key={group.label}>
              {/* Group header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 mb-0.5 ${
                    isActive || isOpen ? 'text-slate-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={{
                    background: isActive || isOpen ? `${group.color}12` : 'transparent',
                    border:     isActive || isOpen ? `1px solid ${group.color}20` : '1px solid transparent',
                  }}
                >
                  <span className="text-[11px] font-black tracking-wide">{group.label}</span>
                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: group.color }} />
                    )}
                    <ChevronDown
                      className="w-3 h-3 transition-transform duration-200"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: group.color,
                      }}
                    />
                  </div>
                </button>
              ) : (
                <div className="flex justify-center py-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isActive ? group.color : 'rgba(255,255,255,0.1)' }}
                  />
                </div>
              )}

              {/* Group items */}
              {(isOpen || collapsed) && (
                <div
                  className={`space-y-0.5 ${!collapsed ? 'ml-2 pl-2 border-l' : ''}`}
                  style={{ borderColor: !collapsed ? `${group.color}25` : 'transparent' }}
                >
                  {group.items.map((item) => {
                    const isItemActive =
                      location.pathname === item.to ||
                      location.pathname.startsWith(item.to + '/');
                    const badgeCount = item.badge ? badges[item.badge] : null;

                    return collapsed ? (
                      /* Collapsed: icon only + tooltip */
                      <div key={item.to} className="relative group/item flex justify-center">
                        <NavLink
                          to={item.to}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                            isItemActive ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                          }`}
                          style={isItemActive ? { background: `${group.color}25`, color: group.color } : {}}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          {badgeCount > 0 && (
                            <span
                              className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-slate-900"
                              style={{ background: group.color }}
                            />
                          )}
                        </NavLink>
                        <Tooltip label={item.label} color={group.color} />
                      </div>
                    ) : (
                      /* Expanded: full nav item */
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-200
                                    relative text-xs font-medium group/item overflow-hidden ${
                          isItemActive
                            ? 'text-white'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                        style={isItemActive ? {
                          background: `linear-gradient(90deg, ${group.color}22, ${group.color}08)`,
                          color: group.color,
                          borderLeft: `2px solid ${group.color}`,
                        } : {
                          borderLeft: '2px solid transparent',
                        }}
                      >
                        <item.icon
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: isItemActive ? group.color : '' }}
                        />
                        <span className="truncate flex-1">{item.label}</span>
                        <CountBadge count={badgeCount} color={group.color} />
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="flex-shrink-0 border-t border-white/5 p-2 space-y-1">

        {/* User section */}
        {user && (
          <div
            className={`flex items-center gap-2 p-2 rounded-xl mb-1.5 border border-white/6 cursor-pointer
                        hover:bg-white/5 hover:border-white/10 transition-all group ${
              collapsed ? 'justify-center' : ''
            }`}
            style={{ background: 'rgba(255,255,255,0.025)' }}
            onClick={() => navigate('/settings')}
            title={collapsed ? user.name : undefined}
          >
            {/* Avatar */}
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                className="w-7 h-7 rounded-full ring-1 ring-orange-500/30 flex-shrink-0"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-black text-white text-xs"
                style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}
              >
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

            {!collapsed && (
              <>
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-300 truncate leading-tight">{user.name}</p>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `${roleBadge.color}20`,
                      color: roleBadge.color,
                      border: `1px solid ${roleBadge.color}30`,
                    }}
                  >
                    {roleBadge.label}
                  </span>
                </div>
                <Settings className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
              </>
            )}
          </div>
        )}

        {/* Portal links (only expanded) */}
        {!collapsed && (
          <div className="space-y-0.5 mb-1">
            <a
              href="/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-slate-500 hover:text-orange-400
                         hover:bg-orange-500/10 transition-all text-xs border border-transparent hover:border-orange-500/20"
            >
              <Home className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Portail client</span>
            </a>
            <a
              href="/intervenant"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-slate-500 hover:text-emerald-400
                         hover:bg-emerald-500/10 transition-all text-xs border border-transparent hover:border-emerald-500/20"
            >
              <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Portail intervenant</span>
            </a>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-slate-600 hover:text-slate-300
                      hover:bg-white/5 transition-all text-xs ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Développer' : undefined}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Réduire</span>
            </>
          )}
        </button>

        {/* Theme Switch */}
        <button onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full mb-1"
          style={{background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.2)',color:'#8b5cf6'}}>
          <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Mode Clair' : 'Mode Sombre'}</span>
        </button>

        {/* Theme Switch */}
        <button onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full mb-1"
          style={{background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.2)',color:'#8b5cf6'}}>
          <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Mode Clair' : 'Mode Sombre'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-slate-600 hover:text-red-400
                      hover:bg-red-500/5 transition-all text-xs ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

export default React.memo(Sidebar);
