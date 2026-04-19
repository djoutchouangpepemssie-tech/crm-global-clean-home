// AnalyticsBoussole.jsx — « La boussole ».
// Identité : rose des vents / boussole — KPIs disposés N/S/E/O autour d'un
// radar central. Trend lines façon cartes anciennes. Palette bleu profond +
// émeraude (pour rappeler les boussoles et atlas maritimes anciens).

import React, { useMemo } from 'react';
import { useCrmAnalytics, useSeoAnalytics, useGa4Analytics } from '../../hooks/api';
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Target, DollarSign, Percent,
  Navigation, Compass, ArrowUp, ArrowDown, Award, Activity,
} from 'lucide-react';

/* ─────────────────── TOKENS ─────────────────── */
const tokenStyle = `
  .bou-root {
    --bg: oklch(0.965 0.012 80);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
    --emerald: oklch(0.52 0.13 165);
    --emerald-soft: oklch(0.93 0.05 165);
    --navy: oklch(0.35 0.06 240);
    --navy-deep: oklch(0.22 0.07 240);
    --navy-soft: oklch(0.92 0.03 240);
    --gold: oklch(0.72 0.13 85);
    --warm: oklch(0.62 0.14 45);
    --danger: oklch(0.55 0.18 25);
  }
  .bou-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .bou-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .bou-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .bou-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .bou-italic  { font-style: italic; color: var(--navy); font-weight: 400; }

  /* Cartouches cardinaux */
  .bou-cartouche {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 14px; padding: 20px 22px; transition: transform .2s;
    position: relative;
  }
  .bou-cartouche:hover { transform: translateY(-2px); }
  .bou-cardinal {
    position: absolute; top: 10px; right: 14px;
    font-family: 'Fraunces', serif; font-size: 16px; font-style: italic;
    color: var(--ink-4); letter-spacing: -0.01em;
  }

  /* Onglets */
  .bou-tabs {
    display: inline-flex; padding: 3px; background: var(--surface);
    border: 1px solid var(--line); border-radius: 999px;
  }
  .bou-tabs button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; border: 0; background: transparent; color: var(--ink-3);
    padding: 8px 18px; border-radius: 999px; cursor: pointer; transition: all .15s;
  }
  .bou-tabs button.active { background: var(--navy-deep); color: var(--bg); }

  /* Rose des vents centrale */
  .bou-rose {
    position: relative; width: 100%; aspect-ratio: 1;
    max-width: 340px; margin: 0 auto;
  }
  .bou-rose-bg {
    position: absolute; inset: 0; border-radius: 999px;
    background: radial-gradient(circle, var(--surface) 40%, var(--surface-2) 70%, var(--surface) 100%);
    border: 2px solid var(--navy-deep);
    box-shadow: inset 0 0 20px rgba(0,0,0,0.06);
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .bou-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .bou-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .bou-header-title { font-size: 36px !important; }
    .bou-body { padding: 0 20px 40px !important; }
    .bou-grid { grid-template-columns: 1fr !important; }
    .bou-cardinals { grid-template-columns: 1fr 1fr !important; }
  }
`;

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtEur = (v) => `${fmt(v)} €`;
const fmtPct = (v) => `${Math.round(v || 0)}%`;

