// QuotesCahier.jsx — « Le cahier des propositions ».
// Liste de devis façon livre ancien : numéros romains géants à gauche,
// détail client/montant centre, statut à droite. Alternance subtile de
// fond (nombre impair/pair) pour évoquer les pages d'un cahier.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, FileText, Send, Download, CheckSquare, Square, Trash2 } from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────── TOKENS + STYLES ─────────────────── */
const tokenStyle = `
  .qc-root {
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
  }
  .qc-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .qc-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .qc-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .qc-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .qc-italic  { font-style: italic; color: var(--accent); font-weight: 400; }

  /* Entrée du cahier */
  .qc-entry {
    display: grid; grid-template-columns: 90px 1fr 180px 120px 100px;
    gap: 24px; align-items: center;
    padding: 24px 28px;
    border-bottom: 1px solid var(--line-2);
    cursor: pointer; text-decoration: none; color: var(--ink);
    transition: background .15s; position: relative;
  }
  .qc-entry:nth-child(odd)  { background: var(--surface); }
  .qc-entry:nth-child(even) { background: var(--surface-2); }
  .qc-entry:hover { background: var(--accent-soft); }

  .qc-roman {
    font-family: 'Fraunces', serif; font-size: 42px; font-weight: 300;
    color: var(--ink-3); letter-spacing: -0.02em; font-feature-settings: "onum";
    line-height: 1; text-align: right; font-variant-numeric: oldstyle-nums;
  }
  .qc-entry:hover .qc-roman { color: var(--accent); }

  /* Status pill */
  .qc-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 12px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.12em;
    text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }
  .qc-pill-dot { width: 5px; height: 5px; border-radius: 999px; }

  /* Toggle pills */
  .qc-toggle {
    display: inline-flex; padding: 3px; background: var(--surface);
    border: 1px solid var(--line); border-radius: 999px;
  }
  .qc-toggle button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; border: 0; background: transparent; color: var(--ink-3);
    padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: all .15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .qc-toggle button.active { background: var(--ink); color: var(--bg); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .qc-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .qc-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .qc-header-title { font-size: 36px !important; }
    .qc-body { padding: 0 20px 40px !important; }
    .qc-entry { grid-template-columns: 50px 1fr auto !important; gap: 14px !important; padding: 16px 18px !important; }
    .qc-roman { font-size: 28px !important; }
    .qc-hide-mobile { display: none !important; }
    .qc-kpis-grid { grid-template-columns: 1fr 1fr !important; }
  }
`;

/* Conversion décimal → chiffres romains */
function toRoman(num) {
  if (!num) return '—';
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  for (const [val, sym] of map) {
    while (num >= val) { result += sym; num -= val; }
  }
  return result;
}

const STATUS_META = {
  'brouillon': { label: 'Brouillon', color: 'oklch(0.52 0.010 60)', bg: 'oklch(0.96 0.01 75)' },
  'envoyé':    { label: 'Envoyé',    color: 'oklch(0.52 0.13 165)', bg: 'var(--accent-soft)' },
  'accepté':   { label: 'Accepté',   color: 'oklch(0.50 0.15 145)', bg: 'oklch(0.94 0.06 145)' },
  'refusé':    { label: 'Refusé',    color: 'oklch(0.62 0.14 45)',  bg: 'var(--warm-soft)' },
  'expiré':    { label: 'Expiré',    color: 'oklch(0.52 0.010 60)', bg: 'var(--surface-2)' },
};

const fmtEur = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return '—'; }
};

