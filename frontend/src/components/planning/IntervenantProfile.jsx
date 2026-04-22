// IntervenantProfile.jsx — /intervenants/:id
// Fiche complète d'un intervenant : photo + identité + stats + planning
// personnel (à venir + récent) + compétences + zones + actions.

import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Award, BadgeCheck, BarChart3, Briefcase, Calendar, Check,
  CheckCircle, ChevronRight, Clock, Edit3, ExternalLink, MapPin, Mail,
  Phone, Plane, Plus, Send, Shield, ShieldOff, Star, TrendingUp,
  Trash2, Users, X, XCircle, Zap,
} from 'lucide-react';
import {
  useMemberProfile, useUpdateMember, useDeleteMember,
  useHoursWorked, useAvailabilities, useCreateAvailability,
  useDeleteAvailability, useNotifyIntervention,
} from '../../hooks/api';

const tokenStyle = `
  .ip-root {
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
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --gold: oklch(0.72 0.13 85);
    --terra: oklch(0.55 0.12 35);
    --terra-soft: oklch(0.93 0.05 35);
    --rouge: oklch(0.55 0.18 25);
    --rouge-soft: oklch(0.94 0.08 25);
  }
  .ip-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 80px;
  }
  .ip-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .ip-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .ip-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .ip-italic  { font-style: italic; color: var(--terra); font-weight: 400; }

  .ip-card {
    background: var(--paper); border: 1px solid var(--line); border-radius: 16px;
  }
  .ip-card-hover:hover { border-color: var(--ink-3); }

  .ip-action-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; text-decoration: none; transition: all .15s;
  }
  .ip-action-btn:hover { border-color: var(--ink-3); color: var(--ink); }
  .ip-action-btn.primary {
    background: var(--ink); color: var(--bg); border-color: var(--ink);
  }
  .ip-action-btn.primary:hover { opacity: 0.85; color: var(--bg); }
  .ip-action-btn.danger { color: var(--rouge); border-color: var(--rouge); }
  .ip-action-btn.danger:hover { background: var(--rouge); color: white; }

  .ip-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.08em;
    text-transform: uppercase; font-weight: 600;
    background: var(--surface); color: var(--ink-3);
    border: 1px solid var(--line);
  }
  .ip-fade { animation: ip-fade 0.35s ease; }
  @keyframes ip-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
`;

function initials(name) {
  if (!name) return '?';
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  const map = {
    done: { tone: 'var(--emerald)', bg: 'var(--emerald-soft)', label: 'Terminée' },
    completed: { tone: 'var(--emerald)', bg: 'var(--emerald-soft)', label: 'Terminée' },
    terminee: { tone: 'var(--emerald)', bg: 'var(--emerald-soft)', label: 'Terminée' },
    cancelled: { tone: 'var(--ink-4)', bg: 'var(--surface-2)', label: 'Annulée' },
    annulee: { tone: 'var(--ink-4)', bg: 'var(--surface-2)', label: 'Annulée' },
    current: { tone: 'white', bg: 'var(--warm)', label: 'En cours' },
    en_cours: { tone: 'white', bg: 'var(--warm)', label: 'En cours' },
    scheduled: { tone: 'var(--navy, var(--ink-2))', bg: 'var(--surface)', label: 'Programmée' },
  };
  const m = map[s] || { tone: 'var(--ink-3)', bg: 'var(--surface)', label: status || '—' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.08em',
      textTransform: 'uppercase', fontWeight: 600,
      color: m.tone, background: m.bg, border: `1px solid ${m.tone === 'white' ? m.bg : m.tone}`,
    }}>
      {m.label}
    </span>
  );
}

function MissionRow({ mission, past = false }) {
  const d = mission.scheduled_date;
  const dateObj = d ? new Date(d + 'T00:00:00') : null;
  const dateLabel = dateObj ? dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }) : '—';
  return (
    <Link to={mission.lead_id ? `/leads/${mission.lead_id}` : '#'}
      style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '100px 1fr auto auto', gap: 16, alignItems: 'center',
        padding: '14px 18px', borderBottom: '1px solid var(--line-2)',
        opacity: past ? 0.75 : 1, cursor: 'pointer',
      }}>
        <div>
          <div className="ip-label" style={{ fontSize: 9, marginBottom: 2 }}>{dateLabel}</div>
          <div className="ip-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>
            {mission.scheduled_time || '—'}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="ip-display" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mission.title || mission.client || 'Mission'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {mission.address && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <MapPin style={{ width: 10, height: 10 }} /> {mission.address}
              </span>
            )}
            {mission.duration_hours && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Clock style={{ width: 10, height: 10 }} /> {mission.duration_hours}h
              </span>
            )}
            {mission.service_type && <span className="ip-badge">{mission.service_type}</span>}
          </div>
        </div>
        <StatusBadge status={mission.status || (past ? 'done' : 'scheduled')} />
        <ChevronRight style={{ width: 14, height: 14, color: 'var(--ink-4)' }} />
      </div>
    </Link>
  );
}

