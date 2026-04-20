// SearchPage.jsx — Recherche globale dans tout le CRM.
// Route : /search?q=...
// Cherche : leads, devis, factures, contrats, interventions, tâches.
// Trouve AUSSI les documents liés à un lead matchant (via lead_id).

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Search, Users, FileText, Receipt, FileSignature, Calendar, CheckCircle,
  ArrowRight, User, Mail, Phone, MapPin, Folder,
} from 'lucide-react';
import api from '../../lib/api';

const tokenStyle = `
  .sr-root {
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
    --sepia-soft: oklch(0.92 0.04 65);
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --cool: oklch(0.55 0.08 220);
    --cool-soft: oklch(0.93 0.03 220);
  }
  .sr-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .sr-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .sr-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .sr-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .sr-italic  { font-style: italic; color: var(--sepia); font-weight: 400; }

  .sr-section {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; overflow: hidden;
    margin-bottom: 18px;
  }
  .sr-section-head {
    display: flex; align-items: baseline; gap: 12px;
    padding: 16px 22px; border-bottom: 1px solid var(--line-2);
    background: var(--surface-2);
  }
  .sr-item {
    display: grid; grid-template-columns: 36px 1fr auto;
    gap: 14px; align-items: center;
    padding: 14px 22px;
    cursor: pointer; transition: background .15s;
    border-bottom: 1px solid var(--line-2);
    text-decoration: none; color: inherit;
  }
  .sr-item:last-child { border-bottom: 0; }
  .sr-item:hover { background: var(--emerald-soft); }

  .sr-icon {
    width: 34px; height: 34px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .sr-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .sr-fade { animation: fadeIn .3s ease; }

  @media (max-width: 760px) {
    .sr-header { padding: 22px 18px !important; }
    .sr-header-title { font-size: 32px !important; }
    .sr-body { padding: 0 18px 30px !important; }
    .sr-item { grid-template-columns: 32px 1fr !important; padding: 12px 16px !important; }
    .sr-hide-mobile { display: none !important; }
  }
`;

const TYPE_META = {
  leads:         { label: 'Clients & prospects', icon: Users,         tone: 'var(--emerald)', path: (r) => `/leads/${r.id}` },
  quotes:        { label: 'Devis',               icon: FileText,      tone: 'var(--sepia)',   path: (r) => `/quotes/${r.id}` },
  invoices:      { label: 'Factures',            icon: Receipt,       tone: 'var(--gold)',    path: (r) => `/invoices/${r.id}` },
  contracts:     { label: 'Contrats',            icon: FileSignature, tone: 'var(--rouge)',   path: (r) => `/contracts` },
  interventions: { label: 'Interventions',       icon: Calendar,      tone: 'var(--warm)',    path: (r) => `/planning` },
  tasks:         { label: 'Tâches',              icon: CheckCircle,   tone: 'var(--cool)',    path: (r) => `/tasks` },
};