/* ═════════════════════ MAIN ═════════════════════ */
export default function QuotesCahier() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = () => {
    setLoading(true);
    api.get('/quotes', { params: { page_size: 200 } })
      .then(r => setQuotes(r.data?.items || r.data || []))
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let arr = [...quotes];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(qt =>
        (qt.quote_number || '').toLowerCase().includes(q) ||
        (qt.lead_name || '').toLowerCase().includes(q) ||
        (qt.title || qt.service_type || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') arr = arr.filter(qt => qt.status === statusFilter);
    arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return arr;
  }, [quotes, search, statusFilter]);

  const stats = useMemo(() => {
    const total = quotes.length;
    const envoyes = quotes.filter(q => q.status === 'envoyé').length;
    const acceptes = quotes.filter(q => q.status === 'accepté').length;
    const ca = quotes.filter(q => q.status === 'accepté').reduce((s, q) => s + (q.amount || 0), 0);
    const rate = total > 0 ? Math.round(acceptes / total * 100) : 0;
    return { total, envoyes, acceptes, ca, rate };
  }, [quotes]);

  return (
    <div className="qc-root">
      <style>{tokenStyle}</style>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="qc-header qc-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="qc-label" style={{ marginBottom: 12 }}>Devis · Cahier</div>
          <h1 className="qc-display qc-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Le <em className="qc-italic">cahier</em> des propositions
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {stats.total} proposition{stats.total > 1 ? 's' : ''} · {stats.rate}% d'acceptation · {fmtEur(stats.ca)} € acquis
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
            padding: '8px 14px', minWidth: 220,
          }}>
            <Search style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="N° devis, client, service…" className="qc-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
          </div>

          <Link to="/quotes/new" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
          }}>
            <Plus style={{ width: 12, height: 12 }} />
            Nouvelle proposition
          </Link>
        </div>
      </div>

      {/* ═══════════ BODY ═══════════ */}
      <div className="qc-body qc-fade" style={{ padding: '0 48px 40px' }}>

        {/* Stats ligne */}
        <div className="qc-kpis-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
          overflow: 'hidden', marginBottom: 28,
        }}>
          {[
            { label: 'Total devis',      value: stats.total,    sub: 'Toutes propositions' },
            { label: 'Envoyés',          value: stats.envoyes,  sub: 'En attente de réponse' },
            { label: 'Acceptés',         value: stats.acceptes, sub: `${stats.rate}% de taux`, tone: 'var(--accent)' },
            { label: 'CA acquis',        value: `${fmtEur(stats.ca)} €`, sub: 'Signé · période', tone: 'var(--accent)' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '22px 26px', borderRight: i < 3 ? '1px solid var(--line-2)' : 0 }}>
              <div className="qc-label" style={{ marginBottom: 8 }}>{k.label}</div>
              <div className="qc-display" style={{ fontSize: 30, fontWeight: 500, color: k.tone || 'var(--ink)', lineHeight: 1 }}>
                {k.value}
              </div>
              <div className="qc-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 5, letterSpacing: '0.08em' }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Filtres status */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="qc-label">Filtrer :</span>
          <div className="qc-toggle">
            {[['all','Tous'],...Object.entries(STATUS_META).map(([k,m]) => [k, m.label])].map(([k, l]) => (
              <button key={k} className={statusFilter === k ? 'active' : ''} onClick={() => setStatusFilter(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Cahier : entrées numérotées */}
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic' }}>
            Ouverture du cahier…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div className="qc-display" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 8 }}>
              Aucune proposition ne correspond à ta recherche.
            </div>
            <Link to="/quotes/new" className="qc-mono" style={{
              display: 'inline-block', marginTop: 12, padding: '10px 18px', borderRadius: 999,
              background: 'var(--ink)', color: 'var(--bg)', textDecoration: 'none', fontSize: 11,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>+ Créer la première</Link>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {filtered.map((q, idx) => {
              const status = STATUS_META[q.status] || STATUS_META.brouillon;
              const romanNum = toRoman(filtered.length - idx);  // le + récent = plus grand chiffre
              const ref = q.quote_number || q.quote_id?.slice(-8).toUpperCase() || '—';
              return (
                <Link key={q.quote_id} to={`/quotes/${q.quote_id}`} className="qc-entry">
                  <div className="qc-roman">{romanNum}</div>

                  <div style={{ minWidth: 0 }}>
                    <div className="qc-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {q.lead_name || 'Client inconnu'}
                      {q.title && <span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', fontWeight: 400 }}> · {q.title.slice(0, 40)}{q.title.length > 40 ? '…' : ''}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="qc-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Réf. {ref}
                      </span>
                      {q.service_type && (
                        <>
                          <span style={{ width: 2, height: 2, borderRadius: 999, background: 'var(--ink-4)' }} />
                          <span className="qc-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                            {q.service_type.toUpperCase()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="qc-hide-mobile">
                    <span className="qc-pill" style={{ background: status.bg, color: status.color, borderColor: status.color }}>
                      <span className="qc-pill-dot" style={{ background: status.color }} />
                      {status.label}
                    </span>
                  </div>

                  <div className="qc-hide-mobile qc-mono" style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right', letterSpacing: '0.04em' }}>
                    {fmtDate(q.created_at)}
                  </div>

                  <div className="qc-display" style={{ fontSize: 22, fontWeight: 500, textAlign: 'right', color: 'var(--ink)' }}>
                    {fmtEur(q.amount)}<span style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}> €</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
