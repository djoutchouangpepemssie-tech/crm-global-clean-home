// LeadsRegister.jsx — « Le registre des prospects ».
// Liste éditoriale dense groupée par sections alphabétiques avec grandes
// lettres en filigrane en arrière-plan. Signature visuelle exclusive de
// cette page.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, Plus, Filter, ArrowRight, Columns3, List,
} from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────── TOKENS + STYLES ─────────────────── */
const tokenStyle = `
  .lr-root {
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
  .lr-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .lr-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .lr-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .lr-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .lr-italic  { font-style: italic; color: var(--accent); font-weight: 400; }

  /* Section alphabétique : grosse lettre en filigrane */
  .lr-alpha-section {
    position: relative; padding: 40px 0 20px;
  }
  .lr-alpha-letter {
    position: absolute; top: 0; right: 0;
    font-family: 'Fraunces', serif; font-size: 200px; font-weight: 300;
    color: var(--ink); opacity: 0.04; line-height: 1; pointer-events: none;
    letter-spacing: -0.05em; z-index: 0;
  }
  .lr-alpha-header {
    display: flex; align-items: baseline; gap: 14px; padding-bottom: 10px;
    border-bottom: 1px solid var(--line); margin-bottom: 16px;
    position: relative; z-index: 1;
  }
  .lr-alpha-header h2 {
    font-family: 'Fraunces', serif; font-size: 36px; font-weight: 400;
    color: var(--ink); margin: 0; letter-spacing: -0.02em;
  }

  /* Rangée de lead */
  .lr-row {
    display: grid; grid-template-columns: 48px 1fr 160px 120px 60px 28px;
    gap: 16px; align-items: center;
    padding: 14px 16px; border-bottom: 1px solid var(--line-2);
    cursor: pointer; text-decoration: none; color: var(--ink);
    transition: background .1s; position: relative; z-index: 1;
  }
  .lr-row:hover { background: var(--surface-2); }
  .lr-row:hover .lr-row-arrow { transform: translateX(3px); color: var(--accent); }

  .lr-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--accent-soft); color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Fraunces', serif; font-size: 14px; font-weight: 600;
    flex-shrink: 0;
  }

  .lr-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600;
  }
  .lr-badge-hot   { background: var(--warm-soft); color: var(--warm); border: 1px solid var(--warm); }
  .lr-badge-warm  { background: oklch(0.95 0.05 85); color: oklch(0.52 0.13 85); border: 1px solid var(--gold); }
  .lr-badge-cold  { background: var(--surface-2); color: var(--ink-3); border: 1px solid var(--line); }

  .lr-status-dot {
    width: 6px; height: 6px; border-radius: 999px; flex-shrink: 0; display: inline-block;
  }

  .lr-row-arrow {
    color: var(--ink-4); transition: all .15s;
  }

  /* Pill toggle */
  .lr-pill {
    display: inline-flex; padding: 3px; background: var(--surface);
    border: 1px solid var(--line); border-radius: 999px;
  }
  .lr-pill button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; border: 0; background: transparent; color: var(--ink-3);
    padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: all .15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .lr-pill button.active { background: var(--ink); color: var(--bg); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .lr-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .lr-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .lr-header-title { font-size: 36px !important; }
    .lr-body { padding: 0 20px 40px !important; }
    .lr-row { grid-template-columns: 44px 1fr 70px 24px !important; gap: 10px !important; font-size: 13px; }
    .lr-row-hide-mobile { display: none !important; }
    .lr-alpha-letter { font-size: 120px !important; }
    .lr-kpis-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
`;

/* ─────────────── Status meta ─────────────── */
const STATUS_META = {
  'nouveau':       { label: 'Nouveau',      color: 'oklch(0.52 0.13 165)' },
  'contacté':      { label: 'Contacté',     color: 'oklch(0.62 0.14 45)'  },
  'en_attente':    { label: 'Qualifié',     color: 'oklch(0.72 0.13 85)'  },
  'devis_envoyé':  { label: 'Devis',        color: 'oklch(0.58 0.14 220)' },
  'gagné':         { label: 'Gagné',        color: 'oklch(0.50 0.15 145)' },
  'perdu':         { label: 'Perdu',        color: 'oklch(0.52 0.010 60)' },
};