const STATUS_COLORS = {
  // Leads
  nouveau: 'var(--emerald)', contacté: 'var(--warm)', qualifié: 'var(--gold)', devis_envoyé: 'var(--cool)', gagné: 'var(--emerald)', perdu: 'var(--ink-3)',
  // Quotes
  brouillon: 'var(--ink-3)', envoyé: 'var(--sepia)', accepté: 'var(--emerald)', refusé: 'var(--rouge)', expiré: 'var(--ink-3)',
  // Invoices
  en_attente: 'var(--gold)', payée: 'var(--emerald)', payee: 'var(--emerald)', en_retard: 'var(--rouge)', annulée: 'var(--ink-3)',
  // Generic
  active: 'var(--emerald)', pending: 'var(--gold)', cancelled: 'var(--rouge)', completed: 'var(--ink-3)',
  open: 'var(--rouge)', in_progress: 'var(--gold)', resolved: 'var(--emerald)', closed: 'var(--ink-3)',
};

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [data, setData] = useState({ results: {}, total: 0, matched_lead_ids: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const runSearch = useCallback((q) => {
    if (!q || q.trim().length < 2) {
      setData({ results: {}, total: 0, matched_lead_ids: [] });
      return;
    }
    setLoading(true);
    setErr(null);
    api.get('/search', { params: { q: q.trim(), limit: 30 } })
      .then(r => setData(r.data || { results: {}, total: 0 }))
      .catch(e => setErr(e?.response?.data?.detail || 'Recherche impossible'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    runSearch(q);
  }, [searchParams, runSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
  };

  const groups = useMemo(() => {
    const r = data.results || {};
    return [
      { key: 'leads',         items: r.leads || [] },
      { key: 'quotes',        items: r.quotes || [] },
      { key: 'invoices',      items: r.invoices || [] },
      { key: 'contracts',     items: r.contracts || [] },
      { key: 'interventions', items: r.interventions || [] },
      { key: 'tasks',         items: r.tasks || [] },
    ].filter(g => g.items.length > 0);
  }, [data.results]);

  const hasQuery = query && query.trim().length >= 2;
  const currentQuery = searchParams.get('q') || '';

  return (
    <div className="sr-root">
      <style>{tokenStyle}</style>

      {/* HEADER */}
      <div className="sr-header sr-fade" style={{
        padding: '40px 48px 24px',
      }}>
        <div className="sr-label" style={{ marginBottom: 12 }}>Recherche globale</div>
        <h1 className="sr-display sr-header-title" style={{
          fontSize: 48, fontWeight: 300, lineHeight: 0.95, margin: '0 0 20px', color: 'var(--ink)',
        }}>
          Chercher dans tout le <em className="sr-italic">crm</em>
        </h1>

        {/* Barre de recherche XXL */}
        <form onSubmit={handleSubmit} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--paper)', border: '2px solid var(--line)', borderRadius: 14,
          padding: '14px 20px', maxWidth: 720,
          transition: 'border-color .15s',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ink)'}
        >
          <Search style={{ width: 18, height: 18, color: 'var(--ink-3)', flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nom, prénom, email, téléphone, n° de devis/facture…"
            className="sr-mono"
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontSize: 15, color: 'var(--ink)',
            }}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setSearchParams({}); }}
              className="sr-mono" style={{
                background: 'transparent', border: 0, cursor: 'pointer',
                color: 'var(--ink-3)', fontSize: 12, letterSpacing: '0.08em',
              }}
            >×</button>
          )}
          <button type="submit" style={{
            background: 'var(--ink)', color: 'var(--bg)', border: 'none',
            borderRadius: 999, padding: '8px 18px', cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500,
          }}>
            Rechercher
          </button>
        </form>

        {/* Meta */}
        <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="sr-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
            {loading ? 'Recherche en cours…' :
              !hasQuery ? 'Tape au moins 2 caractères pour lancer la recherche' :
              `${data.total || 0} résultat${(data.total || 0) > 1 ? 's' : ''} pour « ${currentQuery} »`}
          </span>
        </div>
      </div>

      {/* RÉSULTATS */}
      <div className="sr-body sr-fade" style={{ padding: '0 48px 40px' }}>
        {err && (
          <div style={{
            padding: 22, borderRadius: 12, background: 'var(--rouge-soft)',
            border: '1px solid var(--rouge)', color: 'var(--rouge)',
            fontFamily: 'Fraunces, serif', fontStyle: 'italic',
          }}>
            {err}
          </div>
        )}

        {!loading && hasQuery && groups.length === 0 && !err && (
          <div style={{
            padding: 60, textAlign: 'center',
            background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14,
          }}>
            <div className="sr-display" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 6 }}>
              Aucun résultat pour « {currentQuery} »
            </div>
            <div className="sr-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 10 }}>
              Essaye avec moins de mots, ou vérifie l'orthographe.
            </div>
          </div>
        )}

        {!hasQuery && (
          <div style={{
            padding: 60, textAlign: 'center',
            background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14,
          }}>
            <Folder style={{ width: 40, height: 40, color: 'var(--ink-4)', marginBottom: 14 }} />
            <div className="sr-display" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 10 }}>
              Cherche n'importe qui, n'importe quoi
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink-3)', maxWidth: 440, margin: '0 auto', lineHeight: 1.5 }}>
              Nom, prénom, email, téléphone, adresse, numéro de devis, numéro de facture… La recherche trouve le prospect ET tous les documents qui lui sont liés (devis, factures, contrats, interventions, tâches).
            </div>
          </div>
        )}

        {groups.map(g => {
          const meta = TYPE_META[g.key];
          return (
            <div key={g.key} className="sr-section">
              <div className="sr-section-head">
                <meta.icon style={{ width: 16, height: 16, color: meta.tone }} />
                <div style={{ flex: 1 }}>
                  <div className="sr-label" style={{ margin: 0 }}>{meta.label}</div>
                </div>
                <span className="sr-pill" style={{ color: meta.tone, background: `color-mix(in oklch, ${meta.tone} 12%, transparent)`, borderColor: meta.tone }}>
                  {g.items.length}
                </span>
              </div>

              {g.items.map((item, i) => {
                const statusColor = STATUS_COLORS[item.meta?.status] || 'var(--ink-3)';
                const ItemWrapper = g.key === 'leads' || g.key === 'quotes' || g.key === 'invoices' ? Link : 'div';
                const itemProps = (g.key === 'leads' || g.key === 'quotes' || g.key === 'invoices')
                  ? { to: meta.path(item) }
                  : { onClick: () => navigate(meta.path(item)), style: { cursor: 'pointer' } };

                return (
                  <ItemWrapper key={i} className="sr-item" {...itemProps}>
                    <div className="sr-icon" style={{
                      background: `color-mix(in oklch, ${meta.tone} 12%, transparent)`,
                      color: meta.tone,
                    }}>
                      <meta.icon style={{ width: 15, height: 15 }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 3, flexWrap: 'wrap' }}>
                        <span className="sr-display" style={{
                          fontSize: 15, fontWeight: 500, color: 'var(--ink)',
                        }}>
                          {item.title || '—'}
                        </span>
                        {item.meta?.status && (
                          <span className="sr-pill" style={{
                            color: statusColor, background: `color-mix(in oklch, ${statusColor} 12%, transparent)`, borderColor: statusColor,
                          }}>
                            {item.meta.status}
                          </span>
                        )}
                      </div>
                      <div className="sr-mono" style={{
                        fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.snippet || '—'}
                      </div>
                    </div>
                    <div className="sr-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.meta?.amount != null && (
                        <span className="sr-display" style={{
                          fontSize: 15, fontWeight: 500, color: 'var(--ink)',
                        }}>
                          {new Intl.NumberFormat('fr-FR').format(Math.round(item.meta.amount))} €
                        </span>
                      )}
                      <ArrowRight style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
                    </div>
                  </ItemWrapper>
                );
              })}
            </div>
          );
        })}

        {/* Astuce : clic sur un client pour voir son dossier complet */}
        {hasQuery && (data.matched_lead_ids || []).length > 0 && (
          <div style={{
            marginTop: 20, padding: '18px 22px',
            background: 'var(--emerald-soft)', border: '1px solid var(--emerald)',
            borderRadius: 12, fontFamily: 'Fraunces, serif', fontStyle: 'italic',
            fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5,
          }}>
            💡 Clique sur un <strong style={{ color: 'var(--emerald)', fontStyle: 'normal' }}>client</strong> pour ouvrir son dossier complet : brief, interactions, devis, factures, distance, engagement.
          </div>
        )}
      </div>
    </div>
  );
}
