// CockpitDashboard.jsx — Version magazine éditoriale du dashboard.
// Inspirée des captures d'écran atelier : Fraunces XXL, émeraude italique
// sur les mots clés, sidebar droite avec cards Terrain + Satisfaction.
// Les données sont réelles (fetched depuis /api/stats/dashboard et /financial).
// Le bouton « Personnaliser » renvoie vers /dashboard/custom (ancien éditeur
// de blocs drag&drop avec Claude + vocal — intelligence conservée).

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Search, Plus, RefreshCw, ChevronDown, Pencil, ArrowRight,
} from 'lucide-react';
import axios from 'axios';
import api from '../../lib/api';

const API = (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) || '';

/* ─────────────────────────── TOKENS ─────────────────────────── */
const tokenStyle = `
  .cockpit-root {
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
  .cockpit-root {
    background: var(--bg); color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    /* Pas de min-height:100vh — laisse le contenu déterminer la hauteur
       pour que le parent overflow-y:auto puisse scroller naturellement */
    padding-bottom: 40px;
  }
  .ck-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .ck-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .ck-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .ck-italic  { font-style: italic; color: var(--accent); font-weight: 400; }

  .ck-pill-toggle {
    display: inline-flex; padding: 3px; gap: 2px;
    background: var(--surface); border: 1px solid var(--line); border-radius: 999px;
  }
  .ck-pill-toggle button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; border: 0; background: transparent; color: var(--ink-3);
    padding: 6px 12px; border-radius: 999px; cursor: pointer; transition: all .15s;
  }
  .ck-pill-toggle button.active { background: var(--ink); color: var(--bg); }

  .ck-stage-arrow {
    color: var(--ink-4); font-family: 'JetBrains Mono', monospace;
    font-size: 18px; padding: 0 4px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .ck-fade { animation: fadeIn .3s ease; }

  /* Responsive */
  @media (max-width: 1100px) {
    .ck-insights-grid { grid-template-columns: 1fr 1fr !important; }
    .ck-quick-grid    { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 960px) {
    .ck-main-grid { grid-template-columns: 1fr !important; }
    .ck-hero-number { font-size: 56px !important; }
    .ck-hero-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
    .ck-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .ck-header-title { font-size: 36px !important; }
    .ck-pipeline-flow { overflow-x: auto; }
    .ck-pipeline-stages { min-width: 680px; }
    .ck-container { padding: 20px !important; }
    .ck-insights-grid, .ck-quick-grid { grid-template-columns: 1fr !important; }
  }
`;

/* ─────────────────────── HOOK DATA ─────────────────────── */
function useDashboardData(rangeKey) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const location = useLocation();

  const periodMap = { jour: '1d', sem: '7d', mois: '30d', an: '1y' };
  const period = periodMap[rangeKey] || '30d';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token') || localStorage.getItem('session_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [dashR, finR] = await Promise.all([
        axios.get(`${API}/api/stats/dashboard`, { params: { period }, headers, withCredentials: true }).catch(() => ({ data: {} })),
        axios.get(`${API}/api/stats/financial`, { params: { period }, headers, withCredentials: true }).catch(() => ({ data: {} })),
      ]);
      setData({ ...dashR.data, financial: finR.data });
    } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData, location.key, tick]);

  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') setTick(t => t + 1); }, 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const onFocus = () => setTick(t => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return { data, loading, refresh: () => setTick(t => t + 1) };
}

/* ─────────────────────── HELPERS ─────────────────────── */
const fmtEur = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtK = (v) => (Math.round((v || 0) / 100) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1 });
const getWeekNumber = (d) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
};

/* ─────── Section header éditorial (utilisé sous la fold) ─────── */
function SectionHeader({ num, title, italic, annot }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '36px 0 18px', borderBottom: '1px solid var(--line)', marginBottom: 24,
      flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span className="ck-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>N° {num}</span>
        <h2 className="ck-display" style={{ fontSize: 28, fontWeight: 400, margin: 0 }}>
          {title} <em className="ck-italic">{italic}</em>
        </h2>
      </div>
      {annot && (
        <span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)' }}>
          {annot}
        </span>
      )}
    </div>
  );
}

