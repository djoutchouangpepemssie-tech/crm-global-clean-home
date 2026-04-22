// SeoLayout.jsx — shell SaaS du module SEO / Analytics
// Sidebar latérale persistante + topbar filtres + Outlet pour les sous-pages.
//
// Route parent : /seo
// Enfants attendus :
//   /seo                → Dashboard
//   /seo/performance    → Performance SEO (GSC en profondeur)
//   /seo/content        → Contenu (pages, CTR, cannibalisation)
//   /seo/technical      → Technique (CWV, crawl, erreurs)
//   /seo/conversion     → Funnel conversion
//   /seo/exploration    → Exploration ad-hoc (pivot, segments)
//   /seo/ai             → Recos IA
//   /seo/alerts         → Alertes et monitoring
//   /seo/globe          → Globe 3D + trafic mondial
//   /seo/sources        → Sources & campagnes (UTM, Ads)
//   /seo/connect        → Connexion & Tracking (santé GA4/GSC/Tracker/Ads)

import React, { useMemo, useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity, AlertTriangle, BarChart3, Cable, ChevronsLeft, ChevronsRight,
  FileText, Filter, Footprints, Gauge, Globe2, LineChart, RefreshCw, Search,
  Settings, Sparkles, Target, Wrench, Zap,
} from 'lucide-react';
import {
  seoTokenStyle, SeoFilterContext,
} from './SeoShared';
import { useTrackerHealth } from '../../hooks/api';

const NAV = [
  { to: '/seo',              label: 'Dashboard',     icon: Gauge,          end: true },
  { to: '/seo/performance',  label: 'Performance',   icon: LineChart },
  { to: '/seo/content',      label: 'Contenu',       icon: FileText },
  { to: '/seo/technical',    label: 'Technique',     icon: Wrench },
  { to: '/seo/conversion',   label: 'Conversion',    icon: Target },
  { to: '/seo/sources',      label: 'Sources',       icon: BarChart3 },
  { to: '/seo/globe',        label: 'Globe 3D',      icon: Globe2 },
  { to: '/seo/journeys',     label: 'Parcours',      icon: Footprints, highlight: true },
  { to: '/seo/ai',           label: 'IA & Recos',    icon: Sparkles },
  { to: '/seo/alerts',       label: 'Alertes',       icon: AlertTriangle },
  { to: '/seo/connect',      label: 'Connexion',     icon: Cable, highlight: true },
  { to: '/seo/settings',     label: 'Paramètres',    icon: Settings },
];

const DAYS_CHOICES = [7, 28, 90];

function HealthDot({ status }) {
  const color =
    status === 'ok' ? 'var(--emerald)' :
    status === 'partial' ? 'var(--gold)' :
    status === 'stale' ? 'var(--gold)' :
    status === 'disconnected' ? 'var(--rouge)' :
    status === 'down' ? 'var(--rouge)' : 'var(--ink-4)';
  return (
    <span className="seo-pulse-dot" style={{
      width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block',
    }} />
  );
}

