import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, FileText, CreditCard, Calendar, Clock, ArrowRight } from 'lucide-react';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

// ──────────────────────────────────────────────
// Type icons & config
// ──────────────────────────────────────────────
const TYPE_CONFIG = {
  leads: { label: 'Leads', icon: Users, color: '#a78bfa', path: (r) => `/leads/${r.id}` },
  devis: { label: 'Devis', icon: FileText, color: '#60a5fa', path: (r) => `/quotes` },
  factures: { label: 'Factures', icon: CreditCard, color: '#34d399', path: (r) => `/invoices` },
  interventions: { label: 'Interventions', icon: Calendar, color: '#f59e0b', path: (r) => `/planning` },
};

// ──────────────────────────────────────────────
// Shimmer skeleton
// ──────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ padding: '12px 16px' }}>
      {[80, 60, 70].map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', flexShrink: 0,
            animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%',
            backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 75%)'
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: `${w}%`,
              marginBottom: 6,
              animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%',
              backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 75%)'
            }} />
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', width: `${w * 0.6}%`,
              animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%',
              backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,0.02) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.02) 75%)'
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Recent searches helper
// ──────────────────────────────────────────────
const STORAGE_KEY = 'crm_recent_searches';
const getRecent = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveRecent = (q) => {
  const prev = getRecent().filter(x => x !== q).slice(0, 4);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([q, ...prev]));
};

