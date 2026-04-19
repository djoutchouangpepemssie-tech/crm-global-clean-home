// PipelineRiver.jsx — La rivière commerciale (style magazine atelier).
// Kanban 6 colonnes avec cards riches, courbe SVG décorative, toggle
// vue RIVIÈRE / TABLE. Données réelles depuis /api/leads + enrichissement
// côté composant (score, source, temps relatif).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Table2, Columns3 } from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────────── TOKENS + STYLES ─────────────────────── */
const tokenStyle = `
  .pr-root {
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
  .pr-root {
    background: var(--bg); min-height: 100%; color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .pr-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .pr-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .pr-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .pr-italic  { font-style: italic; color: var(--accent); font-weight: 400; }

  .pr-card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
    padding: 16px 18px; display: flex; flex-direction: column; gap: 10px;
    cursor: pointer; transition: all .15s; min-height: 150px;
    box-shadow: 0 1px 2px oklch(0.32 0.012 60 / 0.03);
  }
  .pr-card:hover { border-color: var(--accent); transform: translateY(-2px);
                   box-shadow: 0 6px 18px oklch(0.32 0.012 60 / 0.08); }

  .pr-score-ring {
    width: 32px; height: 32px; border-radius: 50%;
    border: 2px solid var(--accent); display: flex; align-items: center; justify-content: center;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; color: var(--accent);
    flex-shrink: 0; background: var(--bg);
  }
  .pr-score-ring.warm   { border-color: var(--warm); color: var(--warm); }
  .pr-score-ring.gold   { border-color: var(--gold); color: oklch(0.52 0.13 85); }
  .pr-score-ring.muted  { border-color: var(--line); color: var(--ink-3); }

  .pr-add-slot {
    border: 1.5px dashed var(--line); background: transparent;
    padding: 14px; border-radius: 12px; text-align: center;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-3);
    cursor: pointer; transition: all .15s; text-decoration: none;
  }
  .pr-add-slot:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

  .pr-pill-toggle {
    display: inline-flex; padding: 3px; background: var(--surface);
    border: 1px solid var(--line); border-radius: 999px;
  }
  .pr-pill-toggle button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; border: 0; background: transparent; color: var(--ink-3);
    padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: all .15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .pr-pill-toggle button.active { background: var(--ink); color: var(--bg); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .pr-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .pr-header        { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 12px !important; }
    .pr-header-title  { font-size: 36px !important; }
    .pr-columns-wrap  { padding: 0 20px 40px !important; }
  }
`;

/* ─────────────── Statuts du pipeline (synchro backend) ─────────────── */
const STAGES = [
  { key: 'nouveau',       label: 'Nouveau',       color: 'oklch(0.52 0.13 165)' },
  { key: 'contacté',      label: 'Contacté',      color: 'oklch(0.62 0.14 45)'  },
  { key: 'en_attente',    label: 'Qualifié',      color: 'oklch(0.72 0.13 85)'  },
  { key: 'devis_envoyé',  label: 'Devis envoyé',  color: 'oklch(0.58 0.14 220)' },
  { key: 'gagné',         label: 'Gagné',         color: 'oklch(0.50 0.15 145)' },
  { key: 'perdu',         label: 'Perdu',         color: 'oklch(0.52 0.010 60)' },
];

