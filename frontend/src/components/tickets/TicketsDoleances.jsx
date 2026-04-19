// TicketsDoleances.jsx — « Les doléances ».
// Identité : cahier de réclamations façon registre municipal, entrées
// numérotées avec statut en cachet, sévérité en couleur d'encre.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTicketsList } from '../../hooks/api';
import {
  Search, Plus, AlertTriangle, CheckCircle, Clock, Filter,
  ChevronRight, MessageSquare, Flag,
} from 'lucide-react';

const tokenStyle = `
  .dol-root {
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
    --rouge: oklch(0.48 0.15 25);
    --rouge-soft: oklch(0.94 0.07 25);
    --gold: oklch(0.72 0.13 85);
    --gold-soft: oklch(0.94 0.06 85);
  }
  .dol-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .dol-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .dol-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .dol-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .dol-italic  { font-style: italic; color: var(--rouge); font-weight: 400; }

  /* Cachet officiel */
  .dol-cachet {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 11px; border-radius: 4px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.12em;
    text-transform: uppercase; font-weight: 700;
    border: 1.5px solid; border-style: double;
  }

  /* Entrée doléance */
  .dol-entry {
    display: grid; grid-template-columns: 60px 1fr 140px 120px;
    gap: 16px; align-items: center;
    padding: 18px 22px;
    background: var(--paper);
    border-bottom: 1px solid var(--line-2);
    cursor: pointer; transition: background .15s;
  }
  .dol-entry:last-child { border-bottom: 0; }
  .dol-entry:hover { background: var(--rouge-soft); }

  .dol-num {
    font-family: 'Fraunces', serif; font-size: 26px; font-weight: 400;
    color: var(--ink-3); letter-spacing: -0.02em;
    font-variant-numeric: oldstyle-nums;
  }

  .dol-severity {
    width: 5px; align-self: stretch; border-radius: 3px;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .dol-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .dol-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .dol-header-title { font-size: 36px !important; }
    .dol-body { padding: 0 20px 40px !important; }
    .dol-entry { grid-template-columns: 40px 1fr 100px !important; gap: 10px !important; padding: 14px 16px !important; }
    .dol-hide-mobile { display: none !important; }
  }
`;

const STATUS_META = {
  open:       { label: 'Ouvert',    color: 'var(--rouge)',   bg: 'var(--rouge-soft)' },
  in_progress:{ label: 'En cours',  color: 'var(--gold)',    bg: 'var(--gold-soft)' },
  pending:    { label: 'En attente',color: 'var(--gold)',    bg: 'var(--gold-soft)' },
  resolved:   { label: 'Résolu',    color: 'var(--emerald)', bg: 'var(--emerald-soft)' },
  closed:     { label: 'Clos',      color: 'var(--ink-3)',   bg: 'var(--surface-2)' },
};

const PRIORITY_META = {
  urgent:  { label: 'Urgent', color: 'oklch(0.48 0.18 25)',  icon: '🔴' },
  high:    { label: 'Haute',  color: 'oklch(0.62 0.14 45)',  icon: '🟠' },
  normal:  { label: 'Normale',color: 'oklch(0.60 0.10 220)', icon: '🔵' },
  low:     { label: 'Basse',  color: 'oklch(0.52 0.010 60)', icon: '⚪' },
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return '—'; }
};

