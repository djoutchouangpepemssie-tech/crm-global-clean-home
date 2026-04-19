// ContractsActes.jsx — « Les actes ».
// Identité : documents officiels avec cachet de signature, mention latine en
// exergue, disposition parchemin. Chaque contrat = un acte authentifié.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContractsList } from '../../hooks/api';
import {
  Search, Plus, FileSignature, Calendar, User, Euro,
  Filter, CheckCircle, Clock, AlertTriangle, Edit3,
} from 'lucide-react';

const tokenStyle = `
  .act-root {
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
    --gold: oklch(0.72 0.13 85);
    --gold-soft: oklch(0.94 0.06 85);
    --rouge: oklch(0.48 0.15 25);
    --rouge-soft: oklch(0.94 0.07 25);
    --sepia: oklch(0.55 0.08 65);
  }
  .act-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .act-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .act-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .act-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .act-italic  { font-style: italic; color: var(--sepia); font-weight: 400; }

  /* Carte acte */
  .act-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 10px; padding: 24px 26px;
    transition: transform .15s, box-shadow .15s, border-color .15s;
    cursor: pointer; position: relative;
  }
  .act-card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,0,0,0.06); border-color: var(--sepia); }
  .act-card::before {
    content: ''; position: absolute; top: 0; bottom: 0; left: 0;
    width: 3px; background: var(--gold);
    border-radius: 10px 0 0 10px;
  }

  /* Cachet (sceau officiel) */
  .act-seal {
    width: 58px; height: 58px; border-radius: 999px;
    background: radial-gradient(circle at 35% 35%, var(--rouge) 0%, oklch(0.38 0.15 25) 70%);
    border: 3px solid var(--rouge-soft);
    box-shadow: inset 0 -2px 5px rgba(0,0,0,0.15), 0 3px 8px oklch(0.48 0.15 25 / 0.3);
    display: flex; align-items: center; justify-content: center;
    color: oklch(0.94 0.04 25); flex-shrink: 0;
    font-family: 'Fraunces', serif; font-size: 16px; font-weight: 500;
    transform: rotate(-4deg);
  }
  .act-seal.pending { background: radial-gradient(circle at 35% 35%, var(--gold) 0%, oklch(0.55 0.13 78) 70%); box-shadow: inset 0 -2px 5px rgba(0,0,0,0.15), 0 3px 8px oklch(0.72 0.13 85 / 0.4); }

  .act-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.1em;
    text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .act-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .act-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .act-header-title { font-size: 36px !important; }
    .act-body { padding: 0 20px 40px !important; }
    .act-grid { grid-template-columns: 1fr !important; }
  }
`;

const STATUS_META = {
  active:    { label: 'Actif',     color: 'var(--emerald)', bg: 'var(--emerald-soft)' },
  pending:   { label: 'À signer',  color: 'var(--gold)',    bg: 'var(--gold-soft)' },
  draft:     { label: 'Brouillon', color: 'var(--ink-3)',   bg: 'var(--surface-2)' },
  expired:   { label: 'Expiré',    color: 'var(--rouge)',   bg: 'var(--rouge-soft)' },
  terminated:{ label: 'Résilié',   color: 'var(--ink-3)',   bg: 'var(--surface-2)' },
};

const fmtEur = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

