// ActivityChronique.jsx — « La chronique ».
// Identité : timeline verticale style journal manuscrit. Dates en marge
// à gauche (comme un carnet de bord), entrées groupées par jour avec
// trait vertical continu. Palette encre + sépia chaud.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity as ActivityIcon, RefreshCw, User, FileText, Mail, CheckCircle,
  DollarSign, Phone, MessageCircle, Filter, Clock, Star,
} from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────── TOKENS ─────────────────── */
const tokenStyle = `
  .chr-root {
    --bg: oklch(0.965 0.012 80);
    --paper: oklch(0.985 0.012 82);
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
    --warm: oklch(0.62 0.14 45);
    --sepia: oklch(0.55 0.08 65);
    --sepia-soft: oklch(0.92 0.04 65);
    --gold: oklch(0.72 0.13 85);
    --danger: oklch(0.55 0.18 25);
  }
  .chr-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .chr-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .chr-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .chr-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .chr-italic  { font-style: italic; color: var(--sepia); font-weight: 400; }

  /* Chronique layout */
  .chr-timeline {
    display: grid; grid-template-columns: 180px 1fr; gap: 0;
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; overflow: hidden;
  }
  .chr-day {
    display: contents;
  }
  .chr-day-label {
    grid-column: 1; padding: 24px 22px 18px 28px;
    border-right: 1px solid var(--line-2);
    background: var(--surface-2);
    display: flex; flex-direction: column;
    align-items: flex-end; position: sticky; top: 0;
    border-bottom: 1px solid var(--line-2);
  }
  .chr-day-entries {
    grid-column: 2; padding: 18px 28px 24px;
    border-bottom: 1px solid var(--line-2);
    position: relative;
  }
  /* trait vertical continu */
  .chr-day-entries::before {
    content: ''; position: absolute;
    left: 15px; top: 0; bottom: 0;
    width: 1px; background: var(--line);
  }

  .chr-entry {
    display: grid; grid-template-columns: 28px 1fr 100px;
    gap: 14px; align-items: flex-start;
    padding: 12px 0;
    position: relative;
  }
  .chr-entry + .chr-entry { border-top: 1px dashed var(--line-2); }

  .chr-bullet {
    width: 28px; height: 28px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface); border: 1.5px solid var(--line);
    position: relative; z-index: 1; flex-shrink: 0;
    transition: transform .15s, border-color .15s;
  }
  .chr-entry:hover .chr-bullet { transform: scale(1.1); border-color: var(--emerald); }

  /* Filtre pills */
  .chr-filter {
    display: inline-flex; flex-wrap: wrap; gap: 6px;
  }
  .chr-filter button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em;
    text-transform: uppercase; border: 1px solid var(--line);
    background: var(--surface); color: var(--ink-3);
    padding: 6px 12px; border-radius: 999px; cursor: pointer; transition: all .15s;
    display: inline-flex; align-items: center; gap: 5px;
  }
  .chr-filter button.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .chr-filter button:hover:not(.active) { border-color: var(--ink-3); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .chr-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .chr-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .chr-header-title { font-size: 36px !important; }
    .chr-body { padding: 0 20px 40px !important; }
    .chr-timeline { grid-template-columns: 1fr !important; }
    .chr-day-label { padding: 14px 20px !important; border-right: 0 !important; flex-direction: row !important; justify-content: space-between !important; align-items: center !important; border-bottom: 1px solid var(--line) !important; }
    .chr-day-entries { grid-column: 1 !important; padding: 14px 20px !important; }
    .chr-day-entries::before { left: 35px !important; }
    .chr-entry { grid-template-columns: 28px 1fr !important; }
    .chr-entry-meta { grid-column: 2 !important; padding-top: 4px !important; }
  }
`;

const ACTION_META = {
  create_lead:         { icon: User,         tone: 'var(--emerald)', label: 'Lead créé' },
  update_lead:         { icon: User,         tone: 'var(--gold)',    label: 'Lead modifié' },
  create_quote:        { icon: FileText,     tone: 'var(--warm)',    label: 'Devis créé' },
  send_quote:          { icon: Mail,         tone: 'var(--sepia)',   label: 'Devis envoyé' },
  update_quote:        { icon: FileText,     tone: 'var(--gold)',    label: 'Devis modifié' },
  accept_quote:        { icon: CheckCircle,  tone: 'var(--emerald)', label: 'Devis accepté' },
  create_interaction:  { icon: MessageCircle,tone: 'var(--sepia)',   label: 'Interaction' },
  create_task:         { icon: CheckCircle,  tone: 'var(--emerald)', label: 'Tâche créée' },
  complete_task:       { icon: CheckCircle,  tone: 'var(--emerald)', label: 'Tâche faite' },
  create_invoice:      { icon: FileText,     tone: 'var(--gold)',    label: 'Facture créée' },
  payment_received:    { icon: DollarSign,   tone: 'var(--emerald)', label: 'Paiement reçu' },
  call:                { icon: Phone,        tone: 'var(--sepia)',   label: 'Appel' },
  review:              { icon: Star,         tone: 'var(--gold)',    label: 'Avis client' },
};
const getMeta = (a) => ACTION_META[a] || { icon: ActivityIcon, tone: 'var(--ink-3)', label: (a || 'Action').replace(/_/g, ' ') };

