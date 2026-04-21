// PlanningFil.jsx — Le fil du jour (timeline horizontale magazine).
// Une ligne par équipe, colonnes par heure (7h → 19h), barres missions
// positionnées absolutement en % de la plage horaire. Ligne verticale
// terracotta pour l'heure actuelle. Données réelles depuis /planning/day.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, Map, Calendar, MapPin, Clock, Users as UsersIcon } from 'lucide-react';
import api from '../../lib/api';
import { useAllMembers } from '../../hooks/api';

/* ─────────────────── TOKENS + STYLES ─────────────────── */
const tokenStyle = `
  .pf-root {
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
  .pf-root {
    background: var(--bg); color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px; min-height: 100%;
  }
  .pf-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .pf-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .pf-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .pf-italic  { font-style: italic; color: var(--accent); font-weight: 400; }

  .pf-pill-toggle {
    display: inline-flex; padding: 3px; background: var(--surface);
    border: 1px solid var(--line); border-radius: 999px;
  }
  .pf-pill-toggle button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; border: 0; background: transparent; color: var(--ink-3);
    padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: all .15s;
  }
  .pf-pill-toggle button.active { background: var(--ink); color: var(--bg); }

  /* Mission bars */
  .pf-bar {
    position: absolute; border-radius: 8px;
    padding: 10px 14px; display: flex; flex-direction: column;
    font-family: 'Inter', sans-serif;
    overflow: hidden; cursor: pointer;
    box-sizing: border-box; top: 14px; bottom: 14px;
    transition: transform .1s;
  }
  .pf-bar:hover { transform: translateY(-1px); }
  .pf-bar-title { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
  .pf-bar-sub   { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.05em;
                  opacity: 0.75; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Types */
  .pf-bar-particulier, .pf-bar-pro, .pf-bar-syndic, .pf-bar-recurrent {
    background: oklch(0.94 0.02 80); color: var(--ink);
    border: 1px solid oklch(0.84 0.03 80);
  }
  .pf-bar-visite {
    background: transparent; color: var(--ink-2);
    border: 1.5px dashed var(--accent);
  }
  .pf-bar-pause {
    background: repeating-linear-gradient(-45deg, oklch(0.94 0.01 80), oklch(0.94 0.01 80) 6px, oklch(0.90 0.01 80) 6px, oklch(0.90 0.01 80) 10px);
    color: var(--ink-3);
    border: 1px solid oklch(0.86 0.012 75);
  }
  .pf-bar-current {
    background: var(--warm); color: white;
    border: 1px solid oklch(0.50 0.15 45);
    box-shadow: 0 4px 14px oklch(0.50 0.15 45 / 0.30);
  }
  .pf-bar-done   { opacity: 0.7; }

  /* Ligne verticale "maintenant" */
  .pf-now-line {
    position: absolute; top: -18px; bottom: -14px; width: 1.5px;
    background: var(--warm); pointer-events: none; z-index: 5;
  }
  .pf-now-line::before {
    content: ''; position: absolute; top: 0; left: -3px;
    width: 8px; height: 8px; border-radius: 50%; background: var(--warm);
  }
  .pf-now-label {
    position: absolute; top: -24px; left: 4px; background: var(--warm); color: white;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; padding: 1px 6px; border-radius: 3px;
    font-weight: 600; letter-spacing: 0.05em; white-space: nowrap;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .pf-fade { animation: fadeIn .3s ease; }

  @media (max-width: 1100px) {
    .pf-kpis-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 960px) {
    .pf-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .pf-header-title { font-size: 36px !important; }
    .pf-kpis-grid { grid-template-columns: 1fr 1fr !important; }
    .pf-body { padding: 0 20px 40px !important; }
    .pf-timeline-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .pf-timeline-inner { min-width: 900px; }
  }
`;

/* ─────────────── Heures visibles ─────────────── */
const START_HOUR = 7;
const END_HOUR   = 19; // exclusif
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

function hhmmToMinutes(s) {
  const [h, m] = (s || '00:00').split(':').map(Number);
  return h * 60 + m;
}
function rangeToPercent(startHHMM, endHHMM) {
  const startMin = hhmmToMinutes(startHHMM);
  const endMin   = hhmmToMinutes(endHHMM);
  const dayStart = START_HOUR * 60;
  const dayEnd   = END_HOUR   * 60;
  const total    = dayEnd - dayStart;
  const left  = Math.max(0, (startMin - dayStart) / total * 100);
  const right = Math.min(100, (endMin - dayStart) / total * 100);
  return { left: `${left}%`, width: `${Math.max(2, right - left)}%` };
}
function fmtDateFr(d) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

