// BookingRegistre.jsx — « Le registre des rendez-vous ».
// Identité : cahier de rendez-vous à ligne horizontale, chaque entrée =
// un créneau avec heure en gras à gauche, client au centre, statut à droite.
// Palette émeraude + crème pour la tenue.

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Clock, User, CheckCircle, XCircle, MapPin, Search,
  Filter, RefreshCw, Plus,
} from 'lucide-react';
import api from '../../lib/api';

const tokenStyle = `
  .reg-root {
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
  }
  .reg-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .reg-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .reg-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .reg-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .reg-italic  { font-style: italic; color: var(--emerald); font-weight: 400; }

  /* Ligne de rendez-vous */
  .reg-line {
    display: grid; grid-template-columns: 110px 1fr 180px 120px;
    gap: 18px; align-items: center;
    padding: 18px 22px;
    background: var(--paper);
    border-bottom: 1px solid var(--line-2);
    transition: background .15s;
  }
  .reg-line:last-child { border-bottom: 0; }
  .reg-line:hover { background: var(--emerald-soft); }

  .reg-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.1em;
    text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }

  /* Marqueur jour (carnet) */
  .reg-day-marker {
    display: flex; align-items: baseline; gap: 14px;
    padding: 22px 22px 10px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--line-2);
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .reg-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .reg-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .reg-header-title { font-size: 36px !important; }
    .reg-body { padding: 0 20px 40px !important; }
    .reg-line { grid-template-columns: 90px 1fr 90px !important; gap: 10px !important; padding: 14px 16px !important; }
    .reg-hide-mobile { display: none !important; }
  }
`;

const STATUS_META = {
  confirmed:  { label: 'Confirmé',   color: 'var(--emerald)', bg: 'var(--emerald-soft)' },
  pending:    { label: 'En attente', color: 'var(--gold)',    bg: 'var(--gold-soft)' },
  cancelled:  { label: 'Annulé',     color: 'var(--rouge)',   bg: 'var(--rouge-soft)' },
  completed:  { label: 'Terminé',    color: 'var(--ink-3)',   bg: 'var(--surface-2)' },
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
};

const dayKey = (iso) => {
  if (!iso) return 'sans-date';
  try { return new Date(iso).toISOString().slice(0, 10); }
  catch { return 'sans-date'; }
};

const fmtDayLabel = (iso) => {
  if (!iso) return 'Sans date';
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const d0 = new Date(d); d0.setHours(0, 0, 0, 0);
  if (d0.getTime() === today.getTime()) return "Aujourd'hui";
  if (d0.getTime() === yesterday.getTime()) return 'Hier';
  if (d0.getTime() === tomorrow.getTime()) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
};

export default function BookingRegistre() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'registre'],
    queryFn: async () => {
      try {
        const r = await api.get('/bookings');
        const raw = r.data;
        return Array.isArray(raw) ? raw : (raw?.items || raw?.bookings || []);
      } catch {
        try {
          const r = await api.get('/planning/bookings');
          const raw = r.data;
          return Array.isArray(raw) ? raw : (raw?.items || raw?.bookings || []);
        } catch { return []; }
      }
    },
  });

  const filtered = useMemo(() => {
    let arr = Array.isArray(bookings) ? [...bookings] : [];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(b =>
        (b.client_name || b.lead_name || '').toLowerCase().includes(q) ||
        (b.service_type || b.service || '').toLowerCase().includes(q) ||
        (b.address || '').toLowerCase().includes(q)
      );
    }
    if (filter !== 'all') arr = arr.filter(b => b.status === filter);
    arr.sort((a, b) => new Date(a.start_time || a.scheduled_at || a.date || 0) - new Date(b.start_time || b.scheduled_at || b.date || 0));
    return arr;
  }, [bookings, search, filter]);

  /* Regrouper par jour */
  const byDay = useMemo(() => {
    const map = new Map();
    for (const b of filtered) {
      const when = b.start_time || b.scheduled_at || b.date;
      const key = dayKey(when);
      if (!map.has(key)) map.set(key, { label: fmtDayLabel(when), items: [] });
      map.get(key).items.push(b);
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }, [filtered]);

  const stats = useMemo(() => {
    const arr = Array.isArray(bookings) ? bookings : [];
    return {
      total: arr.length,
      confirmed: arr.filter(b => b.status === 'confirmed').length,
      pending: arr.filter(b => b.status === 'pending').length,
      cancelled: arr.filter(b => b.status === 'cancelled').length,
    };
  }, [bookings]);

  return (
    <div className="reg-root">
      <style>{tokenStyle}</style>

      <div className="reg-header reg-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="reg-label" style={{ marginBottom: 12 }}>Rendez-vous · Agenda</div>
          <h1 className="reg-display reg-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Le <em className="reg-italic">registre</em> des rendez-vous
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {stats.total} entrée{stats.total > 1 ? 's' : ''} · {stats.confirmed} confirmée{stats.confirmed > 1 ? 's' : ''} · {stats.pending} en attente
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
              placeholder="Client, service, adresse…" className="reg-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
          </div>
          <button onClick={() => refetch()} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)', cursor: 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <RefreshCw style={{ width: 12, height: 12, animation: isLoading ? 'spin 1s linear infinite' : 'none' }} /> Actualiser
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </button>
        </div>
      </div>

      {/* Filtre */}
      <div className="reg-body reg-fade" style={{ padding: '0 48px 20px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="reg-label"><Filter style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> Statut :</span>
          {[['all','Tous']].concat(Object.entries(STATUS_META).map(([k, m]) => [k, m.label])).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${filter === k ? 'var(--ink)' : 'var(--line)'}`,
              background: filter === k ? 'var(--ink)' : 'var(--surface)',
              color: filter === k ? 'var(--bg)' : 'var(--ink-3)',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Registre */}
      <div className="reg-body reg-fade" style={{ padding: '0 48px 40px' }}>
        {isLoading ? (
          <div style={{ padding: 80, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Ouverture de l'agenda…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center',
            background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14,
            fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)',
          }}>
            Aucun rendez-vous inscrit au registre.
          </div>
        ) : (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {byDay.map((day, dayIdx) => (
              <React.Fragment key={day.key}>
                <div className="reg-day-marker" style={{ borderTop: dayIdx > 0 ? '1px solid var(--line)' : 0 }}>
                  <div className="reg-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                    {day.label}
                  </div>
                  <div className="reg-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                    {day.items.length} rendez-vous
                  </div>
                </div>
                {day.items.map((b, i) => {
                  const status = STATUS_META[b.status] || STATUS_META.pending;
                  const when = b.start_time || b.scheduled_at || b.date;
                  return (
                    <div key={b.id || b._id || b.booking_id || `${day.key}-${i}`} className="reg-line">
                      <div>
                        <div className="reg-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>
                          {fmtTime(when)}
                        </div>
                        {b.duration && (
                          <div className="reg-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 3 }}>
                            {b.duration} min
                          </div>
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <User style={{ width: 12, height: 12, color: 'var(--ink-3)' }} />
                          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                            {b.client_name || b.lead_name || 'Client'}
                          </span>
                        </div>
                        <div style={{
                          fontFamily: 'Fraunces, serif', fontStyle: 'italic',
                          fontSize: 12, color: 'var(--ink-3)',
                        }}>
                          {b.service_type || b.service || 'Prestation'}
                        </div>
                      </div>

                      <div className="reg-hide-mobile">
                        {b.address && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-2)' }}>
                            <MapPin style={{ width: 11, height: 11, color: 'var(--ink-3)' }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.address}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className="reg-pill" style={{ color: status.color, background: status.bg, borderColor: status.color }}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
