// AccountingGrimoire.jsx — « Le grimoire comptable ».
// Identité : manuscrit ancien de comptabilité à double entrée. Chapitres
// numérotés en chiffres romains, ornements en initiales capitales façon
// enluminure, tranches dorées. Chaque module de l'ERP = un livre du grimoire.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, FileText, Banknote, BookOpen, Receipt, TrendingUp,
  Briefcase, Wallet, Search, ArrowRight, BookMarked, Feather,
} from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────── TOKENS ─────────────────── */
const tokenStyle = `
  .gri-root {
    --bg: oklch(0.965 0.012 80);
    --paper: oklch(0.975 0.014 82);
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
    --sepia: oklch(0.55 0.08 65);
    --sepia-soft: oklch(0.92 0.04 65);
    --gold: oklch(0.72 0.13 85);
    --gold-deep: oklch(0.58 0.13 78);
    --gold-soft: oklch(0.94 0.06 85);
    --rouge: oklch(0.45 0.14 25);
    --danger: oklch(0.55 0.18 25);
  }
  .gri-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 80px;
  }
  .gri-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .gri-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .gri-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .gri-italic  { font-style: italic; color: var(--rouge); font-weight: 400; }

  /* Livre (chapitre) */
  .gri-book {
    display: grid; grid-template-columns: 74px 1fr auto;
    gap: 18px; align-items: stretch;
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 12px;
    text-decoration: none; color: var(--ink);
    position: relative; overflow: hidden;
    transition: transform .2s, box-shadow .2s;
    min-height: 130px;
  }
  .gri-book:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 28px rgba(0,0,0,0.07);
  }

  /* Tranche latérale dorée */
  .gri-book-spine {
    background: linear-gradient(180deg, var(--gold) 0%, var(--gold-deep) 100%);
    border-right: 1px solid var(--gold-deep);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 18px 0;
    position: relative;
  }
  .gri-book-spine::before {
    content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px;
    background: oklch(0.85 0.09 85);
  }
  .gri-book-spine::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
    background: oklch(0.45 0.10 78);
  }
  .gri-book-spine .gri-roman {
    font-family: 'Fraunces', serif;
    font-size: 32px; font-weight: 500; line-height: 1;
    color: oklch(0.20 0.04 60); letter-spacing: -0.01em;
  }
  .gri-book-spine .gri-mini-icon {
    margin-top: 8px;
    color: oklch(0.20 0.04 60); opacity: 0.7;
  }

  .gri-book-body {
    padding: 18px 20px; display: flex; flex-direction: column; justify-content: center;
  }

  .gri-book-arrow {
    display: flex; align-items: center; justify-content: center;
    padding-right: 18px;
    color: var(--ink-3);
    transition: all .2s;
  }
  .gri-book:hover .gri-book-arrow { color: var(--rouge); transform: translateX(4px); }

  /* Initiale décorative (enluminure) */
  .gri-dropcap {
    float: left; font-family: 'Fraunces', serif; font-weight: 500;
    font-size: 48px; line-height: 0.85;
    margin: 3px 10px 0 0; color: var(--rouge);
    letter-spacing: -0.04em;
  }

  /* Bande KPI */
  .gri-kpi-strip {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 12px; overflow: hidden;
  }
  .gri-kpi-cell {
    padding: 22px 26px;
    border-right: 1px solid var(--line-2);
  }
  .gri-kpi-cell:last-child { border-right: 0; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .gri-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .gri-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .gri-header-title { font-size: 36px !important; }
    .gri-body { padding: 0 20px 40px !important; }
    .gri-grid { grid-template-columns: 1fr !important; }
    .gri-kpi-strip { grid-template-columns: 1fr 1fr !important; }
    .gri-kpi-cell { border-right: 0 !important; border-bottom: 1px solid var(--line-2) !important; }
  }
`;

/* Chiffres romains pour les livres */
function toRoman(n) {
  const map = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let r = ''; for (const [v, s] of map) { while (n >= v) { r += s; n -= v; } } return r;
}

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

const CHAPTERS = [
  { tab: 'dashboard',  title: 'Dashboard',    sub: 'Vue d\'ensemble financière, courbes et ratios clés',          icon: BarChart3 },
  { tab: 'invoices',   title: 'Factures',     sub: 'Émettre, suivre et relancer les ventes clients',             icon: FileText },
  { tab: 'expenses',   title: 'Dépenses',     sub: 'Enregistrer les achats et charges par catégorie',            icon: Wallet },
  { tab: 'treasury',   title: 'Trésorerie',   sub: 'Comptes bancaires, rapprochements, flux de trésorerie',      icon: Banknote },
  { tab: 'journals',   title: 'Journaux',     sub: 'Écritures comptables, plan de comptes à double entrée',      icon: BookOpen },
  { tab: 'tva',        title: 'TVA',          sub: 'Collectée / déductible, déclarations périodiques',           icon: Receipt },
  { tab: 'reports',    title: 'Rapports',     sub: 'Bilan, compte de résultat, soldes intermédiaires',           icon: TrendingUp },
  { tab: 'payroll-rh', title: 'Paie & RH',    sub: 'Salaires, cotisations, contrats et registre du personnel',    icon: Briefcase },
];

