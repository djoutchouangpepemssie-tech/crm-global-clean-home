// CommandPalette.jsx — Palette de commandes type Linear/Notion (Ctrl+K).
// Recherche globale : leads, devis, factures, navigation, actions.
// Monté au niveau App pour être accessible partout.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, User, FileText, CreditCard, Home,
  Plus, Calendar, Map, BarChart3, Settings, LogOut, Users,
} from 'lucide-react';
import api from '../../lib/api';

const NAV_COMMANDS = [
  { id: 'nav-dashboard',  icon: Home,        label: 'Dashboard',          kbd: 'D', to: '/dashboard' },
  { id: 'nav-leads',      icon: Users,       label: 'Leads',              kbd: 'L', to: '/leads' },
  { id: 'nav-quotes',     icon: FileText,    label: 'Devis',              kbd: 'Q', to: '/quotes' },
  { id: 'nav-invoices',   icon: CreditCard,  label: 'Factures',           kbd: 'F', to: '/invoices' },
  { id: 'nav-planning',   icon: Calendar,    label: 'Planning',           to: '/planning' },
  { id: 'nav-map',        icon: Map,         label: 'Carte',              to: '/map' },
  { id: 'nav-director',   icon: BarChart3,   label: 'Vue Directeur',      to: '/director' },
  { id: 'nav-settings',   icon: Settings,    label: 'Paramètres',         to: '/settings' },
];