export default function TicketsDoleances() {
  const navigate = useNavigate();
  const { data: tickets = [], isLoading } = useTicketsList('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let arr = Array.isArray(tickets) ? [...tickets] : [];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(t =>
        (t.title || t.subject || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.lead_name || t.client_name || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') arr = arr.filter(t => t.status === statusFilter);
    arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return arr;
  }, [tickets, search, statusFilter]);

  const stats = useMemo(() => {
    const arr = Array.isArray(tickets) ? tickets : [];
    return {
      total: arr.length,
      open: arr.filter(t => t.status === 'open').length,
      in_progress: arr.filter(t => ['in_progress', 'pending'].includes(t.status)).length,
      resolved: arr.filter(t => ['resolved', 'closed'].includes(t.status)).length,
    };
  }, [tickets]);

  return (
    <div className="dol-root">
      <style>{tokenStyle}</style>

      <div className="dol-header dol-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="dol-label" style={{ marginBottom: 12 }}>SAV · Réclamations</div>
          <h1 className="dol-display dol-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Les <em className="dol-italic">doléances</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {stats.total} requête{stats.total > 1 ? 's' : ''} consignée{stats.total > 1 ? 's' : ''} · {stats.open} en instance · {stats.resolved} résolue{stats.resolved > 1 ? 's' : ''}
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
              placeholder="Objet, client…" className="dol-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="dol-body dol-fade" style={{ padding: '0 48px 24px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden',
        }}>
          {[
            { label: 'Total',      value: stats.total,       sub: 'Toutes doléances', tone: 'var(--ink)' },
            { label: 'Ouvertes',   value: stats.open,        sub: 'À prendre en charge', tone: 'var(--rouge)' },
            { label: 'En cours',   value: stats.in_progress, sub: 'En traitement', tone: 'var(--gold)' },
            { label: 'Résolues',   value: stats.resolved,    sub: 'Clôturées', tone: 'var(--emerald)' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '22px 26px', borderRight: i < 3 ? '1px solid var(--line-2)' : 0 }}>
              <div className="dol-label" style={{ marginBottom: 8 }}>{k.label}</div>
              <div className="dol-display" style={{ fontSize: 32, fontWeight: 500, color: k.tone, lineHeight: 1 }}>
                {k.value}
              </div>
              <div className="dol-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, letterSpacing: '0.06em' }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtre */}
      <div className="dol-body dol-fade" style={{ padding: '0 48px 20px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="dol-label"><Filter style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> Statut :</span>
          {[['all','Toutes']].concat(Object.entries(STATUS_META).map(([k, m]) => [k, m.label])).map(([k, l]) => (
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

      {/* Registre */}
      <div className="dol-body dol-fade" style={{ padding: '0 48px 40px' }}>
        {isLoading ? (
          <div style={{ padding: 80, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Ouverture du registre des doléances…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center',
            background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14,
            fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)',
          }}>
            Aucune doléance enregistrée. Que le registre reste silencieux.
          </div>
        ) : (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {filtered.map((t, i) => {
              const status = STATUS_META[t.status] || STATUS_META.open;
              const prio = PRIORITY_META[t.priority] || PRIORITY_META.normal;
              return (
                <div key={t.ticket_id || t.id || i} className="dol-entry" onClick={() => navigate(`/tickets?id=${t.ticket_id || t.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="dol-severity" style={{ background: prio.color }} />
                    <span className="dol-num">№ {filtered.length - i}</span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div className="dol-display" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>
                      {t.title || t.subject || 'Sans objet'}
                    </div>
                    {t.description && (
                      <div style={{
                        fontFamily: 'Fraunces, serif', fontStyle: 'italic',
                        fontSize: 12, color: 'var(--ink-3)',
                        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        « {t.description.slice(0, 140)}{t.description.length > 140 ? '…' : ''} »
                      </div>
                    )}
                    <div className="dol-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.06em', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span>{t.lead_name || t.client_name || 'Anonyme'}</span>
                      <span>·</span>
                      <span>{fmtDate(t.created_at)}</span>
                      <span>·</span>
                      <span style={{ color: prio.color, fontWeight: 600 }}><Flag style={{ width: 9, height: 9, display: 'inline-block' }} /> {prio.label}</span>
                    </div>
                  </div>

                  <div className="dol-hide-mobile">
                    <span className="dol-cachet" style={{ background: status.bg, color: status.color, borderColor: status.color }}>
                      {status.label}
                    </span>
                  </div>

                  <div className="dol-hide-mobile" style={{ textAlign: 'right' }}>
                    <ChevronRight style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
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