/* Tooltip custom */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 8, padding: '10px 14px', minWidth: 140,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
    }}>
      {label && <div style={{ color: 'var(--ink-3)', marginBottom: 6, fontSize: 10 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600, fontSize: 12 }}>
          {p.name}: {typeof p.value === 'number' ? fmt(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

/* Rose des vents SVG décorative */
function CompassRose() {
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      {/* Cercles concentriques */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="oklch(0.35 0.06 240)" strokeWidth="0.3" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="oklch(0.52 0.010 60)" strokeWidth="0.2" strokeDasharray="1 1" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="oklch(0.52 0.010 60)" strokeWidth="0.2" strokeDasharray="1 1" />
      {/* Branches principales */}
      <g fill="oklch(0.22 0.07 240)">
        <polygon points="50,4 48,50 52,50" opacity="0.85" />
        <polygon points="50,96 48,50 52,50" opacity="0.85" />
        <polygon points="4,50 50,48 50,52" opacity="0.85" />
        <polygon points="96,50 50,48 50,52" opacity="0.85" />
      </g>
      {/* Branches secondaires */}
      <g fill="oklch(0.72 0.13 85)" opacity="0.7">
        <polygon points="17,17 50,50 49,49" />
        <polygon points="83,17 50,50 51,49" />
        <polygon points="17,83 50,50 49,51" />
        <polygon points="83,83 50,50 51,51" />
      </g>
      {/* Centre */}
      <circle cx="50" cy="50" r="2.5" fill="oklch(0.22 0.07 240)" />
      {/* Labels cardinaux */}
      <text x="50" y="9" textAnchor="middle" fontSize="5" fontFamily="Fraunces, serif" fontStyle="italic" fill="oklch(0.22 0.07 240)">N</text>
      <text x="50" y="95" textAnchor="middle" fontSize="5" fontFamily="Fraunces, serif" fontStyle="italic" fill="oklch(0.22 0.07 240)">S</text>
      <text x="8" y="52" textAnchor="middle" fontSize="5" fontFamily="Fraunces, serif" fontStyle="italic" fill="oklch(0.22 0.07 240)">O</text>
      <text x="93" y="52" textAnchor="middle" fontSize="5" fontFamily="Fraunces, serif" fontStyle="italic" fill="oklch(0.22 0.07 240)">E</text>
    </svg>
  );
}

/* ═════════════════════ MAIN ═════════════════════ */
export default function AnalyticsBoussole() {
  const { data: crm = {}, isLoading: loadingCrm } = useCrmAnalytics();
  const { data: ga4 = {} } = useGa4Analytics(30);
  const { data: seo = {} } = useSeoAnalytics(30);

  /* KPIs cardinaux : 4 piliers de la boussole */
  const nord = {
    cardinal: 'N',
    label: 'Nouveaux leads',
    value: crm.new_leads_30d || 0,
    trend: crm.leads_trend,
    icon: Users,
    tone: 'var(--emerald)',
    sub: 'Acquisition 30j',
  };
  const est = {
    cardinal: 'E',
    label: 'Taux de conversion',
    value: crm.conversion_rate != null ? `${crm.conversion_rate}%` : '—',
    trend: crm.conversion_trend,
    icon: Target,
    tone: 'var(--navy)',
    sub: 'Lead → signé',
  };
  const sud = {
    cardinal: 'S',
    label: 'Chiffre d\'affaires',
    value: fmt(crm.revenue_30d || 0),
    unit: '€',
    trend: crm.revenue_trend,
    icon: DollarSign,
    tone: 'var(--gold)',
    sub: 'Signé · 30j',
  };
  const ouest = {
    cardinal: 'O',
    label: 'Ticket moyen',
    value: fmt(crm.avg_ticket || 0),
    unit: '€',
    trend: crm.ticket_trend,
    icon: Award,
    tone: 'var(--warm)',
    sub: 'Valeur moyenne',
  };

  /* Radar : 6 axes du CRM */
  const radarData = useMemo(() => [
    { axe: 'Acquisition', valeur: Math.min(100, (crm.new_leads_30d || 0) * 2) },
    { axe: 'Conversion',  valeur: crm.conversion_rate || 0 },
    { axe: 'Rétention',   valeur: crm.retention_rate || 60 },
    { axe: 'Satisfaction',valeur: (crm.nps_score || 0) + 50 },
    { axe: 'Trésorerie',  valeur: Math.min(100, Math.round((crm.revenue_30d || 0) / 300)) },
    { axe: 'Activité',    valeur: Math.min(100, (crm.activity_30d || 0) * 3) },
  ], [crm]);

  /* Mini évolution : 30j */
  const trend30 = useMemo(() => {
    const arr = crm.leads_by_day || crm.evolution || [];
    return Array.isArray(arr) ? arr.slice(-30) : [];
  }, [crm]);

  return (
    <div className="bou-root">
      <style>{tokenStyle}</style>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="bou-header bou-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="bou-label" style={{ marginBottom: 12 }}>Analytics · Cap</div>
          <h1 className="bou-display bou-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            La <em className="bou-italic">boussole</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {crm.new_leads_30d || 0} nouveaux caps · {crm.conversion_rate || 0}% de réussite · {fmt(crm.revenue_30d || 0)} € acquis sur 30 jours
          </div>
        </div>

        <div className="bou-tabs">
          <button className="active">CRM</button>
          <button disabled style={{ opacity: 0.5 }} title="Bientôt">Trafic web</button>
          <button disabled style={{ opacity: 0.5 }} title="Bientôt">SEO</button>
        </div>
      </div>

      {/* ═══════════ ROSE + 4 CARTOUCHES ═══════════ */}
      <div className="bou-body bou-fade" style={{ padding: '0 48px 24px' }}>
        <div className="bou-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 18, alignItems: 'stretch' }}>

          {/* Cartouches gauche : Nord + Ouest */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[nord, ouest].map((k, i) => <CartoucheBlock key={i} k={k} />)}
          </div>

          {/* Rose centrale + radar */}
          <div className="bou-cartouche" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="bou-label" style={{ marginBottom: 4, alignSelf: 'flex-start' }}>Vue d'ensemble</div>
            <h3 className="bou-display" style={{ fontSize: 20, fontWeight: 400, margin: '0 0 18px', alignSelf: 'flex-start' }}>
              Rose des <em style={{ color: 'var(--navy)' }}>performances</em>
            </h3>

            <div className="bou-rose" style={{ maxWidth: 300, margin: '6px 0 10px' }}>
              <div className="bou-rose-bg" />
              <CompassRose />

              {/* Radar superposé */}
              <div style={{ position: 'absolute', inset: '12%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="oklch(0.22 0.07 240)" strokeOpacity={0.15} />
                    <PolarAngleAxis dataKey="axe" tick={{ fontSize: 9, fill: 'oklch(0.32 0.012 60)', fontFamily: 'JetBrains Mono, monospace' }} />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    <Radar dataKey="valeur" stroke="var(--emerald)" fill="var(--emerald)" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bou-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textAlign: 'center', marginTop: 10 }}>
              6 axes · lecture sur 30 jours
            </div>
          </div>

          {/* Cartouches droite : Est + Sud */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[est, sud].map((k, i) => <CartoucheBlock key={i} k={k} />)}
          </div>
        </div>
      </div>

      {/* ═══════════ ÉVOLUTION (journal de bord) ═══════════ */}
      <div className="bou-body bou-fade" style={{ padding: '0 48px 40px' }}>
        <div className="bou-cartouche" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="bou-label" style={{ marginBottom: 4 }}>Journal de bord</div>
              <h3 className="bou-display" style={{ fontSize: 22, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>
                Cap tenu · <em style={{ color: 'var(--navy)' }}>30 derniers jours</em>
              </h3>
            </div>
            <div className="bou-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              {trend30.length} jours de navigation
            </div>
          </div>

          {trend30.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic', fontFamily: 'Fraunces, serif' }}>
              Pas encore assez de points pour tracer la route.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend30} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="bou-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--line-2)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--ink-3)" style={{ fontSize: 9 }} tickLine={false} axisLine={false}
                  tickFormatter={v => (v ? v.slice(5) : '')} interval="preserveStartEnd" />
                <YAxis stroke="var(--ink-3)" style={{ fontSize: 9 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Leads" stroke="var(--emerald)" strokeWidth={2} fill="url(#bou-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {loadingCrm && (
        <div style={{
          position: 'fixed', top: 16, right: 16,
          padding: '8px 14px', borderRadius: 999,
          background: 'var(--surface)', border: '1px solid var(--line)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)',
        }}>
          Calibrage de la boussole…
        </div>
      )}
    </div>
  );
}

/* ─────────── Cartouche (bloc KPI) ─────────── */
function CartoucheBlock({ k }) {
  const up = (k.trend ?? 0) >= 0;
  return (
    <div className="bou-cartouche" style={{ flex: 1 }}>
      <div className="bou-cardinal">{k.cardinal}</div>
      <div style={{
        width: 32, height: 32, borderRadius: 8, marginBottom: 12,
        background: `color-mix(in oklch, ${k.tone} 12%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <k.icon style={{ width: 15, height: 15, color: k.tone }} />
      </div>
      <div className="bou-label" style={{ marginBottom: 6 }}>{k.label}</div>
      <div className="bou-display" style={{ fontSize: 34, fontWeight: 500, lineHeight: 1, color: 'var(--ink)' }}>
        {k.value}
        {k.unit && <span style={{ fontSize: 15, color: 'var(--ink-3)', fontStyle: 'italic', marginLeft: 4 }}>{k.unit}</span>}
      </div>
      <div className="bou-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, letterSpacing: '0.06em' }}>
        {k.sub}
      </div>
      {k.trend !== undefined && k.trend !== null && (
        <div style={{
          marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600,
          color: up ? 'var(--emerald)' : 'var(--danger)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {up ? <ArrowUp style={{ width: 11, height: 11 }} /> : <ArrowDown style={{ width: 11, height: 11 }} />}
          {up ? '+' : ''}{k.trend}%
        </div>
      )}
    </div>
  );
}