// ──────────────────────────────────────────────
// Main GlobalSearch modal
// ──────────────────────────────────────────────
function GlobalSearchModal({ onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = empty state
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(getRecent());

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Flatten results for keyboard nav
  const flatResults = results
    ? Object.entries(results).flatMap(([type, items]) =>
        (items || []).map(item => ({ type, item }))
      )
    : [];

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      const { type, item } = flatResults[activeIdx];
      handleSelect(type, item);
    }
  };

  // Search
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    try {
      // Try /api/search/global first, fallback to /api/search
      let data;
      try {
        const res = await fetch(`${API_URL}/search/global?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
        });
        if (res.ok) data = await res.json();
      } catch {}
      if (!data) {
        const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
        });
        if (res.ok) data = await res.json();
      }
      setResults(data || {});
    } catch {
      setResults({});
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    setActiveIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const handleSelect = (type, item) => {
    if (query) saveRecent(query);
    setRecentSearches(getRecent());
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.leads;
    navigate(cfg.path(item));
    onClose();
  };

  const hasResults = results && Object.values(results).some(arr => arr && arr.length > 0);

  let globalIdx = -1;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes gsSlideIn { from{opacity:0;transform:translateY(-12px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        .gs-result-item:hover { background: rgba(139,92,246,0.08) !important; }
      `}</style>

      <div
        style={{
          width: 640, maxWidth: '90vw', maxHeight: '70vh',
          background: 'var(--bg-card)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          animation: 'gsSlideIn 0.18s ease',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <Search style={{ width: 18, height: 18, color: '#8b5cf6', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher leads, devis, factures..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#e2e8f0', fontSize: 16, fontFamily: 'Inter,sans-serif',
            }}
          />
          {loading && (
            <div style={{
              width: 16, height: 16, border: '2px solid rgba(139,92,246,0.3)',
              borderTop: '2px solid #8b5cf6', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', flexShrink: 0,
            }} />
          )}
          <span style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>Echap pour fermer</span>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6,
            padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <X style={{ width: 14, height: 14, color: '#64748b' }} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {loading && !hasResults ? (
            <Skeleton />
          ) : !query || query.length < 2 ? (
            /* Empty / Recent searches */
            <div style={{ padding: '20px 16px' }}>
              {recentSearches.length > 0 ? (
                <>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    Recherches récentes
                  </p>
                  {recentSearches.map((s, i) => (
                    <button key={i} onClick={() => { setQuery(s); doSearch(s); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '8px 10px', borderRadius: 8, border: 'none',
                        background: 'transparent', cursor: 'pointer',
                        color: '#94a3b8', fontSize: 13, textAlign: 'left',
                        marginBottom: 2,
                      }}
                      className="gs-result-item">
                      <Clock style={{ width: 14, height: 14, color: '#475569', flexShrink: 0 }} />
                      {s}
                    </button>
                  ))}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Search style={{ width: 36, height: 36, color: '#334155', margin: '0 auto 10px' }} />
                  <p style={{ color: '#64748b', fontSize: 14 }}>Tapez pour rechercher...</p>
                  <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>Leads, Devis, Factures, Interventions</p>
                </div>
              )}
            </div>
          ) : !hasResults ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ color: '#64748b', fontSize: 14 }}>Aucun résultat pour « {query} »</p>
            </div>
          ) : (
            /* Results grouped by type */
            <div style={{ padding: '8px 0' }}>
              {Object.entries(results).map(([type, items]) => {
                if (!items || items.length === 0) return null;
                const cfg = TYPE_CONFIG[type] || { label: type, icon: FileText, color: '#94a3b8', path: () => '/' };
                const Icon = cfg.icon;
                return (
                  <div key={type}>
                    <p style={{
                      fontSize: 10, color: '#475569', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '6px 16px 4px',
                    }}>
                      {cfg.label}
                    </p>
                    {items.map((item) => {
                      globalIdx++;
                      const currentIdx = globalIdx;
                      const isActive = activeIdx === currentIdx;
                      return (
                        <button
                          key={item.id || item.lead_id || item.invoice_id || currentIdx}
                          onClick={() => handleSelect(type, item)}
                          className="gs-result-item"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            width: '100%', padding: '10px 16px',
                            border: 'none', cursor: 'pointer', textAlign: 'left',
                            background: isActive ? 'rgba(139,92,246,0.1)' : 'transparent',
                            borderLeft: isActive ? `2px solid ${cfg.color}` : '2px solid transparent',
                            transition: 'all 0.1s',
                          }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: `${cfg.color}15`,
                            border: `1px solid ${cfg.color}25`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon style={{ width: 14, height: 14, color: cfg.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name || item.lead_name || item.title || item.reference || `#${String(item.id || '').slice(-6)}`}
                            </p>
                            <p style={{ color: '#64748b', fontSize: 11, marginTop: 1,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.email || item.service_type || item.amount_ttc
                                ? [item.email, item.service_type, item.amount_ttc ? `${Number(item.amount_ttc).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : null]
                                    .filter(Boolean).join(' · ')
                                : item.subtitle || ''}
                            </p>
                          </div>
                          <ArrowRight style={{ width: 14, height: 14, color: '#334155', flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex', gap: 16, alignItems: 'center',
        }}>
          {[['↑↓', 'Naviguer'], ['↵', 'Sélectionner'], ['Esc', 'Fermer']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <kbd style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4, padding: '1px 6px', fontSize: 10, color: '#94a3b8', fontFamily: 'monospace',
              }}>{key}</kbd>
              <span style={{ fontSize: 11, color: '#475569' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ──────────────────────────────────────────────
// GlobalSearch — renders portal + registers Cmd+K
// ──────────────────────────────────────────────
// Custom event name for triggering global search
const OPEN_EVENT = 'crm:open-global-search';

export function GlobalSearch({ triggerOnly = false }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (triggerOnly) return;
    // Global Cmd+K / Ctrl+K listener
    const keyHandler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    // Custom event from trigger button
    const openHandler = () => setOpen(true);
    window.addEventListener('keydown', keyHandler);
    window.addEventListener(OPEN_EVENT, openHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener(OPEN_EVENT, openHandler);
    };
  }, [triggerOnly]);

  if (triggerOnly) {
    return (
      <button
        onClick={() => window.dispatchEvent(new CustomEvent(OPEN_EVENT))}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '6px 14px',
          cursor: 'pointer', color: '#64748b',
          fontSize: 13, fontFamily: 'Inter,sans-serif',
          transition: 'all 0.2s',
        }}
        title="Recherche globale (Cmd+K)"
      >
        <Search style={{ width: 14, height: 14 }} />
        <span>Rechercher...</span>
        <kbd style={{
          marginLeft: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4, padding: '1px 6px',
          fontSize: 10, color: '#475569', fontFamily: 'monospace',
        }}>⌘K</kbd>
      </button>
    );
  }

  return (
    <>
      {open && createPortal(
        <GlobalSearchModal onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

export default GlobalSearch;