/* ─────────────── Mission bar ─────────────── */
function initialsOf(name) {
  if (!name) return '?';
  return name.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');
}

function MemberAvatar({ member, size = 22, title }) {
  const name = member?.name || '?';
  return (
    <div
      title={title || name}
      style={{
        width: size, height: size, borderRadius: 999,
        background: member?.photo_b64 ? 'transparent' : 'rgba(255,255,255,0.9)',
        color: 'oklch(0.32 0.012 60)',
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Fraunces, serif', fontSize: size * 0.4, fontWeight: 600,
        overflow: 'hidden', flexShrink: 0,
      }}
    >
      {member?.photo_b64
        ? <img src={member.photo_b64} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initialsOf(name)}
    </div>
  );
}

function MissionBar({ mission, onClick, membersMap = {} }) {
  const { left, width } = rangeToPercent(mission.start, mission.end);
  const [hover, setHover] = useState(false);
  const cls =
    mission.status === 'current' ? 'pf-bar-current' :
    `pf-bar-${mission.type}` + (mission.status === 'done' ? ' pf-bar-done' : '');

  const typeLabel = ({
    particulier: 'PARTICULIER', pro: 'PRO', syndic: 'SYNDIC',
    recurrent: 'RÉCURRENT', visite: 'VISITE', pause: 'PAUSE',
  })[mission.type] || mission.type?.toUpperCase();

  const assignedIds = mission.assigned_members || [];
  const assignedMembers = assignedIds.map((id) => membersMap[id]).filter(Boolean);
  // Calcul de la largeur en pixels (approximation) pour décider si on affiche les avatars
  const widthNum = parseFloat(width);
  const showAvatars = widthNum > 6 && assignedMembers.length > 0;

  const statusDot = mission.status === 'current' ? 'white'
                  : mission.status === 'done'    ? 'oklch(0.52 0.13 165)'
                  : mission.status === 'late'    ? 'oklch(0.55 0.18 25)'
                  : 'oklch(0.62 0.14 45)';

  return (
    <div
      className={`pf-bar ${cls}`}
      style={{ left, width, zIndex: hover ? 8 : 1 }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: statusDot, flexShrink: 0 }} />
        <div className="pf-bar-title" style={{ flex: 1 }}>
          {mission.client}{mission.location ? ` · ${mission.location}` : ''}
        </div>
      </div>
      <div className="pf-bar-sub" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <span>{mission.start} → {mission.end} · {typeLabel}</span>
        {showAvatars && (
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            {assignedMembers.slice(0, 3).map((m, i) => (
              <div key={m.member_id} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                <MemberAvatar member={m} size={18} />
              </div>
            ))}
            {assignedMembers.length > 3 && (
              <div style={{
                width: 18, height: 18, borderRadius: 999, marginLeft: -8,
                background: 'rgba(0,0,0,0.12)', color: 'oklch(0.32 0.012 60)',
                border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              }}>+{assignedMembers.length - 3}</div>
            )}
          </div>
        )}
      </div>

      {/* Popup hover : affiché seulement quand on survole */}
      {hover && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 'calc(100% + 8px)',
          transform: 'translateX(-50%)',
          width: 280, background: 'white', borderRadius: 12, padding: 14,
          boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)',
          border: '1px solid oklch(0.85 0.012 75)',
          zIndex: 20, pointerEvents: 'none',
          fontFamily: 'Inter, sans-serif', color: 'oklch(0.165 0.012 60)',
        }}>
          <div style={{
            fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'oklch(0.52 0.010 60)',
            marginBottom: 4,
          }}>
            {typeLabel} · {mission.status === 'current' ? 'EN COURS' :
                         mission.status === 'done' ? 'TERMINÉE' :
                         mission.status === 'late' ? 'EN RETARD' : 'PROGRAMMÉE'}
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>
            {mission.client}
          </div>
          <div style={{ fontSize: 12, color: 'oklch(0.32 0.012 60)', display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock style={{ width: 11, height: 11, color: 'oklch(0.52 0.010 60)' }} />
              {mission.start} → {mission.end}
            </div>
            {mission.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin style={{ width: 11, height: 11, color: 'oklch(0.52 0.010 60)' }} />
                {mission.location}
              </div>
            )}
          </div>
          {assignedMembers.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid oklch(0.92 0.010 78)' }}>
              <div style={{
                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.08em', textTransform: 'uppercase', color: 'oklch(0.52 0.010 60)',
                marginBottom: 6,
              }}>
                Équipe ({assignedMembers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {assignedMembers.map((m) => (
                  <div key={m.member_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MemberAvatar member={m} size={22} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</span>
                    <span style={{ fontSize: 10, color: 'oklch(0.52 0.010 60)', marginLeft: 'auto' }}>
                      {m.role || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Ligne équipe ─────────────── */
function TeamRow({ team, now, onMissionClick, onTeamClick, onTimelineClick, membersMap = {} }) {
  const initials = team.initials || team.name?.slice(0, 2).toUpperCase() || '?';
  // Intervenants de l'équipe (tous ceux ayant team_id = team.id)
  const teamMembers = Object.values(membersMap).filter((m) => m.team_id === team.id || m.team_id === team.team_id);
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '200px 1fr', borderBottom: '1px solid var(--line-2)',
      minHeight: 90, alignItems: 'stretch',
    }}>
      {/* Colonne équipe — cliquable pour assigner */}
      <div
        onClick={() => onTeamClick?.(team)}
        style={{
          padding: '16px 18px', borderRight: '1px solid var(--line-2)',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', transition: 'background .15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        title={`Cliquer pour assigner une mission à ${team.name}`}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600,
        }}>{initials}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="pf-display" style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {team.name}
          </div>
          <div className="pf-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', marginTop: 4 }}>
            {team.km ? `${team.km} KM · ` : ''}{team.count} MISS.
          </div>
          {teamMembers.length > 0 && (
            <div style={{ display: 'flex', marginTop: 6 }}>
              {teamMembers.slice(0, 5).map((m, i) => (
                <div key={m.member_id} style={{ marginLeft: i > 0 ? -6 : 0 }}>
                  <MemberAvatar member={m} size={18} title={m.name} />
                </div>
              ))}
              {teamMembers.length > 5 && (
                <div style={{
                  width: 18, height: 18, borderRadius: 999, marginLeft: -6,
                  background: 'var(--surface-2)', color: 'var(--ink-3)',
                  border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                }}>+{teamMembers.length - 5}</div>
              )}
            </div>
          )}
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: 999,
          background: 'var(--accent)', color: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.85,
        }} title="Assigner une mission">
          <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, marginTop: -2 }}>+</span>
        </div>
      </div>
      {/* Zone timeline — cliquable pour créer au créneau */}
      <div
        style={{ position: 'relative', cursor: 'copy' }}
        onClick={(e) => {
          // N'attrape que les clics sur zone vide (pas sur les mission bars)
          if (e.target.closest('.pf-bar')) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          const minutesFromStart = pct * (19 - 7) * 60; // 7h-19h = 12h
          const totalMin = 7 * 60 + minutesFromStart;
          const hh = Math.max(7, Math.min(18, Math.floor(totalMin / 60)));
          const mm = Math.round((totalMin % 60) / 15) * 15; // quart d'heure
          const time = `${String(hh).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
          onTimelineClick?.(team, time);
        }}
      >
        {team.missions.map(m => (
          <MissionBar key={m.id} mission={m} onClick={() => onMissionClick?.(m)} membersMap={membersMap} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────── COMPOSANT PRINCIPAL ─────────────── */
export default function PlanningFil() {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('jour');
  const [assignOpen, setAssignOpen] = useState(null); // { team, time }
  const [toast, setToast] = useState(null);
  const showToast = (m, t = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2800); };

  // Map member_id -> {name, photo_b64, role, team_id} pour afficher les avatars
  const { data: membersData } = useAllMembers();
  const membersMap = useMemo(() => {
    const map = {};
    (membersData?.members || []).forEach((m) => {
      if (m.member_id) map[m.member_id] = m;
    });
    return map;
  }, [membersData]);

  const reload = () => {
    setLoading(true);
    api.get('/planning/day', { params: { date } })
      .then(r => setData(r.data))
      .catch(() => setData({ teams: [], summary: {}, empty: true }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { reload(); }, [date]);

  const dateObj = useMemo(() => new Date(date + 'T00:00:00'), [date]);
  const shiftDate = (deltaDays) => {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + deltaDays);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const now = new Date();
  const isToday = dateObj.toDateString() === now.toDateString();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dayStart = START_HOUR * 60;
  const dayEnd = END_HOUR * 60;
  const nowInDay = isToday && nowMin >= dayStart && nowMin <= dayEnd;
  const nowPct = nowInDay ? ((nowMin - dayStart) / (dayEnd - dayStart)) * 100 : null;
  const nowLabel = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const teams = data?.teams || [];
  const summary = data?.summary || {};
  const empty = data?.empty;

  return (
    <div className="pf-root">
      <style>{tokenStyle}</style>

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div className="pf-header pf-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="pf-label" style={{ marginBottom: 12 }}>
            PLANNING · {fmtDateFr(dateObj)}
          </div>
          <h1 className="pf-display pf-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Le <em className="pf-italic">fil</em> de la journée
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {summary.total_missions || 0} mission{(summary.total_missions || 0) > 1 ? 's' : ''}
            {summary.total_hours_str ? ` · ${summary.total_hours_str} cumulées` : ''}
            {summary.total_km ? ` · ${summary.total_km} km` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="pf-pill-toggle">
            {[['jour','Jour'],['semaine','Semaine'],['mois','Mois'],['carte','Carte']].map(([k, l]) => (
              <button key={k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => shiftDate(-1)} title="Jour précédent" style={{
              width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--line)',
              background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><ChevronLeft style={{ width: 14, height: 14 }} /></button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
              padding: '7px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: 'var(--ink-2)', outline: 'none', minWidth: 140,
            }} />
            <button onClick={() => shiftDate(1)} title="Jour suivant" style={{
              width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--line)',
              background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><ChevronRight style={{ width: 14, height: 14 }} /></button>
          </div>

          <Link to="/leads/new" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
          }}>
            <Plus style={{ width: 12, height: 12 }} />
            Mission
          </Link>
        </div>
      </div>

      {/* ═══════════════════════ BODY ═══════════════════════ */}
      <div className="pf-body pf-fade" style={{ padding: '0 48px 40px' }}>

        {/* ━━━ Strip KPI ━━━ */}
        <div className="pf-kpis-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
          overflow: 'hidden', marginBottom: 20,
        }}>
          {[
            { label: 'Capacité jour', value: `${summary.capacity_hours || 32}h`, sub: `${summary.capacity_used_pct || 0}% utilisée`, tone: 'var(--accent)' },
            { label: 'Missions',       value: String(summary.total_missions || 0), sub: summary.risk_detail || 'Du jour', tone: 'var(--ink)' },
            { label: 'CA estimé',      value: `${(summary.ca_estimated || 0).toLocaleString('fr-FR')} €`, sub: '—', tone: 'var(--gold)' },
            { label: 'Distance totale',value: `${summary.total_km || 0} km`, sub: 'Trajet cumulé', tone: 'var(--ink-2)' },
            { label: 'Risque retard',  value: summary.risk_level === 'tendu' ? 'Tendu' : 'Faible', sub: summary.risk_detail || '', tone: summary.risk_level === 'tendu' ? 'var(--warm)' : 'var(--accent)' },
          ].map((kpi, i) => (
            <div key={i} style={{
              padding: '22px 26px', borderRight: i < 4 ? '1px solid var(--line-2)' : 0,
            }}>
              <div className="pf-label" style={{ marginBottom: 10 }}>{kpi.label}</div>
              <div className="pf-display" style={{ fontSize: 30, fontWeight: 500, color: kpi.tone, lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div className="pf-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, letterSpacing: '0.08em' }}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ━━━ TIMELINE ━━━ */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
          overflow: 'hidden',
        }}>
          <div className="pf-timeline-wrap">
            <div className="pf-timeline-inner">

              {/* Header heures */}
              <div style={{
                display: 'grid', gridTemplateColumns: '200px 1fr',
                borderBottom: '1px solid var(--line)', background: 'var(--surface-2)',
              }}>
                <div style={{
                  padding: '14px 18px', borderRight: '1px solid var(--line-2)',
                }} className="pf-label">Équipe</div>
                <div style={{
                  display: 'grid', gridTemplateColumns: `repeat(${HOURS.length}, 1fr)`,
                }}>
                  {HOURS.map(h => (
                    <div key={h} style={{
                      padding: '14px 0', textAlign: 'left', paddingLeft: 10,
                      borderRight: '1px solid var(--line-2)',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)',
                      letterSpacing: '0.08em',
                    }}>
                      {h}h
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  Chargement du planning…
                </div>
              ) : empty || teams.length === 0 ? (
                <div style={{ padding: 80, textAlign: 'center' }}>
                  <div className="pf-display" style={{ fontSize: 22, fontWeight: 400, color: 'var(--ink-2)', marginBottom: 8, fontStyle: 'italic' }}>
                    Aucune mission planifiée ce jour.
                  </div>
                  <div className="pf-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 20 }}>
                    Crée une tâche avec une date d'échéance ou une intervention pour voir apparaître le planning.
                  </div>
                  <Link to="/tasks" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                    background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
                    letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
                  }}>
                    <Calendar style={{ width: 12, height: 12 }} />
                    Gérer les tâches
                  </Link>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {teams.map(team => (
                    <TeamRow
                      key={team.id}
                      team={team}
                      membersMap={membersMap}
                      onMissionClick={m => m.lead_id && navigate(`/leads/${m.lead_id}`)}
                      onTeamClick={(t) => setAssignOpen({ team: t, time: '09:00' })}
                      onTimelineClick={(t, time) => setAssignOpen({ team: t, time })}
                    />
                  ))}
                  {/* Overlay pour la ligne « maintenant » — même grid que les rows
                      pour que le % soit calculé sur la colonne timeline (1fr) */}
                  {nowInDay && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'grid', gridTemplateColumns: '200px 1fr',
                      pointerEvents: 'none', zIndex: 5,
                    }}>
                      <div />
                      <div style={{ position: 'relative' }}>
                        <div className="pf-now-line" style={{ left: `${nowPct}%` }}>
                          <div className="pf-now-label">{nowLabel}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ━━━ LÉGENDE ━━━ */}
        <div style={{
          display: 'flex', gap: 22, flexWrap: 'wrap', marginTop: 18,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
          color: 'var(--ink-3)', textTransform: 'uppercase',
        }}>
          {[
            { dot: 'oklch(0.52 0.13 165)', label: 'EN COURS' },
            { dot: 'oklch(0.84 0.03 80)',  label: 'PROGRAMMÉ', box: true },
            { dot: 'var(--accent)',        label: 'VISITE/DEVIS', dashed: true },
            { dot: 'oklch(0.86 0.012 75)', label: 'PAUSE/CONGÉ', hatched: true },
            { dot: 'var(--warm)',          label: 'MAINTENANT' },
          ].map((l, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {l.hatched ? (
                <span style={{
                  width: 14, height: 10, borderRadius: 2,
                  background: 'repeating-linear-gradient(-45deg, oklch(0.94 0.01 80), oklch(0.94 0.01 80) 3px, oklch(0.90 0.01 80) 3px, oklch(0.90 0.01 80) 5px)',
                  border: '1px solid var(--line)',
                }} />
              ) : l.dashed ? (
                <span style={{ width: 14, height: 10, borderRadius: 2, border: '1.5px dashed var(--accent)' }} />
              ) : l.box ? (
                <span style={{ width: 14, height: 10, borderRadius: 2, background: l.dot, border: '1px solid var(--line)' }} />
              ) : (
                <span style={{ width: 10, height: 10, borderRadius: 999, background: l.dot }} />
              )}
              {l.label}
            </span>
          ))}
        </div>

      </div>

      {/* ═══════════ MODALE ASSIGNER / CRÉER MISSION ═══════════ */}
      {assignOpen && (
        <PlanningAssignModal
          team={assignOpen.team}
          defaultTime={assignOpen.time}
          defaultDate={date}
          onClose={() => setAssignOpen(null)}
          onDone={(msg) => { setAssignOpen(null); showToast(msg, 'ok'); reload(); }}
          onError={(msg) => showToast(msg, 'err')}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          padding: '12px 18px', borderRadius: 10,
          background: toast.t === 'err' ? 'oklch(0.48 0.15 25)' : 'var(--ink)',
          color: 'var(--bg)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}>
          {toast.m}
        </div>
      )}
    </div>
  );
}

/* ═════════════ MODALE PLANNING : ASSIGNER / CRÉER MISSION ═════════════ */
function PlanningAssignModal({ team, defaultTime, defaultDate, onClose, onDone, onError }) {
  const [leads, setLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [form, setForm] = useState({
    lead_id: '',
    title: '',
    description: '',
    service_type: '',
    address: '',
    scheduled_date: defaultDate,
    scheduled_time: defaultTime || '09:00',
    duration_hours: 2,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/leads', { params: { page_size: 200, period: 'all' } })
      .then(r => setLeads(r.data?.items || r.data || []))
      .catch(() => setLeads([]));
  }, []);

  const selectedLead = leads.find(l => l.lead_id === form.lead_id);
  useEffect(() => {
    if (selectedLead && !form.title) {
      setForm(p => ({
        ...p,
        title: `${selectedLead.service_type || 'Intervention'} — ${selectedLead.name}`,
        service_type: selectedLead.service_type || '',
        address: selectedLead.address || '',
      }));
    }
  }, [selectedLead]); // eslint-disable-line

  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return leads.slice(0, 30);
    const q = leadSearch.toLowerCase();
    return leads.filter(l =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.address || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [leads, leadSearch]);

  const handleSubmit = async () => {
    if (!form.lead_id) return onError('Sélectionnez un client');
    if (!form.title.trim()) return onError('Ajoutez un titre');
    setSaving(true);
    try {
      const payload = {
        lead_id: form.lead_id,
        title: form.title,
        description: form.description || undefined,
        service_type: form.service_type || undefined,
        address: form.address || undefined,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        duration_hours: Number(form.duration_hours) || 2,
        team_id: team?.id || team?.team_id || undefined,
      };
      await api.post('/planning/interventions', payload);
      onDone(`✓ Mission créée pour ${team.name}`);
    } catch (e) {
      onError(e?.response?.data?.detail || 'Création impossible');
    }
    setSaving(false);
  };

  const initials = team.initials || team.name?.slice(0, 2).toUpperCase() || '?';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 90, padding: 20, backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 16,
          width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{
          padding: '22px 26px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 999,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500,
            border: '2px solid var(--accent)',
          }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
              Nouvelle mission
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>
              pour <em style={{ color: 'var(--accent)' }}>{team.name}</em>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 999, border: '1px solid var(--line)',
            background: 'var(--surface)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)', fontSize: 18,
          }}>×</button>
        </div>

        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Client */}
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Client</div>
            <input
              value={leadSearch}
              onChange={e => setLeadSearch(e.target.value)}
              placeholder="Rechercher un client…"
              style={{
                width: '100%', padding: '9px 14px',
                border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)', outline: 'none',
                marginBottom: 8,
              }}
            />
            <div style={{
              maxHeight: 180, overflowY: 'auto',
              border: '1px solid var(--line)', borderRadius: 10,
              background: 'var(--surface-2)',
            }}>
              {filteredLeads.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif', fontSize: 13 }}>
                  Aucun client trouvé
                </div>
              ) : filteredLeads.map(l => (
                <div
                  key={l.lead_id}
                  onClick={() => setForm(p => ({ ...p, lead_id: l.lead_id }))}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--line-2)',
                    background: form.lead_id === l.lead_id ? 'var(--accent-soft)' : 'transparent',
                  }}
                >
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                    {l.name || 'Sans nom'}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 2 }}>
                    {l.address || l.email || l.phone || ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Titre</div>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ex : Ménage hebdomadaire"
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2)',
                fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Date</div>
              <input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Heure</div>
              <input type="time" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Durée (h)</div>
              <input type="number" min="0.5" step="0.5" value={form.duration_hours} onChange={e => setForm(p => ({ ...p, duration_hours: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)', outline: 'none' }} />
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Notes</div>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Instructions, code d'accès, matériel…" style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2)', fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)', outline: 'none', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{
          padding: '16px 26px', borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onClose} style={{
            padding: '10px 18px', borderRadius: 999,
            border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em',
            textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
          }}>Annuler</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding: '10px 20px', borderRadius: 999, border: 'none',
            background: 'var(--ink)', color: 'var(--bg)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em',
            textTransform: 'uppercase', fontWeight: 500,
            cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Création…' : 'Créer la mission'}
          </button>
        </div>
      </div>
    </div>
  );
}
