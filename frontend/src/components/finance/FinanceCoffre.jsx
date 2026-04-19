// FinanceCoffre.jsx — « Le coffre ».
// Identité financière : or/laiton + chiffres XXL verticaux, barres verticales façon
// piles de pièces, livre de compte pour les mouvements. Palette chaude avec accents
// dorés (différent des autres pages qui sont dominées par l'émeraude).

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Download, FileText, AlertTriangle, ArrowUpRight, ArrowDownRight, Coins } from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────── TOKENS + STYLES ─────────────────── */
const tokenStyle = `
  .cof-root {
    --bg: oklch(0.965 0.012 80);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
    --gold: oklch(0.72 0.13 85);
    --gold-deep: oklch(0.58 0.13 78);
    --gold-soft: oklch(0.94 0.06 85);
    --emerald: oklch(0.52 0.13 165);
    --emerald-soft: oklch(0.93 0.05 165);
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --danger: oklch(0.55 0.18 25);
    --safe-dark: oklch(0.22 0.018 60);
  }
  .cof-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .cof-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .cof-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .cof-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .cof-italic  { font-style: italic; color: var(--gold-deep); font-weight: 400; }

  /* Pièce dorée décorative */
  .cof-coin {
    width: 54px; height: 54px; border-radius: 999px;
    background: radial-gradient(circle at 35% 35%, oklch(0.85 0.12 85), var(--gold) 55%, var(--gold-deep));
    box-shadow: inset 0 -3px 6px rgba(0,0,0,0.12), 0 2px 8px oklch(0.72 0.13 85 / 0.35);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Fraunces', serif; font-size: 24px; color: var(--safe-dark); font-weight: 500;
  }

  /* Hero coffre */
  .cof-hero {
    background: linear-gradient(135deg, var(--safe-dark) 0%, oklch(0.28 0.02 60) 100%);
    color: oklch(0.95 0.01 80);
    border-radius: 16px; padding: 36px 40px;
    border: 1px solid oklch(0.35 0.02 60);
    position: relative; overflow: hidden;
  }
  .cof-hero::before {
    content: ''; position: absolute; top: -20px; right: -20px;
    width: 200px; height: 200px; border-radius: 999px;
    background: radial-gradient(circle, oklch(0.72 0.13 85 / 0.15) 0%, transparent 70%);
    pointer-events: none;
  }
  .cof-hero-amount {
    font-family: 'Fraunces', serif; font-weight: 300; line-height: 0.95;
    font-size: clamp(56px, 8vw, 96px); letter-spacing: -0.03em;
    color: var(--gold); text-shadow: 0 2px 10px rgba(0,0,0,0.18);
  }
  .cof-hero-currency { font-size: 0.5em; color: oklch(0.85 0.05 85); font-style: italic; margin-left: 10px; }

  /* Bar chart vertical — pile de pièces stylisée */
  .cof-stack {
    display: flex; align-items: flex-end; gap: 8px;
    height: 160px; padding: 8px 0;
  }
  .cof-stack-bar {
    flex: 1; min-width: 0; border-radius: 6px 6px 0 0;
    background: linear-gradient(180deg, var(--gold) 0%, var(--gold-deep) 100%);
    position: relative; transition: opacity .2s;
  }
  .cof-stack-bar:hover { opacity: 0.85; }
  .cof-stack-bar::after {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 3px; background: oklch(0.85 0.10 85); border-radius: 6px 6px 0 0;
  }
  .cof-stack-bar.dim { background: var(--surface-2); }

  /* KPI vertical (pièce empilée) */
  .cof-kpi-vertical {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 14px; padding: 24px; position: relative;
    transition: transform .2s, box-shadow .2s;
  }
  .cof-kpi-vertical:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,0,0,0.06); }
  .cof-kpi-vertical .cof-kpi-number {
    font-family: 'Fraunces', serif; font-weight: 500;
    font-size: 48px; line-height: 1; letter-spacing: -0.02em;
    color: var(--ink);
  }

  /* Transaction (livre de compte) */
  .cof-txn {
    display: grid; grid-template-columns: 34px 1fr 120px 110px;
    gap: 14px; align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid var(--line-2);
  }
  .cof-txn:last-child { border-bottom: 0; }
  .cof-txn:hover { background: var(--gold-soft); }
  .cof-txn-icon {
    width: 28px; height: 28px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }

  /* Pill */
  .cof-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.12em;
    text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }

  /* Toggle periodes */
  .cof-periods {
    display: inline-flex; padding: 3px;
    background: oklch(0.35 0.02 60); border-radius: 999px;
    border: 1px solid oklch(0.42 0.02 60);
  }
  .cof-periods button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; border: 0; background: transparent; color: oklch(0.75 0.02 80);
    padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: all .15s;
  }
  .cof-periods button.active { background: var(--gold); color: var(--safe-dark); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .cof-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .cof-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .cof-header-title { font-size: 36px !important; }
    .cof-body { padding: 0 20px 40px !important; }
    .cof-grid-main { grid-template-columns: 1fr !important; }
    .cof-kpis { grid-template-columns: 1fr 1fr !important; }
    .cof-hero-amount { font-size: 54px !important; }
  }
`;

