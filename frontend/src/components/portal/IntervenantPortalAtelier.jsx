// IntervenantPortalAtelier.jsx — Portail intervenant, identité magazine atelier.
// Mobile-first : grand titre Fraunces italic, carte mission en cours (noire/XXL),
// timeline check-in/out avec barre de progression, carte d'accueil cliente
// avec trail SVG façon GPS, checklist contextuelle, photos, messagerie bureau.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Calendar, Clock, MapPin, LogOut, Play, CheckCircle, Phone, MessageSquare,
  ChevronRight, ArrowRight, RefreshCw, X, Check, Send, FileText, Upload,
  Navigation, Shield, Mail, AlertCircle, Camera, Home, Star, Sparkles, Image as ImageIcon,
} from 'lucide-react';
import BACKEND_URL from '../../config.js';

const API = BACKEND_URL + '/api/intervenant';
const CRM = BACKEND_URL + '/api';

/* ─── Axios avec token intervenant ─── */
const iAxios = axios.create({ withCredentials: true });
iAxios.interceptors.request.use(config => {
  const token = localStorage.getItem('intervenant_token');
  if (token) config.headers['X-Intervenant-Token'] = token;
  return config;
});

/* ═════════════════ TOKENS ═════════════════ */
const tokenStyle = `
  .ia-root {
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
    --emerald-deep: oklch(0.38 0.14 160);
    --emerald-soft: oklch(0.93 0.05 165);
    --gold: oklch(0.72 0.13 85);
    --rouge: oklch(0.48 0.15 25);
    --sepia: oklch(0.55 0.08 65);
    --warm: oklch(0.62 0.14 45);

    background:
      radial-gradient(ellipse at top left, oklch(0.95 0.04 165 / 0.6) 0%, transparent 45%),
      radial-gradient(ellipse at bottom right, oklch(0.96 0.04 80 / 0.55) 0%, transparent 50%),
      var(--bg);
    min-height: 100vh;
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding-bottom: 80px;
  }
  .ia-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .ia-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .ia-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.18em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .ia-italic  { font-style: italic; color: var(--emerald); font-weight: 400; }

  /* Carte dark mission en cours — XXL */
  .ia-mission-active {
    background: linear-gradient(135deg, oklch(0.16 0.018 60) 0%, oklch(0.22 0.03 165) 100%);
    color: oklch(0.95 0.01 80);
    border-radius: 22px;
    padding: 22px 24px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(0,0,0,0.14);
  }
  .ia-mission-active::before {
    content: '';
    position: absolute; top: -50%; right: -20%;
    width: 300px; height: 300px;
    background: radial-gradient(circle, oklch(0.52 0.13 165 / 0.22) 0%, transparent 70%);
    pointer-events: none;
  }
  .ia-mission-active .lbl {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: oklch(0.72 0.13 85); font-weight: 600;
  }
  .ia-mission-active .time-big {
    font-family: 'JetBrains Mono', monospace; font-size: 14px;
    font-weight: 600; color: oklch(0.92 0.04 85);
    letter-spacing: 0.04em;
  }

  /* Suite timeline */
  .ia-suite-line {
    display: grid; grid-template-columns: 68px 4px 1fr auto;
    gap: 14px; align-items: center;
    padding: 14px 0;
    position: relative;
  }
  .ia-suite-bar {
    width: 2px; background: var(--line);
    align-self: stretch; margin: 0 auto;
    border-radius: 999px;
  }
  .ia-suite-dot {
    width: 10px; height: 10px; border-radius: 999px;
    background: var(--emerald);
    position: absolute; left: 90px; top: 50%;
    transform: translate(-50%, -50%);
  }

  /* Boutons CTA */
  .ia-cta-primary {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 14px 24px; border-radius: 999px;
    background: var(--emerald); color: white; border: none;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
    cursor: pointer; transition: all .2s;
    box-shadow: 0 6px 18px oklch(0.52 0.13 165 / 0.3);
  }
  .ia-cta-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 22px oklch(0.52 0.13 165 / 0.4); }
  .ia-cta-primary:disabled { opacity: 0.5; cursor: wait; }

  .ia-cta-secondary {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; padding: 14px 20px; border-radius: 999px;
    background: rgba(255,255,255,0.08); color: oklch(0.92 0.04 85); border: 1px solid oklch(0.35 0.02 60);
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: all .15s;
  }
  .ia-cta-secondary:hover { background: rgba(255,255,255,0.15); }

  .ia-cta-dark {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 14px 22px; border-radius: 999px;
    background: var(--ink); color: var(--bg); border: none;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
    cursor: pointer; transition: all .15s;
    width: 100%;
  }
  .ia-cta-dark:hover { opacity: 0.88; }

  /* Carte info claire */
  .ia-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 18px; padding: 18px 20px;
  }

  /* Badge récurrent */
  .ia-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
    background: var(--emerald-soft); color: var(--emerald-deep);
    border: 1px solid var(--emerald);
  }

  /* Onglets bottom nav mobile */
  .ia-bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--paper); border-top: 1px solid var(--line);
    display: flex; padding: 8px 12px 14px;
    z-index: 50;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.04);
  }
  .ia-nav-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 4px; padding: 8px 4px; background: transparent; border: none;
    cursor: pointer; color: var(--ink-3); transition: color .15s;
  }
  .ia-nav-btn.active { color: var(--emerald); }
  .ia-nav-btn .ia-nav-label {
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500;
  }

  @keyframes ia-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .ia-fade { animation: ia-fade-in .35s ease; }

  @media (min-width: 760px) {
    .ia-shell { max-width: 480px; margin: 0 auto; padding: 24px 20px 100px; }
  }
`;