/* ─────────────── Helpers ─────────────── */
const initials = (n) => (n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
const firstLetter = (s) => {
  const t = (s || '').trim().toUpperCase();
  const c = t[0];
  return /[A-Z]/.test(c) ? c : '#';
};
const scoreTemperature = (s) => s >= 70 ? 'hot' : s >= 45 ? 'warm' : 'cold';
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
  catch { return '—'; }
};
const cityFromAddress = (addr) => {
  if (!addr) return '';
  const m = addr.match(/\d{5}\s+([A-Za-zÀ-ÿ'\-\s]{2,40})/);
  return m ? m[1].trim() : '';
};

/* ═════════════════════ MAIN COMPONENT ═════════════════════ */
export default function LeadsRegister() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tempFilter, setTempFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    api.get('/leads', { params: { page_size: 200, period: 'all' } })
      .then(r => {
        const raw = r.data?.items || r.data || [];
        if (alive) setLeads(Array.isArray(raw) ? raw : []);
      })
      .catch(() => { if (alive) setLeads([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    let arr = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(l =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q) ||
        (l.address || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') arr = arr.filter(l => l.status === statusFilter);
    if (tempFilter !== 'all') arr = arr.filter(l => scoreTemperature(l.score || 50) === tempFilter);
    return arr;
  }, [leads, search, statusFilter, tempFilter]);

  // Groupage alphabétique
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      const letter = firstLetter(l.name);
      (map[letter] ||= []).push(l);
    });
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
    });
    return Object.keys(map).sort().map(k => ({ letter: k, leads: map[k] }));
  }, [filtered]);

  const stats = useMemo(() => {
    const hot = leads.filter(l => (l.score || 50) >= 70).length;
    const contacted = leads.filter(l => l.status !== 'nouveau' && l.status !== 'perdu').length;
    const won = leads.filter(l => l.status === 'gagné').length;
    return { total: leads.length, hot, contacted, won };
  }, [leads]);

  return (
    <div className="lr-root">
      <style>{tokenStyle}</style>

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div className="lr-header lr-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="lr-label" style={{ marginBottom: 12 }}>Leads · Registre</div>
          <h1 className="lr-display lr-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Le <em className="lr-italic">registre</em> des prospects
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {leads.length} prospect{leads.length > 1 ? 's' : ''} consigné{leads.length > 1 ? 's' : ''} · {filtered.length} affiché{filtered.length > 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
            padding: '8px 14px', minWidth: 240,
          }}>
            <Search style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chercher par nom, email, tél…"
              className="lr-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
            <span className="lr-mono" style={{ fontSize: 9, color: 'var(--ink-4)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
          </div>

          <Link to="/leads/new" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
          }}>
            <Plus style={{ width: 12, height: 12 }} />
            Nouveau prospect
          </Link>
        </div>
      </div>

      {/* ═══════════════════════ BODY ═══════════════════════ */}
      <div className="lr-body lr-fade" style={{ padding: '0 48px 40px' }}>

        {/* ━━━ Stats strip ━━━ */}
        <div className="lr-kpis-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
          overflow: 'hidden', marginBottom: 28,
        }}>
          {[
            { label: 'Total',             value: stats.total,     sub: 'Consignés',        tone: 'var(--ink)'   },
            { label: 'Leads chauds',      value: stats.hot,       sub: 'Score ≥ 70',       tone: 'var(--warm)'  },
            { label: 'Déjà contactés',    value: stats.contacted, sub: 'Engagement actif', tone: 'var(--accent)'},
            { label: 'Gagnés',            value: stats.won,       sub: 'Convertis',        tone: 'oklch(0.50 0.15 145)' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '22px 26px', borderRight: i < 3 ? '1px solid var(--line-2)' : 0 }}>
              <div className="lr-label" style={{ marginBottom: 8 }}>{k.label}</div>
              <div className="lr-display" style={{ fontSize: 36, fontWeight: 400, color: k.tone, lineHeight: 1 }}>
                {k.value}
              </div>
              <div className="lr-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 5, letterSpacing: '0.08em' }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ━━━ Filtres ━━━ */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="lr-label">Filtres :</span>
          <div className="lr-pill">
            {[['all','Tous'],...Object.entries(STATUS_META).map(([k, m]) => [k, m.label])].map(([k, l]) => (
              <button key={k} className={statusFilter === k ? 'active' : ''} onClick={() => setStatusFilter(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="lr-pill">
            {[['all','Toutes'],['hot','Chaud'],['warm','Tiède'],['cold','Froid']].map(([k, l]) => (
              <button key={k} className={tempFilter === k ? 'active' : ''} onClick={() => setTempFilter(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ━━━ Registre (sections alpha) ━━━ */}
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic' }}>
            Ouverture du registre…
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div className="lr-display" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 8 }}>
              Aucun prospect ne correspond aux filtres.
            </div>
            <div className="lr-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              Ajuste ta recherche ou crée un nouveau lead.
            </div>
          </div>
        ) : (
          grouped.map(section => (
            <div key={section.letter} className="lr-alpha-section">
              {/* Lettre filigrane */}
              <span className="lr-alpha-letter">{section.letter}</span>

              <div className="lr-alpha-header">
                <h2>{section.letter}</h2>
                <span className="lr-label">{section.leads.length} prospect{section.leads.length > 1 ? 's' : ''}</span>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
                {section.leads.map(l => {
                  const status = STATUS_META[l.status] || STATUS_META.nouveau;
                  const temp = scoreTemperature(l.score || 50);
                  const tempLabel = temp === 'hot' ? 'CHAUD' : temp === 'warm' ? 'TIÈDE' : 'FROID';
                  return (
                    <Link key={l.lead_id} to={`/leads/${l.lead_id}`} className="lr-row">
                      <div className="lr-avatar">{initials(l.name)}</div>

                      <div style={{ minWidth: 0 }}>
                        <div className="lr-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.name || 'Sans nom'}
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 3 }}>
                          <span className="lr-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                            {l.service_type || '—'}
                          </span>
                          {cityFromAddress(l.address) && (
                            <>
                              <span style={{ width: 2, height: 2, borderRadius: 999, background: 'var(--ink-4)' }} />
                              <span className="lr-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                                {cityFromAddress(l.address).toUpperCase()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="lr-row-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="lr-status-dot" style={{ background: status.color }} />
                        <span className="lr-mono" style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.04em' }}>
                          {status.label}
                        </span>
                      </div>

                      {/* Date + Temperature */}
                      <div className="lr-row-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`lr-badge lr-badge-${temp}`}>{tempLabel}</span>
                      </div>

                      {/* Score */}
                      <div className="lr-display" style={{
                        fontSize: 20, fontWeight: 500, textAlign: 'right',
                        color: temp === 'hot' ? 'var(--warm)' : temp === 'warm' ? 'var(--gold)' : 'var(--ink-3)',
                      }}>
                        {l.score ?? 50}
                      </div>

                      <ArrowRight className="lr-row-arrow" style={{ width: 16, height: 16 }} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