const ACTION_COMMANDS = [
  { id: 'act-new-lead',   icon: Plus, label: 'Créer un nouveau lead',    to: '/leads/new' },
  { id: 'act-new-quote',  icon: Plus, label: 'Créer un nouveau devis',   to: '/quotes/new' },
  { id: 'act-new-invoice',icon: Plus, label: 'Créer une nouvelle facture',to: '/invoices/new' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ leads: [], quotes: [], invoices: [] });
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const searchTimer = useRef(null);

  // Ctrl/Cmd+K pour ouvrir, Echap pour fermer
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus l'input quand on ouvre
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 20);
      setQuery('');
      setSelectedIdx(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query || query.length < 2) {
      setResults({ leads: [], quotes: [], invoices: [] });
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [leadsR, quotesR, invoicesR] = await Promise.all([
          api.get('/leads', { params: { page_size: 5, period: 'all' } }).catch(() => ({ data: { items: [] } })),
          api.get('/quotes', { params: { page_size: 5 } }).catch(() => ({ data: { items: [] } })),
          api.get('/invoices', { params: { page_size: 5 } }).catch(() => ({ data: { items: [] } })),
        ]);
        const q = query.toLowerCase();
        const match = (s) => (s || '').toLowerCase().includes(q);
        setResults({
          leads: (leadsR.data?.items || []).filter(l => match(l.name) || match(l.email) || match(l.phone)).slice(0, 5),
          quotes: (quotesR.data?.items || []).filter(qt => match(qt.quote_number) || match(qt.lead_name) || match(qt.title)).slice(0, 5),
          invoices: (invoicesR.data?.items || []).filter(i => match(i.invoice_number) || match(i.lead_name)).slice(0, 5),
        });
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => searchTimer.current && clearTimeout(searchTimer.current);
  }, [query]);

  // Liste applate de tous les résultats pour la navigation clavier
  const flatItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? NAV_COMMANDS.filter(c => c.label.toLowerCase().includes(q))
        .concat(ACTION_COMMANDS.filter(c => c.label.toLowerCase().includes(q)))
      : NAV_COMMANDS.concat(ACTION_COMMANDS);

    const items = [];
    filtered.forEach(c => items.push({ kind: 'cmd', data: c }));
    results.leads.forEach(l => items.push({ kind: 'lead', data: l }));
    results.quotes.forEach(qt => items.push({ kind: 'quote', data: qt }));
    results.invoices.forEach(i => items.push({ kind: 'invoice', data: i }));
    return items;
  }, [query, results]);

  const handleSelect = useCallback((item) => {
    if (!item) return;
    let path = null;
    if (item.kind === 'cmd') path = item.data.to;
    if (item.kind === 'lead') path = `/leads/${item.data.lead_id}`;
    if (item.kind === 'quote') path = `/quotes/${item.data.quote_id}`;
    if (item.kind === 'invoice') path = `/invoices/${item.data.invoice_id}`;
    if (path) navigate(path);
    setOpen(false);
  }, [navigate]);

  // Navigation clavier dans les résultats
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(flatItems.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(flatItems[selectedIdx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flatItems, selectedIdx, handleSelect]);

  if (!open) return null;

  let rowIdx = 0;
  const rowIdxFor = () => rowIdx++;

  return (
    <div onClick={() => setOpen(false)} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 'max(10vh, 80px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#FDFCF9', borderRadius: 14, width: '95%', maxWidth: 640,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
        maxHeight: '70vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Input */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid oklch(0.88 0.01 75)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search style={{ width: 18, height: 18, color: 'oklch(0.52 0.010 60)' }} />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            placeholder="Rechercher un lead, devis, facture, ou naviguer…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, fontFamily: 'Inter, system-ui',
            }} />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(0.52 0.010 60)',
            border: '1px solid oklch(0.85 0.012 75)', padding: '2px 6px', borderRadius: 4,
          }}>ESC</span>
        </div>

        {/* Résultats */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {loading && <div style={{ padding: 20, color: 'oklch(0.52 0.010 60)', fontSize: 12, fontStyle: 'italic' }}>Recherche…</div>}

          {!query && (
            <>
              <SectionLabel>Navigation</SectionLabel>
              {NAV_COMMANDS.map(c => {
                const i = rowIdxFor();
                return <Row key={c.id} icon={c.icon} label={c.label} kbd={c.kbd} selected={i === selectedIdx} onClick={() => handleSelect({ kind: 'cmd', data: c })} />;
              })}
              <SectionLabel>Actions</SectionLabel>
              {ACTION_COMMANDS.map(c => {
                const i = rowIdxFor();
                return <Row key={c.id} icon={c.icon} label={c.label} selected={i === selectedIdx} onClick={() => handleSelect({ kind: 'cmd', data: c })} />;
              })}
            </>
          )}

          {query && (
            <>
              {flatItems.filter(x => x.kind === 'cmd').length > 0 && (
                <>
                  <SectionLabel>Navigation / Actions</SectionLabel>
                  {flatItems.filter(x => x.kind === 'cmd').map(item => {
                    const i = rowIdxFor();
                    return <Row key={item.data.id} icon={item.data.icon} label={item.data.label} selected={i === selectedIdx} onClick={() => handleSelect(item)} />;
                  })}
                </>
              )}
              {results.leads.length > 0 && (
                <>
                  <SectionLabel>Leads</SectionLabel>
                  {results.leads.map(l => {
                    const i = rowIdxFor();
                    return <Row key={l.lead_id} icon={User} label={l.name} sub={l.email || l.phone} selected={i === selectedIdx} onClick={() => handleSelect({ kind: 'lead', data: l })} />;
                  })}
                </>
              )}
              {results.quotes.length > 0 && (
                <>
                  <SectionLabel>Devis</SectionLabel>
                  {results.quotes.map(qt => {
                    const i = rowIdxFor();
                    return <Row key={qt.quote_id} icon={FileText} label={qt.quote_number || qt.title || qt.quote_id.slice(-8)} sub={qt.lead_name} selected={i === selectedIdx} onClick={() => handleSelect({ kind: 'quote', data: qt })} />;
                  })}
                </>
              )}
              {results.invoices.length > 0 && (
                <>
                  <SectionLabel>Factures</SectionLabel>
                  {results.invoices.map(inv => {
                    const i = rowIdxFor();
                    return <Row key={inv.invoice_id} icon={CreditCard} label={inv.invoice_number || inv.invoice_id.slice(-8)} sub={inv.lead_name} selected={i === selectedIdx} onClick={() => handleSelect({ kind: 'invoice', data: inv })} />;
                  })}
                </>
              )}
              {!loading && flatItems.length === 0 && (
                <div style={{ padding: 20, color: 'oklch(0.52 0.010 60)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                  Aucun résultat pour « {query} »
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer avec raccourcis */}
        <div style={{
          padding: '8px 14px', borderTop: '1px solid oklch(0.88 0.01 75)',
          display: 'flex', gap: 16, fontSize: 10, color: 'oklch(0.52 0.010 60)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <span>↑↓ naviguer</span>
          <span>↵ sélectionner</span>
          <span>esc fermer</span>
          <span style={{ marginLeft: 'auto' }}>⌘K pour ouvrir</span>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      padding: '10px 14px 4px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
      letterSpacing: '0.12em', textTransform: 'uppercase', color: 'oklch(0.52 0.010 60)',
    }}>{children}</div>
  );
}

function Row({ icon: Icon, label, sub, kbd, selected, onClick }) {
  return (
    <button onClick={onClick} onMouseEnter={e => e.currentTarget.scrollIntoView({ block: 'nearest' })}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', border: 'none', cursor: 'pointer',
        background: selected ? 'oklch(0.93 0.05 165)' : 'transparent',
        textAlign: 'left', borderRadius: 8,
        color: 'oklch(0.165 0.012 60)',
      }}>
      {Icon && <Icon style={{ width: 16, height: 16, color: selected ? 'oklch(0.52 0.13 165)' : 'oklch(0.52 0.010 60)', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'oklch(0.52 0.010 60)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
      </div>
      {kbd && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(0.52 0.010 60)',
          border: '1px solid oklch(0.85 0.012 75)', padding: '1px 6px', borderRadius: 4,
        }}>{kbd}</span>
      )}
      {selected && <ArrowRight style={{ width: 14, height: 14, color: 'oklch(0.52 0.13 165)' }} />}
    </button>
  );
}