function KpiBox({ label, value, sub, tone = 'var(--ink)', icon: Icon }) {
  return (
    <div className="ip-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {Icon && (
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `color-mix(in oklch, ${tone} 14%, transparent)`,
            color: tone,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon style={{ width: 14, height: 14 }} />
          </div>
        )}
        <span className="ip-label" style={{ fontSize: 10 }}>{label}</span>
      </div>
      <div className="ip-display" style={{ fontSize: 30, fontWeight: 500, color: tone, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div className="ip-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, letterSpacing: '0.06em' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function IntervenantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useMemberProfile(id);
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const { data: hoursData } = useHoursWorked({ memberId: id, period: 'month' });
  const { data: availData } = useAvailabilities({ memberId: id });
  const createAvail = useCreateAvailability();
  const deleteAvail = useDeleteAvailability();
  const notify = useNotifyIntervention();
  const [toast, setToast] = useState(null);
  const [availOpen, setAvailOpen] = useState(false);
  const showToast = (m, t = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2800); };

  if (isLoading && !data) {
    return (
      <div className="ip-root">
        <style>{tokenStyle}</style>
        <div style={{ padding: 80, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Chargement de la fiche…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ip-root">
        <style>{tokenStyle}</style>
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div className="ip-display" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 10 }}>
            Intervenant introuvable
          </div>
          <button onClick={() => navigate('/intervenants')} className="ip-action-btn">
            <ArrowLeft style={{ width: 12, height: 12 }} /> Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const { member, stats, upcoming = [], recent = [], teams = [] } = data;
  const name = member.name || 'Intervenant';
  const isActive = member.active !== false;

  const toggleActive = async () => {
    try {
      await updateMember.mutateAsync({ memberId: id, patch: { active: !isActive } });
      showToast(isActive ? 'Désactivé' : 'Réactivé');
    } catch (e) { showToast(e?.response?.data?.detail || 'Erreur', 'err'); }
  };

  const onDelete = async () => {
    if (!window.confirm(`Supprimer définitivement ${name} ? Cette action ne peut pas être annulée.`)) return;
    try {
      await deleteMember.mutateAsync(id);
      navigate('/intervenants');
    } catch (e) { showToast(e?.response?.data?.detail || 'Suppression impossible', 'err'); }
  };

  return (
    <div className="ip-root">
      <style>{tokenStyle}</style>

      {/* ═══════════ BREADCRUMB + ACTIONS TOP ═══════════ */}
      <div className="ip-fade" style={{
        padding: '28px 48px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-3)', fontSize: 12 }}>
          <Link to="/intervenants" style={{ color: 'var(--ink-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Équipage
          </Link>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <span style={{ color: 'var(--ink-2)' }}>{name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {member.phone && (
            <a href={`tel:${member.phone}`} className="ip-action-btn">
              <Phone style={{ width: 11, height: 11 }} /> Appeler
            </a>
          )}
          {member.email && (
            <a href={`mailto:${member.email}`} className="ip-action-btn">
              <Mail style={{ width: 11, height: 11 }} /> Email
            </a>
          )}
          {upcoming.length > 0 && upcoming[0]?.intervention_id && (
            <button onClick={async () => {
              try {
                await notify.mutateAsync({ interventionId: upcoming[0].intervention_id });
              } catch (e) { showToast(e?.response?.data?.detail || 'Erreur', 'err'); }
            }} disabled={notify.isPending} className="ip-action-btn">
              <Send style={{ width: 11, height: 11 }} />
              {notify.isPending ? 'Envoi…' : 'Notifier prochaine mission'}
            </button>
          )}
          <button onClick={() => navigate(`/intervenants?edit=${id}`)} className="ip-action-btn">
            <Edit3 style={{ width: 11, height: 11 }} /> Modifier
          </button>
          <button onClick={toggleActive} className="ip-action-btn"
            style={{ color: isActive ? 'var(--warm)' : 'var(--emerald)', borderColor: isActive ? 'var(--warm)' : 'var(--emerald)' }}>
            {isActive ? <><ShieldOff style={{ width: 11, height: 11 }} /> Désactiver</> :
                         <><Shield style={{ width: 11, height: 11 }} /> Réactiver</>}
          </button>
          <button onClick={onDelete} className="ip-action-btn danger">
            <Trash2 style={{ width: 11, height: 11 }} /> Supprimer
          </button>
        </div>
      </div>

      {/* ═══════════ HEADER PROFILE ═══════════ */}
      <div className="ip-fade" style={{ padding: '28px 48px 32px' }}>
        <div className="ip-card" style={{ padding: '32px 36px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center' }}>
          {/* Photo */}
          <div style={{
            width: 160, height: 160, borderRadius: 999, overflow: 'hidden',
            background: member.photo_b64 ? 'transparent' : 'linear-gradient(135deg, var(--terra-soft), var(--warm-soft))',
            border: '4px solid var(--surface)',
            boxShadow: '0 0 0 3px var(--terra), 0 8px 24px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {member.photo_b64 ? (
              <img src={member.photo_b64} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 64, fontWeight: 500, color: 'var(--terra)' }}>
                {initials(name)}
              </span>
            )}
          </div>

          {/* Identité */}
          <div style={{ minWidth: 0 }}>
            <div className="ip-label" style={{ marginBottom: 10 }}>
              {member.role || 'Intervenant'} · {isActive ? 'EN SERVICE' : 'INACTIF'}
            </div>
            <h1 className="ip-display" style={{ fontSize: 48, fontWeight: 300, lineHeight: 0.95, margin: '0 0 8px', color: 'var(--ink)' }}>
              {name}
            </h1>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>
              {member.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Mail style={{ width: 12, height: 12 }} /> {member.email}
                </span>
              )}
              {member.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Phone style={{ width: 12, height: 12 }} /> {member.phone}
                </span>
              )}
              {member.hire_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Calendar style={{ width: 12, height: 12 }} />
                  Arrivé le {new Date(member.hire_date).toLocaleDateString('fr-FR')}
                  {stats.member_since_days !== null && ` (${stats.member_since_days}j)`}
                </span>
              )}
            </div>

            {/* Skills */}
            {(member.skills || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {member.skills.map((s) => (
                  <span key={s} className="ip-badge"
                    style={{ background: 'var(--emerald-soft)', color: 'var(--emerald)', borderColor: 'var(--emerald)' }}>
                    <BadgeCheck style={{ width: 9, height: 9 }} /> {s}
                  </span>
                ))}
              </div>
            )}
            {/* Zones */}
            {(member.zones || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {member.zones.map((z) => (
                  <span key={z} className="ip-badge"
                    style={{ background: 'var(--terra-soft)', color: 'var(--terra)', borderColor: 'var(--terra)' }}>
                    <MapPin style={{ width: 9, height: 9 }} /> {z}
                  </span>
                ))}
              </div>
            )}
            {teams.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)' }}>
                <Users style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 4 }} />
                Équipe : <b style={{ color: 'var(--ink-2)' }}>{teams[0].name}</b>
                {teams.length > 1 && ` + ${teams.length - 1} autre${teams.length > 2 ? 's' : ''}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ KPIs ═══════════ */}
      <div className="ip-fade" style={{ padding: '0 48px 28px' }}>
        <div className="ip-label" style={{ marginBottom: 10 }}>Statistiques</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <KpiBox label="Aujourd'hui" value={stats.missions_today} sub="Missions du jour" tone="var(--warm)" icon={Zap} />
          <KpiBox label="Ce mois" value={stats.missions_this_month} sub={`${stats.hours_this_month}h cumulées`} tone="var(--ink)" icon={Briefcase} />
          <KpiBox label="Cette année" value={stats.missions_this_year} sub={`${stats.hours_this_year}h cumulées`} tone="var(--ink-2)" icon={Calendar} />
          <KpiBox label="Total carrière" value={stats.missions_total} sub="Depuis arrivée" tone="var(--terra)" icon={Award} />
          <KpiBox label="Terminées" value={stats.missions_done} sub={`${stats.completion_rate}% complétion`} tone="var(--emerald)" icon={CheckCircle} />
          <KpiBox label="Annulées" value={stats.missions_cancelled}
            sub={stats.missions_cancelled > 0 ? 'À surveiller' : 'Aucune'}
            tone={stats.missions_cancelled > 3 ? 'var(--rouge)' : 'var(--ink-3)'} icon={XCircle} />
        </div>
      </div>

      {/* ═══════════ HEURES TRAVAILLÉES + DISPONIBILITÉS ═══════════ */}
      <div className="ip-fade" style={{ padding: '0 48px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <HoursSection data={hoursData} />
        <AvailabilitiesSection
          data={availData}
          memberId={id}
          onAdd={() => setAvailOpen(true)}
          onDelete={async (avaId) => { await deleteAvail.mutateAsync(avaId); }}
        />
      </div>

      {/* ═══════════ MISSIONS ═══════════ */}
      <div className="ip-fade" style={{ padding: '0 48px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* À venir */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="ip-label">Prochaines missions · {upcoming.length}</div>
            <Link to="/planning" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              Planning global <ChevronRight style={{ width: 11, height: 11 }} />
            </Link>
          </div>
          <div className="ip-card" style={{ overflow: 'hidden' }}>
            {upcoming.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic', fontFamily: 'Fraunces, serif' }}>
                Aucune mission programmée.
              </div>
            ) : (
              upcoming.map((m) => <MissionRow key={m.intervention_id || m.id} mission={m} />)
            )}
          </div>
        </div>

        {/* Historique */}
        <div>
          <div className="ip-label" style={{ marginBottom: 10 }}>Historique récent · {recent.length}</div>
          <div className="ip-card" style={{ overflow: 'hidden' }}>
            {recent.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic', fontFamily: 'Fraunces, serif' }}>
                Pas encore de missions terminées.
              </div>
            ) : (
              recent.map((m) => <MissionRow key={m.intervention_id || m.id} mission={m} past />)
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ NOTES ═══════════ */}
      {member.notes && (
        <div className="ip-fade" style={{ padding: '0 48px 28px' }}>
          <div className="ip-label" style={{ marginBottom: 10 }}>Notes internes</div>
          <div className="ip-card" style={{ padding: 24 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {member.notes}
            </div>
          </div>
        </div>
      )}

      {/* Modal ajouter indisponibilité */}
      {availOpen && (
        <AvailabilityModal
          memberId={id}
          onClose={() => setAvailOpen(false)}
          onSubmit={async (body) => {
            try {
              await createAvail.mutateAsync(body);
              setAvailOpen(false);
            } catch (e) { showToast(e?.response?.data?.detail || 'Erreur', 'err'); }
          }}
          saving={createAvail.isPending}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          padding: '12px 18px', borderRadius: 10,
          background: toast.t === 'err' ? 'var(--rouge)' : 'var(--ink)', color: 'var(--bg)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}>
          {toast.m}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SOUS-COMPOSANTS : Heures travaillées · Disponibilités · Modal
════════════════════════════════════════════════════════════════════ */
function HoursSection({ data }) {
  const row = data?.rows?.[0];
  return (
    <div>
      <div className="ip-label" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock style={{ width: 12, height: 12 }} /> Heures travaillées — mois en cours
      </div>
      <div className="ip-card" style={{ padding: 22 }}>
        {!row ? (
          <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontFamily: 'Fraunces, serif', fontSize: 13 }}>
            Aucune mission ce mois.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
              <div className="ip-display" style={{ fontSize: 36, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>
                {row.total_hours}<span style={{ fontSize: 18, color: 'var(--ink-3)', fontWeight: 400 }}>h</span>
              </div>
              <div className="ip-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                / {row.missions_count} missions
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--ink-3)' }}>
              <span><b style={{ color: 'var(--emerald)' }}>{row.done_hours}h</b> terminées</span>
              <span><b style={{ color: 'var(--ink-2)' }}>{row.done_count}</b> missions faites</span>
            </div>
            {row.daily?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="ip-label" style={{ fontSize: 9, marginBottom: 6 }}>RÉPARTITION DAILY</div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 44 }}>
                  {row.daily.slice(-14).map((d) => {
                    const max = Math.max(...row.daily.map((x) => x.hours), 1);
                    const pct = (d.hours / max) * 100;
                    return (
                      <div key={d.date} title={`${d.date} · ${d.hours}h`} style={{
                        flex: 1, height: `${pct}%`, minHeight: 4,
                        background: 'var(--emerald)', borderRadius: '2px 2px 0 0', opacity: 0.8,
                      }} />
                    );
                  })}
                </div>
                <div className="ip-mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 4, letterSpacing: '0.06em' }}>
                  {row.daily.length <= 14 ? 'DEBUT DU MOIS' : '14 DERNIERS JOURS'} → AUJOURD'HUI
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const AVAIL_TYPES = {
  off:      { label: 'Repos', tone: 'var(--ink-3)' },
  leave:    { label: 'Congé', tone: 'var(--gold)' },
  sick:     { label: 'Arrêt maladie', tone: 'var(--rouge)' },
  training: { label: 'Formation', tone: 'var(--emerald)' },
  other:    { label: 'Autre', tone: 'var(--ink-4)' },
};

function AvailabilitiesSection({ data, memberId, onAdd, onDelete }) {
  const items = data?.availabilities || [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = items.filter((a) => a.end_date >= today);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="ip-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plane style={{ width: 12, height: 12 }} /> Absences / Indisponibilités
        </div>
        <button onClick={onAdd} className="ip-action-btn">
          <Plus style={{ width: 11, height: 11 }} /> Ajouter
        </button>
      </div>
      <div className="ip-card" style={{ padding: 0, overflow: 'hidden' }}>
        {upcoming.length === 0 ? (
          <div style={{ padding: 22, textAlign: 'center', fontStyle: 'italic', fontFamily: 'Fraunces, serif', color: 'var(--ink-3)', fontSize: 13 }}>
            Aucune absence planifiée.
          </div>
        ) : (
          <div>
            {upcoming.map((a) => {
              const t = AVAIL_TYPES[a.type] || AVAIL_TYPES.other;
              return (
                <div key={a.availability_id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center',
                  padding: '12px 16px', borderBottom: '1px solid var(--line-2)',
                }}>
                  <div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500 }}>
                      {new Date(a.start_date + 'T00:00:00').toLocaleDateString('fr-FR')}
                      {a.end_date !== a.start_date && <> → {new Date(a.end_date + 'T00:00:00').toLocaleDateString('fr-FR')}</>}
                    </div>
                    {a.reason && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{a.reason}</div>
                    )}
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 999, fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    color: t.tone, background: `color-mix(in oklch, ${t.tone} 14%, transparent)`,
                  }}>
                    {t.label}
                  </span>
                  <button onClick={() => onDelete(a.availability_id)} title="Supprimer"
                    style={{
                      width: 28, height: 28, borderRadius: 999, border: '1px solid var(--line)',
                      background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AvailabilityModal({ memberId, onClose, onSubmit, saving }) {
  const [form, setForm] = useState({
    member_id: memberId,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    type: 'leave',
    reason: '',
    notes: '',
  });

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 95, padding: 20, backdropFilter: 'blur(2px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--paper)', borderRadius: 16, width: '100%', maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="ip-label">Indisponibilité</div>
            <div className="ip-display" style={{ fontSize: 20, marginTop: 4 }}>Ajouter une absence</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          </button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="ip-label" style={{ display: 'block', marginBottom: 5 }}>Du</label>
              <input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={modalInputStyle} />
            </div>
            <div>
              <label className="ip-label" style={{ display: 'block', marginBottom: 5 }}>Au</label>
              <input type="date" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={modalInputStyle} />
            </div>
          </div>
          <div>
            <label className="ip-label" style={{ display: 'block', marginBottom: 5 }}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={modalInputStyle}>
              {Object.entries(AVAIL_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ip-label" style={{ display: 'block', marginBottom: 5 }}>Motif (optionnel)</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Vacances d'été, rdv médical…" style={modalInputStyle} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="ip-action-btn">Annuler</button>
          <button onClick={() => onSubmit(form)} disabled={saving} className="ip-action-btn primary">
            <Check style={{ width: 12, height: 12 }} />
            {saving ? 'Enregistrement…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

const modalInputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--surface)',
  fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'var(--ink)',
  outline: 'none',
};