/* ═════════════════════ MAIN ═════════════════════ */
export default function AccountingGrimoire() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/accounting/erp/kpis')
      .then(r => { if (alive) setKpis(r.data || {}); })
      .catch(() => { if (alive) setKpis({}); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return CHAPTERS;
    const q = search.toLowerCase();
    return CHAPTERS.filter(c => c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="gri-root">
      <style>{tokenStyle}</style>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="gri-header gri-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="gri-label" style={{ marginBottom: 12 }}>Comptabilité · ERP</div>
          <h1 className="gri-display gri-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Le <em className="gri-italic">grimoire</em> comptable
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {CHAPTERS.length} livres pour tenir la comptabilité — des journaux à la TVA, des ventes aux salaires
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
          padding: '8px 14px', minWidth: 260,
        }}>
          <Search style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher un livre…"
            className="gri-mono"
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
          />
        </div>
      </div>

      {/* ═══════════ BANDE KPIS (bilan rapide) ═══════════ */}
      {kpis && (
        <div className="gri-body gri-fade" style={{ padding: '0 48px 24px' }}>
          <div className="gri-kpi-strip">
            {[
              { label: 'Chiffre d\'affaires', value: `${fmt(kpis.revenue_mtd || 0)} €`, sub: 'Mois en cours', tone: 'var(--emerald)' },
              { label: 'Dépenses',             value: `${fmt(kpis.expenses_mtd || 0)} €`, sub: 'Mois en cours', tone: 'var(--rouge)' },
              { label: 'Résultat net',         value: `${fmt((kpis.revenue_mtd || 0) - (kpis.expenses_mtd || 0))} €`, sub: 'CA − dépenses', tone: 'var(--gold-deep)' },
              { label: 'TVA à payer',          value: `${fmt(kpis.tva_due || 0)} €`, sub: 'Prochaine échéance', tone: 'var(--ink)' },
            ].map((k, i) => (
              <div key={i} className="gri-kpi-cell">
                <div className="gri-label" style={{ marginBottom: 8 }}>{k.label}</div>
                <div className="gri-display" style={{ fontSize: 28, fontWeight: 500, color: k.tone, lineHeight: 1 }}>
                  {k.value}
                </div>
                <div className="gri-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, letterSpacing: '0.08em' }}>
                  {k.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ INTRO MANUSCRIT ═══════════ */}
      <div className="gri-body gri-fade" style={{ padding: '0 48px 24px' }}>
        <div style={{
          background: 'var(--sepia-soft)', border: '1px solid var(--sepia)',
          borderRadius: 12, padding: '26px 32px',
        }}>
          <p style={{
            fontFamily: 'Fraunces, serif', fontSize: 17, lineHeight: 1.6,
            color: 'var(--ink-2)', margin: 0,
          }}>
            <span className="gri-dropcap">L</span>
            a comptabilité est l'art de la double entrée : chaque débit appelle son crédit,
            chaque flux laisse sa trace. <em>Le grimoire</em> rassemble en un même lieu tous
            les livres tenus au fil des mois — factures envoyées, dépenses enregistrées,
            déclarations de TVA préparées et bulletins de paie édités. Ouvre un chapitre
            pour en consulter ou en tenir l'écriture.
          </p>
        </div>
      </div>

      {/* ═══════════ LIVRES ═══════════ */}
      <div className="gri-body gri-fade" style={{ padding: '0 48px 40px' }}>
        <div className="gri-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16,
        }}>
          {filtered.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1', padding: 60, textAlign: 'center',
              background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 12,
              fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)',
            }}>
              Aucun livre ne correspond à « {search} ».
            </div>
          ) : (
            filtered.map((c, idx) => (
              <a
                key={c.tab}
                className="gri-book"
                href={`/accounting-erp/legacy?tab=${c.tab}`}
                onClick={(e) => { e.preventDefault(); navigate(`/accounting-erp/legacy?tab=${c.tab}`); }}
              >
                <div className="gri-book-spine">
                  <div className="gri-roman">{toRoman(CHAPTERS.findIndex(x => x.tab === c.tab) + 1)}</div>
                  <div className="gri-mini-icon">
                    <BookMarked style={{ width: 14, height: 14 }} />
                  </div>
                </div>
                <div className="gri-book-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'var(--sepia-soft)', color: 'var(--sepia)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <c.icon style={{ width: 15, height: 15 }} />
                    </div>
                    <div className="gri-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>
                      {c.title}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'Fraunces, serif', fontStyle: 'italic',
                    fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, paddingLeft: 42,
                  }}>
                    {c.sub}
                  </div>
                </div>
                <div className="gri-book-arrow">
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* Footer signature */}
      <div className="gri-body gri-fade" style={{ padding: '0 48px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          color: 'var(--ink-3)', fontStyle: 'italic', fontFamily: 'Fraunces, serif', fontSize: 13,
        }}>
          <Feather style={{ width: 14, height: 14 }} />
          tenu à jour par l'atelier Global Clean Home
        </div>
      </div>

      {loading && (
        <div style={{
          position: 'fixed', top: 16, right: 16,
          padding: '8px 14px', borderRadius: 999,
          background: 'var(--surface)', border: '1px solid var(--line)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)',
        }}>
          Ouverture du grimoire…
        </div>
      )}
    </div>
  );
}