/* ═════════════════ LOGIN ═════════════════ */
function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/request`, { email });
      if (res.data.dev_code) toast.success(`Code : ${res.data.dev_code}`, { duration: 10000 });
      else toast.success('Code envoyé par email');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Email non reconnu');
    }
    setLoading(false);
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/verify`, { email, code }, { withCredentials: true });
      localStorage.setItem('intervenant_token', res.data.token);
      iAxios.defaults.headers.common['X-Intervenant-Token'] = res.data.token;
      onAuth(res.data.agent);
    } catch { toast.error('Code invalide ou expiré'); }
    setLoading(false);
  };

  return (
    <div className="ia-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{tokenStyle}</style>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="ia-label" style={{ marginBottom: 12 }}>Portail Atelier</div>
          <h1 className="ia-display" style={{ fontSize: 42, fontWeight: 300, lineHeight: 1, margin: 0 }}>
            Bienvenue à <em className="ia-italic">l'atelier</em>
          </h1>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', marginTop: 10 }}>
            Connecte-toi pour accéder à tes missions du jour.
          </p>
        </div>

        <div className="ia-card" style={{ padding: '24px 22px' }}>
          {step === 1 ? (
            <form onSubmit={requestCode}>
              <label className="ia-label" style={{ display: 'block', marginBottom: 8 }}>Email professionnel</label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
                padding: '12px 14px', marginBottom: 16,
              }}>
                <Mail style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input
                  type="email" required autoFocus
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="toi@globalcleanhome.com"
                  style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 14, color: 'var(--ink)' }}
                />
              </div>
              <button type="submit" disabled={loading} className="ia-cta-primary" style={{ width: '100%' }}>
                {loading ? 'Envoi…' : 'Recevoir mon code'}
                <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <Shield style={{ width: 28, height: 28, color: 'var(--emerald)' }} />
                <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-2)', margin: '8px 0 0' }}>
                  Code envoyé à <strong style={{ fontStyle: 'normal' }}>{email}</strong>
                </p>
              </div>
              <input
                type="text" required autoFocus maxLength={6}
                value={code} onChange={e => setCode(e.target.value)}
                placeholder="• • • • • •"
                style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  textAlign: 'center', fontSize: 28, fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700, letterSpacing: '0.4em', color: 'var(--ink)',
                  outline: 0, marginBottom: 14,
                }}
              />
              <button type="submit" disabled={loading} className="ia-cta-primary" style={{ width: '100%', marginBottom: 10 }}>
                {loading ? 'Vérification…' : 'Accéder à l\'espace'}
              </button>
              <button type="button" onClick={() => { setStep(1); setCode(''); }}
                style={{ width: '100%', background: 'none', border: 0, color: 'var(--ink-3)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', padding: 8 }}>
                ← Changer d'email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════ HELPERS ═════════════════ */
const fmtTime = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};
const fmtDayLong = (iso) => {
  try { return new Date(iso || Date.now()).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }
  catch { return ''; }
};

const SERVICE_ICONS = {
  'ménage': Home, menage: Home, canapé: '🛋️', canape: '🛋️',
  matelas: '🛏️', tapis: '🪣', bureaux: '🏢', vitre: '🪟',
};