function Sidebar({ collapsed, onToggle, health }) {
  const w = collapsed ? 72 : 240;
  return (
    <aside style={{
      width: w, flexShrink: 0, background: 'var(--paper)',
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      transition: 'width .2s ease',
    }}>
      <div style={{ padding: collapsed ? '20px 12px' : '22px 20px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {!collapsed && (
            <div>
              <div className="seo-label">SEO / Analytics</div>
              <div className="seo-display" style={{ fontSize: 22, fontWeight: 500, marginTop: 4, color: 'var(--ink)' }}>
                <em style={{ color: 'var(--navy)', fontStyle: 'italic' }}>Cockpit</em>
              </div>
            </div>
          )}
          <button onClick={onToggle} className="seo-chip" style={{ padding: 6, borderRadius: 8 }} title={collapsed ? 'Déplier' : 'Réduire'}>
            {collapsed ? <ChevronsRight style={{ width: 14, height: 14 }} /> : <ChevronsLeft style={{ width: 14, height: 14 }} />}
          </button>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 10px' }}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: collapsed ? '10px' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10, marginBottom: 2,
              fontFamily: 'Fraunces, serif', fontSize: 14,
              color: isActive ? 'var(--ink)' : 'var(--ink-3)',
              background: isActive ? 'var(--surface-2)' : 'transparent',
              textDecoration: 'none',
              fontWeight: isActive ? 600 : 400,
              position: 'relative',
              borderLeft: isActive && !collapsed ? '2px solid var(--navy)' : '2px solid transparent',
            })}
            title={collapsed ? item.label : undefined}
          >
            <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.highlight && health && (
              <span style={{ marginLeft: 'auto' }}>
                <HealthDot status={health.status} />
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div style={{
          borderTop: '1px solid var(--line)', padding: '14px 18px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: 'var(--ink-3)', letterSpacing: '0.06em',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HealthDot status={health?.status} />
            <span style={{ textTransform: 'uppercase' }}>
              {health?.status === 'ok' ? 'Tous systèmes OK' :
               health?.status === 'partial' ? `${health?.ok_count}/${health?.total} connectés` :
               health?.status === 'down' ? 'Déconnecté' : 'Vérification…'}
            </span>
          </div>
          <div style={{ marginTop: 4, color: 'var(--ink-4)' }}>
            {health?.site?.replace(/^https?:\/\//, '') || 'globalcleanhome.com'}
          </div>
        </div>
      )}
    </aside>
  );
}

function TopBar({ days, setDays, onRefresh, refreshing, health }) {
  const loc = useLocation();
  const current = NAV.find((n) => n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to));
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'var(--bg)', borderBottom: '1px solid var(--line)',
      padding: '14px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backdropFilter: 'blur(8px)',
    }}>
      <div>
        <div className="seo-label" style={{ color: 'var(--ink-4)' }}>
          {loc.pathname.replace('/seo', '/seo') || '/seo'}
        </div>
        <div className="seo-display" style={{ fontSize: 22, fontWeight: 400, color: 'var(--ink)', marginTop: 2 }}>
          {current?.label || 'Dashboard'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 999,
          border: '1px solid var(--line)', background: 'var(--paper)',
        }}>
          <HealthDot status={health?.status} />
          <span className="seo-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
            {health?.status === 'ok' ? 'Live' :
             health?.status === 'partial' ? `${health?.ok_count}/${health?.total}` :
             health?.status === 'stale' ? 'Stale' :
             health?.status === 'disconnected' ? 'Offline' : '…'}
          </span>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 0,
          padding: 3, borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)',
        }}>
          <Filter style={{ width: 12, height: 12, margin: '0 8px', color: 'var(--ink-3)' }} />
          {DAYS_CHOICES.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={days === d ? 'seo-chip active' : 'seo-chip'}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: days === d ? 'var(--ink)' : 'transparent',
                color: days === d ? 'var(--bg)' : 'var(--ink-3)',
                border: 'none',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              {d}j
            </button>
          ))}
        </div>

        <button onClick={onRefresh} className="seo-chip" style={{ padding: '8px 14px', borderRadius: 999 }}>
          <RefreshCw style={{
            width: 12, height: 12,
            animation: refreshing ? 'seo-pulse 1s linear infinite' : undefined,
          }} />
          <span style={{ marginLeft: 6 }}>Actualiser</span>
        </button>
      </div>
    </header>
  );
}

export default function SeoLayout() {
  const [days, setDays] = useState(28);
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { data: health, refetch: refetchHealth } = useTrackerHealth();

  // Restaure le dernier choix de sidebar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('seo_sidebar_collapsed');
      if (saved === '1') setCollapsed(true);
    } catch (e) {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('seo_sidebar_collapsed', collapsed ? '1' : '0'); } catch (e) {}
  }, [collapsed]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Invalide React Query globalement pour /analytics-data + /tracker
      const evt = new CustomEvent('seo:refresh');
      window.dispatchEvent(evt);
      await refetchHealth();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  const ctx = useMemo(() => ({ days, setDays }), [days]);

  return (
    <SeoFilterContext.Provider value={ctx}>
      <style>{seoTokenStyle}</style>
      <div className="seo-root" style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'stretch',
      }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} health={health} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <TopBar days={days} setDays={setDays} onRefresh={onRefresh} refreshing={refreshing} health={health} />
          <main style={{ padding: '28px 32px 64px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </SeoFilterContext.Provider>
  );
}