export default function ContractsActes() {
  const navigate = useNavigate();
  const { data: contracts = [], isLoading } = useContractsList({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let arr = Array.isArray(contracts) ? [...contracts] : [];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.client_name || c.lead_name || '').toLowerCase().includes(q) ||
        (c.contract_number || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') arr = arr.filter(c => c.status === statusFilter);
    arr.sort((a, b) => new Date(b.signed_at || b.created_at || 0) - new Date(a.signed_at || a.created_at || 0));
    return arr;
  }, [contracts, search, statusFilter]);

  const stats = useMemo(() => {
    const arr = Array.isArray(contracts) ? contracts : [];
    const active = arr.filter(c => c.status === 'active').length;
    const pending = arr.filter(c => c.status === 'pending' || c.status === 'draft').length;
    const totalValue = arr.filter(c => c.status === 'active').reduce((s, c) => s + (c.amount || c.value || 0), 0);
    return { total: arr.length, active, pending, totalValue };
  }, [contracts]);

  return (
    <div className="act-root">
      <style>{tokenStyle}</style>

      <div className="act-header act-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="act-label" style={{ marginBottom: 12 }}>Contrats · Archives légales</div>
          <h1 className="act-display act-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Les <em className="act-italic">actes</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {stats.total} acte{stats.total > 1 ? 's' : ''} répertorié{stats.total > 1 ? 's' : ''} · {stats.active} en vigueur · {fmtEur(stats.totalValue)} € en cours
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
              placeholder="Client, n° d'acte…" className="act-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
          </div>
        </div>
      </div>

      {/* Filtre */}
      <div className="act-body act-fade" style={{ padding: '0 48px 20px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="act-label"><Filter style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> Statut :</span>
          {[['all','Tous']].concat(Object.entries(STATUS_META).map(([k, m]) => [k, m.label])).map(([k, l]) => (
            <button key={k}
              onClick={() => setStatusFilter(k)}
              style={{
                padding: '6px 14px', borderRadius: 999,
                border: `1px solid ${statusFilter === k ? 'var(--ink)' : 'var(--line)'}`,
                background: statusFilter === k ? 'var(--ink)' : 'var(--surface)',
                color: statusFilter === k ? 'var(--bg)' : 'var(--ink-3)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
              }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Actes */}
      <div className="act-body act-fade" style={{ padding: '0 48px 40px' }}>
        {isLoading ? (
          <div style={{ padding: 80, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Consultation des archives…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center',
            background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14,
            fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)',
          }}>
            Aucun acte dans les archives.
          </div>
        ) : (
          <div className="act-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {filtered.map((c, i) => {
              const status = STATUS_META[c.status] || STATUS_META.draft;
              const number = c.contract_number || c.number || `№ ${String(i + 1).padStart(4, '0')}`;
              const isSigned = c.status === 'active';
              return (
                <div key={c.id || c._id || i} className="act-card" onClick={() => navigate(`/contracts?id=${c.id || c._id}`)}>
                  <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 14 }}>
                    <div className={`act-seal ${!isSigned ? 'pending' : ''}`}>
                      <FileSignature style={{ width: 22, height: 22 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="act-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                        {number}
                      </div>
                      <div className="act-display" style={{ fontSize: 19, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.25, marginBottom: 6 }}>
                        {c.title || 'Contrat sans titre'}
                      </div>
                      <span className="act-pill" style={{ color: status.color, background: status.bg, borderColor: status.color }}>
                        {isSigned ? <CheckCircle style={{ width: 9, height: 9 }} /> : <Clock style={{ width: 9, height: 9 }} />}
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    fontFamily: 'Fraunces, serif', fontStyle: 'italic',
                    fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5,
                    paddingBottom: 14, borderBottom: '1px solid var(--line-2)',
                  }}>
                    {c.description
                      ? `« ${c.description.slice(0, 160)}${c.description.length > 160 ? '…' : ''} »`
                      : 'Acte entre les parties, selon les conditions convenues.'}
                  </div>

                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                    marginTop: 14,
                  }}>
                    <div>
                      <div className="act-label" style={{ marginBottom: 4 }}>Partie cocontractante</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User style={{ width: 11, height: 11, color: 'var(--ink-3)' }} />
                        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                          {c.client_name || c.lead_name || 'Inconnu'}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="act-label" style={{ marginBottom: 4 }}>Montant</div>
                      <div className="act-display" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>
                        {fmtEur(c.amount || c.value || 0)}
                        <span style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}> €</span>
                      </div>
                    </div>
                    <div>
                      <div className="act-label" style={{ marginBottom: 4 }}>Signé le</div>
                      <div className="act-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                        {fmtDate(c.signed_at || c.created_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="act-label" style={{ marginBottom: 4 }}>Échéance</div>
                      <div className="act-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                        {fmtDate(c.end_date || c.expiry_date)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
