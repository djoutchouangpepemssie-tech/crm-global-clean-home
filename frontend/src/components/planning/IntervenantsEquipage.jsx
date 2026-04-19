// IntervenantsEquipage.jsx — « L'équipage ».
// Identité : portraits en médaillons ronds à la manière d'un annuaire d'équipage,
// disposition en grille avec skills en badges. Palette chaude (émeraude + terre)
// pour évoquer l'équipe terrain d'une entreprise de ménage.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllTeamMembers } from '../../hooks/api';
import {
  Search, Plus, Phone, Mail, MapPin, Star, Award, Users, Filter,
  Briefcase, TrendingUp, Clock, Navigation, X, Calendar, CheckCircle,
} from 'lucide-react';
import api from '../../lib/api';

const tokenStyle = `
  .eqp-root {
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
  }
  .eqp-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .eqp-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .eqp-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .eqp-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .eqp-italic  { font-style: italic; color: var(--terra); font-weight: 400; }

  /* Carte portrait */
  .eqp-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; padding: 24px 22px;
    transition: transform .2s, box-shadow .2s, border-color .2s;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    position: relative;
  }
  .eqp-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,0.06); border-color: var(--terra); }

  .eqp-medal {
    width: 84px; height: 84px; border-radius: 999px;
    background: linear-gradient(135deg, var(--terra-soft) 0%, var(--warm-soft) 100%);
    border: 3px solid var(--surface);
    box-shadow: 0 0 0 2px var(--terra), 0 4px 10px rgba(0,0,0,0.08);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Fraunces', serif; font-size: 36px; font-weight: 500;
    color: var(--terra); letter-spacing: -0.02em;
    margin-bottom: 16px;
  }

  .eqp-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.08em;
    text-transform: uppercase; font-weight: 600;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink-3);
  }

  .eqp-contact-btn {
    width: 32px; height: 32px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-3);
    cursor: pointer; transition: all .15s; text-decoration: none;
  }
  .eqp-contact-btn:hover { border-color: var(--terra); color: var(--terra); background: var(--terra-soft); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .eqp-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .eqp-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .eqp-header-title { font-size: 36px !important; }
    .eqp-body { padding: 0 20px 40px !important; }
    .eqp-grid { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 640px) {
    .eqp-grid { grid-template-columns: 1fr !important; }
  }
`;

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

function initials(name) {
  if (!name) return '?';
  return name.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');
}

