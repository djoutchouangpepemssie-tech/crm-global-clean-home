import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import {
  Plus, Search, X, FileText, Send, Trash2, CheckSquare, Square,
  ChevronUp, ChevronDown, RefreshCw, TrendingUp, Euro, BarChart3,
  ShoppingCart, Eye,
} from 'lucide-react';

/**
 * QuotesList — Données réelles depuis GET /api/quotes + /api/quotes/stats
 *
 * Mapping backend → composant :
 *   quote_id        → id
 *   quote_number    → number  (D-YYYY-NNNN)
 *   lead_name       → lead.full_name
 *   lead_city       → lead.city
 *   title || service_type → service
 *   amount          → amount
 *   status          → status  (brouillon|envoyé|accepté|refusé|expiré)
 *   created_at      → created_at
 *   expiry_date     → expiry_date
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
    background: var(--bg); min-height: 100vh; color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    font-feature-settings: "ss01","cv11"; -webkit-font-smoothing: antialiased;
  }
  .ql-display { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.02em; }
  .ql-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .ql-label { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ink-3); font-weight:500; }

  .ql-cover {
    background: var(--ink); color: var(--bg);
    padding: 48px 48px 40px; position: relative; overflow: hidden;
  }
  .ql-cover::before {
    content:''; position:absolute; top:-60px; right:-60px;
    width:220px; height:220px; border-radius:50%;
    background:var(--accent); opacity:0.12; pointer-events:none;
  }
  .ql-cover::after {
    content:''; position:absolute; bottom:-40px; left:40%;
    width:140px; height:140px; border-radius:50%;
    background:var(--warm); opacity:0.10; pointer-events:none;
  }

  .ql-hero-cell {
    border-right: 1px solid var(--line-2);
    padding: 20px 28px; flex: 1; min-width: 0;
  }
  .ql-hero-cell:last-child { border-right: none; }

  .ql-tab {
    padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all .15s; border: 1.5px solid transparent;
    white-space: nowrap; display: flex; align-items: center; gap: 6px;
  }
  .ql-tab-active  { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .ql-tab-inactive{ color: var(--ink-3); background: transparent; }
  .ql-tab-inactive:hover { background: var(--surface-2); color: var(--ink-2); }

  .ql-th {
    padding: 10px 12px; font-size: 11px; letter-spacing: 0.10em;
    text-transform: uppercase; color: var(--ink-3); font-weight: 500;
    cursor: pointer; user-select: none;
    border-bottom: 1px solid var(--line); background: var(--surface); white-space: nowrap;
  }
  .ql-th:hover { color: var(--ink-2); }

  .ql-tr { border-bottom: 1px solid var(--line-2); transition: background .1s; }
  .ql-tr:hover { background: var(--surface-2); }
  .ql-tr-selected { background: oklch(0.93 0.04 165 / 0.25) !important; }
  .ql-td { padding: 12px; font-size: 13px; vertical-align: middle; }

  .ql-avatar {
    width:34px; height:34px; border-radius:50%;
    background:var(--accent-soft); color:var(--accent);
    display:flex; align-items:center; justify-content:center;
    font-size:13px; font-weight:700; font-family:'Fraunces',serif;
    flex-shrink:0; border:1.5px solid oklch(0.85 0.06 165);
  }

  .ql-badge { display:inline-flex; align-items:center; padding:2px 10px; border-radius:999px; font-size:11px; font-weight:600; letter-spacing:0.04em; }
  .ql-badge-brouillon { background:var(--surface-2); color:var(--ink-3); }
  .ql-badge-envoye    { background:var(--cool-soft); color:var(--cool); }
  .ql-badge-accepte   { background:var(--accent-soft); color:var(--accent); }
  .ql-badge-refuse    { background:var(--warm-soft); color:var(--warm); }
  .ql-badge-expire    { background:var(--gold-soft); color:oklch(0.52 0.13 85); }

  .ql-bulk-bar {
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:var(--ink); color:var(--bg); border-radius:12px;
    padding:12px 20px; display:flex; align-items:center; gap:12px;
    box-shadow:0 8px 32px oklch(0.165 0.012 60 / 0.35); z-index:100; white-space:nowrap;
  }
  .ql-bulk-btn {
    padding:6px 14px; border-radius:7px; font-size:12px; font-weight:600;
    cursor:pointer; transition:all .15s; border:1.5px solid oklch(0.35 0.012 60);
    background:transparent; color:var(--bg); display:flex; align-items:center; gap:5px;
  }
  .ql-bulk-btn:hover { background:oklch(0.28 0.012 60); border-color:oklch(0.42 0.012 60); }
  .ql-bulk-btn-danger:hover { background:var(--warm); border-color:var(--warm); }

  .ql-search-box {
    background:var(--surface); border:1.5px solid var(--line); border-radius:10px;
    padding:8px 12px; font-size:13px; color:var(--ink); outline:none;
    transition:border .15s; width:220px;
  }
  .ql-search-box:focus { border-color:var(--accent); }

  .ql-icon-btn {
    width:32px; height:32px; border-radius:8px;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; border:1.5px solid var(--line); background:var(--surface);
    color:var(--ink-3); transition:all .15s;
  }
  .ql-icon-btn:hover { border-color:var(--ink-3); color:var(--ink-2); background:var(--surface-2); }

  .ql-btn-primary {
    background:var(--ink); color:var(--bg); border:none; border-radius:9px;
    padding:9px 18px; font-size:13px; font-weight:600; cursor:pointer;
    display:flex; align-items:center; gap:6px; transition:opacity .15s;
  }
  .ql-btn-primary:hover { opacity:0.85; }
  .ql-empty { text-align:center; padding:64px 32px; color:var(--ink-3); }
  .ql-sort-icon { opacity:0.4; transition:opacity .1s; }
  .ql-th:hover .ql-sort-icon { opacity:1; }
  .ql-sort-active { opacity:1; color:var(--accent); }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ─── Helpers ──────────────────────────────────────────────────── */
