import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, CheckSquare, Activity, LogOut,
  TrendingUp, Trello, CreditCard, Zap, CalendarDays, Plug, BookOpen,
  Sparkles, ChevronDown, Search, MessageSquare, Package,
  Ticket, UserCheck, Globe, Star, BarChart2, Settings,
  RefreshCw, MapPin, CalendarCheck, Heart, FolderOpen,
  DollarSign, BarChart3, ChevronLeft, ChevronRight, Bell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import BACKEND_URL from '../../config.js';
const API_URL = (BACKEND_URL + '/api').replace('http://', 'https://');
import axios from 'axios';

/* ── NAV GROUPS ── */
const NAV_GROUPS = [
  {
    label: 'Principal',
    color: '#6366F1',
    defaultOpen: true,
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'       },
      { to: '/director',     icon: Sparkles,        label: 'Vue Directeur'   },
      { to: '/leads',        icon: Users,           label: 'Leads',     badge: 'leads'    },
      { to: '/kanban',       icon: Trello,          label: 'Pipeline'        },
    ]
  },
  {
    label: 'Commercial',
    color: '#10B981',
    defaultOpen: false,
    items: [
      { to: '/quotes',       icon: FileText,        label: 'Devis',     badge: 'devis'    },
      { to: '/invoices',     icon: CreditCard,      label: 'Factures',  badge: 'factures' },
      { to: '/contracts',    icon: RefreshCw,       label: 'Contrats'        },
      { to: '/bookings',     icon: CalendarCheck,   label: 'Réservations'    },
    ]
  },
  {
    label: 'Opérations',
    color: '#F59E0B',
    defaultOpen: false,
    items: [
      { to: '/planning',     icon: CalendarDays,    label: 'Planning'        },
      { to: '/intervenants', icon: UserCheck,       label: 'Intervenants'    },
      { to: '/tasks',        icon: CheckSquare,     label: 'Tâches'          },
      { to: '/tickets',      icon: Ticket,          label: 'Tickets SAV', badge: 'tickets' },
      { to: '/map',          icon: MapPin,          label: 'Carte'           },
    ]
  },
  {
    label: 'Analytics',
    color: '#3B82F6',
    defaultOpen: false,
    items: [
      { to: '/analytics',    icon: TrendingUp,      label: 'Analytics'       },
      { to: '/rentabilite',  icon: BarChart2,       label: 'Rentabilité'     },
      { to: '/ads',          icon: Globe,           label: 'Publicités'      },
      { to: '/seo',          icon: Search,          label: 'SEO'             },
    ]
  },
  {
    label: 'Finance',
    color: '#8B5CF6',
    defaultOpen: false,
    items: [
      { to: '/accounting-erp', icon: BookOpen,      label: 'Comptabilité ERP' },
      { to: '/stock',          icon: Package,       label: 'Stocks'           },
    ]
  },
  {
    label: 'Outils',
    color: '#64748B',
    defaultOpen: false,
    items: [
      { to: '/workflows',    icon: Zap,             label: 'Workflows'       },
      { to: '/ai',           icon: Star,            label: 'Centre IA'       },
      { to: '/chat',         icon: MessageSquare,   label: 'Messages'        },
      { to: '/satisfaction', icon: Heart,           label: 'Satisfaction'    },
      { to: '/documents',    icon: FolderOpen,      label: 'Documents'       },
      { to: '/integrations', icon: Plug,            label: 'Intégrations'    },
      { to: '/activity',     icon: Activity,        label: 'Journal'         },
      { to: '/settings',     icon: Settings,        label: 'Paramètres'      },
    ]
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { prefs, updateTheme } = useTheme();
  const isDark = prefs.theme === 'dark';

  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(NAV_GROUPS.map(g => [g.label, g.defaultOpen]))
  );
  const [badges, setBadges] = useState({});

  /* Fetch badge counts */
  const fetchBadges = useCallback(async () => {
    try {
      const [leadsRes, quotesRes, invoicesRes, ticketsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/leads?status=nouveau&limit=1`, { withCredentials: true }),
        axios.get(`${API_URL}/quotes?status=pending&limit=1`, { withCredentials: true }),
        axios.get(`${API_URL}/invoices?status=en_retard&limit=1`, { withCredentials: true }),
        axios.get(`${API_URL}/tickets?status=open&limit=1`, { withCredentials: true }),
      ]);
      const get = (res, keys) => {
        if (res.status !== 'fulfilled') return null;
        const d = res.value.data;
        for (const k of keys) if (d?.[k] !== undefined) return d[k];
        return Array.isArray(d) ? d.length || null : null;
      };
      setBadges({
        leads:    get(leadsRes,    ['total','count']),
        devis:    get(quotesRes,   ['total','count']),
        factures: get(invoicesRes, ['total','count']),
        tickets:  get(ticketsRes,  ['total','count']),
      });
    } catch {}
  }, []);

  useEffect(() => { fetchBadges(); const t = setInterval(fetchBadges, 120000); return () => clearInterval(t); }, [fetchBadges]);

  const toggleGroup = (label) => setOpenGroups(p => ({ ...p, [label]: !p[label] }));

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'U';

  return (
    <aside style={{
      width: collapsed ? '64px' : '240px',
      minWidth: collapsed ? '64px' : '240px',
      background: '#16181D',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden', zIndex: 40,
      fontFamily: 'var(--font-body)',
    }}>

      {/* Logo + Collapse */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px 16px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        minHeight: '60px',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>G</span>
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: '13px', fontWeight: '700', lineHeight: 1.2, fontFamily: 'var(--font-display)' }}>Global Clean</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', lineHeight: 1 }}>CRM Pro</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>G</span>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              width: '24px', height: '24px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            <ChevronLeft size={13} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            margin: '8px auto',
            width: '32px', height: '32px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <ChevronRight size={13} />
        </button>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}
        className="hide-scrollbar">
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: '2px' }}>

            {/* Group header */}
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {group.label}
                </span>
                <ChevronDown
                  size={12}
                  style={{
                    color: 'rgba(255,255,255,0.25)',
                    transform: openGroups[group.label] ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>
            )}

            {/* Items */}
            {(collapsed || openGroups[group.label]) && (
              <div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to ||
                    (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
                  const badgeCount = item.badge ? badges[item.badge] : null;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      style={{
                        display: 'flex', alignItems: 'center',
                        gap: '10px',
                        padding: collapsed ? '10px 0' : '8px 16px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        margin: collapsed ? '0' : '1px 8px',
                        borderRadius: collapsed ? '0' : '8px',
                        background: isActive
                          ? `rgba(99,102,241,0.18)`
                          : 'transparent',
                        borderLeft: isActive && !collapsed
                          ? `3px solid ${group.color}`
                          : collapsed ? 'none' : '3px solid transparent',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: isActive ? group.color : 'rgba(255,255,255,0.45)', flexShrink: 0 }}
                      />
                      {!collapsed && (
                        <span style={{
                          fontSize: '13px',
                          fontWeight: isActive ? '600' : '400',
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                          flex: 1, whiteSpace: 'nowrap',
                        }}>
                          {item.label}
                        </span>
                      )}
                      {!collapsed && badgeCount > 0 && (
                        <span style={{
                          fontSize: '10px', fontWeight: '700',
                          padding: '1px 6px',
                          background: group.color,
                          color: '#fff',
                          borderRadius: '20px',
                          minWidth: '18px', textAlign: 'center',
                        }}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                      {collapsed && badgeCount > 0 && (
                        <span style={{
                          position: 'absolute', top: '6px', right: '6px',
                          width: '8px', height: '8px',
                          background: group.color,
                          borderRadius: '50%',
                        }} />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px' }}>

        {/* Theme toggle */}
        {!collapsed && (
          <button
            onClick={() => updateTheme('theme', isDark ? 'light' : 'dark')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', marginBottom: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px', fontWeight: '500',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '14px' }}>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'Mode Clair' : 'Mode Sombre'}</span>
          </button>
        )}

        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? '0' : '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '8px 0' : '8px 10px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '12px', fontWeight: '700',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: '12px', fontWeight: '600', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Utilisateur'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || ''}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              title="Déconnexion"
              style={{
                width: '28px', height: '28px',
                borderRadius: '6px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#EF4444',
                flexShrink: 0,
              }}
            >
              <LogOut size={13} />
            </button>
          )}
        </div>

        {/* Portals */}
        {!collapsed && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
            <button
              onClick={() => navigate('/portal')}
              style={{
                flex: 1, padding: '6px', fontSize: '10px', fontWeight: '500',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '6px', cursor: 'pointer', color: '#10B981',
              }}
            >
              Portail Client
            </button>
            <button
              onClick={() => navigate('/intervenant')}
              style={{
                flex: 1, padding: '6px', fontSize: '10px', fontWeight: '500',
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '6px', cursor: 'pointer', color: '#6366F1',
              }}
            >
              Portail Intervenant
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