/* Regrouper par jour */
function groupByDay(logs) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const byDay = new Map();
  for (const log of logs) {
    const d = new Date(log.created_at || log.timestamp || Date.now());
    const key = d.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, { date: d, logs: [] });
    byDay.get(key).logs.push(log);
  }

  const days = [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, { date, logs }]) => {
      const d0 = new Date(date); d0.setHours(0, 0, 0, 0);
      let bucket;
      if (d0.getTime() === today.getTime()) bucket = "Aujourd'hui";
      else if (d0.getTime() === yesterday.getTime()) bucket = 'Hier';
      else if (d0 > weekAgo) bucket = 'Cette semaine';
      else bucket = null;
      return {
        key, date,
        bucket,
        label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }),
        weekday: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
        logs,
      };
    });
  return days;
}

/* ═════════════════════ MAIN ═════════════════════ */
export default function ActivityChronique() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    api.get('/activity', { params: { limit: 200 } })
      .then(r => setLogs(Array.isArray(r.data) ? r.data : r.data?.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter(l => (l.action || '').includes(filter));
  }, [logs, filter]);

  const days = useMemo(() => groupByDay(filtered), [filtered]);

  const actionTypes = useMemo(() => {
    const set = new Set(logs.map(l => l.action).filter(Boolean));
    return [...set].slice(0, 8);
  }, [logs]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
    const todayCount = logs.filter(l => new Date(l.created_at || 0) >= today).length;
    const weekCount = logs.filter(l => new Date(l.created_at || 0) >= weekAgo).length;
    return { total: logs.length, today: todayCount, week: weekCount };
  }, [logs]);

  return (
    <div className="chr-root">
      <style>{tokenStyle}</style>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="chr-header chr-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="chr-label" style={{ marginBottom: 12 }}>Activité · Journal de bord</div>
          <h1 className="chr-display chr-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            La <em className="chr-italic">chronique</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {stats.total} événement{stats.total > 1 ? 's' : ''} consignés · {stats.today} aujourd'hui · {stats.week} sur la semaine
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)', cursor: 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
          <RefreshCw style={{ width: 12, height: 12, animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Rafraîchir
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </button>
      </div>

      {/* ═══════════ FILTRES ═══════════ */}
      <div className="chr-body chr-fade" style={{ padding: '0 48px 20px' }}>
        <div className="chr-filter">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            <Filter style={{ width: 11, height: 11 }} /> Tout
          </button>
          {actionTypes.map(a => {
            const meta = getMeta(a);
            return (
              <button key={a} className={filter === a ? 'active' : ''} onClick={() => setFilter(a)}>
                <meta.icon style={{ width: 11, height: 11, color: filter === a ? 'var(--bg)' : meta.tone }} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════ CHRONIQUE ═══════════ */}
      <div className="chr-body chr-fade" style={{ padding: '0 48px 40px' }}>
        {loading ? (
          <div style={{
            padding: 80, textAlign: 'center', fontFamily: 'Fraunces, serif',
            fontStyle: 'italic', color: 'var(--ink-3)',
          }}>
            Ouverture du journal…
          </div>
        ) : days.length === 0 ? (
          <div style={{
            padding: 80, textAlign: 'center',
            background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14,
          }}>
            <div className="chr-display" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 4 }}>
              Aucun événement consigné pour ce filtre.
            </div>
            <div className="chr-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 8 }}>
              La chronique est en attente d'une plume.
            </div>
          </div>
        ) : (
          <div className="chr-timeline">
            {days.map(day => (
              <div key={day.key} className="chr-day">
                <div className="chr-day-label">
                  <div className="chr-display" style={{ fontSize: 28, fontWeight: 400, lineHeight: 1, color: 'var(--ink)' }}>
                    {day.label}
                  </div>
                  <div className="chr-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>
                    {day.weekday}
                  </div>
                  {day.bucket && (
                    <div style={{
                      marginTop: 10, fontFamily: 'Fraunces, serif', fontStyle: 'italic',
                      fontSize: 13, color: 'var(--sepia)',
                    }}>
                      {day.bucket}
                    </div>
                  )}
                  <div className="chr-mono" style={{ fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em', marginTop: 8 }}>
                    {day.logs.length} entrée{day.logs.length > 1 ? 's' : ''}
                  </div>
                </div>

                <div className="chr-day-entries">
                  {day.logs.map((log, i) => {
                    const meta = getMeta(log.action);
                    const time = new Date(log.created_at || 0).toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit',
                    });
                    return (
                      <div key={log.id || i} className="chr-entry">
                        <div
                          className="chr-bullet"
                          style={{ color: meta.tone, borderColor: meta.tone, background: `color-mix(in oklch, ${meta.tone} 8%, var(--surface))` }}
                        >
                          <meta.icon style={{ width: 13, height: 13 }} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                              {meta.label}
                            </span>
                            {log.entity_type && (
                              <span className="chr-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                · {log.entity_type}
                              </span>
                            )}
                          </div>
                          {(log.description || log.details) && (
                            <div style={{
                              fontFamily: 'Fraunces, serif', fontStyle: 'italic',
                              fontSize: 13, color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.5,
                            }}>
                              {(() => {
                                const raw = log.description || log.details;
                                const txt = typeof raw === 'string' ? raw :
                                  raw == null ? '' :
                                  (() => { try { return JSON.stringify(raw); } catch { return String(raw); } })();
                                return txt.slice(0, 220);
                              })()}
                            </div>
                          )}
                          {log.user_email && (
                            <div className="chr-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.04em' }}>
                              par {log.user_email}
                            </div>
                          )}
                        </div>

                        <div className="chr-entry-meta chr-mono" style={{
                          fontSize: 11, color: 'var(--ink-3)', textAlign: 'right',
                          letterSpacing: '0.04em', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end',
                        }}>
                          <Clock style={{ width: 10, height: 10 }} /> {time}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