const STATUS_LABELS = {
  brouillon: 'Brouillon', envoyé: 'Envoyé', accepté: 'Accepté',
  refusé: 'Refusé', expiré: 'Expiré',
};
const STATUS_BADGE = {
  brouillon: 'ql-badge-brouillon', envoyé: 'ql-badge-envoye',
  accepté: 'ql-badge-accepte', refusé: 'ql-badge-refuse', expiré: 'ql-badge-expire',
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
  return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

/** Adapte un document quote du backend vers le format interne du composant */
function mapQuote(q) {
  return {
    id:         q.quote_id,
    number:     q.quote_number || q.quote_id?.slice(-8)?.toUpperCase() || '—',
    lead: {
      full_name: q.lead_name || 'Client inconnu',
      city:      q.lead_city || '—',
    },
    service:    q.title || q.service_type || '—',
    amount:     q.amount || 0,
    status:     normStatus(q.status),
    created_at: q.created_at,
    expiry_date: q.expiry_date || null,
    _raw: q,
  };
}

/* ─── Sub-components ───────────────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronDown className="w-3 h-3 ql-sort-icon inline ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ql-sort-active inline ml-1" />
    : <ChevronDown className="w-3 h-3 ql-sort-active inline ml-1" />;
}

function StatusBadge({ status }) {
  return (
    <span className={`ql-badge ${STATUS_BADGE[status] || 'ql-badge-brouillon'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/* ─── Main ─────────────────────────────────────────────────────── */
export default function QuotesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [quotes, setQuotes]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState('created_at');
  const [sortDir, setSortDir]   = useState('desc');
  const [selected, setSelected] = useState(new Set());

  /* ── Chargement ── */
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/quotes', { params: { page_size: 200 } })
      .then(r => {
        const items = r.data?.items || r.data || [];
        setQuotes(items.map(mapQuote));
      })
      .catch(err => {
        setError(err?.message || 'Erreur de chargement');
        setQuotes([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, location.key]);

  /* ── Stats calculées à partir des données ── */
  const stats = useMemo(() => {
    const pending  = quotes.filter(q => q.status === 'envoyé');
    const accepted = quotes.filter(q => q.status === 'accepté');
    const last30   = quotes.filter(q => {
      try { return (Date.now() - new Date(q.created_at)) < 30 * 86400 * 1000; }
      catch { return false; }
    });
    const caAttente = pending.reduce((s, q) => s + (q.amount || 0), 0);
    const total     = quotes.length;
    const tauxAccept = total > 0 ? Math.round(accepted.length / total * 100) : 0;
    const panierMoy  = total > 0 ? Math.round(quotes.reduce((s, q) => s + (q.amount || 0), 0) / total) : 0;
    return { caAttente, total30: last30.length, tauxAccept, panierMoy };
  }, [quotes]);

  /* ── Compteurs par onglet ── */
  const counts = useMemo(() => {
    const c = { all: quotes.length };
    quotes.forEach(q => { c[q.status] = (c[q.status] || 0) + 1; });
    return c;
  }, [quotes]);

  /* ── Filtre + tri ── */
  const filtered = useMemo(() => {
    let list = quotes;
    if (activeTab !== 'all') list = list.filter(q => q.status === activeTab);
    if (search.trim()) {
      const sq = search.toLowerCase();
      list = list.filter(q =>
        q.number.toLowerCase().includes(sq) ||
        q.lead.full_name.toLowerCase().includes(sq) ||
        q.lead.city.toLowerCase().includes(sq) ||
        q.service.toLowerCase().includes(sq)
      );
    }
    return [...list].sort((a, b) => {
      let av = sortKey === 'lead' ? a.lead.full_name : a[sortKey];
      let bv = sortKey === 'lead' ? b.lead.full_name : b[sortKey];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
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

  /* ── Suppression (soft-delete) ── */
  const deleteSelected = useCallback(async () => {
    if (!selected.size) return;
    if (!window.confirm(`Supprimer ${selected.size} devis ? Cette action est réversible (corbeille).`)) return;
    const results = await Promise.allSettled([...selected].map(id => api.delete(`/quotes/${id}`)));
    const failed = results.filter(r => r.status === 'rejected').length;
    setSelected(new Set());
    if (failed) setError(`${failed} devis n'ont pas pu être supprimés`);
    load();
  }, [selected, load]);

  /* ── Envoi en masse (POST /quotes/:id/send) ── */
  const [bulkBusy, setBulkBusy] = useState(false);
  const sendSelected = useCallback(async () => {
    if (!selected.size || bulkBusy) return;
    if (!window.confirm(`Envoyer ${selected.size} devis par email au client ?`)) return;
    setBulkBusy(true);
    const results = await Promise.allSettled([...selected].map(id => api.post(`/quotes/${id}/send`)));
    const failed = results.filter(r => r.status === 'rejected').length;
    const sent = results.length - failed;
    setSelected(new Set());
    setBulkBusy(false);
    if (failed) setError(`${sent} devis envoyé(s), ${failed} échec(s)`);
    load();
  }, [selected, bulkBusy, load]);

  /* ── Export PDF (téléchargement séquentiel) ── */
  const exportSelected = useCallback(async () => {
    if (!selected.size || bulkBusy) return;
    setBulkBusy(true);
    let failed = 0;
    for (const id of [...selected]) {
      try {
        const r = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
        const q = quotes.find(x => x.id === id);
        const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${q?.number || id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        failed++;
      }
    }
    setBulkBusy(false);
    if (failed) setError(`${failed} PDF n'ont pas pu être générés`);
  }, [selected, bulkBusy, quotes]);

  const TABS = [
    { key: 'all',      label: 'Tous' },
    { key: 'brouillon',label: 'Brouillon' },
    { key: 'envoyé',   label: 'Envoyés' },
    { key: 'accepté',  label: 'Acceptés' },
    { key: 'refusé',   label: 'Refusés' },
    { key: 'expiré',   label: 'Expirés' },
  ];

  const COLUMNS = [
    { key: 'number',      label: 'Référence',   w: '140px' },
    { key: 'lead',        label: 'Client',       w: '200px' },
    { key: 'service',     label: 'Service',      w: '180px' },
    { key: 'amount',      label: 'Montant',      w: '120px' },
    { key: 'status',      label: 'Statut',       w: '110px' },
    { key: 'created_at',  label: 'Créé le',      w: '120px' },
    { key: 'expiry_date', label: 'Expiration',   w: '120px' },
  ];

  return (
    <div className="ql-root">
      <style>{tokenStyle}</style>

      {/* Cover */}
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
            <Plus className="w-4 h-4" /> Nouveau devis
          </button>
        </div>
      </div>

      {/* Hero 4 chiffres */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', maxWidth: '100%' }}>
          {[
            { Icon: Euro,        label: 'CA en attente',      value: fmtAmount(stats.caAttente),  sub: 'devis envoyés non signés', accent: 'var(--accent)' },
            { Icon: BarChart3,   label: 'Devis sur 30 jours', value: stats.total30,               sub: 'nouveaux dossiers',        accent: 'var(--warm)' },
            { Icon: TrendingUp,  label: "Taux d'acceptation", value: `${stats.tauxAccept}%`,      sub: 'vs 38% secteur',           accent: 'var(--accent)' },
            { Icon: ShoppingCart,label: 'Panier moyen',       value: fmtAmount(stats.panierMoy),  sub: 'toutes prestations',       accent: 'var(--gold)' },
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

      {/* Toolbar */}
      <div style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`ql-tab ${activeTab === t.key ? 'ql-tab-active' : 'ql-tab-inactive'}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              <span style={{
                fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
                padding: '1px 6px', borderRadius: 9999,
                background: activeTab === t.key ? 'rgba(255,255,255,0.15)' : 'var(--surface-2)',
                color: activeTab === t.key ? 'inherit' : 'var(--ink-3)',
              }}>
                {counts[t.key] || 0}
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--ink-3)' }} />
            <input className="ql-search-box" style={{ paddingLeft: 32 }} placeholder="Rechercher…"
                   value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
          <button className="ql-icon-btn" onClick={load} title="Rafraîchir">
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div style={{ padding: '12px 24px', background: 'var(--warm-soft)', borderBottom: '1px solid var(--warm)', color: 'var(--warm)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          Erreur : {error}
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warm)', textDecoration: 'underline', fontSize: 12 }}>Réessayer</button>
        </div>
      )}

      {/* Tableau */}
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
            <p style={{ fontSize: 13, opacity: 0.6 }}>
              {quotes.length === 0 ? 'Créez votre premier devis' : 'Ajustez les filtres'}
            </p>
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
                    <th key={col.key} className="ql-th"
                        style={{ width: col.w, textAlign: col.key === 'amount' ? 'right' : 'left' }}
                        onClick={() => toggleSort(col.key)}>
                      {col.label}
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="ql-th" style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const isSel = selected.has(q.id);
                  return (
                    <tr key={q.id} className={`ql-tr ${isSel ? 'ql-tr-selected' : ''}`}>
                      <td className="ql-td" style={{ padding: '12px' }}>
                        <button onClick={() => toggleSelect(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}>
                          {isSel
                            ? <CheckSquare style={{ width: 15, height: 15, color: 'var(--accent)' }} />
                            : <Square style={{ width: 15, height: 15 }} />}
                        </button>
                      </td>
                      <td className="ql-td">
                        <span className="ql-mono" style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                          {q.number}
                        </span>
                      </td>
                      <td className="ql-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="ql-avatar">{initials(q.lead.full_name)}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{q.lead.full_name}</div>
                            <div className="ql-mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 1 }}>{q.lead.city}</div>
                          </div>
                        </div>
                      </td>
                      <td className="ql-td" style={{ color: 'var(--ink-2)', fontSize: 12 }}>
                        {q.service}
                      </td>
                      <td className="ql-td" style={{ textAlign: 'right' }}>
                        <span className="ql-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                          {fmtAmount(q.amount)}
                        </span>
                      </td>
                      <td className="ql-td"><StatusBadge status={q.status} /></td>
                      <td className="ql-td">
                        <span className="ql-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                          {fmtDate(q.created_at)}
                        </span>
                      </td>
                      <td className="ql-td">
                        <span className="ql-mono" style={{ fontSize: 11, color: q.expiry_date && new Date(q.expiry_date) < new Date() ? 'var(--warm)' : 'var(--ink-3)' }}>
                          {fmtDate(q.expiry_date)}
                        </span>
                      </td>
                      <td className="ql-td">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="ql-icon-btn" title="Voir" onClick={() => navigate(`/quotes/${q.id}`)}>
                            <Eye style={{ width: 13, height: 13 }} />
                          </button>
                          {q.status === 'brouillon' && (
                            <button className="ql-icon-btn" title="Envoyer"
                                    onClick={() => api.post(`/quotes/${q.id}/send`).then(load)}>
                              <Send style={{ width: 13, height: 13 }} />
                            </button>
                          )}
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

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="ql-bulk-bar">
          <span className="ql-mono" style={{ fontSize: 12, opacity: 0.7 }}>
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <div style={{ width: 1, height: 18, background: 'oklch(0.35 0.012 60)' }} />
          <button className="ql-bulk-btn" onClick={sendSelected} disabled={bulkBusy}
                  style={{ opacity: bulkBusy ? 0.5 : 1, cursor: bulkBusy ? 'wait' : 'pointer' }}>
            <Send style={{ width: 13, height: 13 }} /> Envoyer
          </button>
          <button className="ql-bulk-btn" onClick={exportSelected} disabled={bulkBusy}
                  style={{ opacity: bulkBusy ? 0.5 : 1, cursor: bulkBusy ? 'wait' : 'pointer' }}>
            <FileText style={{ width: 13, height: 13 }} /> Exporter PDF
          </button>
          <button className="ql-bulk-btn ql-bulk-btn-danger" onClick={deleteSelected} disabled={bulkBusy}
                  style={{ opacity: bulkBusy ? 0.5 : 1, cursor: bulkBusy ? 'wait' : 'pointer' }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Supprimer
          </button>
          <button onClick={() => setSelected(new Set())}
                  style={{ background: 'none', border: 'none', color: 'oklch(0.65 0.008 70)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <X style={{ width: 13, height: 13 }} /> Désélectionner
          </button>
        </div>
      )}
    </div>
  );
}