/* ═════════════════ MAP TRAIL SVG ═════════════════ */
function MapTrail({ distance = '12 m' }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 160, borderRadius: 14,
      background: 'var(--surface)', border: '1px solid var(--line)',
      backgroundImage:
        'repeating-linear-gradient(0deg, oklch(0.92 0.010 78) 0, oklch(0.92 0.010 78) 1px, transparent 1px, transparent 22px), ' +
        'repeating-linear-gradient(90deg, oklch(0.92 0.010 78) 0, oklch(0.92 0.010 78) 1px, transparent 1px, transparent 22px)',
      overflow: 'hidden',
    }}>
      {/* Badge distance */}
      <div style={{
        position: 'absolute', top: 10, left: 12,
        padding: '4px 10px', borderRadius: 999,
        background: 'var(--paper)', border: '1px solid var(--line)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-2)',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        📍 {distance} de la cible
      </div>

      {/* Trail */}
      <svg viewBox="0 0 400 160" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="ia-target-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Halo cible */}
        <circle cx="340" cy="70" r="60" fill="url(#ia-target-glow)" />
        {/* Trail courbe pointillée */}
        <path
          d="M 40 110 Q 120 60, 180 100 T 340 70"
          fill="none" stroke="oklch(0.52 0.13 165)" strokeWidth="2.5"
          strokeDasharray="4 5" strokeLinecap="round"
        />
        {/* Point de départ */}
        <circle cx="40" cy="110" r="6" fill="oklch(0.52 0.13 165)" />
        <circle cx="40" cy="110" r="10" fill="none" stroke="oklch(0.52 0.13 165)" strokeWidth="1.5" opacity="0.5" />
        {/* Point cible */}
        <circle cx="340" cy="70" r="8" fill="oklch(0.165 0.012 60)" />
        <circle cx="340" cy="70" r="14" fill="none" stroke="oklch(0.165 0.012 60)" strokeWidth="1.5" opacity="0.4" />
      </svg>
    </div>
  );
}