/* ─────────────── Helpers ─────────────── */
const fmtAmount = (n) => {
  const v = Math.round(n || 0);
  if (v >= 1000) return `${(v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} K€`;
  return `${v} €`;
};
const relTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)    return 'À L\'INSTANT';
  if (diff < 3600)  return `IL Y A ${Math.floor(diff / 60)} MIN`;
  if (diff < 86400) return `IL Y A ${Math.floor(diff / 3600)} H`;
  if (diff < 7*86400) return `IL Y A ${Math.floor(diff / 86400)} J.`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase();
};
const cityFromAddress = (addr) => {
  if (!addr) return '';
  const m = addr.match(/\d{5}\s+([A-Za-zÀ-ÿ'\-\s]{2,40})/);
  return m ? m[1].trim().toUpperCase() : addr.split(',').pop().trim().toUpperCase();
};
const typeFromLead = (l) => {
  const name = (l.name || '').toLowerCase();
  if (/sci|société|agence|cabinet|studio|atelier|hôtel|hotel|boutique|entreprise/.test(name)) return 'PRO';
  if (/syndic/.test(name)) return 'SYNDIC';
  return 'PARTICULIER';
};
const scoreTone = (s) => s >= 70 ? '' : s >= 45 ? 'gold' : s >= 30 ? 'warm' : 'muted';

/* ─────────────── SVG décoratif — la courbe « rivière » ─────────────── */
function RiverCurve() {
  return (
    <svg width="100%" height="50" viewBox="0 0 1600 50" preserveAspectRatio="none"
         style={{ display: 'block', marginTop: 10, marginBottom: -6, pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="oklch(0.52 0.13 165)" stopOpacity="0" />
          <stop offset="25%"  stopColor="oklch(0.52 0.13 165)" stopOpacity="0.55" />
          <stop offset="75%"  stopColor="oklch(0.52 0.13 165)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 0 25 C 200 5 320 45 530 22 S 900 5 1080 28 S 1420 6 1600 24"
        fill="none" stroke="url(#rg)" strokeWidth="1.5"
      />
    </svg>
  );
}

/* ─────────────── Card lead individuel ─────────────── */
function LeadCard({ lead, onClick }) {
  const score = lead.score ?? 50;
  const isHot = score >= 70;
  const city = cityFromAddress(lead.address);
  const kind = typeFromLead(lead);
  const source = (lead.source || 'Direct').toUpperCase();
  const amount = lead.estimated_amount || lead.budget || 0;

  return (
    <div className="pr-card pr-fade" onClick={onClick}>
      {/* Ligne 1 : nom + score IA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pr-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lead.name || 'Sans nom'}
          </div>
          <div className="pr-mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.1em' }}>
            {city ? `${city} · ` : ''}{kind}
          </div>
        </div>
        <div className={`pr-score-ring ${scoreTone(score)}`}>{score}</div>
      </div>

      {/* Ligne 2 : montant + badge CHAUD */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="pr-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>
          {amount ? `${fmtAmount(amount)}` : <span style={{ color: 'var(--ink-3)', fontSize: 14, fontStyle: 'italic' }}>À estimer</span>}
        </div>
        {isHot && (
          <span className="pr-mono" style={{
            padding: '3px 10px', borderRadius: 999, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
            background: 'var(--warm-soft)', color: 'var(--warm)', border: '1px solid var(--warm)',
          }}>● CHAUD</span>
        )}
      </div>

      {/* Ligne 3 : source + date */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, borderTop: '1px solid var(--line-2)',
      }}>
        <span className="pr-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          {source}
        </span>
        <span className="pr-mono" style={{ fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>
          {relTime(lead.created_at)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────── Colonne de statut ─────────────── */
function StageColumn({ stage, leads, onLeadClick }) {
  const count = leads.length;
  const totalAmount = leads.reduce((s, l) => s + (l.estimated_amount || l.budget || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 260 }}>
      {/* Header colonne */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: stage.color }} />
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
              {stage.label}
            </span>
          </div>
          <span className="pr-mono" style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>
            {count}
          </span>
        </div>
        <div className="pr-display" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>
          {fmtAmount(totalAmount)} <span className="pr-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>EN COURS</span>
        </div>
        <div style={{ height: 2, background: stage.color, opacity: 0.35, borderRadius: 999 }} />
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {leads.length === 0 ? (
          <div className="pr-mono" style={{
            padding: 20, textAlign: 'center', color: 'var(--ink-4)', fontSize: 10,
            letterSpacing: '0.1em', border: '1.5px dashed var(--line)', borderRadius: 12,
          }}>
            AUCUN LEAD
          </div>
        ) : (
          leads.map(l => <LeadCard key={l.lead_id} lead={l} onClick={() => onLeadClick(l)} />)
        )}
      </div>

      {/* Slot « + ajouter » */}
      <Link to={`/leads/new?status=${encodeURIComponent(stage.key)}`} className="pr-add-slot">
        + ajouter
      </Link>
    </div>
  );
}

/* ─────────────── Vue TABLE (toggle alternatif) ─────────────── */
function LeadsTable({ leads, onRowClick }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', margin: '0 48px' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Nom', 'Statut', 'Ville', 'Type', 'Source', 'Score', 'Créé'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '14px 18px',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map(l => {
              const stage = STAGES.find(s => s.key === l.status) || STAGES[0];
              return (
                <tr key={l.lead_id} onClick={() => onRowClick(l)} style={{
                  cursor: 'pointer', borderBottom: '1px solid var(--line-2)', transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 18px', fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 14 }}>{l.name || '—'}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: stage.color }} />
                      {stage.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)' }}>{cityFromAddress(l.address)}</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)' }}>{typeFromLead(l)}</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)' }}>{(l.source || 'Direct').toUpperCase()}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className={`pr-score-ring ${scoreTone(l.score ?? 50)}`} style={{ width: 28, height: 28, fontSize: 10 }}>
                      {l.score ?? 50}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-4)' }}>{relTime(l.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────── COMPOSANT PRINCIPAL ─────────────────────── */
export default function PipelineRiver() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('river');  // 'river' | 'table'

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

  // Groupement par statut
  const grouped = useMemo(() => {
    const filtered = search
      ? leads.filter(l => {
          const q = search.toLowerCase();
          return (l.name || '').toLowerCase().includes(q)
              || (l.email || '').toLowerCase().includes(q)
              || (l.phone || '').toLowerCase().includes(q)
              || (l.address || '').toLowerCase().includes(q);
        })
      : leads;
    const map = Object.fromEntries(STAGES.map(s => [s.key, []]));
    filtered.forEach(l => {
      const key = STAGES.some(s => s.key === l.status) ? l.status : 'nouveau';
      (map[key] ||= []).push(l);
    });
    // Sort dans chaque colonne : plus récent d'abord
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    });
    return map;
  }, [leads, search]);

  const totalActive = leads.filter(l => l.status !== 'perdu' && l.status !== 'gagné').length;
  const totalAmount = leads.reduce((s, l) => s + (l.estimated_amount || l.budget || 0), 0);

  const handleLeadClick = (l) => navigate(`/leads/${l.lead_id}`);

  return (
    <div className="pr-root">
      <style>{tokenStyle}</style>

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div className="pr-header pr-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="pr-label" style={{ marginBottom: 12 }}>
            Leads · Pipeline
          </div>
          <h1 className="pr-display pr-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            La <em className="pr-italic">rivière</em> commerciale
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {totalActive} lead{totalActive > 1 ? 's' : ''} actif{totalActive > 1 ? 's' : ''} · {fmtAmount(totalAmount)}
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
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer leads…"
              className="pr-mono"
              style={{
                flex: 1, border: 0, outline: 0, background: 'transparent',
                fontSize: 12, color: 'var(--ink)',
              }}
            />
            <span className="pr-mono" style={{
              fontSize: 9, color: 'var(--ink-4)',
              border: '1px solid var(--line)', padding: '1px 5px', borderRadius: 4,
            }}>⌘K</span>
          </div>

          <div className="pr-pill-toggle">
            <button className={view === 'river' ? 'active' : ''} onClick={() => setView('river')}>
              <Columns3 style={{ width: 11, height: 11 }} /> Rivière
            </button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              <Table2 style={{ width: 11, height: 11 }} /> Table
            </button>
          </div>

          <Link to="/leads/new" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
          }}>
            <Plus style={{ width: 12, height: 12 }} />
            Nouveau lead
          </Link>
        </div>
      </div>

      {/* ═══════════════════════ COURBE « RIVIÈRE » ═══════════════════════ */}
      {view === 'river' && <RiverCurve />}

      {/* ═══════════════════════ COLONNES ou TABLE ═══════════════════════ */}
      {loading ? (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic' }}>
          Chargement du pipeline…
        </div>
      ) : view === 'river' ? (
        <div className="pr-columns-wrap" style={{
          padding: '12px 48px 60px', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STAGES.length}, minmax(260px, 1fr))`,
            gap: 20,
            minWidth: STAGES.length * 280,
          }}>
            {STAGES.map(stage => (
              <StageColumn
                key={stage.key}
                stage={stage}
                leads={grouped[stage.key] || []}
                onLeadClick={handleLeadClick}
              />
            ))}
          </div>
        </div>
      ) : (
        <LeadsTable leads={leads} onRowClick={handleLeadClick} />
      )}
    </div>
  );
}
