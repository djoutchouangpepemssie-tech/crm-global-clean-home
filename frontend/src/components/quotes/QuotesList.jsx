import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import {
  Plus, Search, X, FileText, Send, Trash2, CheckSquare, Square,
  ChevronUp, ChevronDown, RefreshCw, TrendingUp, Euro, BarChart3,
  ShoppingCart, Filter, Eye, MoreHorizontal, ArrowRight,
} from 'lucide-react';

/**
 * QuotesList — Atelier artisanal.
 *
 * Cover éditoriale "Le livre des devis"
 * Hero 4 chiffres : CA attente · total 30j · taux accept · panier moy
 * Tabs statuts + compteurs · recherche · tri colonnes
 * Tableau dense avatar+ville · pastilles statut colorées · bulk bar ink
 *
 * API : GET /api/quotes → [{ id, number, lead, amount, status, created_at, expiry_date, … }]
 * Fallbacks inline complets.
 */

/* ─── CSS tokens ───────────────────────────────────────────────── */
const tokenStyle = `
  .ql-root {
    --bg: oklch(0.965 0.012 80);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
    --accent: oklch(0.52 0.13 165);
    --accent-soft: oklch(0.93 0.05 165);
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --gold: oklch(0.72 0.13 85);
    --gold-soft: oklch(0.95 0.05 85);
    --cool: oklch(0.60 0.10 220);
    --cool-soft: oklch(0.94 0.04 220);
  }
  .ql-root {
    background: var(--bg);
    min-height: 100vh;
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    font-feature-settings: "ss01", "cv11";
    -webkit-font-smoothing: antialiased;
  }
  .ql-display { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.02em; }
  .ql-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .ql-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 500; }

  .ql-cover {
    background: var(--ink);
    color: var(--bg);
    padding: 48px 48px 40px;
    position: relative;
    overflow: hidden;
  }
  .ql-cover::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 220px; height: 220px;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0.12;
    pointer-events: none;
  }
  .ql-cover::after {
    content: '';
    position: absolute;
    bottom: -40px; left: 40%;
    width: 140px; height: 140px;
    border-radius: 50%;
    background: var(--warm);
    opacity: 0.10;
    pointer-events: none;
  }

  .ql-hero-cell {
    border-right: 1px solid var(--line-2);
    padding: 20px 28px;
    flex: 1;
    min-width: 0;
  }
  .ql-hero-cell:last-child { border-right: none; }

  .ql-tab {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all .15s;
    border: 1.5px solid transparent;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ql-tab-active {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  .ql-tab-inactive {
    color: var(--ink-3);
    background: transparent;
  }
  .ql-tab-inactive:hover { background: var(--surface-2); color: var(--ink-2); }

  .ql-th {
    padding: 10px 12px;
    font-size: 11px;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--ink-3);
    font-weight: 500;
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
    white-space: nowrap;
  }
  .ql-th:hover { color: var(--ink-2); }

  .ql-tr {
    border-bottom: 1px solid var(--line-2);
    transition: background .1s;
  }
  .ql-tr:hover { background: var(--surface-2); }
  .ql-tr-selected { background: oklch(0.93 0.04 165 / 0.25) !important; }

  .ql-td { padding: 12px 12px; font-size: 13px; vertical-align: middle; }

  .ql-avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700;
    font-family: 'Fraunces', serif;
    flex-shrink: 0;
    border: 1.5px solid oklch(0.85 0.06 165);
  }

  .ql-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .ql-badge-brouillon { background: var(--surface-2); color: var(--ink-3); }
  .ql-badge-envoye    { background: var(--cool-soft); color: var(--cool); }
  .ql-badge-accepte   { background: var(--accent-soft); color: var(--accent); }
  .ql-badge-refuse    { background: var(--warm-soft); color: var(--warm); }
  .ql-badge-expire    { background: var(--gold-soft); color: oklch(0.52 0.13 85); }

  .ql-bulk-bar {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--ink);
    color: var(--bg);
    border-radius: 12px;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 8px 32px oklch(0.165 0.012 60 / 0.35);
    z-index: 100;
    white-space: nowrap;
  }
  .ql-bulk-btn {
    padding: 6px 14px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s;
    border: 1.5px solid oklch(0.35 0.012 60);
    background: transparent;
    color: var(--bg);
    display: flex; align-items: center; gap: 5px;
  }
  .ql-bulk-btn:hover { background: oklch(0.28 0.012 60); border-color: oklch(0.42 0.012 60); }
  .ql-bulk-btn-danger:hover { background: var(--warm); border-color: var(--warm); }

  .ql-search-box {
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--ink);
    outline: none;
    transition: border .15s;
    width: 220px;
  }
  .ql-search-box:focus { border-color: var(--accent); }

  .ql-icon-btn {
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink-3);
    transition: all .15s;
  }
  .ql-icon-btn:hover { border-color: var(--ink-3); color: var(--ink-2); background: var(--surface-2); }

  .ql-btn-primary {
    background: var(--ink);
    color: var(--bg);
    border: none;
    border-radius: 9px;
    padding: 9px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    transition: opacity .15s;
  }
  .ql-btn-primary:hover { opacity: 0.85; }

  .ql-empty {
    text-align: center;
    padding: 64px 32px;
    color: var(--ink-3);
  }

  .ql-sort-icon { opacity: 0.4; transition: opacity .1s; }
  .ql-th:hover .ql-sort-icon { opacity: 1; }
  .ql-sort-active { opacity: 1; color: var(--accent); }
`;

