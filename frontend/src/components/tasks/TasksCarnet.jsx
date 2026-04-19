// TasksCarnet.jsx — « Le carnet des promesses ».
// Todo list éditoriale façon journal intime : cases cochables gravées,
// ratures sur les tâches complétées, horodatage mono, urgences soulignées.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Check, Circle, Clock, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────── TOKENS + STYLES ─────────────────── */
const tokenStyle = `
  .tc-root {
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
  .tc-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .tc-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .tc-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .tc-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .tc-italic  { font-style: italic; color: var(--accent); font-weight: 400; }

  /* Case à cocher gravée */
  .tc-check {
    width: 22px; height: 22px; flex-shrink: 0;
    border-radius: 4px; border: 1.5px solid var(--ink-3);
    display: flex; align-items: center; justify-content: center;
    background: var(--surface); cursor: pointer; transition: all .15s;
  }
  .tc-check:hover { border-color: var(--accent); background: var(--accent-soft); }
  .tc-check.done {
    background: var(--ink); border-color: var(--ink); color: var(--bg);
  }

  /* Promesse (task row) */
  .tc-promise {
    display: grid; grid-template-columns: 28px 1fr 140px 110px;
    gap: 16px; align-items: flex-start;
    padding: 18px 22px;
    border-bottom: 1px dashed var(--line);
    transition: background .1s;
  }
  .tc-promise:hover { background: var(--accent-soft); }
  .tc-promise.done .tc-promise-title {
    text-decoration: line-through; text-decoration-color: var(--ink-3);
    color: var(--ink-3);
  }
  .tc-promise-title {
    font-family: 'Fraunces', serif; font-size: 16px; font-weight: 500;
    color: var(--ink); line-height: 1.4;
  }
  .tc-promise-desc {
    font-family: 'Fraunces', serif; font-style: italic; font-size: 13px;
    color: var(--ink-3); margin-top: 4px; line-height: 1.5;
  }

  /* Priority markers (flèches) */
  .tc-priority-hi { color: var(--warm); font-weight: 800; }
  .tc-priority-md { color: var(--gold); font-weight: 600; }
  .tc-priority-lo { color: var(--ink-4); }

  /* Section header - jour */
  .tc-day-section {
    margin-bottom: 32px; position: relative;
  }
  .tc-day-header {
    display: flex; align-items: baseline; gap: 14px;
    padding-bottom: 8px; margin-bottom: 12px;
    border-bottom: 2px solid var(--ink);
  }
  .tc-day-title {
    font-family: 'Fraunces', serif; font-size: 32px; font-weight: 400;
    color: var(--ink); margin: 0; letter-spacing: -0.02em; line-height: 1;
  }
  .tc-day-italic {
    font-family: 'Fraunces', serif; font-style: italic; color: var(--accent);
    font-weight: 400;
  }

  /* Pill toggle */
  .tc-pill {
    display: inline-flex; padding: 3px; background: var(--surface);
    border: 1px solid var(--line); border-radius: 999px;
  }
  .tc-pill button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; border: 0; background: transparent; color: var(--ink-3);
    padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: all .15s;
  }
  .tc-pill button.active { background: var(--ink); color: var(--bg); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .tc-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .tc-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .tc-header-title { font-size: 36px !important; }
    .tc-body { padding: 0 20px 40px !important; }
    .tc-promise { grid-template-columns: 24px 1fr !important; gap: 12px !important; padding: 14px 16px !important; }
    .tc-hide-mobile { display: none !important; }
    .tc-kpis-grid { grid-template-columns: 1fr 1fr !important; }
  }
`;

