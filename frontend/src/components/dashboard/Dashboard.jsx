// Dashboard.jsx — Atelier edition (niveau Atelier.html pur)
import { useState, useEffect } from 'react';
import {
  Plus, PenLine, Calendar, Map,
  TrendingUp, AlertTriangle, Sparkles
} from 'lucide-react';
import axios from 'axios';

const API = (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) || '';

// ──────────────────────────────────────────────────────────────────
// TOKENS — variables CSS inline (atelier palette OKLCH)
// ──────────────────────────────────────────────────────────────────
const tokenStyle = `
  .atelier-root {
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
  .atelier-root { background: var(--bg); min-height: 100vh; color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    font-feature-settings: "ss01", "cv11";
    -webkit-font-smoothing: antialiased; }
  .at-display { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.02em; }
  .at-display-bold { font-family: 'Fraunces', serif; font-weight: 600; letter-spacing: -0.025em; }
  .at-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .at-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .at-meta { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: var(--ink-3);
    text-transform: uppercase; letter-spacing: 0.06em; }
`;

// ──────────────────────────────────────────────────────────────────
// RANGE TABS
// ──────────────────────────────────────────────────────────────────
function RangeTabs({ value, onChange, options }) {
  const opts = options || [['today', 'Auj.'], ['7d', '7 j.'], ['30d', '30 j.'], ['3m', '3 m.'], ['year', 'An.']];
  return (
    <div style={{
      display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--line)',
      padding: 3, borderRadius: 999
    }}>
      {opts.map(([k, l]) => (
        <button
          key={k}
          onClick={() => onChange && onChange(k)}
          style={{
            border: 0, cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 500,
            padding: '7px 14px', borderRadius: 999,
            background: value === k ? 'var(--ink)' : 'transparent',
            color: value === k ? 'var(--bg)' : 'var(--ink-3)',
            transition: 'all .12s'
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// COVER — header éditorial
// ──────────────────────────────────────────────────────────────────
function Cover({ firstName, newLeads, pendingQuotes, tomorrowInterventions, range, setRange }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const words = greeting.split(' ');

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'flex-end',
      paddingBottom: 32, borderBottom: '1px solid var(--line)', marginBottom: 56
    }}>
      <div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ width: 4, height: 4, background: 'var(--accent)', borderRadius: 999 }} />
          <span>{dateStr}</span>
          <span>·</span>
          <span>Édition du jour</span>
        </div>
        <h1 className="at-display" style={{
          fontWeight: 300, fontSize: 88, lineHeight: 0.92, letterSpacing: '-0.04em',
          margin: '0 0 12px', color: 'var(--ink)'
        }}>
          {words.map((w, i) => i === 1
            ? <span key={i}> <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>{w}</em></span>
            : <span key={i}>{w}</span>
          )}
          {firstName && <span>, {firstName}.</span>}
        </h1>
        <div style={{
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 17,
          color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 480
        }}>
          {newLeads || 0} nouveau{(newLeads || 0) > 1 ? 'x' : ''} lead{(newLeads || 0) > 1 ? 's' : ''}
          {pendingQuotes > 0 && <span> · {pendingQuotes} devis à envoyer</span>}
          {tomorrowInterventions > 0 && <span> · {tomorrowInterventions} intervention{tomorrowInterventions > 1 ? 's' : ''} demain</span>}
          {!newLeads && !pendingQuotes && !tomorrowInterventions && <span>Journée calme. Prenez une longueur d'avance.</span>}
        </div>
      </div>
      <RangeTabs value={range} onChange={setRange} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// SECTION caption — numérotation + filet
// ──────────────────────────────────────────────────────────────────
function Section({ num, title, accent, desc }) {
  return (
    <div style={{
      marginTop: 56, marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 20,
      paddingBottom: 16, borderBottom: '1px solid var(--line-2)'
    }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.12em',
        color: 'var(--ink-3)', whiteSpace: 'nowrap'
      }}>{num}</span>
      <h2 className="at-display" style={{
        fontWeight: 400, fontSize: 30, lineHeight: 1, letterSpacing: '-0.025em',
        margin: 0, color: 'var(--ink)'
      }}>
        {title}
        {accent && <em style={{ fontStyle: 'italic', color: 'var(--accent)', fontWeight: 400 }}>{accent}</em>}
        .
      </h2>
      {desc && <span style={{
        fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14,
        color: 'var(--ink-3)', marginLeft: 'auto', maxWidth: 360, lineHeight: 1.5
      }}>{desc}</span>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// RUBAN actions rapides
// ──────────────────────────────────────────────────────────────────
function QuickActions({ onAction }) {
  const cells = [
    ['01', Plus, 'Nouveau lead', 'Capturer un prospect', 'new-lead'],
    ['02', PenLine, 'Créer un devis', 'Vocal ou manuel', 'new-quote'],
    ['03', Calendar, 'Planifier', 'Intervention', 'planning'],
    ['04', Map, 'Voir la carte', 'Paris · temps réel', 'map'],
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 14, marginBottom: 56, overflow: 'hidden'
    }}>
      {cells.map(([num, Icon, title, sub, key], i) => (
        <button
          key={num}
          onClick={() => onAction && onAction(key)}
          style={{
            padding: '22px 24px',
            borderRight: i < 3 ? '1px solid var(--line-2)' : 'none',
            border: 'none',
            display: 'flex', alignItems: 'center', gap: 16,
            background: 'transparent', cursor: 'pointer', textAlign: 'left',
            transition: 'background .12s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
            flexShrink: 0
          }}>
            <Icon size={18} strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="at-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em' }}>{num}</div>
            <div className="at-display" style={{ fontWeight: 500, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{title}</div>
            <div className="at-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{sub}</div>
          </div>
          <span style={{ color: 'var(--ink-4)', fontSize: 16, flexShrink: 0 }}>→</span>
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// HERO CA CARD
// ──────────────────────────────────────────────────────────────────
function HeroRevenue({ revenue, encaisse, enAttente, retard, devisOuverts, delta, sparkData }) {
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  const pct = (part) => revenue ? Math.round((part / revenue) * 100) : 0;

  const intPart = Math.floor((revenue || 0) / 1000);
  const hundreds = Math.round((revenue || 0) % 1000);

  const points = (sparkData && sparkData.length ? sparkData : [12, 18, 15, 22, 19, 28, 25, 33, 38, 36, 44, 47]);
  const max = Math.max(...points, 1);
  const w = 180, h = 42;
  const step = w / Math.max(points.length - 1, 1);
  const linePath = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (v / max) * h}`).join(' ');
  const areaPath = linePath + ` L ${w} ${h} L 0 ${h} Z`;

  const breakdownItems = [
    ['Encaissé', encaisse, pct(encaisse)],
    ['En attente', enAttente, pct(enAttente)],
    ['Retard', retard, pct(retard)],
    ['Devis ouverts', devisOuverts, null],
  ];

  return (
    <div style={{
      gridRow: 'span 2', background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 14, padding: 36
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="at-label">Chiffre d'affaires · Ce mois</div>
        <RangeTabs value="mois" onChange={() => {}} options={[['jour', 'Jour'], ['sem', 'Sem.'], ['mois', 'Mois'], ['an', 'An.']]} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32 }}>
        <div className="at-display" style={{
          fontWeight: 300, fontSize: 120, lineHeight: 0.85, letterSpacing: '-0.05em', color: 'var(--ink)'
        }}>
          {intPart}
          <span style={{ color: 'var(--ink-3)' }}>·</span>
          <em style={{ fontStyle: 'italic', fontWeight: 400 }}>{hundreds.toString().padStart(3, '0')}</em>
          <span style={{ fontSize: 28, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 10 }}>€</span>
        </div>
        <div style={{ paddingBottom: 16 }}>
          <div>
            <span style={{
              color: delta >= 0 ? 'var(--accent)' : 'var(--warm)',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13
            }}>
              {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{(delta || 0).toFixed(1)}%
            </span>
            <span className="at-meta" style={{ marginLeft: 6 }}>vs. mois dernier</span>
          </div>
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ marginTop: 10 }}>
            <defs>
              <linearGradient id="sg1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity=".35" />
                <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#sg1)" />
            <path d={linePath} fill="none" stroke="oklch(0.52 0.13 165)" strokeWidth={1.6} />
          </svg>
        </div>
      </div>

      <div style={{
        display: 'flex', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--line-2)'
      }}>
        {breakdownItems.map(([l, v, p], i) => (
          <div key={l} style={{
            flex: 1, paddingRight: 20,
            paddingLeft: i ? 20 : 0,
            borderLeft: i ? '1px solid var(--line-2)' : 'none'
          }}>
            <div className="at-label">{l}</div>
            <div className="at-display" style={{ fontSize: 22, letterSpacing: '-0.02em', margin: '6px 0' }}>
              {fmt(v)} <em style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14 }}>€</em>
            </div>
            <div className="at-meta">{p !== null ? `${p}%` : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// KPI MINI cards
// ──────────────────────────────────────────────────────────────────
function KpiMini({ label, value, sub, subLabel, dark, children }) {
  return (
    <div style={{
      background: dark ? 'var(--ink)' : 'var(--surface)',
      color: dark ? 'var(--bg)' : 'var(--ink)',
      border: dark ? 'none' : '1px solid var(--line)',
      borderRadius: 14, padding: 24
    }}>
      <div className="at-label" style={dark ? { color: 'oklch(0.55 0.010 80)' } : {}}>{label}</div>
      <div className="at-display" style={{
        fontWeight: 300, fontSize: 56, lineHeight: 0.9, letterSpacing: '-0.04em',
        color: dark ? 'var(--bg)' : 'var(--ink)', marginTop: 16
      }}>
        {value}
        {sub && <span style={{ fontSize: 22, color: dark ? 'oklch(0.65 0.010 80)' : 'var(--ink-3)' }}>{sub}</span>}
      </div>
      {subLabel && <div className="at-mono" style={{
        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: dark ? 'oklch(0.55 0.010 80)' : 'var(--ink-3)', marginTop: 10
      }}>{subLabel}</div>}
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// PIPELINE FUNNEL
// ──────────────────────────────────────────────────────────────────
function PipelineFunnel({ stages, total, conversion, cycle, avgCart }) {
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const colors = ['var(--ink-4)', 'var(--ink-3)', 'var(--ink-2)', 'var(--accent)', 'var(--accent)', 'var(--ink)'];

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 14, padding: 36, marginBottom: 24
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div className="at-label" style={{ marginBottom: 8 }}>Pipeline · 30 jours</div>
          <div className="at-display" style={{ fontSize: 28 }}>
            <span className="at-display-bold">{new Intl.NumberFormat('fr-FR').format(total)} €</span>
            <em style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontWeight: 400 }}> en cours</em>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 40 }}>
          {[
            ['conversion', `${conversion}%`],
            ['cycle moyen', `${cycle} j.`],
            ['panier moy.', `${new Intl.NumberFormat('fr-FR').format(avgCart)} €`],
          ].map(([meta, val]) => (
            <div key={meta}>
              <div className="at-meta">{meta}</div>
              <div className="at-display" style={{ fontSize: 22, letterSpacing: '-0.02em', marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
        {stages.map((s, i) => (
          <div key={s.name} style={{ display: 'contents' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="at-display" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>{s.count}</span>
                <span className="at-meta">{s.name}</span>
              </div>
              <div style={{
                width: '100%', height: `${30 + (s.count / maxCount) * 70}%`,
                background: colors[i] || 'var(--ink)', borderRadius: '4px 4px 0 0'
              }} />
            </div>
            {i < stages.length - 1 && (
              <div style={{ width: 22, alignSelf: 'flex-end', paddingBottom: 6, color: 'var(--ink-4)' }}>
                <svg width="22" height="14" viewBox="0 0 22 14">
                  <path d="M0 7h20m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="1" fill="none" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// IA INSIGHTS
// ──────────────────────────────────────────────────────────────────
function AIInsightsPanel({ insights }) {
  const tagColors = {
    urgent: { bg: 'var(--warm-soft)', fg: 'var(--warm)' },
    opp: { bg: 'oklch(0.93 0.05 85)', fg: 'var(--gold)' },
    info: { bg: 'var(--accent-soft)', fg: 'var(--accent)' }
  };
  const IconFor = { urgent: AlertTriangle, opp: Sparkles, info: TrendingUp };

  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px dashed var(--accent)',
      borderRadius: 14, padding: 28
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Sparkles size={14} style={{ color: 'var(--accent)' }} />
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600
        }}>Recommandations personnalisées</span>
        <span className="at-meta" style={{ marginLeft: 'auto' }}>mise à jour à l'instant</span>
      </div>

      {insights.map((ins, i) => {
        const Icon = IconFor[ins.type] || TrendingUp;
        const tc = tagColors[ins.type] || tagColors.info;
        return (
          <div key={i} style={{
            padding: '14px 0',
            borderTop: i ? '1px solid var(--line-2)' : 'none',
            paddingTop: i ? 14 : 4,
            display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 14, alignItems: 'flex-start'
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 999,
              background: 'var(--surface)', border: `1px solid ${tc.fg}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: tc.fg
            }}>
              <Icon size={11} strokeWidth={2} />
            </div>
            <div>
              <div className="at-display" style={{ fontWeight: 500, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                {ins.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, marginTop: 4 }}>
                {ins.description}
              </div>
            </div>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.12em',
              textTransform: 'uppercase', padding: '3px 7px', borderRadius: 4,
              background: tc.bg, color: tc.fg, fontWeight: 600
            }}>{ins.tag}</span>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(u);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [dashRes, insRes] = await Promise.all([
          axios.get(`${API}/api/dashboard?range=${range}`, { headers, withCredentials: true }).catch(() => ({ data: {} })),
          axios.get(`${API}/api/ai/insights`, { headers, withCredentials: true }).catch(() => ({ data: { insights: [] } })),
        ]);
        if (!cancelled) {
          setData({ ...dashRes.data, insights: insRes.data.insights || [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  const d = data || {};
  const firstName = user && (user.firstName || user.first_name || (user.name && user.name.split(' ')[0])) || '';
  const revenue = d.revenue || 0;
  const encaisse = d.encaisse || revenue * 0.66;
  const enAttente = d.enAttente || revenue * 0.24;
  const retard = d.retard || revenue * 0.10;
  const devisOuverts = d.devisOuverts || d.pending_quotes_count || 0;
  const delta = d.revenueDelta || d.revenue_delta || 0;
  const sparkData = d.sparkData || d.spark_data || [];

  const newLeads = d.newLeads || d.new_leads || d.leads_count || 0;
  const leadsGoal = d.leadsGoal || d.leads_goal || 20;
  const conversion = d.conversion || d.conversion_rate || 0;
  const interventionsToday = d.interventionsToday || d.interventions_today || 0;
  const interventionsPlanned = d.interventionsPlanned || d.interventions_planned || Math.max(interventionsToday + 2, 3);
  const leadsScore = d.leadsScore || d.leads_score || 0;
  const pendingQuotes = d.pendingQuotes || d.pending_quotes || 0;
  const tomorrowInterventions = d.tomorrowInterventions || d.tomorrow_interventions || 0;

  const pipelineStages = d.pipelineStages || d.pipeline_stages || [
    { name: 'Nouveau', count: 0 },
    { name: 'Contacté', count: 0 },
    { name: 'Qualifié', count: 0 },
    { name: 'Devis', count: 0 },
    { name: 'Négo.', count: 0 },
    { name: 'Gagné', count: 0 },
  ];

  const insights = (d.insights && d.insights.length) ? d.insights : [
    { type: 'info', title: 'Bienvenue sur votre atelier.', description: 'Les premières recommandations apparaîtront dès que les données seront disponibles.', tag: 'Info' }
  ];

  if (loading) {
    return (
      <div className="atelier-root" style={{ padding: 56 }}>
        <style>{tokenStyle}</style>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Chargement de l'atelier…
        </div>
      </div>
    );
  }

  return (
    <div className="atelier-root">
      <style>{tokenStyle}</style>
      <div style={{ padding: '56px 56px 120px', maxWidth: 1400 }}>

        <Cover
          firstName={firstName}
          newLeads={newLeads}
          pendingQuotes={pendingQuotes}
          tomorrowInterventions={tomorrowInterventions}
          range={range}
          setRange={setRange}
        />

        <QuickActions onAction={(k) => {
          const urls = { 'new-lead': '/leads', 'new-quote': '/quotes/new', 'planning': '/planning', 'map': '/map' };
          if (urls[k]) window.location.href = urls[k];
        }} />

        <Section
          num="01 — Aperçu"
          title="L'instant "
          accent="T"
          desc="Pulse mensuel de l'activité. Chiffres à date, arrêtés à minuit la veille."
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
          <HeroRevenue
            revenue={revenue} encaisse={encaisse} enAttente={enAttente}
            retard={retard} devisOuverts={devisOuverts} delta={delta} sparkData={sparkData}
          />

          <KpiMini
            label="Nouveaux leads · 30 j."
            value={<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>{newLeads}</em>}
            sub={`/${leadsGoal}`}
            subLabel="Objectif mensuel"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <div style={{ flex: 1, height: 4, background: 'var(--line-2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (newLeads / leadsGoal) * 100)}%`, height: '100%', background: 'var(--accent)' }} />
              </div>
              <span className="at-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {Math.round((newLeads / leadsGoal) * 100)}%
              </span>
            </div>
          </KpiMini>

          <KpiMini
            dark
            label="Taux conversion"
            value={conversion}
            sub="%"
            subLabel="Lead → devis"
          >
            <div style={{ marginTop: 18, display: 'flex', gap: 4 }}>
              <div style={{ flex: Math.max(conversion, 1), height: 6, background: 'var(--accent)', borderRadius: 999 }} />
              <div style={{ flex: Math.max(1, 100 - conversion), height: 6, background: 'oklch(0.30 0.012 60)', borderRadius: 999 }} />
            </div>
            <div className="at-meta" style={{ marginTop: 10, color: 'oklch(0.55 0.010 80)' }}>cible 35%</div>
          </KpiMini>

          <KpiMini
            label="Aujourd'hui · Terrain"
            value={interventionsToday}
            sub={`/${interventionsPlanned}`}
            subLabel="Interventions planifiées"
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(interventionsPlanned, 3)}, 1fr)`,
              gap: 3, marginTop: 14
            }}>
              {Array.from({ length: Math.max(interventionsPlanned, 3) }).map((_, i) => (
                <div key={i} style={{
                  height: 22, borderRadius: 3,
                  background: i < interventionsToday ? 'var(--accent)' :
                              i === interventionsToday ? 'var(--gold)' : 'var(--line-2)'
                }} />
              ))}
            </div>
          </KpiMini>

          <KpiMini
            label="Score moyen · Leads"
            value={<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>{leadsScore}</em>}
            sub="/100"
            subLabel="Qualité globale"
          >
            <div style={{
              marginTop: 14, position: 'relative', height: 6,
              background: 'var(--line-2)', borderRadius: 999, overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', width: `${leadsScore}%`,
                background: 'linear-gradient(90deg, var(--warm), var(--gold), var(--accent))',
                borderRadius: 999
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span className="at-meta">Faible</span>
              <span className="at-meta">Fort</span>
            </div>
          </KpiMini>
        </div>

        <Section
          num="02 — Pipeline"
          title="Flux "
          accent="commercial"
          desc="Entonnoir Lead → Gagné. Cycle moyen sur les 90 derniers jours."
        />

        <PipelineFunnel
          stages={pipelineStages}
          total={d.pipelineTotal || d.pipeline_total || 0}
          conversion={conversion}
          cycle={d.cycleTime || d.cycle_time || 11}
          avgCart={d.avgCart || d.avg_cart || 0}
        />

        <Section
          num="03 — Intelligence"
          title="Analyse "
          accent="IA"
          desc="Recommandations générées à partir de votre activité."
        />

        <AIInsightsPanel insights={insights} />

      </div>
    </div>
  );
}