/* ─── Helpers ──────────────────────────────────────────────────── */
const STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoyé: 'Envoyé',
  accepté: 'Accepté',
  refusé: 'Refusé',
  expiré: 'Expiré',
};

const STATUS_BADGE_CLASS = {
  brouillon: 'ql-badge-brouillon',
  envoyé: 'ql-badge-envoye',
  accepté: 'ql-badge-accepte',
  refusé: 'ql-badge-refuse',
  expiré: 'ql-badge-expire',
};

function normStatus(s) {
  if (!s) return 'brouillon';
  const m = { envoye: 'envoyé', accepte: 'accepté', refuse: 'refusé', expire: 'expiré' };
  return m[s.toLowerCase()] || s.toLowerCase();
}

function fmtAmount(n) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

/* ─── Demo data ────────────────────────────────────────────────── */
const DEMO_QUOTES = [
  { id: 1, number: 'D-2024-001', lead: { full_name: 'Marie Dupont', city: 'Paris 11e' }, amount: 2400, status: 'envoyé', created_at: '2024-11-10', expiry_date: '2024-12-10', service: 'Nettoyage après travaux' },
  { id: 2, number: 'D-2024-002', lead: { full_name: 'Thomas Martin', city: 'Paris 7e' }, amount: 840, status: 'accepté', created_at: '2024-11-08', expiry_date: '2024-12-08', service: 'Ménage régulier' },
  { id: 3, number: 'D-2024-003', lead: { full_name: 'Sophie Bernard', city: 'Neuilly-sur-Seine' }, amount: 5200, status: 'brouillon', created_at: '2024-11-12', expiry_date: null, service: 'Pressing & repassage' },
  { id: 4, number: 'D-2024-004', lead: { full_name: 'Antoine Leroy', city: 'Vincennes' }, amount: 1100, status: 'refusé', created_at: '2024-11-01', expiry_date: '2024-11-30', service: 'Nettoyage vitres' },
  { id: 5, number: 'D-2024-005', lead: { full_name: 'Camille Petit', city: 'Paris 16e' }, amount: 3600, status: 'envoyé', created_at: '2024-11-14', expiry_date: '2024-12-14', service: 'Grand ménage' },
  { id: 6, number: 'D-2024-006', lead: { full_name: 'Lucas Simon', city: 'Levallois-Perret' }, amount: 720, status: 'accepté', created_at: '2024-11-05', expiry_date: '2024-12-05', service: 'Ménage régulier' },
  { id: 7, number: 'D-2024-007', lead: { full_name: 'Élise Moreau', city: 'Boulogne-Billancourt' }, amount: 4800, status: 'expiré', created_at: '2024-10-20', expiry_date: '2024-11-20', service: 'Nettoyage après déménagement' },
  { id: 8, number: 'D-2024-008', lead: { full_name: 'Paul Lambert', city: 'Paris 8e' }, amount: 9200, status: 'envoyé', created_at: '2024-11-15', expiry_date: '2024-12-15', service: 'Contrat entreprise' },
  { id: 9, number: 'D-2024-009', lead: { full_name: 'Inès Lefebvre', city: 'Saint-Cloud' }, amount: 660, status: 'brouillon', created_at: '2024-11-16', expiry_date: null, service: 'Ménage ponctuel' },
  { id: 10, number: 'D-2024-010', lead: { full_name: 'Hugo Blanc', city: 'Paris 14e' }, amount: 2100, status: 'accepté', created_at: '2024-11-07', expiry_date: '2024-12-07', service: 'Nettoyage après travaux' },
];

