// DirectorDashboard.jsx — Atelier edition (niveau Atelier.html pur)
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) || '';

// ──────────────────────────────────────────────────────────────────
// TOKENS — variables CSS inline (atelier palette OKLCH)
// ──────────────────────────────────────────────────────────────────
const tokenStyle = `
  .dir-root {
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
  .dir-root { background: var(--bg); min-height: 100vh; color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    font-feature-settings: "ss01", "cv11";
    -webkit-font-smoothing: antialiased; }
  .dir-display { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.02em; }
  .dir-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .dir-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .dir-meta { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: var(--ink-3);
    text-transform: uppercase; letter-spacing: 0.06em; }
  .dir-rank-row { transition: background .12s; }
  .dir-rank-row:hover { background: var(--surface-2); }
  .dir-cta { transition: all .15s; }
  .dir-cta:hover { background: var(--ink); color: var(--bg); border-color: var(--ink); }
`;

// ──────────────────────────────────────────────────────────────────
// COVER
// ──────────────────────────────────────────────────────────────────
function Cover({ range, setRange }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).toUpperCase();

  const editionLabel = range === 'week' ? 'hebdomadaire'
    : range === 'month' ? 'mensuelle'
    : range === 'quarter' ? 'trimestrielle'
    : 'annuelle';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'flex-end',
      paddingBottom: 32, borderBottom: '1px solid var(--line)', marginBottom: 40
    }}>
      <div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span>{dateStr}</span>
          <span style={{ width: 4, height: 4, background: 'var(--accent)', borderRadius: 999 }} />
          <span>Rapport direction</span>
          <span style={{ width: 4, height: 4, background: 'var(--accent)', borderRadius: 999 }} />
          <span>Édition {editionLabel}</span>
        </div>
        <h1 className="dir-display" style={{
          fontWeight: 300, fontSize: 88, lineHeight: 0.92, letterSpacing: '-0.04em',
          margin: '0 0 14px', color: 'var(--ink)'
        }}>
          Vue d'<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>ensemble</em>.
        </h1>
        <div className="dir-display" style={{
          fontStyle: 'italic', fontWeight: 400, fontSize: 17, color: 'var(--ink-3)',
          lineHeight: 1.5, maxWidth: 520
        }}>
          Santé opérationnelle, performance commerciale et signaux stratégiques pour la direction — période courante.
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--surface)', border: '1px solid var(--line)',
        padding: 3, borderRadius: 999
      }}>
        {[
          { k: 'week', l: 'Semaine' },
          { k: 'month', l: 'Mois' },
          { k: 'quarter', l: 'Trimestre' },
          { k: 'year', l: 'Année' },
        ].map(t => (
          <button key={t.k} onClick={() => setRange(t.k)}
            style={{
              border: 0, cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', fontWeight: 500,
              padding: '7px 14px', borderRadius: 999,
              background: range === t.k ? 'var(--ink)' : 'transparent',
              color: range === t.k ? 'var(--bg)' : 'var(--ink-3)'
            }}>
            {t.l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// HERO COVER — 3 chiffres massifs
// ──────────────────────────────────────────────────────────────────
function HeroCover({ conversionRate, conversionTrend, revenueRealized, revenueTrend, healthScore, healthTrend }) {
  const revStr = String((revenueRealized || 0) / 1000);
  const [intPart, decPart] = revStr.split('.');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr',
      border: '1px solid var(--line)',
      borderLeft: 0, borderRight: 0,
      marginBottom: 0
    }}>
      {/* Cellule 1 — Taux de conversion */}
      <div style={{ padding: '44px 40px 40px', borderRight: '1px solid var(--line-2)', position: 'relative' }}>
        <span className="dir-label" style={{ display: 'block', marginBottom: 20 }}>Taux de conversion global</span>
        <div className="dir-display" style={{
          fontWeight: 300, fontSize: 140, lineHeight: 0.9, letterSpacing: '-0.04em',
          color: 'var(--ink)', fontFeatureSettings: '"tnum"'
        }}>
          <em style={{ fontStyle: 'normal', color: 'var(--accent)', fontWeight: 400 }}>
            {conversionRate || 0}
          </em>
          <span style={{ color: 'var(--ink-3)', fontSize: 64 }}>%</span>
        </div>
        <div style={{
          marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 10,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: 'var(--accent)', letterSpacing: '0.06em'
        }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {(conversionTrend || 0) >= 0 ? '↑' : '↓'} {Math.abs(conversionTrend || 0)}pts
          </span>
          <span style={{ color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            vs. période précédente
          </span>
        </div>
        <svg width="220" height="36" viewBox="0 0 220 36" fill="none" style={{ marginTop: 14, opacity: 0.6 }}>
          <path d="M0 28 L22 24 L44 26 L66 20 L88 22 L110 16 L132 18 L154 12 L176 14 L198 8 L220 6"
                stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
          <path d="M0 28 L22 24 L44 26 L66 20 L88 22 L110 16 L132 18 L154 12 L176 14 L198 8 L220 6 L220 36 L0 36 Z"
                fill="var(--accent-soft)" opacity="0.4"/>
        </svg>
      </div>

      {/* Cellule 2 — CA réalisé */}
      <div style={{ padding: '44px 40px 40px', borderRight: '1px solid var(--line-2)' }}>
        <span className="dir-label" style={{ display: 'block', marginBottom: 20 }}>CA réalisé · période</span>
        <div className="dir-display" style={{
          fontWeight: 300, fontSize: 72, lineHeight: 0.9, letterSpacing: '-0.04em',
          color: 'var(--ink)', fontFeatureSettings: '"tnum"'
        }}>
          {intPart}
          {decPart && <span style={{ fontSize: 48, color: 'var(--ink-3)' }}>,{decPart.slice(0, 2)}</span>}
        </div>
        <div style={{
          marginTop: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase'
        }}>
          k€ facturés
        </div>
        <div style={{
          marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 10,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: (revenueTrend || 0) >= 0 ? 'var(--accent)' : 'var(--warm)', letterSpacing: '0.06em'
        }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {(revenueTrend || 0) >= 0 ? '↑' : '↓'} {Math.abs(revenueTrend || 0)}%
          </span>
          <span style={{ color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MoM</span>
        </div>
      </div>

      {/* Cellule 3 — Score santé */}
      <div style={{ padding: '44px 40px 40px' }}>
        <span className="dir-label" style={{ display: 'block', marginBottom: 20 }}>Score santé business</span>
        <div className="dir-display" style={{
          fontWeight: 300, fontSize: 72, lineHeight: 0.9, letterSpacing: '-0.04em',
          color: 'var(--ink)', fontFeatureSettings: '"tnum"'
        }}>
          {healthScore || 0}
          <span style={{ fontSize: 36, color: 'var(--ink-3)' }}>/100</span>
        </div>
        <div className="dir-display" style={{
          marginTop: 6, fontStyle: 'italic', fontSize: 15,
          color: (healthScore || 0) >= 80 ? 'var(--accent)' : (healthScore || 0) >= 60 ? 'var(--gold)' : 'var(--warm)'
        }}>
          {(healthScore || 0) >= 80 ? 'Solide — tendance haussière'
            : (healthScore || 0) >= 60 ? 'Correct — à surveiller'
            : 'Fragile — action requise'}
        </div>
        <div style={{
          marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 10,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: (healthTrend || 0) >= 0 ? 'var(--accent)' : 'var(--warm)', letterSpacing: '0.06em'
        }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {(healthTrend || 0) >= 0 ? '▲' : '▼'} {(healthTrend || 0) >= 0 ? '+' : ''}{healthTrend || 0}pts
          </span>
          <span style={{ color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>vs. N-1</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// RIBBON — 4 mini-KPIs
// ──────────────────────────────────────────────────────────────────
function Ribbon({ items }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
      background: 'var(--line-2)',
      margin: '0 0 72px',
      borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)'
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          background: 'var(--surface)', padding: '16px 24px',
          display: 'flex', flexDirection: 'column', gap: 4
        }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)'
          }}>{it.label}</span>
          <span className="dir-display" style={{
            fontSize: 20, fontWeight: 500, color: 'var(--ink)',
            fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em'
          }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// SECTION header
// ──────────────────────────────────────────────────────────────────
function Section({ num, title, titleItalic, annot }) {
  return (
    <div style={{
      marginTop: 72, marginBottom: 28,
      display: 'flex', alignItems: 'baseline', gap: 20,
      paddingBottom: 16, borderBottom: '1px solid var(--line-2)'
    }}>
      <span className="dir-mono" style={{
        fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 500
      }}>{num}</span>
      <h2 className="dir-display" style={{
        fontWeight: 400, fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em',
        margin: 0, color: 'var(--ink)'
      }}>
        {title}{titleItalic && <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--ink-3)', fontSize: 22 }}> {titleItalic}</em>}
      </h2>
      {annot && <span style={{
        marginLeft: 'auto',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--ink-3)'
      }}>{annot}</span>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 01 — Santé du business
// ──────────────────────────────────────────────────────────────────
function HealthSection({ score, subscores }) {
  const s = score || 0;
  const verdictColor = s >= 80 ? 'var(--accent)' : s >= 60 ? 'var(--gold)' : 'var(--warm)';
  const verdict = s >= 80 ? 'Solide, tendance haussière.' : s >= 60 ? 'Correct, à surveiller.' : 'Fragile, action requise.';
  const dashOffset = 515 - (515 * s) / 100;

  const defaultSubs = [
    { cap: 'Finance', name: 'Performance CA', value: 92, tone: 'ok' },
    { cap: 'Pipeline', name: 'Qualité & vélocité', value: 72, tone: 'warn' },
    { cap: 'Clients', name: 'Satisfaction NPS', value: 94, tone: 'ok' },
    { cap: 'Opérationnel', name: 'Délais & retards', value: 58, tone: 'bad' },
  ];
  const subs = (subscores && subscores.length) ? subscores : defaultSubs;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 32 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22,
        padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center'
      }}>
        <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 20 }}>
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="100" cy="100" r="82" fill="none" stroke="var(--line-2)" strokeWidth="14"/>
            <circle cx="100" cy="100" r="82" fill="none" stroke={verdictColor} strokeWidth="14"
                    strokeDasharray="515" strokeDashoffset={dashOffset} strokeLinecap="round"/>
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <span className="dir-display" style={{
              fontWeight: 300, fontSize: 64, lineHeight: 1, letterSpacing: '-0.03em',
              color: 'var(--ink)', fontFeatureSettings: '"tnum"'
            }}>{s}</span>
            <span className="dir-mono" style={{
              fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)',
              textTransform: 'uppercase', marginTop: 4
            }}>/ 100</span>
          </div>
        </div>
        <div className="dir-display" style={{ fontStyle: 'italic', fontSize: 17, color: verdictColor }}>
          {verdict}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {subs.map((sb, i) => {
          const fillColor = sb.tone === 'warn' ? 'var(--gold)' : sb.tone === 'bad' ? 'var(--warm)' : 'var(--accent)';
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 24, alignItems: 'center',
              padding: '22px 24px', background: 'var(--surface)',
              border: '1px solid var(--line)', borderRadius: 14
            }}>
              <div>
                <span style={{
                  display: 'block',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
                  color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 2
                }}>{sb.cap}</span>
                <span className="dir-display" style={{
                  fontWeight: 500, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.015em'
                }}>{sb.name}</span>
              </div>
              <div style={{
                height: 4, borderRadius: 999, background: 'var(--surface-2)',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0,
                  right: `${100 - sb.value}%`,
                  background: fillColor, borderRadius: 999
                }}/>
              </div>
              <div className="dir-display" style={{
                fontWeight: 300, fontSize: 36, color: 'var(--ink)', letterSpacing: '-0.02em',
                fontFeatureSettings: '"tnum"', lineHeight: 1
              }}>
                {sb.value}
                <span className="dir-mono" style={{
                  fontSize: 11, color: 'var(--ink-3)', marginLeft: 4, letterSpacing: '0.08em'
                }}>/100</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 02 — Performance financière
// ──────────────────────────────────────────────────────────────────
function FinancialGrid({ cells }) {
  const defaultCells = [
    { cap: 'CA prévu fin de mois', value: '248', unit: 'k€', trend: '+18%', context: 'vs. objectif', dot: 'accent', neg: false },
    { cap: 'Marge nette moyenne', value: '34', unit: '%', trend: '+1,2pts', context: 'MoM', dot: 'gold', neg: false },
    { cap: 'Ticket moyen', value: '12,4', unit: 'k€', trend: '+6%', context: 'MoM', dot: 'ink', neg: false },
    { cap: 'Cash flow · 30j', value: '+42', unit: 'k€', trend: '−8%', context: '2 factures en retard', dot: 'warm', neg: true },
  ];
  const c = (cells && cells.length) ? cells : defaultCells;
  const dotColor = (d) => d === 'gold' ? 'var(--gold)' : d === 'warm' ? 'var(--warm)' : d === 'ink' ? 'var(--ink-2)' : 'var(--accent)';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      border: '1px solid var(--line)', borderRadius: 22, overflow: 'hidden',
      background: 'var(--surface)'
    }}>
      {c.map((cell, i) => (
        <div key={i} style={{
          padding: '28px 28px 32px',
          borderRight: i < c.length - 1 ? '1px solid var(--line-2)' : 0
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)',
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor(cell.dot), flexShrink: 0 }}/>
            {cell.cap}
          </div>
          <div className="dir-display" style={{
            fontWeight: 300, fontSize: 44, lineHeight: 1, letterSpacing: '-0.025em',
            color: 'var(--ink)', fontFeatureSettings: '"tnum"'
          }}>
            {cell.value}
            <span className="dir-mono" style={{
              fontSize: 13, color: 'var(--ink-3)', marginLeft: 4, letterSpacing: '0.06em', fontWeight: 500
            }}>{cell.unit}</span>
          </div>
          <div style={{
            marginTop: 14, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: cell.neg ? 'var(--warm)' : 'var(--accent)', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'baseline', gap: 8
          }}>
            <span>{cell.trend}</span>
            <span style={{ color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{cell.context}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 03 — Paris : carte + ranking
// ──────────────────────────────────────────────────────────────────
function ParisSection({ topAreas }) {
  const defaultAreas = [
    { rank: '01', num: '16', name: 'arrondissement', sub: 'Passy · Auteuil · Chaillot', leads: 184, ca: '42 000 €', top: true },
    { rank: '02', num: '7', name: 'arrondissement', sub: 'Invalides · Gros-Caillou', leads: 156, ca: '38 500 €', top: true },
    { rank: '03', num: '17', name: 'arrondissement', sub: 'Batignolles · Monceau', leads: 122, ca: '29 100 €', top: false },
    { rank: '04', num: '8', name: 'arrondissement', sub: 'Madeleine · Champs-Élysées', leads: 98, ca: '24 700 €', top: false },
    { rank: '05', num: '6', name: 'arrondissement', sub: 'Saint-Germain · Odéon', leads: 74, ca: '19 800 €', top: false },
  ];
  const areas = (topAreas && topAreas.length) ? topAreas : defaultAreas;
  const totalLeads = areas.reduce((a, b) => a + (b.leads || 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 32 }}>
      {/* Carte */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22,
        padding: 28, position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <div className="dir-display" style={{ fontWeight: 500, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
            Répartition par <em style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontWeight: 400 }}>arrondissement</em>
          </div>
          <div className="dir-mono" style={{
            fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase'
          }}>Source CRM · {totalLeads} leads</div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 16, height: 380, position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 600 340" preserveAspectRatio="xMidYMid meet">
            <path d="M300 40 Q450 50 510 130 Q550 210 490 280 Q420 315 300 310 Q180 315 110 280 Q50 210 90 130 Q150 50 300 40 Z"
                  fill="oklch(0.92 0.018 78)" stroke="oklch(0.80 0.012 75)" strokeWidth="1.2"/>
            <path d="M60 200 Q200 160 300 180 Q400 200 540 170"
                  stroke="oklch(0.78 0.06 220)" strokeWidth="6" fill="none" opacity="0.4" strokeLinecap="round"/>
            <path d="M60 200 Q200 160 300 180 Q400 200 540 170"
                  stroke="oklch(0.85 0.04 220)" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <g fontFamily="JetBrains Mono, monospace" fontSize="8" fill="oklch(0.65 0.010 70)" textAnchor="middle" fontWeight="500">
              <text x="290" y="168">1</text><text x="250" y="150">2</text><text x="310" y="150">3</text>
              <text x="315" y="195">4</text><text x="275" y="195">5</text><text x="240" y="185">6</text>
              <text x="220" y="165">7</text><text x="260" y="120">8</text><text x="295" y="115">9</text>
              <text x="345" y="130">10</text><text x="370" y="175">11</text><text x="390" y="220">12</text>
              <text x="330" y="240">13</text><text x="275" y="250">14</text><text x="190" y="220">15</text>
              <text x="155" y="150">16</text><text x="200" y="95">17</text><text x="300" y="80">18</text>
              <text x="370" y="95">19</text><text x="440" y="190">20</text>
            </g>
            <g>
              <circle cx="155" cy="150" r="32" fill="var(--warm)" opacity="0.18"/>
              <circle cx="155" cy="150" r="22" fill="var(--warm)" opacity="0.55"/>
              <circle cx="155" cy="150" r="10" fill="var(--warm)"/>
              <text x="155" y="122" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="var(--ink)" textAnchor="middle" fontWeight="600" letterSpacing="1">16e · 42k€</text>
            </g>
            <g>
              <circle cx="220" cy="165" r="28" fill="var(--warm)" opacity="0.15"/>
              <circle cx="220" cy="165" r="18" fill="var(--warm)" opacity="0.45"/>
              <circle cx="220" cy="165" r="8" fill="var(--warm)"/>
              <text x="220" y="142" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="var(--ink)" textAnchor="middle" fontWeight="600" letterSpacing="1">7e · 38k€</text>
            </g>
            <g>
              <circle cx="200" cy="95" r="24" fill="var(--gold)" opacity="0.18"/>
              <circle cx="200" cy="95" r="15" fill="var(--gold)" opacity="0.55"/>
              <circle cx="200" cy="95" r="7" fill="var(--gold)"/>
              <text x="200" y="75" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="var(--ink)" textAnchor="middle" fontWeight="600" letterSpacing="1">17e · 29k€</text>
            </g>
            <g>
              <circle cx="260" cy="120" r="22" fill="var(--gold)" opacity="0.15"/>
              <circle cx="260" cy="120" r="13" fill="var(--gold)" opacity="0.5"/>
              <circle cx="260" cy="120" r="6" fill="var(--gold)"/>
              <text x="260" y="101" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="var(--ink)" textAnchor="middle" fontWeight="600" letterSpacing="1">8e · 25k€</text>
            </g>
            <circle cx="240" cy="185" r="18" fill="var(--accent)" opacity="0.15"/>
            <circle cx="240" cy="185" r="11" fill="var(--accent)" opacity="0.55"/>
            <circle cx="240" cy="185" r="5" fill="var(--accent)"/>
            <circle cx="190" cy="220" r="16" fill="var(--accent)" opacity="0.15"/>
            <circle cx="190" cy="220" r="10" fill="var(--accent)" opacity="0.5"/>
            <circle cx="190" cy="220" r="4" fill="var(--accent)"/>
            <circle cx="370" cy="175" r="15" fill="var(--accent)" opacity="0.15"/>
            <circle cx="370" cy="175" r="9" fill="var(--accent)" opacity="0.5"/>
            <circle cx="370" cy="175" r="4" fill="var(--accent)"/>
            <circle cx="295" cy="115" r="7" fill="var(--accent)" opacity="0.5"/>
            <circle cx="295" cy="115" r="3" fill="var(--accent)"/>
            <circle cx="290" cy="168" r="6" fill="var(--accent)" opacity="0.5"/>
            <circle cx="290" cy="168" r="3" fill="var(--accent)"/>
            <circle cx="330" cy="240" r="8" fill="var(--accent)" opacity="0.4"/>
            <circle cx="330" cy="240" r="3" fill="var(--accent)"/>
            <circle cx="275" cy="250" r="6" fill="var(--accent)" opacity="0.4"/>
            <circle cx="275" cy="250" r="3" fill="var(--accent)"/>
            <circle cx="440" cy="190" r="7" fill="var(--accent)" opacity="0.4"/>
            <circle cx="440" cy="190" r="3" fill="var(--accent)"/>
          </svg>
        </div>
        <div style={{
          position: 'absolute', bottom: 28, left: 44,
          display: 'flex', gap: 16, alignItems: 'center',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--ink-3)',
          background: 'var(--surface)', padding: '8px 14px', borderRadius: 999,
          border: '1px solid var(--line)'
        }}>
          <span><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--warm)', display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }}/>&gt; 30k€</span>
          <span><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--gold)', display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }}/>15–30k€</span>
          <span><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent-soft)', display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }}/>&lt; 15k€</span>
        </div>
      </div>

      {/* Ranking */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22,
        padding: '28px 0 0', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          padding: '0 28px 18px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          borderBottom: '1px solid var(--line-2)'
        }}>
          <div className="dir-display" style={{ fontWeight: 500, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
            Top arrondissements <em style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontWeight: 400 }}>— CA</em>
          </div>
          <div className="dir-mono" style={{
            fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase'
          }}>{totalLeads} leads</div>
        </div>
        <div>
          {areas.map((a, i) => (
            <div key={i} className="dir-rank-row" style={{
              display: 'grid', gridTemplateColumns: '32px 1fr auto auto', gap: 18, alignItems: 'center',
              padding: '18px 28px', borderBottom: i < areas.length - 1 ? '1px solid var(--line-2)' : 0
            }}>
              <div className="dir-display" style={{
                fontWeight: 300, fontSize: 26,
                color: a.top ? 'var(--warm)' : 'var(--ink-4)',
                letterSpacing: '-0.02em', lineHeight: 1
              }}>{a.rank}</div>
              <div>
                <div className="dir-display" style={{ fontWeight: 500, fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
                  {a.num}<sup>e</sup> {a.name}
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.12em',
                  color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 500, marginTop: 2
                }}>{a.sub}</div>
              </div>
              <div className="dir-mono" style={{
                fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.04em', textAlign: 'right'
              }}>{a.leads} leads</div>
              <div className="dir-display" style={{
                fontWeight: 500, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.01em',
                fontFeatureSettings: '"tnum"', textAlign: 'right', minWidth: 110
              }}>{a.ca}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 04 — Activité + entonnoir
// ──────────────────────────────────────────────────────────────────
function ActivitySection({ funnelSteps }) {
  const defaultSteps = [
    { name: 'Leads', sub: 'Entrants', count: 442, pct: 100, tone: 0 },
    { name: 'Qualifiés', sub: 'Contact pris', count: 318, pct: 72, tone: 1 },
    { name: 'Devis', sub: 'Envoyés', count: 212, pct: 48, tone: 2 },
    { name: 'Négociation', sub: 'En cours', count: 159, pct: 36, tone: 3 },
    { name: 'Gagnés', sub: 'Signés', count: 142, pct: 32, tone: 4 },
  ];
  const steps = (funnelSteps && funnelSteps.length) ? funnelSteps : defaultSteps;
  const barColors = ['var(--ink)', 'oklch(0.28 0.03 60)', 'var(--accent)', 'oklch(0.60 0.16 45)', 'var(--warm)'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 28
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="dir-display" style={{ fontWeight: 500, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
            Évolution CA <em style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontWeight: 400 }}>— quotidien</em>
          </div>
          <div style={{
            display: 'flex', gap: 16,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em',
            color: 'var(--ink-3)', textTransform: 'uppercase'
          }}>
            <span><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent)', display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }}/>Réalisé</span>
            <span><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--warm)', display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }}/>Objectif</span>
          </div>
        </div>
        <svg width="100%" height="220" viewBox="0 0 640 220" preserveAspectRatio="none">
          <defs>
            <linearGradient id="dirGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <g stroke="var(--line-2)" strokeWidth="1">
            <line x1="0" y1="40" x2="640" y2="40"/>
            <line x1="0" y1="90" x2="640" y2="90"/>
            <line x1="0" y1="140" x2="640" y2="140"/>
            <line x1="0" y1="190" x2="640" y2="190"/>
          </g>
          <line x1="0" y1="110" x2="640" y2="90" stroke="var(--warm)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6"/>
          <path d="M0 170 L40 160 L80 145 L120 140 L160 125 L200 115 L240 100 L280 90 L320 80 L360 70 L400 60 L440 55 L480 50 L520 45 L560 40 L600 35 L640 30 L640 220 L0 220 Z"
                fill="url(#dirGrad)"/>
          <path d="M0 170 L40 160 L80 145 L120 140 L160 125 L200 115 L240 100 L280 90 L320 80 L360 70 L400 60 L440 55 L480 50 L520 45 L560 40 L600 35 L640 30"
                stroke="var(--accent)" strokeWidth="2" fill="none"/>
          <circle cx="640" cy="30" r="4" fill="var(--accent)"/>
          <circle cx="640" cy="30" r="8" fill="var(--accent)" opacity="0.25"/>
        </svg>
        <div style={{
          marginTop: 12, display: 'flex', justifyContent: 'space-between',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em',
          color: 'var(--ink-3)', textTransform: 'uppercase'
        }}>
          <span>J-30</span><span>J-22</span><span>J-15</span><span>J-7</span><span>Aujourd'hui</span>
        </div>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 28
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="dir-display" style={{ fontWeight: 500, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
            Entonnoir <em style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontWeight: 400 }}>de conversion</em>
          </div>
          <div className="dir-mono" style={{
            fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase'
          }}>Période courante</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map((st, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 16, alignItems: 'center'
            }}>
              <div className="dir-display" style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>
                {st.name}
                <span style={{
                  display: 'block',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.12em',
                  color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 500, marginTop: 2
                }}>{st.sub}</span>
              </div>
              <div style={{
                position: 'relative', height: 36, background: 'var(--surface-2)',
                borderRadius: 6, overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0,
                  width: `${st.pct}%`, background: barColors[st.tone] || 'var(--ink)', borderRadius: 6,
                  display: 'flex', alignItems: 'center', paddingLeft: 14,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--bg)',
                  letterSpacing: '0.06em', fontWeight: 500
                }}>{st.count}</div>
              </div>
              <div className="dir-display" style={{
                fontWeight: 400, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.01em',
                fontFeatureSettings: '"tnum"', minWidth: 54, textAlign: 'right'
              }}>{st.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 05 — Signaux & opportunités
// ──────────────────────────────────────────────────────────────────
function SignalsSection({ signals }) {
  const defaultSignals = [
    { tag: 'opp', tagLabel: 'Opportunité', text: '3 leads 16e arrondissement · forte probabilité de signature', sub: 'Budgets combinés 85 000 € · délai < 15 jours · aucun compétiteur identifié', cta: 'Relancer →' },
    { tag: 'alr', tagLabel: 'Alerte', text: 'Facture FAC-2410-014 en retard de 18 jours', sub: 'Client Dupont · 24 500 € · 2 relances sans réponse', cta: 'Ouvrir →' },
    { tag: 'act', tagLabel: 'Action', text: 'Conversion en baisse sur le segment < 10k€', sub: '−6 pts en 30 jours · revoir la grille tarifaire ou le pitch d\'entrée', cta: 'Analyser →' },
    { tag: 'opp', tagLabel: 'Opportunité', text: 'Pic de demandes "rénovation salle de bain" · 17e', sub: '+42% vs. mois précédent · saisonnalité favorable', cta: 'Créer →' },
    { tag: 'alr', tagLabel: 'Alerte', text: '2 chantiers dépassent le budget prévu de > 15%', sub: 'Chantier Bellanger · Chantier Moreau · revue économique nécessaire', cta: 'Consulter →' },
  ];
  const sigs = (signals && signals.length) ? signals : defaultSignals;
  const tagStyle = (t) => {
    if (t === 'opp') return { background: 'var(--accent-soft)', color: 'var(--accent)' };
    if (t === 'alr') return { background: 'var(--warm-soft)', color: 'var(--warm)' };
    return { background: 'oklch(0.94 0.05 85)', color: 'oklch(0.55 0.15 85)' };
  };

  return (
    <div style={{
      background: 'var(--bg)', border: '1px dashed var(--accent)', borderRadius: 22,
      padding: 32, position: 'relative'
    }}>
      <span style={{
        position: 'absolute', top: 14, right: 14,
        width: 8, height: 8, borderRadius: 999, background: 'var(--accent)',
        boxShadow: '0 0 0 4px var(--accent-soft)'
      }}/>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--line-2)'
      }}>
        <div className="dir-display" style={{
          fontWeight: 500, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.015em',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <em style={{ fontStyle: 'italic', color: 'var(--accent)', fontWeight: 400 }}>{sigs.length}</em>
          {' '}signaux détectés
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
            textTransform: 'uppercase',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            padding: '3px 10px', borderRadius: 999, fontWeight: 600
          }}>IA · Direction</span>
        </div>
        <span className="dir-mono" style={{
          fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase'
        }}>Prioritaires · &gt; impact 10k€</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sigs.map((s, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 20, alignItems: 'center',
            padding: '16px 4px',
            borderBottom: i < sigs.length - 1 ? '1px solid var(--line-2)' : 0
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontWeight: 600,
              padding: '4px 10px', borderRadius: 3, textAlign: 'center',
              ...tagStyle(s.tag)
            }}>{s.tagLabel}</span>
            <div>
              <div className="dir-display" style={{
                fontWeight: 400, fontSize: 15, color: 'var(--ink)',
                letterSpacing: '-0.01em', lineHeight: 1.4
              }}>{s.text}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.sub}</div>
            </div>
            <button className="dir-cta" style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--ink-2)',
              padding: '6px 14px', border: '1px solid var(--line)', borderRadius: 999,
              cursor: 'pointer', background: 'var(--surface)'
            }}>{s.cta}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// COLOPHON
// ──────────────────────────────────────────────────────────────────
function Colophon() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR') + ' à ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{
      marginTop: 88, paddingTop: 28, borderTop: '1px solid var(--line)',
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: 'var(--ink-3)'
    }}>
      <div>
        <em className="dir-display" style={{
          fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)',
          textTransform: 'none', letterSpacing: '-0.01em'
        }}>Vue Directeur</em>
        {' '}· Rapport généré le {dateStr}
      </div>
      <div>Atelier CRM · v2.1.0</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────
export default function DirectorDashboard() {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const token = localStorage.getItem('token') || localStorage.getItem('session_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios.get(`${API}/api/director/dashboard`, { params: { range }, headers, withCredentials: true })
      .then(res => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setData({}); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const d = data || {};

  const conversionRate = d.conversionRate ?? d.conversion_rate ?? 0;
  const conversionTrend = d.conversionTrend ?? d.conversion_trend ?? 0;
  const revenueRealized = d.revenueRealized ?? d.revenue ?? d.ca_realise ?? 0;
  const revenueTrend = d.revenueTrend ?? d.revenue_trend ?? 0;
  const healthScore = d.healthScore ?? d.health ?? 0;
  const healthTrend = d.healthTrend ?? d.health_trend ?? 0;

  const ribbonItems = [
    { label: 'Leads qualifiés · période', value: (d.qualifiedLeads ?? d.qualified_leads ?? 0).toLocaleString('fr-FR') },
    { label: 'Devis envoyés', value: (d.quotesSent ?? d.quotes_sent ?? 0).toLocaleString('fr-FR') },
    { label: 'Chantiers actifs', value: (d.activeProjects ?? d.active_projects ?? 0).toLocaleString('fr-FR') },
    { label: 'Ticket moyen', value: (d.avgTicket ?? d.avg_ticket ?? 0).toLocaleString('fr-FR') + ' €' },
  ];

  const rangeDays = range === 'week' ? '7' : range === 'month' ? '30' : range === 'quarter' ? '90' : '365';

  if (loading) {
    return (
      <div className="dir-root" style={{ padding: 56 }}>
        <style>{tokenStyle}</style>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Chargement du rapport…
        </div>
      </div>
    );
  }

  return (
    <div className="dir-root">
      <style>{tokenStyle}</style>
      <div style={{ padding: '56px 56px 120px', maxWidth: 1400, margin: '0 auto' }}>

        <Cover range={range} setRange={setRange} />

        <HeroCover
          conversionRate={conversionRate}
          conversionTrend={conversionTrend}
          revenueRealized={revenueRealized}
          revenueTrend={revenueTrend}
          healthScore={healthScore}
          healthTrend={healthTrend}
        />

        <Ribbon items={ribbonItems} />

        <Section num="01" title="Santé du business" titleItalic="— vue synthétique" annot="Mis à jour · il y a qq min" />
        <HealthSection score={healthScore} subscores={d.subscores} />

        <Section num="02" title="Performance" titleItalic="financière" annot="EUR · HT · Période courante" />
        <FinancialGrid cells={d.financialCells || d.financial_cells} />

        <Section num="03" title="Géographie" titleItalic="Paris" annot="Volume CA · 12 derniers mois" />
        <ParisSection topAreas={d.topAreas || d.top_areas} />

        <Section num="04" title="Activité" titleItalic="commerciale" annot={`${rangeDays} derniers jours · cumul`} />
        <ActivitySection funnelSteps={d.funnel || d.funnel_steps} />

        <Section num="05" title="Signaux &" titleItalic="opportunités" annot="Détection automatique · IA" />
        <SignalsSection signals={d.signals} />

        <Colophon />
      </div>
    </div>
  );
}