export default function IntervenantsEquipage() {
  const navigate = useNavigate();
  const { data: members = [], isLoading } = useAllTeamMembers();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [assignOpen, setAssignOpen] = useState(null); // intervenant en cours d'assignation
  const [toast, setToast] = useState(null);
  const showToast = (m, t = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2800); };

  const filtered = useMemo(() => {
    let arr = [...(members || [])];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(m =>
        (m.name || m.full_name || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.zones || []).join(' ').toLowerCase().includes(q)
      );
    }
    if (filter === 'active') arr = arr.filter(m => m.active !== false && m.status !== 'inactive');
    if (filter === 'leader') arr = arr.filter(m => m.role?.toLowerCase().includes('chef') || m.is_leader);
    return arr;
  }, [members, search, filter]);

  const stats = useMemo(() => {
    const total = (members || []).length;
    const active = (members || []).filter(m => m.active !== false && m.status !== 'inactive').length;
    const leaders = (members || []).filter(m => m.role?.toLowerCase().includes('chef') || m.is_leader).length;
    return { total, active, leaders };
  }, [members]);

  return (
    <div className="eqp-root">
      <style>{tokenStyle}</style>

      <div className="eqp-header eqp-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="eqp-label" style={{ marginBottom: 12 }}>Terrain · Équipe</div>
          <h1 className="eqp-display eqp-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            L'<em className="eqp-italic">équipage</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {stats.total} intervenant{stats.total > 1 ? 's' : ''} · {stats.active} en service · {stats.leaders} chef{stats.leaders > 1 ? 's' : ''} d'équipe
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
              placeholder="Nom, zone, compétence…" className="eqp-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
          </div>
          <button
            onClick={() => navigate('/planning/calendar')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999, border: 'none',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 12, height: 12 }} /> Ajouter
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="eqp-body eqp-fade" style={{ padding: '0 48px 24px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14,
          overflow: 'hidden',
        }}>
          {[
            { label: 'Effectif total',    value: stats.total,   sub: 'Tous statuts', icon: Users },
            { label: 'En service',         value: stats.active,  sub: `${stats.total > 0 ? Math.round(stats.active / stats.total * 100) : 0}% du total`, icon: Briefcase, tone: 'var(--emerald)' },
            { label: 'Chefs d\'équipe',   value: stats.leaders, sub: 'Référents', icon: Star, tone: 'var(--gold)' },
            { label: 'Zones couvertes',    value: new Set((members || []).flatMap(m => m.zones || [])).size, sub: 'Secteurs actifs', icon: Navigation, tone: 'var(--terra)' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '22px 26px', borderRight: i < 3 ? '1px solid var(--line-2)' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: `color-mix(in oklch, ${k.tone || 'var(--ink)'} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <k.icon style={{ width: 13, height: 13, color: k.tone || 'var(--ink)' }} />
                </div>
                <span className="eqp-label">{k.label}</span>
              </div>
              <div className="eqp-display" style={{ fontSize: 32, fontWeight: 500, color: k.tone || 'var(--ink)', lineHeight: 1 }}>
                {k.value}
              </div>
              <div className="eqp-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, letterSpacing: '0.06em' }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="eqp-body eqp-fade" style={{ padding: '0 48px 20px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="eqp-label"><Filter style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> Filtre :</span>
          {[['all','Tous'],['active','En service'],['leader','Chefs']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                padding: '6px 14px', borderRadius: 999,
                border: `1px solid ${filter === k ? 'var(--ink)' : 'var(--line)'}`,
                background: filter === k ? 'var(--ink)' : 'var(--surface)',
                color: filter === k ? 'var(--bg)' : 'var(--ink-3)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Grille médaillons */}
      <div className="eqp-body eqp-fade" style={{ padding: '0 48px 40px' }}>
        {isLoading ? (
          <div style={{ padding: 80, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Rassemblement de l'équipage…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center',
            background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14,
            fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)',
          }}>
            Aucun intervenant ne correspond à cette recherche.
          </div>
        ) : (
          <div className="eqp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map((m, i) => {
              const name = m.name || m.full_name || `Intervenant ${i + 1}`;
              const skills = m.skills || m.specialties || [];
              const zones = m.zones || m.areas || [];
              const rating = m.rating || m.avg_rating;
              return (
                <div
                  key={m.id || m._id || m.email || i}
                  className="eqp-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setAssignOpen({ ...m, _name: name })}
                  title="Cliquer pour assigner une mission"
                >
                  <div className="eqp-medal">{initials(name)}</div>
                  <div className="eqp-display" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>
                    {name}
                  </div>
                  <div className="eqp-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    {m.role || m.title || 'Intervenant'}
                  </div>

                  {rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                      <Star style={{ width: 13, height: 13, color: 'var(--gold)', fill: 'var(--gold)' }} />
                      <span className="eqp-mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                        {Number(rating).toFixed(1)}
                      </span>
                    </div>
                  )}

                  {(skills.length > 0 || zones.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
                      {skills.slice(0, 3).map((s, idx) => (
                        <span key={'s' + idx} className="eqp-badge" style={{ background: 'var(--emerald-soft)', borderColor: 'var(--emerald)', color: 'var(--emerald)' }}>{s}</span>
                      ))}
                      {zones.slice(0, 2).map((z, idx) => (
                        <span key={'z' + idx} className="eqp-badge">
                          <MapPin style={{ width: 8, height: 8 }} /> {z}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="eqp-contact-btn" title={m.phone} onClick={e => e.stopPropagation()}>
                        <Phone style={{ width: 13, height: 13 }} />
                      </a>
                    )}
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="eqp-contact-btn" title={m.email} onClick={e => e.stopPropagation()}>
                        <Mail style={{ width: 13, height: 13 }} />
                      </a>
                    )}
                    <button
                      className="eqp-contact-btn"
                      onClick={e => { e.stopPropagation(); setAssignOpen({ ...m, _name: name }); }}
                      title="Assigner une mission"
                      style={{ marginLeft: 'auto', background: 'var(--emerald-soft)', color: 'var(--emerald)', borderColor: 'var(--emerald)' }}
                    >
                      <Briefcase style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════ MODALE ASSIGNER MISSION ═══════════ */}
      {assignOpen && (
        <AssignMissionModal
          intervenant={assignOpen}
          onClose={() => setAssignOpen(null)}
          onDone={(msg) => { setAssignOpen(null); showToast(msg, 'ok'); }}
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

/* ═════════════ MODALE ASSIGNATION MISSION ═════════════ */
function AssignMissionModal({ intervenant, onClose, onDone, onError }) {
  const [leads, setLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [form, setForm] = useState({
    lead_id: '',
    title: '',
    description: '',
    service_type: '',
    address: '',
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time: '09:00',
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
    if (!form.scheduled_date) return onError('Choisissez une date');
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
        assigned_members: [intervenant.member_id || intervenant.id || intervenant._id || intervenant.email],
      };
      if (intervenant.team_id) payload.team_id = intervenant.team_id;
      await api.post('/planning/interventions', payload);
      onDone(`✓ Mission assignée à ${intervenant._name}`);
    } catch (e) {
      onError(e?.response?.data?.detail || 'Création impossible');
    }
    setSaving(false);
  };

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
          background: 'var(--paper)', borderRadius: 16,
          width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '22px 26px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 999,
            background: 'linear-gradient(135deg, var(--terra-soft) 0%, var(--warm-soft) 100%)',
            border: '2px solid var(--terra)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, color: 'var(--terra)',
          }}>
            {initials(intervenant._name)}
          </div>
          <div style={{ flex: 1 }}>
            <div className="eqp-label" style={{ marginBottom: 4 }}>Assigner une mission</div>
            <div className="eqp-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>
              à <em className="eqp-italic">{intervenant._name}</em>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 999, border: '1px solid var(--line)',
            background: 'var(--surface)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Client */}
          <div>
            <div className="eqp-label" style={{ marginBottom: 8 }}>Client</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10,
              padding: '9px 14px', marginBottom: 8,
            }}>
              <Search style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
              <input
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                placeholder="Rechercher un client…"
                className="eqp-mono"
                style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
              />
            </div>
            <div style={{
              maxHeight: 180, overflowY: 'auto',
              border: '1px solid var(--line)', borderRadius: 10,
              background: 'var(--surface)',
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
                    background: form.lead_id === l.lead_id ? 'var(--emerald-soft)' : 'transparent',
                    transition: 'background .1s',
                  }}
                >
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                    {l.name || 'Sans nom'}
                  </div>
                  <div className="eqp-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 2 }}>
                    {l.address || l.email || l.phone || ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <div className="eqp-label" style={{ marginBottom: 6 }}>Titre de la mission</div>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ex : Ménage appartement 3 pièces"
              className="eqp-mono"
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)',
                fontSize: 13, color: 'var(--ink)', outline: 'none',
                fontFamily: 'Fraunces, serif',
              }}
            />
          </div>

          {/* Date + Heure + Durée */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10 }}>
            <div>
              <div className="eqp-label" style={{ marginBottom: 6 }}>
                <Calendar style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> Date
              </div>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))}
                className="eqp-mono"
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)',
                  fontSize: 12, color: 'var(--ink)', outline: 'none',
                }}
              />
            </div>
            <div>
              <div className="eqp-label" style={{ marginBottom: 6 }}>
                <Clock style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> Heure
              </div>
              <input
                type="time"
                value={form.scheduled_time}
                onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))}
                className="eqp-mono"
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)',
                  fontSize: 12, color: 'var(--ink)', outline: 'none',
                }}
              />
            </div>
            <div>
              <div className="eqp-label" style={{ marginBottom: 6 }}>Durée (h)</div>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={form.duration_hours}
                onChange={e => setForm(p => ({ ...p, duration_hours: e.target.value }))}
                className="eqp-mono"
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)',
                  fontSize: 12, color: 'var(--ink)', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="eqp-label" style={{ marginBottom: 6 }}>Notes (optionnel)</div>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Instructions, matériel nécessaire, code d'accès…"
              rows={3}
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)',
                fontSize: 13, color: 'var(--ink)', outline: 'none',
                fontFamily: 'Fraunces, serif', resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 26px', borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onClose} style={{
            padding: '10px 18px', borderRadius: 999,
            border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em',
            textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
          }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 999, border: 'none',
            background: 'var(--ink)', color: 'var(--bg)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em',
            textTransform: 'uppercase', fontWeight: 500,
            cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            <CheckCircle style={{ width: 13, height: 13 }} />
            {saving ? 'Création…' : 'Assigner la mission'}
          </button>
        </div>
      </div>
    </div>
  );
}