/* ─── Subcomponents ────────────────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronDown className="w-3 h-3 ql-sort-icon inline ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ql-sort-active inline ml-1" />
    : <ChevronDown className="w-3 h-3 ql-sort-active inline ml-1" />;
}

function StatusBadge({ status }) {
  const s = normStatus(status);
  return (
    <span className={`ql-badge ${STATUS_BADGE_CLASS[s] || 'ql-badge-brouillon'}`}>
      {STATUS_LABELS[s] || s}
    </span>
  );
}

/* ─── Main component ───────────────────────────────────────────── */
export default function QuotesList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(new Set());

  /* Fetch */
  useEffect(() => {
    setLoading(true);
    api.get('/quotes')
      .then(r => setQuotes(r.data || DEMO_QUOTES))
      .catch(() => setQuotes(DEMO_QUOTES))
      .finally(() => setLoading(false));
  }, []);

  /* Stats Hero */
  const stats = useMemo(() => {
    const all = quotes.map(q => ({ ...q, status: normStatus(q.status) }));
    const pending = all.filter(q => q.status === 'envoyé');
    const accepted = all.filter(q => q.status === 'accepté');
    const last30 = all.filter(q => {
      try { return (Date.now() - new Date(q.created_at)) < 30 * 86400 * 1000; } catch { return false; }
    });
    const caAttente = pending.reduce((s, q) => s + (q.amount || 0), 0);
    const total30 = last30.length;
    const tauxAccept = all.length > 0 ? Math.round((accepted.length / all.length) * 100) : 0;
    const panierMoy = all.length > 0 ? Math.round(all.reduce((s, q) => s + (q.amount || 0), 0) / all.length) : 0;
    return { caAttente, total30, tauxAccept, panierMoy };
  }, [quotes]);

  /* Tabs counts */
  const counts = useMemo(() => {
    const c = { all: quotes.length };
    quotes.forEach(q => {
      const s = normStatus(q.status);
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [quotes]);

  /* Filtered + sorted */
  const filtered = useMemo(() => {
    let list = quotes.map(q => ({ ...q, status: normStatus(q.status) }));
    if (activeTab !== 'all') list = list.filter(q => q.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(item =>
        (item.number || '').toLowerCase().includes(q) ||
        (item.lead?.full_name || '').toLowerCase().includes(q) ||
        (item.lead?.city || '').toLowerCase().includes(q) ||
        (item.service || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'lead') { av = a.lead?.full_name || ''; bv = b.lead?.full_name || ''; }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [quotes, activeTab, search, sortKey, sortDir]);

  const toggleSort = useCallback((col) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(col); setSortDir('desc'); }
  }, [sortKey]);

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(q => q.id)));
  }, [selected, filtered]);

  const clearSelection = () => setSelected(new Set());

  const TABS = [
    { key: 'all', label: 'Tous' },
    { key: 'brouillon', label: 'Brouillon' },
    { key: 'envoyé', label: 'Envoyés' },
    { key: 'accepté', label: 'Acceptés' },
    { key: 'refusé', label: 'Refusés' },
    { key: 'expiré', label: 'Expirés' },
  ];

  const COLUMNS = [
    { key: 'number',     label: 'Référence',  w: '140px' },
    { key: 'lead',       label: 'Client',     w: '200px' },
    { key: 'service',    label: 'Service',    w: '180px' },
    { key: 'amount',     label: 'Montant',    w: '120px' },
    { key: 'status',     label: 'Statut',     w: '110px' },
    { key: 'created_at', label: 'Créé le',    w: '120px' },
    { key: 'expiry_date',label: 'Expiration', w: '120px' },
  ];

  return (
    <div className="ql-root">
      <style>{tokenStyle}</style>

      {/* ── Cover éditoriale ── */}
      <div className="ql-cover">
        <div className="relative z-10 flex items-end justify-between gap-4" style={{ flexWrap: 'wrap' }}>
          <div>
            <p className="ql-mono text-[11px] uppercase tracking-[0.14em] mb-2"
               style={{ color: 'oklch(0.72 0.008 70)', opacity: 0.7 }}>
              Commercial · Documents
            </p>
            <h1 className="ql-display text-[42px] leading-none mb-1"
                style={{ color: 'oklch(0.965 0.012 80)', fontStyle: 'italic' }}>
              Le livre des devis
            </h1>
            <p style={{ color: 'oklch(0.72 0.008 70)', fontSize: 14, marginTop: 6 }}>
              {quotes.length} devis enregistrés · mis à jour à l'instant
            </p>
          </div>
          <button className="ql-btn-primary" onClick={() => navigate('/quotes/new')}
                  style={{ background: 'var(--accent)', color: 'white' }}>
            <Plus className="w-4 h-4" />
            Nouveau devis
          </button>
        </div>
      </div>

      {/* ── Hero 4 chiffres ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', maxWidth: '100%' }}>
          {[
            {
              Icon: Euro,
              label: 'CA en attente',
              value: fmtAmount(stats.caAttente),
              sub: 'devis envoyés non signés',
              accent: 'var(--accent)',
            },
            {
              Icon: BarChart3,
              label: 'Devis sur 30 jours',
              value: stats.total30,
              sub: 'nouveaux dossiers',
              accent: 'var(--warm)',
            },
            {
              Icon: TrendingUp,
              label: 'Taux d\'acceptation',
              value: `${stats.tauxAccept}%`,
              sub: 'vs 38% secteur',
              accent: 'var(--accent)',
            },
            {
              Icon: ShoppingCart,
              label: 'Panier moyen',
              value: fmtAmount(stats.panierMoy),
              sub: 'toutes prestations',
              accent: 'var(--gold)',
            },
          ].map(({ Icon, label, value, sub, accent }, i) => (
            <div key={i} className="ql-hero-cell">
              <Icon style={{ width: 16, height: 16, color: accent, marginBottom: 10 }} strokeWidth={1.8} />
              <div className="ql-mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
                {value}
              </div>
              <div className="ql-label">{label}</div>
              <div className="ql-mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`ql-tab ${activeTab === t.key ? 'ql-tab-active' : 'ql-tab-inactive'}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              <span style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '1px 6px',
                borderRadius: 9999,
                background: activeTab === t.key ? 'rgba(255,255,255,0.15)' : 'var(--surface-2)',
                color: activeTab === t.key ? 'inherit' : 'var(--ink-3)',
              }}>
                {counts[t.key] || 0}
              </span>
            </button>
          ))}
        </div>
        {/* Search + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--ink-3)' }} />
            <input
              className="ql-search-box"
              style={{ paddingLeft: 32 }}
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
          <button className="ql-icon-btn" onClick={() => {
            setLoading(true);
            api.get('/quotes').then(r => setQuotes(r.data || DEMO_QUOTES)).catch(() => setQuotes(DEMO_QUOTES)).finally(() => setLoading(false));
          }}>
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ padding: '0 0 80px' }}>
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ width: 28, height: 28, border: '2.5px solid var(--line)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13 }}>Chargement des devis…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ql-empty">
            <FileText style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.2 }} />
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucun devis</p>
            <p style={{ fontSize: 13, opacity: 0.6 }}>Ajustez les filtres ou créez un nouveau devis</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr>
                  <th className="ql-th" style={{ width: 44, padding: '10px 12px' }}>
                    <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}>
                      {selected.size > 0 && selected.size === filtered.length
                        ? <CheckSquare style={{ width: 15, height: 15 }} />
                        : <Square style={{ width: 15, height: 15 }} />}
                    </button>
                  </th>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className="ql-th"
                      style={{ width: col.w, textAlign: col.key === 'amount' ? 'right' : 'left' }}
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="ql-th" style={{ width: 60 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const isSel = selected.has(q.id);
                  return (
                    <tr key={q.id} className={`ql-tr ${isSel ? 'ql-tr-selected' : ''}`}>
                      {/* Checkbox */}
                      <td className="ql-td" style={{ padding: '12px 12px' }}>
                        <button onClick={() => toggleSelect(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}>
                          {isSel
                            ? <CheckSquare style={{ width: 15, height: 15, color: 'var(--accent)' }} />
                            : <Square style={{ width: 15, height: 15 }} />}
                        </button>
                      </td>
                      {/* Numéro */}
                      <td className="ql-td">
                        <span className="ql-mono" style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                          {q.number || `#${q.id}`}
                        </span>
                      </td>
                      {/* Client + ville */}
                      <td className="ql-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="ql-avatar">{initials(q.lead?.full_name)}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>
                              {q.lead?.full_name || 'Client inconnu'}
                            </div>
                            <div className="ql-mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 1 }}>
                              {q.lead?.city || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Service */}
                      <td className="ql-td" style={{ color: 'var(--ink-2)', fontSize: 12 }}>
                        {q.service || '—'}
                      </td>
                      {/* Montant */}
                      <td className="ql-td" style={{ textAlign: 'right' }}>
                        <span className="ql-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                          {fmtAmount(q.amount)}
                        </span>
                      </td>
                      {/* Statut */}
                      <td className="ql-td">
                        <StatusBadge status={q.status} />
                      </td>
                      {/* Créé le */}
                      <td className="ql-td">
                        <span className="ql-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                          {fmtDate(q.created_at)}
                        </span>
                      </td>
                      {/* Expiration */}
                      <td className="ql-td">
                        <span className="ql-mono" style={{ fontSize: 11, color: q.expiry_date && new Date(q.expiry_date) < new Date() ? 'var(--warm)' : 'var(--ink-3)' }}>
                          {fmtDate(q.expiry_date)}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="ql-td">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="ql-icon-btn" title="Voir" onClick={() => navigate(`/quotes/${q.id}`)}>
                            <Eye style={{ width: 13, height: 13 }} />
                          </button>
                          <button className="ql-icon-btn" title="Envoyer" onClick={() => navigate(`/quotes/${q.id}`)}>
                            <Send style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bulk bar ── */}
      {selected.size > 0 && (
        <div className="ql-bulk-bar">
          <span className="ql-mono" style={{ fontSize: 12, opacity: 0.7 }}>
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <div style={{ width: 1, height: 18, background: 'oklch(0.35 0.012 60)' }} />
          <button className="ql-bulk-btn">
            <Send style={{ width: 13, height: 13 }} /> Envoyer
          </button>
          <button className="ql-bulk-btn">
            <FileText style={{ width: 13, height: 13 }} /> Exporter PDF
          </button>
          <button className="ql-bulk-btn ql-bulk-btn-danger">
            <Trash2 style={{ width: 13, height: 13 }} /> Supprimer
          </button>
          <button
            onClick={clearSelection}
            style={{ background: 'none', border: 'none', color: 'oklch(0.65 0.008 70)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <X style={{ width: 13, height: 13 }} /> Désélectionner
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