/* ───────── Card « Activité en direct » (feed temps réel) ───────── */
function LiveActivityCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api.get('/activity/live', { params: { limit: 8 } })
        .then(r => { if (alive) setItems(r.data?.items || []); })
        .catch(() => { if (alive) setItems([]); })
        .finally(() => { if (alive) setLoading(false); });
    };
    load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const fmtRel = (iso) => {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)    return 'à l\'instant';
    if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
        <div className="ck-label">Activité en direct</div>
      </div>
      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: 13 }}>Chargement…</div>
      ) : items.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: 13 }}>Aucune activité récente.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.slice(0, 6).map(ev => (
            <Link key={ev.id} to={ev.link || '#'} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10, alignItems: 'center',
              padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)',
              textDecoration: 'none', color: 'var(--ink)', transition: 'background .1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}>
              <span style={{ fontSize: 16 }}>{ev.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ev.label}
                </div>
                <div className="ck-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{ev.sub}</div>
              </div>
              <span className="ck-mono" style={{ fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                {fmtRel(ev.at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Card « Leads récents » ───────── */
function RecentLeadsCard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/leads', { params: { page_size: 6, period: 'all' } })
      .then(r => { if (alive) setLeads(r.data?.items || []); })
      .catch(() => { if (alive) setLeads([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const scoreColor = (s) => s >= 70 ? 'var(--accent)' : s >= 45 ? 'var(--gold)' : 'var(--ink-3)';
  const initials = (name) => (name || '—').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="ck-label">Leads récents</div>
        <Link to="/leads" className="ck-mono" style={{
          fontSize: 10, color: 'var(--accent)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Tout voir →
        </Link>
      </div>
      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: 13 }}>Chargement…</div>
      ) : leads.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: 13 }}>Aucun lead pour l'instant.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {leads.slice(0, 5).map(l => (
            <Link key={l.lead_id} to={`/leads/${l.lead_id}`} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 40px', gap: 10, alignItems: 'center',
              padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)',
              textDecoration: 'none', color: 'var(--ink)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 600,
              }}>{initials(l.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l.name || 'Sans nom'}
                </div>
                <div className="ck-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                  {l.service_type || '—'} · {l.status || 'nouveau'}
                </div>
              </div>
              <span className="ck-display" style={{
                fontSize: 16, fontWeight: 500, textAlign: 'right',
                color: scoreColor(l.score || 50),
              }}>{l.score || 50}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Card « Répartition par service » (barres horizontales) ───────── */
function TopServicesCard({ data }) {
  const rawServices = data?.leads_by_service || {};
  const entries = Object.entries(rawServices)
    .filter(([k]) => k && k !== 'null')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const total = entries.reduce((s, [_, v]) => s + v, 0);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24 }}>
      <div className="ck-label" style={{ marginBottom: 18 }}>Répartition par service</div>
      {entries.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: 13 }}>Aucune donnée pour l'instant.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {entries.map(([svc, count], i) => {
            const pct = total > 0 ? Math.round(count / total * 100) : 0;
            const colors = ['var(--accent)', 'var(--warm)', 'var(--gold)', 'oklch(0.60 0.10 220)', 'oklch(0.58 0.14 300)', 'var(--ink-3)'];
            return (
              <div key={svc}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{svc}</span>
                  <span className="ck-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    <strong style={{ color: 'var(--ink)' }}>{count}</strong> · {pct}%
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--line-2)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: colors[i % colors.length], transition: 'width .4s' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Mini sparkline SVG inline ─────────────── */
function Sparkline({ data, color = 'var(--accent)', width = 120, height = 42 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const areaPts = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#spark-grad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */
export default function CockpitDashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState('mois');
  const { data, loading, refresh } = useDashboardData(range);
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(u);
    } catch {}
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long' });
  const weekNo = getWeekNumber(now);

  // Données
  const d = data || {};
  const fin = d.financial || {};

  const revenue = fin.total_revenue || 0;
  const revenue_pending = fin.total_pending || 0;
  const revenue_overdue = fin.total_overdue || 0;

  const devis_ouverts_amount = 0; // À calculer si on a les devis détaillés
  const paid_count = fin.paid_count || 0;

  // Trend (approximation depuis spark si dispo)
  const sparkData = (fin.revenue_by_day || []).map(p => p.revenue || 0);
  const firstHalf = sparkData.slice(0, Math.floor(sparkData.length / 2)).reduce((s, v) => s + v, 0);
  const secondHalf = sparkData.slice(Math.floor(sparkData.length / 2)).reduce((s, v) => s + v, 0);
  const trendPct = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf * 100) : 0;

  // Split encaissé/attente/retard en % du total
  const totalWithPending = revenue + revenue_pending + revenue_overdue;
  const pctEncaisse = totalWithPending > 0 ? Math.round(revenue / totalWithPending * 100) : 0;
  const pctAttente = totalWithPending > 0 ? Math.round(revenue_pending / totalWithPending * 100) : 0;
  const pctRetard = totalWithPending > 0 ? Math.round(revenue_overdue / totalWithPending * 100) : 0;

  // Pipeline
  const stages = [
    { label: 'Nouveau',     count: d.new_leads       || 0 },
    { label: 'Contacté',    count: d.contacted_leads || 0 },
    { label: 'Qualifié',    count: d.total_quotes    || 0 },
    { label: 'Devis',       count: d.sent_quotes     || 0 },
    { label: 'Négociation', count: 0 },   // Pas de champ dédié, on met 0
    { label: 'Gagné',       count: d.won_leads       || 0 },
  ];
  const pipeline_ca = stages.reduce((s, x) => s + x.count * (fin.avg_ticket || 1280), 0) / 1000;
  const conversion = d.conversion_lead_to_quote || 0;
  const cycle_jours = 11; // À connecter à vraies data si dispo
  const panier_moy = paid_count > 0 ? Math.round(revenue / paid_count) : 0;

  // Terrain — on utilise les tâches comme proxy d'interventions
  const interv_done = Math.max(0, (d.pending_tasks || 0) - (d.tasks_today || 0) - (d.tasks_overdue || 0));
  const interv_today = d.tasks_today || 0;
  const interv_total = interv_done + interv_today + (d.tasks_overdue || 0);

  // Satisfaction — si pas de NPS configuré, affiche un état vide
  const nps = d.nps_score;                // non renseigné = undefined
  const nps_responses = d.nps_responses || 0;
  const nps_promo = d.nps_promoters_pct ?? 0;
  const nps_passifs = d.nps_passives_pct ?? 0;
  const nps_detract = d.nps_detractors_pct ?? 0;

  const rangeOptions = [['jour', 'Jour'], ['sem', 'Sem.'], ['mois', 'Mois'], ['an', 'An.']];

  return (
    <div className="cockpit-root">
      <style>{tokenStyle}</style>

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div className="ck-header ck-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 28px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="ck-label" style={{ marginBottom: 12 }}>
            ATELIER · {dateStr}
          </div>
          <h1 className="ck-display ck-header-title" style={{
            fontSize: 64, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Cockpit <em className="ck-italic">jour</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-3)' }}>
            Semaine {weekNo} · {interv_today || 0} intervention{interv_today > 1 ? 's' : ''} prévue{interv_today > 1 ? 's' : ''}
          </div>
        </div>

        {/* Right: search + date + new lead */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
            padding: '8px 14px', minWidth: 220, cursor: 'pointer',
          }} onClick={() => {
            // Ouvre la command palette globale (Ctrl+K)
            const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
            window.dispatchEvent(ev);
          }}>
            <Search style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
            <span className="ck-mono" style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1 }}>Rechercher…</span>
            <span className="ck-mono" style={{ fontSize: 9, color: 'var(--ink-4)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
          </div>

          <button onClick={refresh} disabled={loading} title="Rafraîchir" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)',
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.5 : 1,
          }}>
            <RefreshCw style={{ width: 12, height: 12, animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Aujourd'hui <ChevronDown style={{ width: 10, height: 10 }} />
          </button>

          <Link to="/dashboard/custom" title="Personnaliser" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)',
            textDecoration: 'none',
          }}>
            <Pencil style={{ width: 11, height: 11 }} />
            Personnaliser
          </Link>

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

      {/* ═══════════════════════ BODY ═══════════════════════ */}
      <div className="ck-container ck-fade" style={{ padding: '0 48px 80px' }}>

        <div className="ck-main-grid" style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start',
        }}>

          {/* ═══════════ LEFT COLUMN ═══════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ━━━ Revenue card ━━━ */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18,
              padding: '32px 36px', position: 'relative',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div className="ck-label">
                  Chiffre d'affaires · {monthLabel}
                </div>
                <div className="ck-pill-toggle">
                  {rangeOptions.map(([k, l]) => (
                    <button key={k} className={range === k ? 'active' : ''} onClick={() => setRange(k)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 28, flexWrap: 'wrap' }}>
                <div className="ck-display ck-hero-number" style={{
                  fontSize: 96, fontWeight: 300, lineHeight: 0.95, color: 'var(--ink)', tabularNums: true,
                }}>
                  {fmtEur(revenue)}<span style={{ fontSize: 42, color: 'var(--ink-3)', fontStyle: 'italic', fontWeight: 400 }}>€</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {trendPct !== 0 && (
                    <div className="ck-mono" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: trendPct >= 0 ? 'var(--accent-soft)' : 'var(--warm-soft)',
                      color: trendPct >= 0 ? 'var(--accent)' : 'var(--warm)',
                    }}>
                      {trendPct >= 0 ? '↗' : '↘'} {Math.abs(trendPct).toFixed(1)}%
                    </div>
                  )}
                  <div className="ck-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    vs. période précédente
                  </div>
                  <Sparkline data={sparkData} color="var(--accent)" width={140} height={42} />
                </div>
              </div>

              <div className="ck-hero-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
                paddingTop: 20, borderTop: '1px solid var(--line-2)',
              }}>
                {[
                  { label: 'Encaissé',   value: revenue,         pct: pctEncaisse,  accent: 'var(--accent)' },
                  { label: 'En attente', value: revenue_pending, pct: pctAttente,   accent: 'var(--gold)' },
                  { label: 'Retard',     value: revenue_overdue, pct: pctRetard,    accent: 'var(--warm)' },
                  { label: 'Devis ouverts', value: devis_ouverts_amount, pct: null, accent: 'var(--ink-3)', sub: `${d.sent_quotes || 0} en cours` },
                ].map((c, i) => (
                  <div key={i}>
                    <div className="ck-label" style={{ marginBottom: 8 }}>{c.label}</div>
                    <div className="ck-display" style={{ fontSize: 26, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>
                      {fmtEur(c.value)} <span style={{ fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}>€</span>
                    </div>
                    <div className="ck-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
                      {c.sub ? c.sub : (c.pct !== null ? `${c.pct}%` : '—')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ━━━ Pipeline flow ━━━ */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18,
              padding: '32px 36px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div className="ck-label" style={{ marginBottom: 8 }}>Pipeline commercial</div>
                  <div className="ck-display" style={{ fontSize: 36, fontWeight: 400, color: 'var(--ink)' }}>
                    {fmtK(pipeline_ca * 1000)} K€ <em className="ck-italic" style={{ fontSize: 28 }}>en cours</em>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 32 }}>
                  <div>
                    <div className="ck-label" style={{ marginBottom: 4 }}>Conversion</div>
                    <div className="ck-display" style={{ fontSize: 22, fontWeight: 500 }}>
                      {conversion.toFixed(0)}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>%</span>
                    </div>
                  </div>
                  <div>
                    <div className="ck-label" style={{ marginBottom: 4 }}>Cycle moyen</div>
                    <div className="ck-display" style={{ fontSize: 22, fontWeight: 500 }}>
                      {cycle_jours}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>j.</span>
                    </div>
                  </div>
                  <div>
                    <div className="ck-label" style={{ marginBottom: 4 }}>Panier</div>
                    <div className="ck-display" style={{ fontSize: 22, fontWeight: 500 }}>
                      {fmtEur(panier_moy)}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}> €</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flow horizontal */}
              <div className="ck-pipeline-flow">
                <div className="ck-pipeline-stages" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 12, borderTop: '1px solid var(--line-2)',
                }}>
                  {stages.map((s, i) => (
                    <React.Fragment key={s.label}>
                      <div style={{ textAlign: 'center', minWidth: 80 }}>
                        <div className="ck-display" style={{ fontSize: 32, fontWeight: 400, color: 'var(--ink)', lineHeight: 1, paddingTop: 16 }}>
                          {s.count}
                        </div>
                        <div className="ck-label" style={{ marginTop: 6 }}>{s.label}</div>
                      </div>
                      {i < stages.length - 1 && (
                        <span className="ck-stage-arrow">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ═══════════ RIGHT SIDEBAR ═══════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ━━━ Aujourd'hui · Terrain ━━━ */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18,
              padding: '28px 32px',
            }}>
              <div className="ck-label" style={{ marginBottom: 14 }}>Aujourd'hui · Terrain</div>
              <div className="ck-display" style={{ fontSize: 72, fontWeight: 300, lineHeight: 0.95, color: 'var(--ink)' }}>
                {interv_done}<span style={{ fontSize: 32, color: 'var(--ink-3)' }}>/{interv_total || '—'}</span>
              </div>
              <div className="ck-label" style={{ marginTop: 6, marginBottom: 20 }}>
                Interventions terminées
              </div>

              {/* Segment bar */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
                {Array.from({ length: Math.max(interv_total, 1) }).map((_, i) => {
                  const status = i < interv_done ? 'done' : i < interv_done + interv_today ? 'today' : 'later';
                  const bg = status === 'done' ? 'var(--accent)'
                           : status === 'today' ? 'var(--gold)'
                           : 'var(--line-2)';
                  return <div key={i} style={{ flex: 1, height: 18, borderRadius: 3, background: bg }} />;
                })}
              </div>

              <div className="ck-mono" style={{ fontSize: 10, color: 'var(--ink-3)', display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
                <span><span style={{ color: 'var(--accent)' }}>●</span> {interv_done} OK</span>
                <span><span style={{ color: 'var(--gold)' }}>●</span> {interv_today} EN COURS</span>
                <span><span style={{ color: 'var(--ink-4)' }}>●</span> {Math.max(0, interv_total - interv_done - interv_today)} À VENIR</span>
              </div>
            </div>

            {/* ━━━ Satisfaction · 30j (card sombre) ━━━ */}
            <div style={{
              background: 'var(--ink)', color: 'var(--bg)', borderRadius: 18,
              padding: '28px 32px',
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'oklch(0.72 0.008 70)', fontWeight: 500, marginBottom: 14,
              }}>
                Satisfaction · 30 j.
              </div>

              {nps !== undefined && nps !== null ? (
                <>
                  <div className="ck-display" style={{ fontSize: 72, fontWeight: 300, lineHeight: 0.95 }}>
                    {nps >= 0 ? '+' : ''}{nps}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.55, marginTop: 6, marginBottom: 22 }}>
                    NPS · {nps_responses} réponses
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Promo.', val: nps_promo,   color: 'oklch(0.72 0.14 165)' },
                      { label: 'Passifs', val: nps_passifs, color: 'oklch(0.78 0.13 85)' },
                      { label: 'Détract.',val: nps_detract, color: 'oklch(0.62 0.14 45)' },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                        <span style={{ width: 60, opacity: 0.6 }}>{r.label}</span>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${r.val}%`, height: '100%', background: r.color }} />
                        </div>
                        <span className="ck-mono" style={{ fontSize: 11, minWidth: 30, textAlign: 'right' }}>{r.val}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="ck-display" style={{ fontSize: 48, fontWeight: 300, lineHeight: 1, opacity: 0.5 }}>
                    —
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.45, marginTop: 6, marginBottom: 16 }}>
                    NPS non configuré
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.7 }}>
                    Active les enquêtes de satisfaction automatiques après chaque intervention pour voir apparaître ici ton score NPS.
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* ═══════════════════════ FLUX & INSIGHTS ═══════════════════════ */}
        <SectionHeader
          num="02"
          title="Flux &"
          italic="intelligence"
          annot="Rafraîchi automatiquement toutes les 30 s"
        />
        <div className="ck-insights-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32,
        }}>
          <LiveActivityCard />
          <RecentLeadsCard />
          <TopServicesCard data={d} />
        </div>

        {/* ═══════════════════════ RACCOURCIS ═══════════════════════ */}
        <SectionHeader
          num="03"
          title="Actions"
          italic="rapides"
        />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40,
        }} className="ck-quick-grid">
          {[
            { to: '/leads/new',    label: 'Nouveau lead',        kbd: 'N', desc: 'Ajouter un prospect manuellement' },
            { to: '/quotes/new',   label: 'Créer un devis',       kbd: 'D', desc: 'Rédiger un nouveau devis' },
            { to: '/invoices/new', label: 'Nouvelle facture',     kbd: 'F', desc: 'Émettre une facture client' },
            { to: '/planning',     label: 'Planning',             kbd: 'P', desc: 'Voir le fil de la journée' },
          ].map((q, i) => (
            <Link key={q.to} to={q.to} style={{
              display: 'block', padding: 20, borderRadius: 14,
              background: 'var(--surface)', border: '1px solid var(--line)',
              textDecoration: 'none', color: 'var(--ink)', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--surface)'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span className="ck-display" style={{ fontSize: 18, fontWeight: 500 }}>{q.label}</span>
                <span className="ck-mono" style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                  border: '1px solid var(--line)', color: 'var(--ink-3)',
                }}>{q.kbd}</span>
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                {q.desc}
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
