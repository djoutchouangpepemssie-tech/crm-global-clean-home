import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, CheckSquare, Activity, LogOut,
  TrendingUp, Trello, CreditCard, Zap, CalendarDays, Plug, BookOpen,
  Sparkles, ChevronDown, Search, MessageSquare, Package,
  Ticket, UserCheck, Globe, Star, BarChart2, Settings,
  RefreshCw, MapPin, CalendarCheck, Heart, FolderOpen,
  ChevronLeft, ChevronRight, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';

/* ═══ Palette Atelier (tokens durs pour inline styles) ═══ */
const C = {
  bg:       '#1C1915',  // ivoire profond / encre chaude
  bgHover:  'rgba(255, 248, 235, 0.05)',
  bgActive: 'rgba(194, 65, 12, 0.14)',  // terracotta translucent
  border:   'rgba(255, 248, 235, 0.08)',
  textMain: '#F5EFE3',
  textMuted:'rgba(245, 239, 227, 0.55)',
  textDim:  'rgba(245, 239, 227, 0.32)',
  brand:    '#047857',   // émeraude
  accent:   '#C2410C',   // terracotta
  amber:    '#D97706',
  ink:      '#57534E',   // sable foncé neutre
};

/* ═══ NAV GROUPS — couleurs atelier ═══ */
const NAV_GROUPS = [
  {
    label: 'Principal',
    color: C.accent,
    defaultOpen: true,
    items: [
      { to: '/search',       icon: Search,          label: 'Recherche' },
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/director',     icon: Sparkles,        label: 'Vue Directeur' },
      { to: '/leads',        icon: Users,           label: 'Leads',    badge: 'leads' },
      { to: '/pipeline',     icon: Trello,          label: 'Pipeline' },
    ],
  },
  {
    label: 'Commercial',
    color: C.brand,
    defaultOpen: false,
    items: [
      { to: '/quotes',       icon: FileText,        label: 'Devis',    badge: 'devis' },
      { to: '/invoices',     icon: CreditCard,      label: 'Factures', badge: 'factures' },
      { to: '/contracts',    icon: RefreshCw,       label: 'Contrats' },
      { to: '/bookings',     icon: CalendarCheck,   label: 'Réservations' },
    ],
  },
  {
    label: 'Opérations',
    color: C.amber,
    defaultOpen: false,
    items: [
      { to: '/planning',     icon: CalendarDays,    label: 'Planning' },
      { to: '/intervenants', icon: UserCheck,       label: 'Intervenants' },
      { to: '/tasks',        icon: CheckSquare,     label: 'Tâches' },
      { to: '/tickets',      icon: Ticket,          label: 'Tickets SAV', badge: 'tickets' },
      { to: '/map',          icon: MapPin,          label: 'Carte' },
    ],
  },
  {
    label: 'Analytics',
    color: C.brand,
    defaultOpen: false,
    items: [
      { to: '/analytics',    icon: TrendingUp,      label: 'Analytics' },
      { to: '/rentabilite',  icon: BarChart2,       label: 'Rentabilité' },
      { to: '/ads',          icon: Globe,           label: 'Publicités' },
      { to: '/seo',          icon: Search,          label: 'SEO' },
    ],
  },
  {
    label: 'Finance',
    color: C.accent,
    defaultOpen: false,
    items: [
      { to: '/accounting-erp', icon: BookOpen,      label: 'Comptabilité ERP' },
      { to: '/stock',          icon: Package,       label: 'Stocks' },
    ],
  },
  {
    label: 'Outils',
    color: C.ink,
    defaultOpen: false,
    items: [
      { to: '/workflows',    icon: Zap,             label: 'Workflows' },
      { to: '/ai',           icon: Star,            label: 'Centre IA' },
      { to: '/chat',         icon: MessageSquare,   label: 'Messages' },
      { to: '/satisfaction', icon: Heart,           label: 'Satisfaction' },
      { to: '/documents',    icon: FolderOpen,      label: 'Documents' },
      { to: '/integrations', icon: Plug,            label: 'Intégrations' },
      { to: '/activity',     icon: Activity,        label: 'Journal' },
      { to: '/settings',     icon: Settings,        label: 'Paramètres' },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { prefs, updateTheme } = useTheme();
  const isDark = prefs.theme === 'dark';

  // Sur mobile, la sidebar démarre masquée et s'ouvre via bouton hamburger
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Ferme automatiquement la sidebar mobile à chaque navigation
  useEffect(() => { if (isMobile) setMobileOpen(false); }, [location.pathname, isMobile]);
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.label, g.defaultOpen]))
  );
  const [badges, setBadges] = useState({});

  const fetchBadges = useCallback(async () => {
    try {
      const [leadsRes, quotesRes, invoicesRes] = await Promise.allSettled([
        api.get('/leads', { params: { status: 'nouveau', page_size: 1, period: 'all' } }),
        api.get('/quotes', { params: { status: 'envoyé', page_size: 1 } }),
        api.get('/invoices', { params: { status: 'en_retard', page_size: 1 } }),
      ]);
      const get = (res) => {
        if (res.status !== 'fulfilled') return null;
        const d = res.value.data;
        if (d?.total !== undefined) return d.total;
        if (d?.count !== undefined) return d.count;
        return Array.isArray(d) ? (d.length || null) : null;
      };
      setBadges({
        leads:    get(leadsRes),
        devis:    get(quotesRes),
        factures: get(invoicesRes),
        tickets:  null,
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchBadges();
    const t = setInterval(fetchBadges, 120000);
    return () => clearInterval(t);
  }, [fetchBadges]);

  const toggleGroup = (label) => setOpenGroups((p) => ({ ...p, [label]: !p[label] }));

  const initials = user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <>
      {/* Bouton hamburger mobile — toujours accessible, position fixe top-left */}
      {isMobile && (
        <>
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
            style={{
              position: 'fixed', top: 10, left: 10, zIndex: 60,
              width: 40, height: 40, borderRadius: 10, border: 'none',
              background: C.bg, color: C.text, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{mobileOpen ? '×' : '☰'}</span>
          </button>
          {mobileOpen && (
            <div onClick={() => setMobileOpen(false)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50,
            }} />
          )}
        </>
      )}
    <aside style={{
      width: isMobile ? (mobileOpen ? '260px' : '0px') : (collapsed ? '64px' : '240px'),
      minWidth: isMobile ? (mobileOpen ? '260px' : '0px') : (collapsed ? '64px' : '240px'),
      background: C.bg,
      borderRight: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: isMobile ? 'fixed' : 'sticky',
      top: 0,
      left: 0,
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
      zIndex: 55,
      fontFamily: 'var(--font-body)',
    }} onClick={isMobile ? () => { /* ferme au clic sur un lien */ } : undefined}>

      {/* Logo + Collapse */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: `1px solid ${C.border}`,
        minHeight: '60px',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px',
              background: C.accent,
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.15)',
            }}>
              <span style={{ color: '#F5EFE3', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display, "Fraunces", serif)', letterSpacing: '-0.02em' }}>G</span>
            </div>
            <div>
              <p style={{ color: C.textMain, fontSize: '13px', fontWeight: 600, lineHeight: 1.2, margin: 0, fontFamily: 'var(--font-display, "Fraunces", serif)', letterSpacing: '-0.01em' }}>
                Global Clean
              </p>
              <p style={{ color: C.textDim, fontSize: '9.5px', lineHeight: 1, margin: '2px 0 0', fontFamily: 'var(--font-mono, ui-monospace, monospace)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Atelier · CRM
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: '34px', height: '34px',
            background: C.accent,
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#F5EFE3', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display, "Fraunces", serif)' }}>G</span>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              width: '24px', height: '24px',
              borderRadius: '6px',
              background: 'transparent',
              border: `1px solid ${C.border}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.textMuted,
              transition: 'all 0.15s ease',
            }}
            aria-label="Réduire la sidebar"
          >
            <ChevronLeft size={13} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            margin: '8px auto',
            width: '32px', height: '32px',
            borderRadius: '8px',
            background: 'transparent',
            border: `1px solid ${C.border}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.textMuted,
          }}
          aria-label="Développer la sidebar"
        >
          <ChevronRight size={13} />
        </button>
      )}

      {/* Nav */}
      <nav
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}
        className="hide-scrollbar"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: '2px' }}>

            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 18px 4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: 600,
                  color: C.textDim,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                }}>
                  {group.label}
                </span>
                <ChevronDown
                  size={11}
                  style={{
                    color: C.textDim,
                    transform: openGroups[group.label] ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>
            )}

            {(collapsed || openGroups[group.label]) && (
              <div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.to ||
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
                        padding: collapsed ? '10px 0' : '8px 14px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        margin: collapsed ? '0' : '1px 8px',
                        borderRadius: collapsed ? '0' : '6px',
                        background: isActive ? C.bgActive : 'transparent',
                        borderLeft: isActive && !collapsed
                          ? `2px solid ${group.color}`
                          : collapsed ? 'none' : '2px solid transparent',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = C.bgHover;
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Icon
                        size={16}
                        style={{
                          color: isActive ? group.color : C.textMuted,
                          flexShrink: 0,
                          strokeWidth: isActive ? 2.2 : 1.8,
                        }}
                      />
                      {!collapsed && (
                        <span style={{
                          fontSize: '13px',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? C.textMain : C.textMuted,
                          flex: 1, whiteSpace: 'nowrap',
                          letterSpacing: '-0.005em',
                        }}>
                          {item.label}
                        </span>
                      )}
                      {!collapsed && badgeCount > 0 && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          padding: '1px 6px',
                          background: group.color,
                          color: '#F5EFE3',
                          borderRadius: '20px',
                          minWidth: '18px', textAlign: 'center',
                          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                      {collapsed && badgeCount > 0 && (
                        <span style={{
                          position: 'absolute', top: '6px', right: '6px',
                          width: '7px', height: '7px',
                          background: group.color,
                          borderRadius: '50%',
                          boxShadow: `0 0 0 2px ${C.bg}`,
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

      {/* Bottom */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px' }}>

        {!collapsed && (
          <button
            onClick={() => updateTheme('theme', isDark ? 'light' : 'dark')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', marginBottom: '8px',
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: '6px', cursor: 'pointer',
              color: C.textMuted,
              fontSize: '12px', fontWeight: 500,
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
            <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
          </button>
        )}

        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? '0' : '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '8px 0' : '8px 10px',
          borderRadius: '6px',
          background: 'rgba(255, 248, 235, 0.03)',
        }}>
          <div style={{
            position: 'relative',
            width: '32px', height: '32px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.brand}, ${C.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#F5EFE3', fontSize: '11px', fontWeight: 700,
            flexShrink: 0,
            fontFamily: 'var(--font-display, "Fraunces", serif)',
            letterSpacing: '0.02em',
          }}>
            {initials}
            {/* Voyant "en ligne" — pastille verte avec halo pulsant */}
            <span
              title="En ligne"
              style={{
                position: 'absolute',
                bottom: -1, right: -1,
                width: 10, height: 10, borderRadius: '50%',
                background: 'oklch(0.65 0.18 145)',
                border: '2px solid oklch(0.15 0.01 60)',
                boxShadow: '0 0 0 0 oklch(0.65 0.18 145 / 0.6)',
                animation: 'sb-online-pulse 2s ease-out infinite',
              }}
            />
            <style>{`
              @keyframes sb-online-pulse {
                0% { box-shadow: 0 0 0 0 oklch(0.65 0.18 145 / 0.55); }
                70% { box-shadow: 0 0 0 6px oklch(0.65 0.18 145 / 0); }
                100% { box-shadow: 0 0 0 0 oklch(0.65 0.18 145 / 0); }
              }
            `}</style>
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                color: C.textMain, fontSize: '12px', fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                margin: 0,
              }}>
                {user?.name || 'Utilisateur'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'oklch(0.65 0.18 145)', flexShrink: 0,
                }} />
                <span style={{
                  color: 'oklch(0.70 0.15 145)', fontSize: '9px',
                  fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  En ligne
                </span>
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              title="Déconnexion"
              style={{
                width: '28px', height: '28px',
                borderRadius: '6px',
                background: 'transparent',
                border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.textMuted,
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = C.accent;
                e.currentTarget.style.borderColor = 'rgba(194,65,12,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.textMuted;
                e.currentTarget.style.borderColor = C.border;
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
                flex: 1, padding: '7px 6px',
                fontSize: '10px', fontWeight: 500,
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: '6px', cursor: 'pointer',
                color: C.textMuted,
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.brand; e.currentTarget.style.borderColor = 'rgba(4,120,87,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}
            >
              Portail Client
            </button>
            <button
              onClick={() => navigate('/intervenant')}
              style={{
                flex: 1, padding: '7px 6px',
                fontSize: '10px', fontWeight: 500,
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: '6px', cursor: 'pointer',
                color: C.textMuted,
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = 'rgba(194,65,12,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}
            >
              Portail Intervenant
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
// Atelier direction - Sidebar