/* ═════════════════ DASHBOARD ACCUEIL ═════════════════ */
function ViewAccueil({ agent, interventions, onStart, onOpenMission, onSelectTab }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const todayMissions = useMemo(() => interventions.filter(i => {
    const d = (i.scheduled_date || i.date || '').slice(0, 10);
    return d === todayStr && i.status !== 'terminée';
  }).sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || '')), [interventions, todayStr]);

  const active = interventions.find(i => i.status === 'en_cours');
  const next = todayMissions.find(i => i !== active);

  const totalHours = useMemo(() => {
    return todayMissions.reduce((s, i) => s + (Number(i.duration_hours) || 2), 0);
  }, [todayMissions]);

  const agentName = agent?.full_name?.split(' ')[0] || agent?.name?.split(' ')[0] || agent?.first_name || 'toi';

  return (
    <div className="ia-fade" style={{ padding: '24px 20px 40px' }}>
      <div style={{ marginBottom: 18 }}>
        <div className="ia-label">{fmtDayLong(new Date())}</div>
        <h1 className="ia-display" style={{
          fontSize: 40, fontWeight: 300, lineHeight: 0.95, margin: '10px 0 6px', color: 'var(--ink)',
        }}>
          Bonjour <em className="ia-italic">{agentName}</em>.
        </h1>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)' }}>
          {todayMissions.length} mission{todayMissions.length > 1 ? 's' : ''} · {totalHours.toFixed(1).replace('.', 'h').replace('h0', 'h')} prévue{totalHours > 1 ? 's' : ''}
        </div>
      </div>

      {/* MISSION EN COURS (dark card XXL) */}
      {active ? (
        <ActiveMissionCard intervention={active} onCheckout={() => onOpenMission(active, true)} onOpen={() => onOpenMission(active, false)} />
      ) : next ? (
        <UpcomingHeroCard intervention={next} onStart={() => onStart(next)} onOpen={() => onOpenMission(next, false)} />
      ) : (
        <div className="ia-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🎯</div>
          <div className="ia-display" style={{ fontSize: 18, fontStyle: 'italic', color: 'var(--ink-2)' }}>
            Pas de mission planifiée aujourd'hui.
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            Profite du temps libre pour mettre à jour tes documents.
          </div>
        </div>
      )}

      {/* SUITE DE LA JOURNÉE */}
      {todayMissions.length > 1 && (
        <div style={{ marginTop: 28 }}>
          <div className="ia-label" style={{ marginBottom: 10 }}>Suite</div>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 18, padding: '4px 18px' }}>
            {todayMissions.filter(m => m !== active && m !== next).map((m, i) => (
              <div key={m.intervention_id || m.id || i}
                onClick={() => onOpenMission(m, false)}
                className="ia-suite-line"
                style={{ cursor: 'pointer', borderBottom: i < todayMissions.length - 3 ? '1px solid var(--line-2)' : 0 }}>
                <div>
                  <div className="ia-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{m.scheduled_time || '—'}</div>
                  <div className="ia-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', marginTop: 2 }}>
                    {m.duration_hours ? `${m.duration_hours}h00` : ''}
                  </div>
                </div>
                <div className="ia-suite-bar" />
                <div>
                  <div className="ia-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>
                    {m.title || m.service_type || 'Mission'}
                  </div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {m.address || m.city || ''}
                  </div>
                </div>
                <ChevronRight style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={() => onSelectTab('planning')}
          style={{
            padding: '14px 16px', borderRadius: 16,
            background: 'var(--paper)', border: '1px solid var(--line)', textAlign: 'left',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          }}>
          <Calendar style={{ width: 18, height: 18, color: 'var(--emerald)' }} />
          <div>
            <div className="ia-label" style={{ marginBottom: 2 }}>Mon planning</div>
            <div className="ia-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{interventions.length} au total</div>
          </div>
        </button>
        <button onClick={() => onSelectTab('messages')}
          style={{
            padding: '14px 16px', borderRadius: 16,
            background: 'var(--paper)', border: '1px solid var(--line)', textAlign: 'left',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          }}>
          <MessageSquare style={{ width: 18, height: 18, color: 'var(--sepia)' }} />
          <div>
            <div className="ia-label" style={{ marginBottom: 2 }}>Bureau</div>
            <div className="ia-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>Messagerie</div>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ─ Mission EN COURS (dark XXL) ─ */
function ActiveMissionCard({ intervention, onCheckout, onOpen }) {
  const start = intervention.actual_start_time || intervention.scheduled_time || '—';
  const end = intervention.scheduled_end_time || intervention.scheduled_time || '—';
  const name = intervention.lead_name || intervention.client_name || intervention.title || 'Client';
  const addr = intervention.address || '';
  const now = new Date();
  const nowTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  // Progression estimée (entre scheduled_time et scheduled_end_time)
  const startM = (() => {
    const t = intervention.actual_start_time || intervention.scheduled_time;
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  })();
  const endM = (() => {
    const dur = Number(intervention.duration_hours || 2);
    if (startM == null) return null;
    return startM + dur * 60;
  })();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const progress = (startM != null && endM != null && endM > startM)
    ? Math.max(0, Math.min(100, ((nowM - startM) / (endM - startM)) * 100)) : 0;

  return (
    <div className="ia-mission-active ia-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div className="lbl">En cours</div>
        <div className="time-big">{nowTime}</div>
      </div>
      <div className="ia-display" style={{
        fontSize: 26, fontWeight: 500, lineHeight: 1.05, marginBottom: 6,
        color: 'oklch(0.95 0.01 80)',
      }}>
        {name} — {intervention.service_type || 'visite'}
      </div>
      <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'oklch(0.78 0.04 80)', marginBottom: 18 }}>
        {addr}
      </div>

      {/* Timeline progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(0.72 0.04 80)', letterSpacing: '0.06em', marginBottom: 6 }}>
        <span>{start}</span>
        <span style={{ color: 'oklch(0.72 0.13 85)' }}>~{Math.round((100 - progress) * (Number(intervention.duration_hours || 2) * 60) / 100)}min</span>
        <span>{typeof end === 'string' ? end : ''}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'oklch(0.72 0.13 85)', transition: 'width 1s' }} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCheckout} className="ia-cta-primary" style={{ flex: 1 }}>
          <Check style={{ width: 14, height: 14 }} /> Check-out
        </button>
        <button onClick={onOpen} className="ia-cta-secondary" style={{ padding: '14px 18px' }}>
          <Camera style={{ width: 13, height: 13 }} /> Photo
        </button>
      </div>
    </div>
  );
}

/* ─ Mission PROCHAINE (claire avec start) ─ */
function UpcomingHeroCard({ intervention, onStart, onOpen }) {
  const name = intervention.lead_name || intervention.client_name || intervention.title || 'Mission';
  return (
    <div className="ia-card ia-fade" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div className="ia-label">Prochaine · {intervention.scheduled_time || 'aujourd\'hui'}</div>
        {intervention.is_recurring && <span className="ia-badge">Récurrent</span>}
      </div>
      <h2 className="ia-display" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.15, margin: '0 0 4px', color: 'var(--ink)' }}>
        Bienvenue chez <em className="ia-italic">{name}</em>
      </h2>
      <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
        {intervention.address || ''}
      </div>

      <MapTrail distance="12 m" />

      <div style={{ margin: '16px 0' }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div className="ia-label">Mission</div>
            {intervention.is_recurring && <span className="ia-badge">Récurrent</span>}
          </div>
          <div className="ia-display" style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink)' }}>
            {intervention.title || intervention.service_type}
            {intervention.duration_hours ? ` · ${intervention.duration_hours}h` : ''}
          </div>
          {Array.isArray(intervention.resources) && intervention.resources.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-2)' }}>
              {intervention.resources.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Check style={{ width: 13, height: 13, color: 'var(--emerald)' }} /> {r}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button onClick={onStart} className="ia-cta-dark">
        Démarrer la mission <ArrowRight style={{ width: 13, height: 13 }} />
      </button>
      <button onClick={onOpen}
        style={{
          width: '100%', marginTop: 8, padding: 12, borderRadius: 999,
          background: 'transparent', border: '1px solid var(--line)',
          color: 'var(--ink-2)', fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}>
        Voir détails
      </button>
    </div>
  );
}

/* ═════════════════ VIEW PLANNING ═════════════════ */
function ViewPlanning({ interventions, onOpen }) {
  const byDay = useMemo(() => {
    const map = new Map();
    interventions.sort((a, b) => {
      const da = (a.scheduled_date || '') + (a.scheduled_time || '');
      const db = (b.scheduled_date || '') + (b.scheduled_time || '');
      return da.localeCompare(db);
    }).forEach(i => {
      const d = (i.scheduled_date || '').slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(i);
    });
    return [...map.entries()];
  }, [interventions]);

  return (
    <div className="ia-fade" style={{ padding: '24px 20px 40px' }}>
      <div className="ia-label" style={{ marginBottom: 8 }}>Mon planning</div>
      <h1 className="ia-display" style={{ fontSize: 32, fontWeight: 300, margin: '0 0 18px', lineHeight: 1 }}>
        Le fil des <em className="ia-italic">missions</em>
      </h1>

      {byDay.length === 0 ? (
        <div className="ia-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Aucune mission planifiée.
        </div>
      ) : (
        byDay.map(([date, missions]) => (
          <div key={date || 'x'} style={{ marginBottom: 20 }}>
            <div className="ia-label" style={{ marginBottom: 8 }}>
              {date ? new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Sans date'}
            </div>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              {missions.map((m, i) => {
                const status = m.status || 'planifiée';
                const tone = status === 'en_cours' ? 'var(--gold)'
                  : status === 'terminée' ? 'var(--emerald)'
                  : status === 'annulée' ? 'var(--rouge)' : 'var(--ink-3)';
                return (
                  <div key={m.intervention_id || m.id || i}
                    onClick={() => onOpen(m, false)}
                    style={{
                      display: 'grid', gridTemplateColumns: '70px 1fr auto',
                      gap: 14, alignItems: 'center',
                      padding: '14px 18px',
                      borderBottom: i < missions.length - 1 ? '1px solid var(--line-2)' : 0,
                      cursor: 'pointer',
                    }}>
                    <div>
                      <div className="ia-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                        {m.scheduled_time || '—'}
                      </div>
                      <div style={{
                        display: 'inline-block', marginTop: 4, padding: '2px 7px', borderRadius: 999,
                        background: `color-mix(in oklch, ${tone} 14%, transparent)`, color: tone,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                        letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                      }}>{status}</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="ia-display" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.title || m.service_type}
                      </div>
                      <div className="ia-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 2 }}>
                        {m.address || m.city || ''}
                      </div>
                    </div>
                    <ChevronRight style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ═════════════════ MISSION DETAIL ═════════════════ */
function MissionDetailModal({ mission, onClose, onStart, onCheckout, onSendPhoto }) {
  if (!mission) return null;
  const name = mission.lead_name || mission.client_name || mission.title;
  const addr = mission.address || '';
  const phone = mission.lead_phone || mission.client_phone;

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', zIndex: 90,
        backdropFilter: 'blur(4px)',
      }}>
      <div onClick={e => e.stopPropagation()}
        className="ia-fade"
        style={{
          background: 'var(--paper)', width: '100%',
          borderRadius: '24px 24px 0 0', maxHeight: '92vh', overflowY: 'auto',
          padding: '22px 20px 32px',
        }}>
        <div style={{ width: 40, height: 4, background: 'var(--line)', borderRadius: 999, margin: '0 auto 18px' }} />

        <div style={{ marginBottom: 14 }}>
          <div className="ia-label" style={{ marginBottom: 6 }}>
            Check-in · {mission.scheduled_time || ''}
          </div>
          <h2 className="ia-display" style={{ fontSize: 26, fontWeight: 300, lineHeight: 1.1, margin: 0 }}>
            Bienvenue chez <em className="ia-italic">{name}</em>
          </h2>
        </div>

        <MapTrail distance="~ à venir" />

        <div className="ia-card" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="ia-label">Mission</div>
            {mission.is_recurring && <span className="ia-badge">Récurrent</span>}
          </div>
          <div className="ia-display" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
            {mission.title || mission.service_type}
            {mission.duration_hours ? ` · ${mission.duration_hours}h00` : ''}
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>
            {addr}
          </div>
          {mission.description && (
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 10 }}>
              « {mission.description} »
            </div>
          )}
          {phone && (
            <a href={`tel:${phone}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              color: 'var(--emerald)', textDecoration: 'none',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              <Phone style={{ width: 12, height: 12 }} /> {phone}
            </a>
          )}
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mission.status !== 'en_cours' && mission.status !== 'terminée' && (
            <button onClick={() => { onStart(); onClose(); }} className="ia-cta-dark">
              <Play style={{ width: 14, height: 14 }} /> Démarrer la mission
            </button>
          )}
          {mission.status === 'en_cours' && (
            <>
              <button onClick={() => { onCheckout(); onClose(); }} className="ia-cta-primary" style={{ width: '100%' }}>
                <Check style={{ width: 14, height: 14 }} /> Terminer + Checklist
              </button>
              <label className="ia-cta-dark" style={{ cursor: 'pointer' }}>
                <Camera style={{ width: 13, height: 13 }} /> Ajouter une photo
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { onSendPhoto(f); onClose(); }
                  }} />
              </label>
            </>
          )}
          {addr && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`}
              target="_blank" rel="noopener noreferrer"
              className="ia-cta-dark"
              style={{ background: 'var(--emerald-soft)', color: 'var(--emerald-deep)', textDecoration: 'none' }}
            >
              <Navigation style={{ width: 13, height: 13 }} /> Itinéraire Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════ CHECKLIST (sortie mission) ═════════════════ */
function ChecklistSheet({ mission, onClose, onComplete }) {
  const type = (mission.service_type || '').toLowerCase();
  const items = type.includes('canap') ? ['Dépoussiérage préalable', 'Traitement des taches', 'Injection-extraction', 'Séchage vérifié', 'Résultat validé avec le client']
    : type.includes('matelas') ? ['Dépoussiérage', 'Anti-acariens appliqué', 'Injection-extraction', 'Séchage vérifié', 'Protège-matelas replacé']
    : type.includes('tapis') ? ['Dépoussiérage', 'Traitement taches', 'Shampooing', 'Rinçage', 'Séchage contrôlé']
    : type.includes('bureau') ? ['Postes de travail nettoyés', 'Sanitaires désinfectés', 'Parties communes', 'Poubelles vidées', 'Sols nettoyés', 'Accès sécurisé']
    : ['Matériel vérifié', 'Zone sécurisée', 'Client informé', 'Prestation réalisée', 'Zone rangée', 'Photos prises', 'Client satisfait'];

  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', zIndex: 95, backdropFilter: 'blur(4px)',
      }}>
      <div onClick={e => e.stopPropagation()}
        className="ia-fade"
        style={{
          background: 'var(--paper)', width: '100%',
          borderRadius: '24px 24px 0 0', maxHeight: '94vh', overflowY: 'auto',
          padding: '22px 20px 24px',
        }}>
        <div style={{ width: 40, height: 4, background: 'var(--line)', borderRadius: 999, margin: '0 auto 14px' }} />

        <div className="ia-label" style={{ marginBottom: 6 }}>Check-out</div>
        <h2 className="ia-display" style={{ fontSize: 26, fontWeight: 300, lineHeight: 1.05, margin: '0 0 6px' }}>
          Clore la <em className="ia-italic">mission</em>
        </h2>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
          {mission.title || mission.service_type}
        </div>

        {/* Progress */}
        <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 999, marginBottom: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(done / items.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--emerald), var(--emerald-deep))',
            transition: 'width .3s',
          }} />
        </div>
        <div className="ia-mono" style={{ fontSize: 10, color: 'var(--emerald)', letterSpacing: '0.06em', marginBottom: 14 }}>
          {done}/{items.length} complétés
        </div>

        {/* Items */}
        {items.map((item, i) => (
          <button key={i} onClick={() => setChecked(p => ({ ...p, [i]: !p[i] }))}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 14,
              background: checked[i] ? 'var(--emerald-soft)' : 'var(--surface)',
              border: `1px solid ${checked[i] ? 'var(--emerald)' : 'var(--line)'}`,
              cursor: 'pointer', marginBottom: 8, textAlign: 'left',
            }}>
            <div style={{
              width: 22, height: 22, borderRadius: 7,
              background: checked[i] ? 'var(--emerald)' : 'transparent',
              border: `1.5px solid ${checked[i] ? 'var(--emerald)' : 'var(--ink-3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {checked[i] && <Check style={{ width: 14, height: 14, color: 'white' }} />}
            </div>
            <span style={{
              fontFamily: 'Fraunces, serif', fontSize: 14,
              color: checked[i] ? 'var(--emerald-deep)' : 'var(--ink)',
              textDecoration: checked[i] ? 'line-through' : 'none',
            }}>{item}</span>
          </button>
        ))}

        {/* Note client */}
        <div style={{ marginTop: 16 }}>
          <div className="ia-label" style={{ marginBottom: 8 }}>Satisfaction perçue</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              }}>
                <Star style={{
                  width: 26, height: 26,
                  color: n <= rating ? 'var(--gold)' : 'var(--line)',
                  fill: n <= rating ? 'var(--gold)' : 'transparent',
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginTop: 14 }}>
          <div className="ia-label" style={{ marginBottom: 8 }}>Observations</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Problèmes rencontrés, matériel supplémentaire utilisé…"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              background: 'var(--surface)', border: '1px solid var(--line)',
              fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)',
              outline: 'none', resize: 'vertical',
            }} />
        </div>

        <button
          onClick={() => onComplete(checked, notes, rating)}
          disabled={done < Math.ceil(items.length * 0.7)}
          className="ia-cta-primary"
          style={{ width: '100%', marginTop: 18, opacity: done < Math.ceil(items.length * 0.7) ? 0.5 : 1 }}
        >
          {done === items.length ? '🎉 Terminer la mission' : `Encore ${items.length - done} tâche${items.length - done > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

/* ═════════════════ VIEW MESSAGES ═════════════════ */
function ViewMessages({ messages, onSend, onRefresh }) {
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="ia-fade" style={{ padding: '24px 20px 120px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 90px)' }}>
      <div style={{ marginBottom: 18 }}>
        <div className="ia-label">Bureau</div>
        <h1 className="ia-display" style={{ fontSize: 30, fontWeight: 300, margin: '8px 0 2px' }}>
          Le <em className="ia-italic">salon</em>
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {messages.length === 0 ? (
          <div className="ia-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Aucun message.<br/>Écris au bureau, ils répondent sous 5 min.
          </div>
        ) : messages.map((m, i) => {
          const mine = m.from === 'intervenant' || m.sender === 'intervenant' || m.author_type === 'intervenant';
          return (
            <div key={m.id || i} style={{
              display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                background: mine ? 'var(--ink)' : 'var(--paper)',
                color: mine ? 'var(--bg)' : 'var(--ink)',
                border: mine ? 'none' : '1px solid var(--line)',
                borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontFamily: 'Fraunces, serif', fontSize: 14,
              }}>
                {m.content || m.text}
                <div className="ia-mono" style={{
                  fontSize: 9, marginTop: 4, letterSpacing: '0.04em',
                  color: mine ? 'oklch(0.72 0.008 70)' : 'var(--ink-3)',
                }}>
                  {fmtTime(m.created_at || m.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0' }}>
        <input
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { onSend(draft); setDraft(''); } }}
          placeholder="Un mot au bureau…"
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 999,
            background: 'var(--paper)', border: '1px solid var(--line)',
            fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)',
            outline: 'none',
          }} />
        <button
          onClick={() => { if (draft.trim()) { onSend(draft); setDraft(''); } }}
          disabled={!draft.trim()}
          style={{
            width: 44, height: 44, borderRadius: 999,
            background: draft.trim() ? 'var(--emerald)' : 'var(--line)',
            color: 'white', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Send style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

/* ═════════════════ VIEW PROFIL ═════════════════ */
function ViewProfil({ agent, onLogout }) {
  const initials = (agent?.full_name || agent?.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

  return (
    <div className="ia-fade" style={{ padding: '24px 20px 40px' }}>
      <div className="ia-card" style={{ padding: 26, textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 78, height: 78, borderRadius: 999, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, var(--emerald-soft), oklch(0.88 0.08 165))',
          color: 'var(--emerald-deep)', border: '3px solid var(--emerald)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 500,
        }}>
          {initials}
        </div>
        <h2 className="ia-display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px' }}>
          {agent?.full_name || agent?.name || 'Intervenant'}
        </h2>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)' }}>
          {agent?.role || agent?.function || 'Équipage · Global Clean Home'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div className="ia-card" style={{ padding: 14 }}>
          <div className="ia-label">Missions</div>
          <div className="ia-display" style={{ fontSize: 26, fontWeight: 500, color: 'var(--emerald)', lineHeight: 1, marginTop: 6 }}>
            {agent?.total_interventions ?? '—'}
          </div>
        </div>
        <div className="ia-card" style={{ padding: 14 }}>
          <div className="ia-label">Note moy.</div>
          <div className="ia-display" style={{ fontSize: 26, fontWeight: 500, color: 'var(--gold)', lineHeight: 1, marginTop: 6 }}>
            {agent?.rating ? Number(agent.rating).toFixed(1) : '—'}
          </div>
        </div>
      </div>

      <div className="ia-card">
        <div className="ia-label" style={{ marginBottom: 10 }}>Coordonnées</div>
        {agent?.email && <div style={{ padding: '10px 0', borderBottom: '1px dashed var(--line-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mail style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13 }}>{agent.email}</span>
        </div>}
        {agent?.phone && <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Phone style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13 }}>{agent.phone}</span>
        </div>}
      </div>

      <button onClick={onLogout} style={{
        width: '100%', marginTop: 26, padding: 14, borderRadius: 999,
        background: 'transparent', border: '1px solid var(--rouge)', color: 'var(--rouge)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em',
        textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <LogOut style={{ width: 13, height: 13 }} /> Se déconnecter
      </button>
    </div>
  );
}

/* ═════════════════ MAIN DASHBOARD ═════════════════ */
function Dashboard({ agent, onLogout }) {
  const [interventions, setInterventions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('accueil');
  const [detailMission, setDetailMission] = useState(null);
  const [checkoutMission, setCheckoutMission] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [intvRes, msgRes] = await Promise.allSettled([
        iAxios.get(`${API}/interventions`),
        iAxios.get(`${API}/messages`),
      ]);
      setInterventions(intvRes.status === 'fulfilled' ? (intvRes.value.data?.interventions || intvRes.value.data || []) : []);
      setMessages(msgRes.status === 'fulfilled' ? (msgRes.value.data?.messages || []) : []);
    } catch { toast.error('Chargement impossible'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (tab === 'messages') {
      const t = setInterval(() => iAxios.get(`${API}/messages`).then(r => setMessages(r.data?.messages || [])).catch(() => {}), 8000);
      return () => clearInterval(t);
    }
  }, [tab]);

  const handleStart = async (mission) => {
    try {
      await iAxios.post(`${API}/interventions/${mission.intervention_id || mission.id}/checkin`, {});
      toast.success('✅ Arrivée enregistrée');
      fetchData();
    } catch { toast.error('Échec check-in'); }
  };

  const handleComplete = async (checked, notes, rating) => {
    const id = checkoutMission.intervention_id || checkoutMission.id;
    try {
      await iAxios.post(`${API}/interventions/${id}/checkout`, {
        checklist: checked,
        notes,
        rating,
        completed_items: Object.values(checked).filter(Boolean).length,
      });
      toast.success('🎉 Mission terminée');
      setCheckoutMission(null);
      fetchData();
    } catch { toast.error('Erreur lors de la clôture'); }
  };

  const handleSend = async (content) => {
    try {
      await iAxios.post(`${API}/messages`, { content });
      const r = await iAxios.get(`${API}/messages`);
      setMessages(r.data?.messages || []);
    } catch { toast.error('Envoi impossible'); }
  };

  const handleSendPhoto = async (file) => {
    try {
      await iAxios.post(`${API}/messages`, { content: `📷 Photo d'intervention : ${file.name}`, attachment_name: file.name });
      toast.success('Photo notifiée au bureau');
    } catch { toast.error('Envoi impossible'); }
  };

  const openMission = (m, toCheckout) => {
    if (toCheckout) setCheckoutMission(m);
    else setDetailMission(m);
  };

  if (loading) {
    return (
      <div className="ia-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{tokenStyle}</style>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ width: 26, height: 26, color: 'var(--emerald)', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 14, fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14 }}>
            Chargement de l'atelier…
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="ia-root">
      <style>{tokenStyle}</style>
      <div className="ia-shell">
        {tab === 'accueil' && <ViewAccueil agent={agent} interventions={interventions} onStart={handleStart} onOpenMission={openMission} onSelectTab={setTab} />}
        {tab === 'planning' && <ViewPlanning interventions={interventions} onOpen={openMission} />}
        {tab === 'messages' && <ViewMessages messages={messages} onSend={handleSend} onRefresh={fetchData} />}
        {tab === 'profil' && <ViewProfil agent={agent} onLogout={onLogout} />}
      </div>

      {/* Bottom nav */}
      <div className="ia-bottom-nav">
        {[
          { k: 'accueil',  icon: Home,           label: 'Accueil' },
          { k: 'planning', icon: Calendar,       label: 'Planning' },
          { k: 'messages', icon: MessageSquare,  label: 'Bureau' },
          { k: 'profil',   icon: User,           label: 'Profil' },
        ].map(b => {
          const Active = b.icon;
          return (
            <button key={b.k} onClick={() => setTab(b.k)} className={`ia-nav-btn ${tab === b.k ? 'active' : ''}`}>
              <Active style={{ width: 20, height: 20 }} />
              <span className="ia-nav-label">{b.label}</span>
            </button>
          );
        })}
      </div>

      {detailMission && (
        <MissionDetailModal
          mission={detailMission}
          onClose={() => setDetailMission(null)}
          onStart={() => handleStart(detailMission)}
          onCheckout={() => setCheckoutMission(detailMission)}
          onSendPhoto={handleSendPhoto}
        />
      )}
      {checkoutMission && (
        <ChecklistSheet
          mission={checkoutMission}
          onClose={() => setCheckoutMission(null)}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

/* Icon for bottom nav */
function User(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ═════════════════ EXPORT ═════════════════ */
export default function IntervenantPortalAtelier() {
  const [agent, setAgent] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('intervenant_token');
    if (!token) { setChecking(false); return; }
    iAxios.get(`${API}/me`)
      .then(r => { setAgent(r.data); setChecking(false); })
      .catch(() => { localStorage.removeItem('intervenant_token'); setChecking(false); });
  }, []);

  const logout = () => {
    localStorage.removeItem('intervenant_token');
    setAgent(null);
  };

  if (checking) return (
    <div className="ia-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{tokenStyle}</style>
    </div>
  );

  if (!agent) return <Login onAuth={setAgent} />;
  return <Dashboard agent={agent} onLogout={logout} />;
}