const fmtEur = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtShortEur = (v) => {
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v || 0)}`;
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
  catch { return '—'; }
};

const STATUS_META = {
  'paid':       { label: 'Encaissé',   color: 'var(--emerald)',  bg: 'var(--emerald-soft)' },
  'initiated':  { label: 'Initié',     color: 'var(--gold-deep)', bg: 'var(--gold-soft)' },
  'failed':     { label: 'Échec',      color: 'var(--danger)',    bg: 'oklch(0.94 0.08 25)' },
  'pending':    { label: 'En attente', color: 'var(--gold-deep)', bg: 'var(--gold-soft)' },
};

/* ═════════════════════ MAIN ═════════════════════ */
export default function FinanceCoffre() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/invoices/financial-stats', { params: { period } })
      .then(r => { if (alive) setStats(r.data || {}); })
      .catch(() => { if (alive) setStats({}); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  const totalRevenue  = stats.total_revenue || 0;
  const totalPending  = stats.total_pending || 0;
  const totalOverdue  = stats.total_overdue || 0;
  const totalInvoices = stats.total_invoices || 0;
  const paidCount     = stats.paid_count || 0;
  const pendingCount  = stats.pending_count || 0;
  const overdueCount  = stats.overdue_count || 0;
  const overduePct    = totalInvoices > 0 ? Math.round((overdueCount / totalInvoices) * 100) : 0;
  const avgValue      = paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0;

  /* Revenue stack : série par jour → pile de pièces */
  const revSeries = useMemo(() => {
    const arr = stats.revenue_by_day || [];
    if (!arr.length) return [];
    const max = Math.max(...arr.map(d => d.revenue || 0), 1);
    return arr.map(d => ({ ...d, ratio: (d.revenue || 0) / max }));
  }, [stats.revenue_by_day]);

  const serviceData = useMemo(() => {
    const obj = stats.revenue_by_service || {};
    const total = Object.values(obj).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(obj).map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / total) * 100),
    })).sort((a, b) => b.value - a.value);
  }, [stats.revenue_by_service]);

  const transactions = stats.recent_transactions || [];

  /* KPIs verticaux (4 piles) */
  const kpis = [
    {
      label: 'Encaissé', icon: TrendingUp,
      value: fmtEur(totalRevenue), unit: '€',
      sub: `${paidCount} factures soldées`,
      tone: 'var(--emerald)', trend: stats.revenue_trend,
    },
    {
      label: 'En attente', icon: FileText,
      value: fmtEur(totalPending), unit: '€',
      sub: `${pendingCount} à régler`,
      tone: 'var(--gold-deep)',
    },
    {
      label: 'Retard', icon: AlertTriangle,
      value: fmtEur(totalOverdue), unit: '€',
      sub: `${overdueCount} factures · ${overduePct}%`,
      tone: 'var(--danger)',
      trend: stats.overdue_trend !== undefined ? -stats.overdue_trend : undefined,
    },
    {
      label: 'Ticket moyen', icon: Coins,
      value: fmtEur(avgValue), unit: '€',
      sub: 'Par facture payée',
      tone: 'var(--ink)', trend: stats.avg_trend,
    },
  ];

  return (
    <div className="cof-root">
      <style>{tokenStyle}</style>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="cof-header cof-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="cof-label" style={{ marginBottom: 12 }}>Finance · Trésorerie</div>
          <h1 className="cof-display cof-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Le <em className="cof-italic">coffre</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {totalInvoices} écriture{totalInvoices > 1 ? 's' : ''} · {fmtEur(totalRevenue)} € au coffre · {fmtEur(totalPending + totalOverdue)} € à rapatrier
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="cof-periods">
            {[['7d', '7j'], ['30d', '30j'], ['90d', '90j']].map(([k, l]) => (
              <button key={k} className={period === k ? 'active' : ''} onClick={() => setPeriod(k)}>
                {l}
              </button>
            ))}
          </div>
          <a
            href={`/api/exports/financial/pdf?period=${period}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)',
              letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
            }}
          >
            <Download style={{ width: 12, height: 12 }} /> Export PDF
          </a>
        </div>
      </div>

      {/* ═══════════ HERO COFFRE ═══════════ */}
      <div className="cof-body cof-fade" style={{ padding: '0 48px 24px' }}>
        <div className="cof-hero">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap' }}>
            <div>
              <div className="cof-label" style={{ color: 'oklch(0.78 0.04 85)', marginBottom: 16 }}>
                Chiffre d'affaires · {period === '7d' ? '7 derniers jours' : period === '30d' ? '30 derniers jours' : '90 derniers jours'}
              </div>
              <div className="cof-hero-amount">
                {fmtEur(totalRevenue)}
                <span className="cof-hero-currency">€</span>
              </div>
              {stats.revenue_trend !== undefined && (
                <div style={{
                  marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 999,
                  background: stats.revenue_trend >= 0 ? 'oklch(0.35 0.07 150)' : 'oklch(0.35 0.1 25)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em',
                  color: stats.revenue_trend >= 0 ? 'oklch(0.88 0.15 150)' : 'oklch(0.88 0.15 25)',
                }}>
                  {stats.revenue_trend >= 0 ? <TrendingUp style={{ width: 12, height: 12 }} /> : <TrendingDown style={{ width: 12, height: 12 }} />}
                  {stats.revenue_trend >= 0 ? '+' : ''}{stats.revenue_trend}% vs période précédente
                </div>
              )}
            </div>

            <div className="cof-coin" style={{ width: 84, height: 84, fontSize: 42 }}>€</div>
          </div>

          {/* Stack bar chart - la « pile de pièces » */}
          <div style={{ marginTop: 34 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10,
            }}>
              <span className="cof-label" style={{ color: 'oklch(0.78 0.04 85)' }}>Flux quotidien</span>
              <span className="cof-mono" style={{ fontSize: 10, color: 'oklch(0.7 0.03 80)', letterSpacing: '0.08em' }}>
                {revSeries.length} jours
              </span>
            </div>
            <div className="cof-stack">
              {revSeries.length > 0 ? revSeries.map((d, i) => (
                <div
                  key={i}
                  className={`cof-stack-bar ${d.revenue ? '' : 'dim'}`}
                  style={{ height: `${Math.max(d.ratio * 100, d.revenue ? 4 : 2)}%` }}
                  title={`${fmtDate(d.date)} · ${fmtEur(d.revenue)} €`}
                />
              )) : (
                <div style={{ width: '100%', textAlign: 'center', color: 'oklch(0.6 0.03 80)', fontStyle: 'italic', paddingTop: 50, fontFamily: 'Fraunces, serif' }}>
                  Aucune donnée pour cette période
                </div>
              )}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 6,
              fontSize: 9, color: 'oklch(0.65 0.03 80)', fontFamily: 'JetBrains Mono, monospace',
            }}>
              {revSeries.length > 0 && (
                <>
                  <span>{fmtDate(revSeries[0]?.date)}</span>
                  <span>{fmtDate(revSeries[revSeries.length - 1]?.date)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ KPIS VERTICAUX ═══════════ */}
      <div className="cof-body cof-fade" style={{ padding: '0 48px 24px' }}>
        <div className="cof-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {kpis.map((k, i) => (
            <div key={i} className="cof-kpi-vertical">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className="cof-label">{k.label}</span>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `color-mix(in oklch, ${k.tone} 10%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <k.icon style={{ width: 14, height: 14, color: k.tone }} />
                </div>
              </div>
              <div className="cof-kpi-number" style={{ color: k.tone }}>
                {k.value}
                <span style={{ fontSize: 18, color: 'var(--ink-3)', fontStyle: 'italic', marginLeft: 4 }}>€</span>
              </div>
              <div className="cof-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 8, letterSpacing: '0.06em' }}>
                {k.sub}
              </div>
              {k.trend !== undefined && (
                <div style={{
                  marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600,
                  color: k.trend >= 0 ? 'var(--emerald)' : 'var(--danger)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {k.trend >= 0 ? <TrendingUp style={{ width: 11, height: 11 }} /> : <TrendingDown style={{ width: 11, height: 11 }} />}
                  {k.trend >= 0 ? '+' : ''}{k.trend}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ GRILLE : SERVICES + TRANSACTIONS ═══════════ */}
      <div className="cof-body cof-fade" style={{ padding: '0 48px 40px' }}>
        <div className="cof-grid-main" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 18 }}>

          {/* Répartition par service — barres verticales façon stacks */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 24 }}>
            <div className="cof-label" style={{ marginBottom: 4 }}>Répartition · Services</div>
            <h3 className="cof-display" style={{ fontSize: 22, fontWeight: 400, margin: '0 0 20px', color: 'var(--ink)' }}>
              Par <em style={{ color: 'var(--gold-deep)' }}>prestation</em>
            </h3>

            {serviceData.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic', fontFamily: 'Fraunces, serif' }}>
                Aucune donnée par service.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {serviceData.map((s, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', textTransform: 'capitalize' }}>
                        {s.name}
                      </span>
                      <span className="cof-mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
                        {fmtEur(s.value)} <span style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontFamily: 'Fraunces, serif' }}>€</span>
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${s.pct}%`,
                        background: `linear-gradient(90deg, var(--gold) 0%, var(--gold-deep) 100%)`,
                        borderRadius: 4, transition: 'width .4s',
                      }} />
                    </div>
                    <div className="cof-mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 3, letterSpacing: '0.06em' }}>
                      {s.pct}% du total
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Derniers mouvements — livre de compte */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 0' }}>
              <div className="cof-label" style={{ marginBottom: 4 }}>Livre de caisse</div>
              <h3 className="cof-display" style={{ fontSize: 22, fontWeight: 400, margin: '0 0 16px', color: 'var(--ink)' }}>
                Derniers <em style={{ color: 'var(--gold-deep)' }}>mouvements</em>
              </h3>
            </div>

            {transactions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic', fontFamily: 'Fraunces, serif' }}>
                Aucun mouvement enregistré.
              </div>
            ) : (
              <div>
                {transactions.slice(0, 8).map((tx, i) => {
                  const meta = STATUS_META[tx.payment_status] || STATUS_META.pending;
                  const isIn = tx.payment_status === 'paid';
                  return (
                    <div key={i} className="cof-txn">
                      <div
                        className="cof-txn-icon"
                        style={{
                          background: isIn ? 'var(--emerald-soft)' : 'var(--gold-soft)',
                          color: isIn ? 'var(--emerald)' : 'var(--gold-deep)',
                        }}
                      >
                        {isIn ? <ArrowDownRight style={{ width: 14, height: 14 }} /> : <ArrowUpRight style={{ width: 14, height: 14 }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cof-mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tx.transaction_id || tx.invoice_id || '—'}
                        </div>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 2 }}>
                          Fact. {tx.invoice_id ? tx.invoice_id.slice(-8).toUpperCase() : '—'}
                        </div>
                      </div>
                      <span className="cof-pill" style={{ color: meta.color, background: meta.bg, borderColor: meta.color }}>
                        {meta.label}
                      </span>
                      <div className="cof-display" style={{ fontSize: 17, fontWeight: 500, textAlign: 'right', color: isIn ? 'var(--emerald)' : 'var(--ink)' }}>
                        {isIn ? '+' : ''}{fmtEur(tx.amount)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}> €</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line-2)', background: 'var(--surface-2)', textAlign: 'right' }}>
              <Link to="/invoices" className="cof-mono" style={{
                fontSize: 11, color: 'var(--ink-2)', textDecoration: 'none',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Voir toutes les écritures →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          position: 'fixed', top: 16, right: 16,
          padding: '8px 14px', borderRadius: 999,
          background: 'var(--surface)', border: '1px solid var(--line)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)',
        }}>
          Chargement du coffre…
        </div>
      )}
    </div>
  );
}