/* ─────────────── Helpers ─────────────── */
const isSameDay = (a, b) => a.toDateString() === b.toDateString();
const dayBucket = (iso) => {
  if (!iso) return 'sans-date';
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d < yesterday) return 'retard';
  if (isSameDay(d, now)) return 'aujourdhui';
  if (isSameDay(d, tomorrow)) return 'demain';
  return 'cette-semaine';
};
const dayLabel = (key) => ({
  'retard':       { title: 'En', italic: 'retard',       order: 0 },
  'aujourdhui':   { title: "Aujourd'hui", italic: '',    order: 1 },
  'demain':       { title: 'Demain',      italic: '',    order: 2 },
  'cette-semaine':{ title: 'Cette',       italic: 'semaine', order: 3 },
  'sans-date':    { title: 'Sans',        italic: 'date',    order: 4 },
}[key] || { title: 'Autre', italic: '', order: 99 });
const fmtHour = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
  catch { return '—'; }
};
const priorityArrow = (p) => {
  if (p === 'high' || p === 'urgent') return '↑↑';
  if (p === 'medium' || p === 'normal') return '→';
  if (p === 'low') return '↓';
  return '·';
};

export default function TasksCarnet() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('active');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/tasks', { params: { limit: 200 } })
      .then(r => setTasks(r.data?.items || r.data || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleTask = async (t) => {
    if (busyId) return;
    setBusyId(t.task_id);
    const isDone = t.status === 'done' || t.status === 'completed';
    try {
      if (isDone) {
        await api.patch(`/tasks/${t.task_id}`, { status: 'pending' });
      } else {
        await api.patch(`/tasks/${t.task_id}/complete`);
      }
      load();
    } catch (e) {
      alert('Impossible de modifier cette tâche');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    let arr = [...tasks];
    if (view === 'active') arr = arr.filter(t => !['done','completed'].includes(t.status));
    else if (view === 'done') arr = arr.filter(t => ['done','completed'].includes(t.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    return arr;
  }, [tasks, search, view]);

  // Groupage par bucket
  const grouped = useMemo(() => {
    const buckets = {};
    filtered.forEach(t => {
      const key = dayBucket(t.due_date);
      (buckets[key] ||= []).push(t);
    });
    return Object.entries(buckets)
      .map(([key, items]) => ({ key, meta: dayLabel(key), items }))
      .sort((a, b) => a.meta.order - b.meta.order);
  }, [filtered]);

  const stats = useMemo(() => {
    const active = tasks.filter(t => !['done','completed'].includes(t.status)).length;
    const done = tasks.filter(t => ['done','completed'].includes(t.status)).length;
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['done','completed'].includes(t.status)).length;
    const today = tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), new Date()) && !['done','completed'].includes(t.status)).length;
    return { active, done, overdue, today };
  }, [tasks]);

  return (
    <div className="tc-root">
      <style>{tokenStyle}</style>

      {/* HEADER */}
      <div className="tc-header tc-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="tc-label" style={{ marginBottom: 12 }}>Tâches · Carnet</div>
          <h1 className="tc-display tc-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Le carnet des <em className="tc-italic">promesses</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {stats.active} promesse{stats.active > 1 ? 's' : ''} en cours
            {stats.overdue > 0 && ` · ${stats.overdue} en retard`}
            {stats.today > 0 && ` · ${stats.today} pour aujourd'hui`}
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
              placeholder="Chercher une promesse…" className="tc-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
          </div>
          <Link to="/tasks/new" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
          }}>
            <Plus style={{ width: 12, height: 12 }} /> Nouvelle promesse
          </Link>
        </div>
      </div>

      {/* BODY */}
      <div className="tc-body tc-fade" style={{ padding: '0 48px 40px' }}>

        {/* Stats */}
        <div className="tc-kpis-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
          overflow: 'hidden', marginBottom: 28,
        }}>
          {[
            { label: 'Promesses tenues', value: stats.done,    sub: 'Complétées',      tone: 'oklch(0.50 0.15 145)' },
            { label: "Aujourd'hui",       value: stats.today,   sub: 'À honorer',        tone: 'var(--accent)' },
            { label: 'En retard',         value: stats.overdue, sub: 'Dépassées',        tone: 'oklch(0.55 0.18 25)' },
            { label: 'Actives',           value: stats.active,  sub: 'Au total',         tone: 'var(--ink)' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '22px 26px', borderRight: i < 3 ? '1px solid var(--line-2)' : 0 }}>
              <div className="tc-label" style={{ marginBottom: 8 }}>{k.label}</div>
              <div className="tc-display" style={{ fontSize: 36, fontWeight: 400, color: k.tone, lineHeight: 1 }}>
                {k.value}
              </div>
              <div className="tc-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 5, letterSpacing: '0.08em' }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Filtre view */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="tc-label">Vue :</span>
          <div className="tc-pill">
            {[['active','À faire'],['done','Tenues'],['all','Toutes']].map(([k, l]) => (
              <button key={k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Carnet */}
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic' }}>
            Ouverture du carnet…
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div className="tc-display" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 8 }}>
              {view === 'active'
                ? 'Aucune promesse en cours. Belle journée pour en faire naître.'
                : view === 'done'
                ? 'Aucune promesse encore tenue.'
                : 'Carnet vide. Commence par noter une première promesse.'}
            </div>
            <Link to="/tasks/new" className="tc-mono" style={{
              display: 'inline-block', marginTop: 12, padding: '10px 18px', borderRadius: 999,
              background: 'var(--ink)', color: 'var(--bg)', textDecoration: 'none', fontSize: 11,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>+ Nouvelle promesse</Link>
          </div>
        ) : (
          grouped.map(section => (
            <div key={section.key} className="tc-day-section">
              <div className="tc-day-header">
                <h2 className="tc-day-title">
                  {section.meta.title}
                  {section.meta.italic && <> <em className="tc-day-italic">{section.meta.italic}</em></>}
                </h2>
                <span className="tc-label">{section.items.length} promesse{section.items.length > 1 ? 's' : ''}</span>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
                {section.items.map(t => {
                  const isDone = ['done','completed'].includes(t.status);
                  const priority = t.priority || 'medium';
                  return (
                    <div key={t.task_id} className={`tc-promise ${isDone ? 'done' : ''}`}>
                      <div className={`tc-check ${isDone ? 'done' : ''}`}
                           onClick={() => toggleTask(t)} title={isDone ? 'Rouvrir' : 'Marquer tenue'}>
                        {isDone && <Check style={{ width: 14, height: 14, strokeWidth: 3 }} />}
                      </div>

                      <div style={{ minWidth: 0 }}
                           onClick={() => t.lead_id ? navigate(`/leads/${t.lead_id}`) : null}
                           style={{ cursor: t.lead_id ? 'pointer' : 'default', minWidth: 0 }}>
                        <div className="tc-promise-title">
                          {t.title || t.description || 'Promesse sans titre'}
                        </div>
                        {t.description && t.description !== t.title && (
                          <div className="tc-promise-desc">
                            « {t.description.slice(0, 120)}{t.description.length > 120 ? '…' : ''} »
                          </div>
                        )}
                      </div>

                      <div className="tc-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {t.due_date ? (
                          <>
                            <Clock style={{ width: 12, height: 12, color: 'var(--ink-3)' }} />
                            <span className="tc-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                              {fmtDate(t.due_date)}{fmtHour(t.due_date) ? ` · ${fmtHour(t.due_date)}` : ''}
                            </span>
                          </>
                        ) : (
                          <span className="tc-mono" style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                            Sans date
                          </span>
                        )}
                      </div>

                      <div className="tc-hide-mobile" style={{ textAlign: 'right' }}>
                        <span className={`tc-mono tc-priority-${priority === 'high' || priority === 'urgent' ? 'hi' : priority === 'low' ? 'lo' : 'md'}`}
                              style={{ fontSize: 14, letterSpacing: '0.05em' }}>
                          {priorityArrow(priority)}
                        </span>
                        <div className="tc-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', marginTop: 2 }}>
                          {(t.type || 'TÂCHE').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
