// ClientPortalAtelier.jsx — Portail client pro, identité magazine atelier.
// 8 vues : Accueil · Devis · Factures · Interventions · Documents · Fidélité · Conseiller · Profil.
// Mobile-first avec bottom nav + notifications bell + cartes dark/light alternées.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText, CreditCard, Calendar, Home, MessageSquare, User, Bell, Mail,
  Phone, MapPin, ChevronRight, Check, X, Send, ArrowRight, Download,
  Star, Gift, LogOut, Edit3, Sparkles, Plus, RefreshCw, ExternalLink,
  Shield, Award, Clock, CheckCircle, AlertCircle, HelpCircle, Folder,
  Settings, Copy, TrendingUp, TrendingDown, Navigation, Activity, Zap, Receipt,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import BACKEND_URL from '../../config.js';

const API_URL = BACKEND_URL + '/api/portal';
const CHAT_API = BACKEND_URL + '/api/chat';

const pAxios = axios.create({ withCredentials: true });
pAxios.interceptors.request.use(config => {
  const token = localStorage.getItem('portal_token');
  if (token) {
    config.headers['X-Portal-Token'] = token;
    config.headers['x-portal-token'] = token;
  }
  return config;
});
const _init = localStorage.getItem('portal_token');
if (_init) pAxios.defaults.headers.common['X-Portal-Token'] = _init;

/* ═══════════ TOKENS & STYLES ═══════════ */
const tokenStyle = `
  .cpa-root {
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
    --gold-soft: oklch(0.94 0.06 85);
    --rouge: oklch(0.48 0.15 25);
    --rouge-soft: oklch(0.94 0.07 25);
    --sepia: oklch(0.55 0.08 65);
    --sepia-soft: oklch(0.92 0.04 65);
    --cool: oklch(0.55 0.08 220);

    background:
      radial-gradient(ellipse 80% 50% at top, oklch(0.93 0.06 165 / 0.5), transparent),
      radial-gradient(ellipse 60% 40% at bottom right, oklch(0.95 0.05 80 / 0.5), transparent),
      var(--bg);
    min-height: 100vh;
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding-bottom: 84px;
  }
  .cpa-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .cpa-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .cpa-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.18em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .cpa-italic  { font-style: italic; color: var(--emerald); font-weight: 400; }

  .cpa-shell {
    max-width: 520px; margin: 0 auto;
    position: relative;
  }

  /* Top bar */
  .cpa-topbar {
    position: sticky; top: 0; z-index: 40;
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    background: color-mix(in oklch, var(--bg) 82%, transparent);
    padding: 14px 20px;
    border-bottom: 1px solid color-mix(in oklch, var(--line) 50%, transparent);
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
  }
  .cpa-topbar-logo {
    font-family: 'Fraunces', serif; font-size: 16px; font-weight: 500;
    color: var(--ink);
  }
  .cpa-topbar-logo em { font-style: italic; color: var(--emerald); font-weight: 400; }

  .cpa-icon-btn {
    position: relative;
    width: 38px; height: 38px; border-radius: 999px;
    background: var(--surface); border: 1px solid var(--line);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--ink-2);
    transition: all .15s;
  }
  .cpa-icon-btn:hover { border-color: var(--ink-3); color: var(--ink); }
  .cpa-icon-btn .badge {
    position: absolute; top: -2px; right: -2px;
    min-width: 16px; height: 16px; padding: 0 4px;
    border-radius: 999px; background: var(--rouge); color: white;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    font-weight: 700; display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--bg);
  }

  /* Hero dark card (devis) */
  .cpa-dark {
    background: linear-gradient(165deg, oklch(0.14 0.018 60) 0%, oklch(0.18 0.03 165) 100%);
    color: oklch(0.95 0.01 80);
    border-radius: 22px;
    padding: 22px 22px;
    position: relative; overflow: hidden;
    box-shadow: 0 14px 36px rgba(0,0,0,0.18);
  }
  .cpa-dark::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 80% 20%, oklch(0.52 0.13 165 / 0.28), transparent 60%);
    pointer-events: none;
  }
  .cpa-amount {
    font-family: 'Fraunces', serif; font-weight: 300; line-height: 1;
    font-size: clamp(52px, 13vw, 80px); letter-spacing: -0.03em;
    color: oklch(0.95 0.01 80);
  }
  .cpa-amount-currency {
    font-size: 0.4em; color: oklch(0.72 0.13 85); font-style: italic;
    margin-left: 6px; letter-spacing: 0;
  }

  /* CTA */
  .cpa-cta {
    width: 100%; display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 15px 22px; border-radius: 999px;
    background: var(--emerald); color: white; border: none;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
    cursor: pointer; transition: all .2s;
    box-shadow: 0 8px 22px oklch(0.52 0.13 165 / 0.35);
  }
  .cpa-cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 26px oklch(0.52 0.13 165 / 0.45); }
  .cpa-cta:disabled { opacity: 0.5; cursor: wait; }

  .cpa-cta-ghost-dark {
    width: 100%; display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; padding: 14px 20px; border-radius: 999px;
    background: transparent; color: oklch(0.92 0.04 85);
    border: 1px solid oklch(0.35 0.02 60);
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: all .15s;
  }
  .cpa-cta-ghost-dark:hover { background: oklch(0.22 0.02 60); }

  .cpa-cta-dark {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 14px 20px; border-radius: 999px;
    background: var(--ink); color: var(--bg); border: none;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
    cursor: pointer; transition: opacity .15s; width: 100%;
  }
  .cpa-cta-dark:hover { opacity: 0.88; }

  .cpa-chip-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 12px; border-radius: 999px;
    background: var(--paper); border: 1px solid var(--line);
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500;
    color: var(--ink-2); cursor: pointer; transition: all .15s;
  }
  .cpa-chip-btn:hover { border-color: var(--ink-3); color: var(--ink); }
  .cpa-chip-btn.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }

  .cpa-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 18px; padding: 18px 20px;
  }
  .cpa-card-click { cursor: pointer; transition: transform .15s, box-shadow .15s; }
  .cpa-card-click:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.05); }

  .cpa-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }

  /* Bottom nav */
  .cpa-nav {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: color-mix(in oklch, var(--paper) 90%, transparent);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid var(--line);
    display: flex; padding: 10px 12px 18px; z-index: 50;
    box-shadow: 0 -6px 24px rgba(0,0,0,0.06);
  }
  .cpa-nav-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 4px; padding: 8px 4px; background: transparent; border: none;
    cursor: pointer; color: var(--ink-3); transition: color .15s;
    position: relative;
  }
  .cpa-nav-btn.active { color: var(--emerald); }
  .cpa-nav-btn span { font-family: 'JetBrains Mono', monospace; font-size: 9px;
                      letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500; }
  .cpa-nav-dot {
    position: absolute; top: 4px; right: 50%; transform: translateX(12px);
    width: 7px; height: 7px; border-radius: 999px; background: var(--rouge);
    border: 2px solid var(--paper);
  }

  /* Map trail */
  .cpa-trail {
    position: relative; height: 140px; border-radius: 14px;
    background: var(--surface);
    border: 1px solid var(--line);
    background-image:
      repeating-linear-gradient(0deg, oklch(0.92 0.010 78) 0 1px, transparent 1px 22px),
      repeating-linear-gradient(90deg, oklch(0.92 0.010 78) 0 1px, transparent 1px 22px);
    overflow: hidden;
  }

  /* Notifications bell drawer */
  .cpa-drawer-back {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px); z-index: 90;
  }
  .cpa-drawer {
    position: fixed; top: 0; right: 0; bottom: 0;
    width: 88vw; max-width: 420px;
    background: var(--paper); z-index: 91;
    display: flex; flex-direction: column;
    animation: cpa-slide-in .25s ease;
  }
  @keyframes cpa-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }

  @keyframes cpa-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .cpa-fade { animation: cpa-fade .35s ease; }

  @media (max-width: 520px) {
    .cpa-shell { padding: 0; }
  }
`;

/* ═══════════ HELPERS ═══════════ */
const fmtEur = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
const fmtEur2 = (n) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};
const fmtDateShort = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
  catch { return '—'; }
};
const fmtTime = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};
const greeting = () => {
  const h = new Date().getHours();
  return h < 6 ? 'Bonsoir' : h < 13 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
};

/* ═══════════ LOGIN MAGIC LINK ═══════════ */
function PortalLogin({ onAuth, magicError }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const requestLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/magic-link`, { email });
      setSent(true);
      if (res.data.magic_token) setToken(res.data.magic_token);
      toast.success('Lien de connexion envoyé');
    } catch { toast.error('Envoi impossible'); }
    setLoading(false);
  };

  const authenticate = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/${token}`, {}, { withCredentials: true });
      localStorage.setItem('portal_token', token);
      pAxios.defaults.headers.common['X-Portal-Token'] = token;
      onAuth(res.data);
    } catch { toast.error('Lien invalide ou expiré'); }
    setLoading(false);
  };

  return (
    <div className="cpa-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{tokenStyle}</style>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="cpa-label" style={{ marginBottom: 12 }}>Espace Client</div>
          <h1 className="cpa-display" style={{ fontSize: 44, fontWeight: 300, lineHeight: 1, margin: 0 }}>
            Votre <em className="cpa-italic">espace</em>
          </h1>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', marginTop: 8 }}>
            Consultez vos devis, suivez vos interventions, signez et payez en ligne.
          </p>
        </div>

        <div className="cpa-card" style={{ padding: '24px 22px' }}>
          {magicError && (
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--rouge-soft)', color: 'var(--rouge)', fontSize: 12, marginBottom: 14 }}>
              {magicError}
            </div>
          )}

          {!sent ? (
            <form onSubmit={requestLink}>
              <label className="cpa-label" style={{ display: 'block', marginBottom: 8 }}>Votre email</label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
                padding: '12px 14px', marginBottom: 16,
              }}>
                <Mail style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
                <input
                  type="email" required autoFocus
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 14, color: 'var(--ink)' }}
                />
              </div>
              <button type="submit" disabled={loading} className="cpa-cta">
                {loading ? 'Envoi…' : 'Recevoir mon lien'} <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
              <div style={{
                marginTop: 14, padding: '10px 12px', borderRadius: 10,
                background: 'var(--emerald-soft)', border: '1px dashed var(--emerald)',
                fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11,
                color: 'var(--emerald-deep)', lineHeight: 1.5,
              }}>
                <Shield style={{ width: 11, height: 11, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Connexion sécurisée sans mot de passe. Le lien reçu expire en 24 h.
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--emerald-soft)', color: 'var(--emerald-deep)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Check style={{ width: 24, height: 24 }} />
              </div>
              <h3 className="cpa-display" style={{ fontSize: 22, fontStyle: 'italic', margin: '0 0 6px' }}>
                Lien envoyé
              </h3>
              <p style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>
                Ouvrez votre email et cliquez sur le lien pour accéder à l'espace.
              </p>
              {token && (
                <button onClick={authenticate} disabled={loading} className="cpa-cta">
                  Accéder directement (démo) <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ MAP TRAIL (pour vue intervention) ═══════════ */
function MapTrail({ distance = '12 m' }) {
  return (
    <div className="cpa-trail">
      <div style={{
        position: 'absolute', top: 10, left: 12,
        padding: '4px 10px', borderRadius: 999,
        background: 'var(--paper)', border: '1px solid var(--line)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-2)',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        📍 {distance} de la cible
      </div>
      <svg viewBox="0 0 400 160" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="cpa-target-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="340" cy="70" r="60" fill="url(#cpa-target-glow)" />
        <path
          d="M 40 110 Q 120 60, 180 100 T 340 70"
          fill="none" stroke="oklch(0.52 0.13 165)" strokeWidth="2.5"
          strokeDasharray="4 5" strokeLinecap="round"
        />
        <circle cx="40" cy="110" r="6" fill="oklch(0.52 0.13 165)" />
        <circle cx="340" cy="70" r="8" fill="oklch(0.165 0.012 60)" />
      </svg>
    </div>
  );
}

/* ═══════════ QUOTE HERO ═══════════ */
function QuoteHeroFull({ quote, advisor, onSign, onRefuse, onChat, onDownload }) {
  const inclusions = useMemo(() => {
    if (Array.isArray(quote.line_items) && quote.line_items.length) {
      return quote.line_items.slice(0, 6).map(li => li.label || li.description || '').filter(Boolean);
    }
    const list = [];
    if (quote.service_type) list.push(quote.service_type);
    if (quote.frequency && quote.frequency !== 'unique') {
      list.push(`${quote.frequency}${quote.interventions_count > 1 ? ` · ${quote.interventions_count} passages` : ''}`);
    }
    list.push('Matériel & produits écolabel fournis');
    list.push('Équipe formée · RC Pro');
    list.push('Résultat garanti');
    return list.slice(0, 5);
  }, [quote]);

  const ht = Number(quote.amount_ht ?? (quote.tva_rate ? quote.amount / (1 + quote.tva_rate / 100) : quote.amount) ?? 0);
  const ttc = Number(quote.amount ?? 0);
  const tva = Math.max(0, ttc - ht);
  const isPending = ['envoyé', 'envoye'].includes(quote.status);
  const isDone = ['accepté', 'accepte', 'signé'].includes(quote.status);

  return (
    <div className="cpa-dark cpa-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, position: 'relative' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.72 0.04 80)' }}>
          Devis {quote.quote_number || quote.quote_id?.slice(-8).toUpperCase()}
        </div>
        {quote.frequency && quote.frequency !== 'unique' && (
          <span style={{ padding: '3px 9px', borderRadius: 999, background: 'oklch(0.52 0.13 165)', color: 'white', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Récurrent
          </span>
        )}
      </div>

      <h1 className="cpa-display" style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.05, margin: '0 0 20px', color: 'oklch(0.95 0.01 80)', position: 'relative' }}>
        Votre <em className="cpa-italic" style={{ color: 'oklch(0.72 0.13 85)' }}>devis</em> est prêt.
      </h1>

      <div style={{
        border: '1px solid oklch(0.30 0.02 60)', borderRadius: 16, padding: '16px 18px',
        background: 'oklch(0.12 0.015 60)', position: 'relative', marginBottom: 16,
      }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.72 0.04 80)', marginBottom: 8 }}>
          Total TTC
        </div>
        <div className="cpa-amount">
          {fmtEur(ttc)}<span className="cpa-amount-currency">€</span>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(0.70 0.03 80)', letterSpacing: '0.08em', marginTop: 6 }}>
          {fmtEur(ht)} € HT · TVA {fmtEur(tva)} €
        </div>
      </div>

      <div style={{ border: '1px solid oklch(0.30 0.02 60)', borderRadius: 16, padding: '6px 18px', marginBottom: 18, position: 'relative' }}>
        {inclusions.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid oklch(0.28 0.02 60)',
            fontFamily: 'Fraunces, serif', fontSize: 14, color: 'oklch(0.92 0.04 85)',
          }}>
            <span>{t}</span>
            <Check style={{ width: 16, height: 16, color: 'oklch(0.65 0.13 165)' }} />
          </div>
        ))}
      </div>

      {isPending && (
        <>
          <button onClick={onSign} className="cpa-cta">
            Accepter et signer <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={onChat} className="cpa-cta-ghost-dark" style={{ flex: 1 }}>
              <MessageSquare style={{ width: 13, height: 13 }} /> Discuter
            </button>
            <button onClick={onRefuse} className="cpa-cta-ghost-dark" style={{ flex: 1, borderColor: 'oklch(0.35 0.12 25)', color: 'oklch(0.85 0.12 25)' }}>
              <X style={{ width: 13, height: 13 }} /> Refuser
            </button>
          </div>
          <button onClick={onDownload} className="cpa-cta-ghost-dark" style={{ marginTop: 8 }}>
            <Download style={{ width: 13, height: 13 }} /> Télécharger le PDF
          </button>
        </>
      )}
      {isDone && (
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'oklch(0.22 0.07 165)', color: 'oklch(0.85 0.10 165)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, textAlign: 'center',
        }}>
          ✓ Devis {quote.status === 'signé' ? 'signé' : 'accepté'} — merci de votre confiance.
        </div>
      )}

      {advisor && (
        <div style={{
          marginTop: 18, padding: '12px 16px', borderRadius: 14,
          background: 'oklch(0.14 0.018 60)', border: '1px solid oklch(0.28 0.02 60)',
          display: 'flex', alignItems: 'center', gap: 12, position: 'relative',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'oklch(0.38 0.14 160)', color: 'oklch(0.95 0.05 165)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500,
          }}>
            {(advisor.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'oklch(0.72 0.04 80)' }}>
              Votre conseiller
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'oklch(0.95 0.01 80)' }}>
              {advisor.name || 'Global Clean Home'}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(0.72 0.04 80)', letterSpacing: '0.06em' }}>
              {advisor.status || 'Répond en ~5 min'}
            </div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: 'oklch(0.65 0.15 145)' }} />
        </div>
      )}
    </div>
  );
}

/* ═══════════ SIGNATURE SHEET ═══════════ */
function SignatureSheet({ quote, onClose, onConfirm }) {
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  const sign = async () => {
    if (!fullName.trim()) return toast.error('Entrez votre nom complet');
    setSaving(true);
    await onConfirm(fullName);
    setSaving(false);
  };

  return (
    <BottomSheet onClose={onClose}>
      <div className="cpa-label" style={{ marginBottom: 4 }}>Signature électronique</div>
      <h2 className="cpa-display" style={{ fontSize: 26, fontWeight: 300, margin: '0 0 6px' }}>
        Signer le <em className="cpa-italic">devis</em>
      </h2>
      <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>
        Montant · {fmtEur(quote.amount)} € TTC
      </div>

      <div className="cpa-card" style={{ marginBottom: 14, padding: 18 }}>
        <div className="cpa-label" style={{ marginBottom: 6 }}>Votre nom complet</div>
        <input
          value={fullName} onChange={e => setFullName(e.target.value)} autoFocus
          placeholder="Prénom Nom"
          style={{
            width: '100%', padding: 0, border: 0, outline: 0, background: 'transparent',
            fontFamily: 'Fraunces, serif', fontSize: 22, fontStyle: 'italic', color: 'var(--ink)',
          }} />
        {fullName && (
          <div style={{
            marginTop: 14, padding: '20px 14px', borderRadius: 10,
            background: 'var(--emerald-soft)', border: '1px dashed var(--emerald)',
            textAlign: 'center',
          }}>
            <div className="cpa-label" style={{ color: 'var(--emerald-deep)', marginBottom: 6 }}>Aperçu signature</div>
            <div style={{
              fontFamily: 'Caveat, Fraunces, cursive', fontSize: 40,
              color: 'var(--emerald-deep)', lineHeight: 1,
              fontStyle: 'italic', transform: 'rotate(-2deg)',
            }}>
              {fullName}
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)',
        fontFamily: 'Fraunces, serif', fontSize: 12, fontStyle: 'italic', color: 'var(--ink-2)',
        marginBottom: 14, lineHeight: 1.5,
      }}>
        En signant, je confirme accepter le devis pour le montant de <strong style={{ fontStyle: 'normal' }}>{fmtEur(quote.amount)} € TTC</strong>. Cette signature a valeur juridique (art. 1367 du Code civil).
      </div>

      <button onClick={sign} disabled={!fullName.trim() || saving} className="cpa-cta">
        {saving ? 'Signature…' : 'Valider ma signature'} <Check style={{ width: 14, height: 14 }} />
      </button>
    </BottomSheet>
  );
}

/* ═══════════ BOTTOM SHEET (réutilisable) ═══════════ */
function BottomSheet({ onClose, children, maxHeight = '94vh' }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', zIndex: 95,
    }}>
      <div onClick={e => e.stopPropagation()} className="cpa-fade" style={{
        background: 'var(--paper)', width: '100%',
        borderRadius: '24px 24px 0 0', maxHeight, overflowY: 'auto',
        padding: '22px 20px 28px',
      }}>
        <div style={{ width: 40, height: 4, background: 'var(--line)', borderRadius: 999, margin: '0 auto 16px' }} />
        {children}
      </div>
    </div>
  );
}

/* ═══════════ VUE ACCUEIL — Dashboard data-driven ═══════════ */
function ViewAccueil({ client, quotes, invoices, interventions, loyalty, onOpenQuote, onOpenInvoice, onOpenIntv, onSelectTab }) {
  const pendingQuote = quotes.find(q => ['envoyé', 'envoye'].includes(q.status));
  const urgentInvoice = invoices.find(i => i.status === 'en_retard') || invoices.find(i => i.status === 'en_attente');
  const upcoming = interventions.filter(i => i.status !== 'terminée')
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''))[0];
  const firstName = (client?.name || client?.full_name || '').split(' ')[0] || '';

  // ═══ Aggregations data-driven (12 derniers mois + comparaison N vs N-1) ═══
  const dash = useMemo(() => {
    const now = new Date();
    const Y = now.getFullYear();
    const PY = Y - 1;
    const isPaid = (i) => ['payée', 'payee'].includes(i.status);
    const dateOf = (x) => x.paid_at || x.created_at || x.scheduled_date || x.completed_at;
    const yearOf = (iso) => { try { return new Date(iso).getFullYear(); } catch { return null; } };
    const ymOf = (iso) => { try { return iso.slice(0, 7); } catch { return ''; } };

    // Interventions par année
    const intvY = interventions.filter(i => yearOf(dateOf(i)) === Y);
    const intvPY = interventions.filter(i => yearOf(dateOf(i)) === PY);

    // Dépenses par année (factures payées)
    const sumPaid = (year) => invoices.filter(isPaid).filter(i => yearOf(dateOf(i)) === year)
      .reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);
    const spentY = sumPaid(Y);
    const spentPY = sumPaid(PY);

    // Évolution YoY
    const yoyPct = spentPY > 0 ? Math.round(((spentY - spentPY) / spentPY) * 100) : null;

    // Heures cumulées (estimation 2h si non renseigné)
    const totalHours = intvY.reduce((s, i) => s + Number(i.duration_hours || 2), 0);

    // Crédit d'impôt 50 % (services à la personne — France)
    const taxCredit = Math.round(spentY * 0.5);

    // Série 12 mois glissants : { month, cur, prev }
    const monthly = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const kPrev = `${d.getFullYear() - 1}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const sumMonth = (key) => invoices.filter(isPaid)
        .filter(i => ymOf(String(dateOf(i) || '')) === key)
        .reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);
      monthly.push({
        m: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
        cur: Math.round(sumMonth(k)),
        prev: Math.round(sumMonth(kPrev)),
      });
    }
    const peakCur = Math.max(...monthly.map(p => p.cur), 0);

    // Répartition services (top 5)
    const services = {};
    intvY.forEach(i => {
      const k = (i.service_type || i.title || 'Autre').toString().trim() || 'Autre';
      services[k] = (services[k] || 0) + 1;
    });
    const serviceList = Object.entries(services)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      Y, PY,
      intvY: intvY.length, intvPY: intvPY.length,
      spentY, spentPY, yoyPct,
      totalHours, taxCredit,
      monthly, peakCur,
      serviceList,
      hasData: intvY.length + intvPY.length + spentY > 0,
    };
  }, [interventions, invoices]);

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div className="cpa-label">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h1 className="cpa-display" style={{ fontSize: 40, fontWeight: 300, lineHeight: 0.95, margin: '10px 0 6px' }}>
          {greeting()} <em className="cpa-italic">{firstName || 'vous'}</em>.
        </h1>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)' }}>
          Votre tableau de bord <span style={{ color: 'var(--emerald)' }}>{dash.Y}</span> — {dash.intvY} intervention{dash.intvY > 1 ? 's' : ''} cette année
        </div>
      </div>

      {/* Alertes prioritaires */}
      {pendingQuote && (
        <div onClick={() => onOpenQuote(pendingQuote)} className="cpa-fade" style={{ cursor: 'pointer', marginBottom: 14 }}>
          <QuoteHeroPreview quote={pendingQuote} />
        </div>
      )}

      {urgentInvoice && (
        <div className="cpa-card cpa-card-click" style={{
          marginBottom: 14,
          borderColor: urgentInvoice.status === 'en_retard' ? 'var(--rouge)' : 'var(--gold)',
          borderWidth: 1,
        }} onClick={() => onOpenInvoice(urgentInvoice)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="cpa-label" style={{ color: urgentInvoice.status === 'en_retard' ? 'var(--rouge)' : 'var(--gold)' }}>
                {urgentInvoice.status === 'en_retard' ? '⚠ Facture en retard' : 'Facture à régler'}
              </div>
              <div className="cpa-display" style={{ fontSize: 20, fontWeight: 500, marginTop: 4 }}>
                {urgentInvoice.invoice_number || 'Facture'}
              </div>
              <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                Échéance · {fmtDate(urgentInvoice.due_date)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="cpa-display" style={{
                fontSize: 30, fontWeight: 500,
                color: urgentInvoice.status === 'en_retard' ? 'var(--rouge)' : 'var(--ink)', lineHeight: 1,
              }}>
                {fmtEur(urgentInvoice.amount_ttc || urgentInvoice.amount)}
              </div>
              <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.1em' }}>€ TTC</div>
            </div>
          </div>
        </div>
      )}

      {/* Prochaine intervention */}
      {upcoming && (
        <div className="cpa-card cpa-card-click" style={{ marginBottom: 18 }} onClick={() => onOpenIntv(upcoming)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div className="cpa-label">Prochaine intervention</div>
            {upcoming.is_recurring && <span className="cpa-pill" style={{ color: 'var(--emerald-deep)', background: 'var(--emerald-soft)', borderColor: 'var(--emerald)' }}>Récurrent</span>}
          </div>
          <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, margin: '4px 0 6px' }}>
            {upcoming.title || upcoming.service_type}
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 10 }}>
            {fmtDate(upcoming.scheduled_date)} · {upcoming.scheduled_time || ''}
          </div>
          {upcoming.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)', marginBottom: 4 }}>
              <MapPin style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
              {upcoming.address}
            </div>
          )}
          {upcoming.agent_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)' }}>
              <User style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
              {upcoming.agent_name}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ DASHBOARD ANNUEL ═══════════ */}
      {dash.hasData && (
        <>
          <SectionLabel>Cette année · {dash.Y}</SectionLabel>

          {/* Hero KPI : Dépenses + comparaison YoY */}
          <div className="cpa-card" style={{ marginBottom: 12, padding: '20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div className="cpa-label">Dépenses cumulées</div>
                <div className="cpa-display" style={{ fontSize: 42, fontWeight: 300, lineHeight: 1, color: 'var(--ink)', marginTop: 6 }}>
                  {fmtEur(dash.spentY)} <span style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>€</span>
                </div>
              </div>
              {dash.yoyPct !== null && (
                <YoYBadge pct={dash.yoyPct} prevYear={dash.PY} />
              )}
            </div>

            {/* Sparkline 12 mois */}
            <div style={{ height: 90, margin: '0 -6px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dash.monthly} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="curFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="m"
                    tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fill: 'oklch(0.52 0.010 60)' }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: 'oklch(0.98 0.008 85)',
                      border: '1px solid oklch(0.85 0.012 75)',
                      borderRadius: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      padding: '6px 10px',
                    }}
                    cursor={{ stroke: 'oklch(0.85 0.012 75)', strokeWidth: 1, strokeDasharray: '3 3' }}
                    formatter={(v, k) => [`${fmtEur(v)} €`, k === 'cur' ? dash.Y : dash.PY]}
                    labelStyle={{ color: 'oklch(0.32 0.012 60)', fontWeight: 500 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="prev"
                    stroke="oklch(0.72 0.008 70)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    fill="transparent"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="cur"
                    stroke="oklch(0.52 0.13 165)"
                    strokeWidth={2}
                    fill="url(#curFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: 'oklch(0.38 0.14 160)', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 4 }}>
              <ChartLegendDot color="oklch(0.52 0.13 165)" label={dash.Y} />
              <ChartLegendDot color="oklch(0.72 0.008 70)" label={dash.PY} dashed />
            </div>
          </div>

          {/* KPIs grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <KpiTile
              icon={<Activity style={{ width: 16, height: 16, color: 'var(--emerald)' }} />}
              label="Interventions"
              value={dash.intvY}
              hint={dash.intvPY > 0 ? `vs ${dash.intvPY} en ${dash.PY}` : 'Première année'}
              onClick={() => onSelectTab('interventions')}
            />
            <KpiTile
              icon={<Clock style={{ width: 16, height: 16, color: 'var(--sepia)' }} />}
              label="Heures de ménage"
              value={`${dash.totalHours} h`}
              hint={`≈ ${Math.round(dash.totalHours / 8)} journées`}
            />
            <KpiTile
              icon={<Receipt style={{ width: 16, height: 16, color: 'var(--gold)' }} />}
              label="Crédit d'impôt"
              value={fmtEur(dash.taxCredit) + ' €'}
              hint="50 % automatique"
              tone="gold"
            />
            <KpiTile
              icon={<Zap style={{ width: 16, height: 16, color: 'var(--cool)' }} />}
              label="Mois de pointe"
              value={dash.peakCur > 0 ? fmtEur(dash.peakCur) + ' €' : '—'}
              hint={dash.peakCur > 0 ? (dash.monthly.find(m => m.cur === dash.peakCur)?.m || '') : 'Aucun paiement'}
            />
          </div>

          {/* Répartition services */}
          {dash.serviceList.length > 0 && (
            <div className="cpa-card" style={{ marginBottom: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <div className="cpa-label">Répartition des services</div>
                <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  {dash.serviceList.reduce((s, x) => s + x.count, 0)} passage{dash.serviceList.reduce((s, x) => s + x.count, 0) > 1 ? 's' : ''}
                </div>
              </div>
              {(() => {
                const max = Math.max(...dash.serviceList.map(s => s.count), 1);
                const palette = ['var(--emerald)', 'var(--gold)', 'var(--sepia)', 'var(--cool)', 'var(--rouge)'];
                return dash.serviceList.map((s, i) => (
                  <div key={s.name} style={{ marginBottom: i === dash.serviceList.length - 1 ? 0 : 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{s.name}</div>
                      <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{s.count}</div>
                    </div>
                    <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(s.count / max) * 100}%`,
                        background: palette[i % palette.length],
                        borderRadius: 999,
                        transition: 'width .4s ease',
                      }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </>
      )}

      {/* ═══════════ Accès rapide aux espaces ═══════════ */}
      <SectionLabel>Mes documents</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <button onClick={() => onSelectTab('quotes')} style={tileStyle}>
          <FileText style={{ width: 18, height: 18, color: 'var(--emerald)' }} />
          <div>
            <div className="cpa-label">Devis</div>
            <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>{quotes.length}</div>
          </div>
        </button>
        <button onClick={() => onSelectTab('invoices')} style={tileStyle}>
          <CreditCard style={{ width: 18, height: 18, color: 'var(--gold)' }} />
          <div>
            <div className="cpa-label">Factures</div>
            <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>{invoices.length}</div>
          </div>
        </button>
        <button onClick={() => onSelectTab('interventions')} style={tileStyle}>
          <Calendar style={{ width: 18, height: 18, color: 'var(--sepia)' }} />
          <div>
            <div className="cpa-label">Passages</div>
            <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>{interventions.length}</div>
          </div>
        </button>
        <button onClick={() => onSelectTab('documents')} style={tileStyle}>
          <Folder style={{ width: 18, height: 18, color: 'var(--cool)' }} />
          <div>
            <div className="cpa-label">Tous documents</div>
            <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>{quotes.length + invoices.length}</div>
          </div>
        </button>
      </div>

      {/* Loyalty preview */}
      {loyalty && loyalty.points > 0 && (
        <div onClick={() => onSelectTab('fidelite')} className="cpa-card-click" style={{
          marginBottom: 16, padding: '18px 20px', borderRadius: 18,
          background: 'linear-gradient(135deg, oklch(0.93 0.05 165) 0%, oklch(0.95 0.08 85) 100%)',
          border: '1px solid var(--emerald)',
          cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="cpa-label" style={{ color: 'var(--emerald-deep)' }}>Programme fidélité</div>
              <div className="cpa-display" style={{ fontSize: 28, fontWeight: 500, color: 'var(--emerald-deep)', lineHeight: 1, marginTop: 4 }}>
                {loyalty.points} <span style={{ fontSize: 14, fontStyle: 'italic' }}>points</span>
              </div>
              <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--emerald-deep)', letterSpacing: '0.08em', marginTop: 4 }}>
                {loyalty.next_reward ? `Prochaine récompense à ${loyalty.next_reward} pts` : 'Parrainez un ami pour +50 pts'}
              </div>
            </div>
            <Gift style={{ width: 32, height: 32, color: 'var(--emerald-deep)' }} />
          </div>
        </div>
      )}

      {/* Quick actions */}
      <SectionLabel>Actions rapides</SectionLabel>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onSelectTab('demande')} className="cpa-chip-btn">
          <Plus style={{ width: 11, height: 11 }} /> Demander une intervention
        </button>
        <button onClick={() => onSelectTab('conseiller')} className="cpa-chip-btn">
          <MessageSquare style={{ width: 11, height: 11 }} /> Écrire au conseiller
        </button>
        <button onClick={() => onSelectTab('fidelite')} className="cpa-chip-btn">
          <Gift style={{ width: 11, height: 11 }} /> Parrainer
        </button>
      </div>
    </div>
  );
}

/* ═══════════ Composants dashboard ═══════════ */
function SectionLabel({ children }) {
  return (
    <div className="cpa-label" style={{
      marginBottom: 10, marginTop: 6,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ flex: '0 0 12px', height: 1, background: 'var(--line)' }} />
      {children}
      <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
}

function YoYBadge({ pct, prevYear }) {
  const positive = pct > 0;
  const flat = pct === 0;
  const color = flat ? 'var(--ink-3)' : positive ? 'var(--rouge)' : 'var(--emerald-deep)';
  const bg = flat ? 'var(--surface-2)' : positive ? 'var(--rouge-soft)' : 'var(--emerald-soft)';
  const Icon = positive ? TrendingUp : (flat ? null : TrendingDown);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '6px 10px', borderRadius: 10,
      background: bg, color,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
    }}>
      {Icon && <Icon style={{ width: 12, height: 12 }} />}
      {pct > 0 ? '+' : ''}{pct}%
      <span style={{ fontSize: 9, opacity: 0.75, fontWeight: 400, marginLeft: 2 }}>vs {prevYear}</span>
    </div>
  );
}

function ChartLegendDot({ color, label, dashed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)' }}>
      <span style={{
        width: 12, height: dashed ? 0 : 6, borderRadius: dashed ? 0 : 999,
        background: dashed ? 'transparent' : color,
        borderTop: dashed ? `1.5px dashed ${color}` : 'none',
      }} />
      {label}
    </div>
  );
}

function KpiTile({ icon, label, value, hint, onClick, tone }) {
  const accent = tone === 'gold' ? 'oklch(0.94 0.06 85)' : 'var(--paper)';
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        padding: '14px 14px',
        borderRadius: 14,
        background: accent,
        border: '1px solid var(--line)',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'transform .15s, box-shadow .15s',
        font: 'inherit',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="cpa-label">{label}</span>
        {icon}
      </div>
      <div className="cpa-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.05 }}>
        {value}
      </div>
      {hint && (
        <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          {hint}
        </div>
      )}
    </button>
  );
}

const tileStyle = {
  padding: '14px 16px', borderRadius: 16,
  background: 'var(--paper)', border: '1px solid var(--line)', textAlign: 'left',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
  transition: 'transform .15s, box-shadow .15s',
};

function QuoteHeroPreview({ quote }) {
  return (
    <div style={{
      background: 'linear-gradient(165deg, oklch(0.14 0.018 60) 0%, oklch(0.18 0.03 165) 100%)',
      color: 'oklch(0.95 0.01 80)',
      borderRadius: 18, padding: '18px 20px',
      boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(0.70 0.03 80)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Nouveau devis · {quote.quote_number || ''}
        </div>
        <ArrowRight style={{ width: 14, height: 14, color: 'oklch(0.72 0.13 85)' }} />
      </div>
      <div className="cpa-display" style={{ fontSize: 22, fontWeight: 300, lineHeight: 1.1, color: 'oklch(0.95 0.01 80)' }}>
        Votre <em style={{ fontStyle: 'italic', color: 'oklch(0.72 0.13 85)' }}>devis</em> est prêt
      </div>
      <div className="cpa-display" style={{ fontSize: 30, fontWeight: 500, color: 'oklch(0.72 0.13 85)', marginTop: 4 }}>
        {fmtEur(quote.amount)} <span style={{ fontSize: 15, fontStyle: 'italic', opacity: 0.9 }}>€ TTC</span>
      </div>
    </div>
  );
}

/* ═══════════ VUE DEVIS LIST ═══════════ */
function ViewQuotes({ quotes, onOpen }) {
  const [filter, setFilter] = useState('all');
  const filtered = quotes.filter(q => {
    if (filter === 'pending') return ['envoyé', 'envoye'].includes(q.status);
    if (filter === 'accepted') return ['accepté', 'accepte', 'signé'].includes(q.status);
    return true;
  });

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Vos devis</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Les <em className="cpa-italic">propositions</em>
      </h1>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
        {[
          { k: 'all', label: `Tous (${quotes.length})` },
          { k: 'pending', label: `À signer (${quotes.filter(q => ['envoyé', 'envoye'].includes(q.status)).length})` },
          { k: 'accepted', label: `Acceptés (${quotes.filter(q => ['accepté', 'accepte', 'signé'].includes(q.status)).length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            className={`cpa-chip-btn ${filter === t.k ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Aucun devis dans cette catégorie.
        </div>
      ) : (
        <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((q, i) => {
            const isPending = ['envoyé', 'envoye'].includes(q.status);
            const isAccepted = ['accepté', 'accepte', 'signé'].includes(q.status);
            const tone = isAccepted ? 'var(--emerald)' : isPending ? 'var(--gold)' : 'var(--ink-3)';
            return (
              <div key={q.quote_id} onClick={() => onOpen(q)} style={{
                padding: '16px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 0,
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                      {q.quote_number || q.quote_id?.slice(-8).toUpperCase()}
                    </span>
                    <span className="cpa-pill" style={{ color: tone, background: `color-mix(in oklch, ${tone} 14%, transparent)`, borderColor: tone }}>
                      {q.status}
                    </span>
                  </div>
                  <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500 }}>
                    {q.title || q.service_type || 'Devis'}
                  </div>
                  <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>
                    {fmtDate(q.created_at)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12 }}>
                  <div className="cpa-display" style={{ fontSize: 20, fontWeight: 500 }}>
                    {fmtEur(q.amount)} <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>€</span>
                  </div>
                  <ChevronRight style={{ width: 14, height: 14, color: 'var(--ink-3)', marginTop: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════ VUE FACTURES LIST ═══════════ */
function ViewInvoices({ invoices, onOpen, onPay }) {
  const total = invoices.filter(i => ['en_attente', 'en_retard'].includes(i.status))
    .reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Vos factures</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 14px', lineHeight: 1 }}>
        Le <em className="cpa-italic">grand livre</em>
      </h1>

      {total > 0 && (
        <div className="cpa-card" style={{
          background: 'linear-gradient(135deg, oklch(0.94 0.06 85), oklch(0.95 0.02 85))',
          border: '1px solid var(--gold)', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="cpa-label" style={{ color: 'oklch(0.45 0.13 78)' }}>À régler</div>
              <div className="cpa-display" style={{ fontSize: 28, fontWeight: 500, color: 'oklch(0.35 0.13 78)', lineHeight: 1, marginTop: 4 }}>
                {fmtEur(total)} €
              </div>
            </div>
            <CreditCard style={{ width: 30, height: 30, color: 'oklch(0.58 0.13 78)' }} />
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Aucune facture.
        </div>
      ) : (
        <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
          {invoices.map((inv, i) => {
            const status = inv.status || 'en_attente';
            const isPaid = ['payée', 'payee'].includes(status);
            const tone = isPaid ? 'var(--emerald)' : status === 'en_retard' ? 'var(--rouge)' : 'var(--gold)';
            return (
              <div key={inv.invoice_id} style={{
                padding: '16px 18px', borderBottom: i < invoices.length - 1 ? '1px solid var(--line-2)' : 0,
              }}>
                <div onClick={() => onOpen(inv)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                        {inv.invoice_number}
                      </span>
                      <span className="cpa-pill" style={{ color: tone, background: `color-mix(in oklch, ${tone} 14%, transparent)`, borderColor: tone }}>
                        {isPaid ? 'Réglée' : status === 'en_retard' ? 'En retard' : 'À régler'}
                      </span>
                    </div>
                    <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500 }}>
                      {inv.project || inv.service_type || 'Prestation'}
                    </div>
                    <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>
                      Échéance · {fmtDate(inv.due_date)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 12 }}>
                    <div className="cpa-display" style={{ fontSize: 20, fontWeight: 500 }}>
                      {fmtEur(inv.amount_ttc || inv.amount)} <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>€</span>
                    </div>
                  </div>
                </div>
                {!isPaid && (
                  <button onClick={() => onPay(inv)} className="cpa-cta-dark" style={{ marginTop: 10, padding: '10px 14px', fontSize: 10 }}>
                    <CreditCard style={{ width: 11, height: 11 }} /> Payer en ligne
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════ VUE INTERVENTIONS ═══════════ */
function ViewInterventions({ interventions, onOpen, onReview }) {
  const upcoming = interventions.filter(i => i.status !== 'terminée')
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));
  const past = interventions.filter(i => i.status === 'terminée');

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Vos passages</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Les <em className="cpa-italic">interventions</em>
      </h1>

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div className="cpa-label" style={{ marginBottom: 10 }}>À venir</div>
          <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
            {upcoming.map((i, idx) => (
              <div key={i.intervention_id} onClick={() => onOpen(i)} style={{
                padding: '14px 18px',
                borderBottom: idx < upcoming.length - 1 ? '1px solid var(--line-2)' : 0,
                cursor: 'pointer',
              }}>
                <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--emerald)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
                  {fmtDate(i.scheduled_date)} · {i.scheduled_time || ''}
                </div>
                <div className="cpa-display" style={{ fontSize: 16, fontWeight: 500, margin: '4px 0' }}>
                  {i.title || i.service_type}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>
                  {i.address || ''}{i.agent_name ? ` · ${i.agent_name}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div className="cpa-label" style={{ marginBottom: 10 }}>Passées</div>
          <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
            {past.map((i, idx) => {
              const hasReview = i.review_rating;
              return (
                <div key={i.intervention_id} style={{
                  padding: '14px 18px',
                  borderBottom: idx < past.length - 1 ? '1px solid var(--line-2)' : 0,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpen(i)}>
                    <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {fmtDate(i.scheduled_date || i.completed_at)}
                    </div>
                    <div className="cpa-display" style={{ fontSize: 15, fontWeight: 500, margin: '3px 0' }}>
                      {i.title || i.service_type}
                    </div>
                  </div>
                  {hasReview ? (
                    <div style={{ display: 'flex', gap: 1 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} style={{ width: 14, height: 14, color: n <= i.review_rating ? 'var(--gold)' : 'var(--line)', fill: n <= i.review_rating ? 'var(--gold)' : 'transparent' }} />
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => onReview(i)} className="cpa-chip-btn" style={{
                      background: 'var(--emerald-soft)', color: 'var(--emerald-deep)', borderColor: 'var(--emerald)',
                    }}>
                      <Star style={{ width: 11, height: 11 }} /> Noter
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {interventions.length === 0 && (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Aucune intervention planifiée.
        </div>
      )}
    </div>
  );
}

/* ═══════════ VUE DOCUMENTS ═══════════ */
function ViewDocuments({ quotes, invoices }) {
  const allDocs = useMemo(() => {
    const docs = [];
    quotes.forEach(q => docs.push({
      type: 'quote', id: q.quote_id, number: q.quote_number || q.quote_id?.slice(-8).toUpperCase(),
      title: q.title || q.service_type, amount: q.amount, date: q.created_at, status: q.status,
      download: `${BACKEND_URL}/api/quotes/${q.quote_id}/pdf`,
    }));
    invoices.forEach(i => docs.push({
      type: 'invoice', id: i.invoice_id, number: i.invoice_number,
      title: i.project || i.service_type || 'Facture', amount: i.amount_ttc || i.amount, date: i.created_at, status: i.status,
      download: `${BACKEND_URL}/api/invoices/${i.invoice_id}/pdf`,
    }));
    return docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [quotes, invoices]);

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Vos documents</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        La <em className="cpa-italic">bibliothèque</em>
      </h1>

      {allDocs.length === 0 ? (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
          Aucun document pour le moment.
        </div>
      ) : (
        <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
          {allDocs.map((d, i) => (
            <div key={d.type + d.id} style={{
              padding: '14px 18px',
              borderBottom: i < allDocs.length - 1 ? '1px solid var(--line-2)' : 0,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 34, height: 40, borderRadius: 6,
                background: d.type === 'invoice' ? 'var(--gold-soft)' : 'var(--emerald-soft)',
                color: d.type === 'invoice' ? 'oklch(0.45 0.13 78)' : 'var(--emerald-deep)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: `1px solid ${d.type === 'invoice' ? 'var(--gold)' : 'var(--emerald)'}`,
              }}>
                <FileText style={{ width: 15, height: 15 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cpa-display" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>
                  {d.type === 'invoice' ? 'Facture' : 'Devis'} {d.number}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  {d.title} · {fmtDateShort(d.date)} · {fmtEur(d.amount)} €
                </div>
              </div>
              <a href={d.download} target="_blank" rel="noopener noreferrer" className="cpa-icon-btn" style={{ width: 32, height: 32 }}>
                <Download style={{ width: 13, height: 13 }} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════ VUE FIDÉLITÉ & PARRAINAGE ═══════════ */
function ViewFidelite({ client, loyalty }) {
  const [copied, setCopied] = useState(false);
  const referralCode = useMemo(() => {
    const base = (client?.name || client?.email || 'AMI').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6) || 'AMI';
    const suffix = (client?.lead_id || '').slice(-4).toUpperCase();
    return `${base}${suffix}`;
  }, [client]);

  const referralLink = `https://www.globalcleanhome.com/?ref=${referralCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Lien copié');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Global Clean Home',
        text: `J'utilise Global Clean Home pour mon ménage — essaie avec mon code et nous gagnons chacun 20 € !`,
        url: referralLink,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  const points = loyalty?.points || 0;
  const tier = points >= 500 ? 'Or' : points >= 200 ? 'Argent' : 'Découverte';
  const tierColor = points >= 500 ? 'var(--gold)' : points >= 200 ? 'oklch(0.70 0.02 260)' : 'var(--emerald)';
  const nextThreshold = points >= 500 ? 1000 : points >= 200 ? 500 : 200;
  const progress = Math.min(100, (points / nextThreshold) * 100);

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Programme fidélité</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Vos <em className="cpa-italic">récompenses</em>
      </h1>

      {/* Carte fidélité XXL */}
      <div className="cpa-dark" style={{ marginBottom: 18, padding: '22px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, position: 'relative' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.72 0.04 80)' }}>
              Statut · {tier}
            </div>
            <div className="cpa-display" style={{ fontSize: 56, fontWeight: 300, color: tierColor, lineHeight: 1, marginTop: 8 }}>
              {points}
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'oklch(0.85 0.03 80)', marginTop: 4 }}>
              points accumulés
            </div>
          </div>
          <Award style={{ width: 36, height: 36, color: tierColor, opacity: 0.9 }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(0.72 0.04 80)', marginBottom: 6 }}>
            <span>Palier {tier}</span>
            <span>{nextThreshold - points} pts pour le palier suivant</span>
          </div>
          <div style={{ height: 6, background: 'oklch(0.22 0.02 60)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${tierColor}, oklch(0.72 0.13 85))`, borderRadius: 999 }} />
          </div>
        </div>
      </div>

      {/* Parrainage */}
      <div className="cpa-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Gift style={{ width: 20, height: 20, color: 'var(--emerald)' }} />
          <div>
            <div className="cpa-label">Parrainez un ami</div>
            <div className="cpa-display" style={{ fontSize: 18, fontWeight: 500, margin: '2px 0 0' }}>
              +20 € pour <em className="cpa-italic">vous deux</em>
            </div>
          </div>
        </div>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 14 }}>
          Partagez votre code. À sa première prestation, vous gagnez 20 € de crédit + 50 points de fidélité.
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-2)', border: '1px dashed var(--emerald)',
          borderRadius: 10, padding: '10px 12px', marginBottom: 10,
        }}>
          <span className="cpa-mono" style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--emerald-deep)', letterSpacing: '0.12em' }}>
            {referralCode}
          </span>
          <button onClick={copyLink} className="cpa-chip-btn" style={{ background: 'var(--emerald)', color: 'white', borderColor: 'var(--emerald)' }}>
            {copied ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
        <button onClick={shareLink} className="cpa-cta-dark">
          <Send style={{ width: 13, height: 13 }} /> Partager le lien
        </button>
      </div>

      {/* Avantages */}
      <div className="cpa-card">
        <div className="cpa-label" style={{ marginBottom: 12 }}>Vos avantages actuels</div>
        {[
          { icon: '⭐', t: 'Crédit d\'impôt 50% automatique', s: 'Attestation fiscale générée chaque année' },
          { icon: '🛡️', t: 'Garantie satisfait ou remboursé', s: 'Intervention reprise gratuitement' },
          { icon: '📞', t: 'Hotline dédiée 7j/7', s: 'Réponse sous 5 min en journée' },
          { icon: '🎁', t: 'Cadeau anniversaire', s: '10% sur votre prochaine prestation' },
        ].map((a, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--line-2)' : 0,
          }}>
            <div style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: 'center' }}>{a.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{a.t}</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{a.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════ VUE DEMANDE INTERVENTION ═══════════ */
function ViewDemande({ client, onSubmit }) {
  const [form, setForm] = useState({
    service_type: 'Ménage',
    date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(form);
      toast.success('Demande envoyée au conseiller');
      setForm({ service_type: 'Ménage', date: '', notes: '' });
    } catch { toast.error('Envoi impossible'); }
    setSaving(false);
  };

  const services = ['Ménage', 'Nettoyage bureaux', 'Canapé', 'Matelas', 'Tapis', 'Vitres', 'Fin de chantier', 'Déménagement'];

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-label">Nouvelle demande</div>
      <h1 className="cpa-display" style={{ fontSize: 34, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Planifier une <em className="cpa-italic">prestation</em>
      </h1>

      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div className="cpa-label" style={{ marginBottom: 10 }}>Quel service ?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {services.map(s => (
            <button key={s} onClick={() => setForm(p => ({ ...p, service_type: s }))}
              className={`cpa-chip-btn ${form.service_type === s ? 'active' : ''}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div className="cpa-label" style={{ marginBottom: 10 }}>Date souhaitée</div>
        <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--line)', background: 'var(--surface)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink)',
            outline: 'none',
          }} />
        <div className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 6, fontStyle: 'italic' }}>
          Le conseiller vous proposera le créneau le plus proche.
        </div>
      </div>

      <div className="cpa-card" style={{ marginBottom: 16 }}>
        <div className="cpa-label" style={{ marginBottom: 10 }}>Informations complémentaires</div>
        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Surface, pièces, état, contraintes d'accès, instructions particulières…"
          rows={4}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--line)', background: 'var(--surface)',
            fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)',
            outline: 'none', resize: 'vertical',
          }} />
      </div>

      <button onClick={handleSubmit} disabled={saving || !form.service_type} className="cpa-cta">
        {saving ? 'Envoi…' : 'Envoyer ma demande'} <Send style={{ width: 13, height: 13 }} />
      </button>
      <div style={{
        marginTop: 10, fontFamily: 'Fraunces, serif', fontStyle: 'italic',
        fontSize: 12, color: 'var(--ink-3)', textAlign: 'center',
      }}>
        Le conseiller vous répond sous ~5 min en journée.
      </div>
    </div>
  );
}

/* ═══════════ VUE CONSEILLER (messages) ═══════════ */
function ViewConseiller({ messages, advisor, onSend }) {
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)' }}>
      <div className="cpa-label">Votre conseiller</div>
      <h1 className="cpa-display" style={{ fontSize: 30, fontWeight: 300, margin: '8px 0 14px', lineHeight: 1 }}>
        Le <em className="cpa-italic">salon</em>
      </h1>

      {advisor && (
        <div className="cpa-card" style={{ marginBottom: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999,
              background: 'var(--emerald-soft)', color: 'var(--emerald-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 500,
              border: '2px solid var(--emerald)',
            }}>
              {(advisor.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                {advisor.name || 'Votre conseiller'}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--emerald)', letterSpacing: '0.06em' }}>
                {advisor.status || 'Répond en ~5 min'}
              </div>
            </div>
            <a href="tel:+33622665308" className="cpa-icon-btn">
              <Phone style={{ width: 14, height: 14 }} />
            </a>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Aucun échange.<br/>Écrivez au conseiller, il vous répond sous 5 min.
          </div>
        ) : messages.map((m, i) => {
          const mine = m.from === 'client' || m.sender === 'client' || m.author_type === 'client' || m.from_client;
          return (
            <div key={m.id || m.message_id || i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                background: mine ? 'var(--ink)' : 'var(--paper)',
                color: mine ? 'var(--bg)' : 'var(--ink)',
                border: mine ? 'none' : '1px solid var(--line)',
                borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontFamily: 'Fraunces, serif', fontSize: 14,
              }}>
                {m.content || m.text}
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, marginTop: 4, letterSpacing: '0.04em', opacity: 0.7 }}>
                  {fmtTime(m.created_at || m.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 0 0' }}>
        <input
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { onSend(draft); setDraft(''); } }}
          placeholder="Écrire un message…"
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 999,
            background: 'var(--paper)', border: '1px solid var(--line)',
            fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', outline: 'none',
          }} />
        <button onClick={() => { if (draft.trim()) { onSend(draft); setDraft(''); } }} disabled={!draft.trim()}
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

/* ═══════════ VUE PROFIL ═══════════ */
function ViewProfil({ client, onSave, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
  });
  const [prefs, setPrefs] = useState({
    email_reminders: client?.pref_email_reminders !== false,
    sms_reminders: client?.pref_sms_reminders !== false,
    newsletter: client?.pref_newsletter !== false,
  });

  const save = async () => {
    try {
      await onSave({ ...form, preferences: prefs });
      setEditing(false);
      toast.success('Profil mis à jour');
    } catch { toast.error('Sauvegarde impossible'); }
  };

  const initials = (client?.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

  return (
    <div className="cpa-fade" style={{ padding: '20px 20px 40px' }}>
      <div className="cpa-card" style={{ padding: 26, textAlign: 'center', marginBottom: 16 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 999, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, var(--emerald-soft), oklch(0.88 0.08 165))',
          color: 'var(--emerald-deep)', border: '3px solid var(--emerald)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500,
        }}>{initials}</div>
        <h2 className="cpa-display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px' }}>
          {client?.name || 'Vous'}
        </h2>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)' }}>
          Client Global Clean Home{client?.since ? ` · depuis ${fmtDate(client.since)}` : ''}
        </div>
      </div>

      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="cpa-label">Coordonnées</div>
          <button onClick={() => setEditing(e => !e)} className="cpa-chip-btn">
            <Edit3 style={{ width: 11, height: 11 }} /> {editing ? 'Annuler' : 'Modifier'}
          </button>
        </div>
        {editing ? (
          <>
            {[
              { k: 'name', label: 'Nom complet', icon: User },
              { k: 'email', label: 'Email', icon: Mail, type: 'email' },
              { k: 'phone', label: 'Téléphone', icon: Phone, type: 'tel' },
              { k: 'address', label: 'Adresse', icon: MapPin },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <div className="cpa-label" style={{ marginBottom: 6 }}>{f.label}</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px',
                }}>
                  <f.icon style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
                  <input type={f.type || 'text'} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                    style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)' }} />
                </div>
              </div>
            ))}
            <button onClick={save} className="cpa-cta" style={{ marginTop: 4 }}>
              <Check style={{ width: 13, height: 13 }} /> Enregistrer
            </button>
          </>
        ) : (
          <>
            {[
              { icon: Mail, v: client?.email },
              { icon: Phone, v: client?.phone },
              { icon: MapPin, v: client?.address },
            ].filter(x => x.v).map((x, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--line-2)' : 0,
              }}>
                <x.icon style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)' }}>{x.v}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Préférences */}
      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div className="cpa-label" style={{ marginBottom: 12 }}>Préférences</div>
        {[
          { k: 'email_reminders', label: 'Rappels par email', sub: 'Avant chaque intervention' },
          { k: 'sms_reminders', label: 'Rappels SMS', sub: '1h avant le passage' },
          { k: 'newsletter', label: 'Newsletter mensuelle', sub: 'Astuces & actualités' },
        ].map((p, i) => (
          <div key={p.k} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--line-2)' : 0,
          }}>
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{p.label}</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 11, fontStyle: 'italic', color: 'var(--ink-3)' }}>{p.sub}</div>
            </div>
            <button onClick={() => setPrefs(x => ({ ...x, [p.k]: !x[p.k] }))}
              style={{
                width: 44, height: 24, borderRadius: 999, border: 0,
                background: prefs[p.k] ? 'var(--emerald)' : 'var(--line)',
                cursor: 'pointer', padding: 2, transition: 'background .15s',
                position: 'relative',
              }}>
              <div style={{
                width: 20, height: 20, borderRadius: 999, background: 'white',
                transform: `translateX(${prefs[p.k] ? 20 : 0}px)`, transition: 'transform .2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }} />
            </button>
          </div>
        ))}
      </div>

      {/* Aide & contact */}
      <div className="cpa-card" style={{ marginBottom: 14 }}>
        <div className="cpa-label" style={{ marginBottom: 12 }}>Aide &amp; contact</div>
        {[
          { icon: Phone, label: 'Nous appeler', value: '06 22 66 53 08', href: 'tel:+33622665308' },
          { icon: Mail, label: 'Email support', value: 'info@globalcleanhome.com', href: 'mailto:info@globalcleanhome.com' },
          { icon: HelpCircle, label: 'Questions fréquentes', value: 'FAQ du portail', href: '#' },
        ].map((x, i) => (
          <a key={i} href={x.href} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
            borderBottom: i < 2 ? '1px solid var(--line-2)' : 0,
            textDecoration: 'none', color: 'inherit',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-2)', flexShrink: 0,
            }}><x.icon style={{ width: 15, height: 15 }} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{x.label}</div>
              <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{x.value}</div>
            </div>
            <ChevronRight style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          </a>
        ))}
      </div>

      <button onClick={onLogout} style={{
        width: '100%', padding: 14, borderRadius: 999,
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

/* ═══════════ INTERVENTION DETAIL ═══════════ */
function InterventionDetail({ intervention, onClose }) {
  const isUpcoming = intervention.status !== 'terminée';
  return (
    <BottomSheet onClose={onClose}>
      <div className="cpa-label" style={{ marginBottom: 4 }}>
        {isUpcoming ? 'Intervention planifiée' : 'Intervention terminée'}
      </div>
      <h2 className="cpa-display" style={{ fontSize: 26, fontWeight: 300, lineHeight: 1.1, margin: '0 0 18px' }}>
        Bienvenue chez <em className="cpa-italic">{intervention.lead_name || intervention.address?.split(',')[0] || 'vous'}</em>
      </h2>

      {isUpcoming && <MapTrail distance="à venir" />}

      <div className="cpa-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="cpa-label">Mission</div>
          {intervention.is_recurring && <span className="cpa-pill" style={{ color: 'var(--emerald-deep)', background: 'var(--emerald-soft)', borderColor: 'var(--emerald)' }}>Récurrent</span>}
        </div>
        <div className="cpa-display" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
          {intervention.title || intervention.service_type}
          {intervention.duration_hours ? ` · ${intervention.duration_hours}h` : ''}
        </div>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>
          {fmtDate(intervention.scheduled_date)} · {intervention.scheduled_time || ''}
        </div>
        {intervention.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>
            <MapPin style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
            {intervention.address}
          </div>
        )}
        {intervention.agent_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)' }}>
            <User style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
            Intervenant · <strong>{intervention.agent_name}</strong>
          </div>
        )}
      </div>

      {isUpcoming && intervention.address && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(intervention.address)}`}
          target="_blank" rel="noopener noreferrer"
          className="cpa-cta-dark"
          style={{ marginTop: 14, background: 'var(--emerald-soft)', color: 'var(--emerald-deep)', textDecoration: 'none' }}
        >
          <Navigation style={{ width: 13, height: 13 }} /> Voir l'adresse sur la carte
        </a>
      )}
    </BottomSheet>
  );
}

/* ═══════════ REVIEW MODAL ═══════════ */
function ReviewModal({ intervention, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    await onSubmit({ intervention_id: intervention.intervention_id, rating, comment });
    setSaving(false);
  };

  return (
    <BottomSheet onClose={onClose}>
      <div className="cpa-label">Votre avis</div>
      <h2 className="cpa-display" style={{ fontSize: 24, fontWeight: 300, margin: '4px 0 18px' }}>
        Votre <em className="cpa-italic">retour</em> compte
      </h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Star style={{ width: 38, height: 38, color: n <= rating ? 'var(--gold)' : 'var(--line)', fill: n <= rating ? 'var(--gold)' : 'transparent' }} />
          </button>
        ))}
      </div>

      <textarea value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Un mot pour l'intervenant (optionnel)…" rows={4}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          background: 'var(--surface)', border: '1px solid var(--line)',
          fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)',
          outline: 'none', resize: 'vertical', marginBottom: 16,
        }} />

      <button onClick={submit} disabled={saving} className="cpa-cta">
        {saving ? 'Envoi…' : 'Publier mon avis'} <Check style={{ width: 14, height: 14 }} />
      </button>
    </BottomSheet>
  );
}

/* ═══════════ NOTIFICATIONS DRAWER ═══════════ */
function NotificationsDrawer({ notifications, onClose, onMarkRead }) {
  return (
    <>
      <div className="cpa-drawer-back" onClick={onClose} />
      <div className="cpa-drawer">
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="cpa-label">Notifications</div>
              <h2 className="cpa-display" style={{ fontSize: 22, fontWeight: 300, margin: '4px 0 0' }}>
                Vos <em className="cpa-italic">alertes</em>
              </h2>
            </div>
            <button onClick={onClose} className="cpa-icon-btn">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 20px' }}>
          {notifications.length === 0 ? (
            <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
              Aucune notification.
            </div>
          ) : notifications.map((n, i) => (
            <div key={n.id || i} style={{
              padding: '14px 16px', borderRadius: 12,
              background: n.read ? 'var(--surface)' : 'var(--emerald-soft)',
              border: '1px solid', borderColor: n.read ? 'var(--line)' : 'var(--emerald)',
              marginBottom: 8,
              cursor: 'pointer',
            }} onClick={() => onMarkRead(n.id)}>
              <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                {fmtDateShort(n.created_at)} · {fmtTime(n.created_at)}
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>
                {n.title}
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 12, fontStyle: 'italic', color: 'var(--ink-3)', lineHeight: 1.4 }}>
                {n.message}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════ DASHBOARD PRINCIPAL ═══════════ */
function Dashboard({ client, onLogout, onRefreshClient }) {
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('accueil');
  const [openQuote, setOpenQuote] = useState(null);
  const [signQuote, setSignQuote] = useState(null);
  const [openIntv, setOpenIntv] = useState(null);
  const [reviewIntv, setReviewIntv] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [q, i, iv] = await Promise.allSettled([
        pAxios.get(`${API_URL}/quotes`),
        pAxios.get(`${API_URL}/invoices`),
        pAxios.get(`${API_URL}/interventions`),
      ]);
      setQuotes(q.status === 'fulfilled' ? (q.value.data?.quotes || q.value.data || []) : []);
      setInvoices(i.status === 'fulfilled' ? (i.value.data?.invoices || i.value.data || []) : []);
      setInterventions(iv.status === 'fulfilled' ? (iv.value.data?.interventions || iv.value.data || []) : []);
    } catch { toast.error('Chargement impossible'); }
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const r = await pAxios.get(CHAT_API + '/portal/conversation');
      setMessages(r.data?.messages || r.data || []);
    } catch {}
  }, []);

  const loadNotifs = useCallback(async () => {
    try {
      const r = await pAxios.get(`${API_URL}/notifications`);
      setNotifications(r.data?.notifications || r.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); loadNotifs(); }, [fetchData, loadNotifs]);
  useEffect(() => {
    if (tab === 'conseiller') {
      loadMessages();
      const t = setInterval(loadMessages, 10000);
      return () => clearInterval(t);
    }
  }, [tab, loadMessages]);

  const handleSign = async (fullName) => {
    try {
      await pAxios.post(`${API_URL}/quotes/${signQuote.quote_id}/sign`, { signature: fullName });
      toast.success('✓ Devis signé — merci !');
      setSignQuote(null); setOpenQuote(null); fetchData();
    } catch { toast.error('Signature impossible'); }
  };
  const handleRefuse = async (quote) => {
    if (!window.confirm('Refuser ce devis ?')) return;
    try {
      await pAxios.post(`${API_URL}/quotes/${quote.quote_id}/respond`, { action: 'refuse' });
      setOpenQuote(null); fetchData();
      toast.success('Devis refusé');
    } catch { toast.error('Erreur'); }
  };
  const handleDownloadQuote = (quote) => {
    window.open(`${BACKEND_URL}/api/quotes/${quote.quote_id}/pdf`, '_blank');
  };
  const handlePay = async (invoice) => {
    try {
      const r = await pAxios.post(`${API_URL}/invoices/${invoice.invoice_id}/checkout`);
      if (r.data?.checkout_url) {
        window.location.href = r.data.checkout_url;
      } else {
        toast.error('Paiement en ligne indisponible pour cette facture');
      }
    } catch {
      toast.error('Lien de paiement indisponible — contactez le conseiller');
    }
  };
  const handleSendMsg = async (content) => {
    try {
      await pAxios.post(CHAT_API + '/portal/message', { content });
      loadMessages();
    } catch { toast.error('Envoi impossible'); }
  };
  const handleReview = async ({ intervention_id, rating, comment }) => {
    try {
      await pAxios.post(`${API_URL}/reviews`, { intervention_id, rating, comment });
      setReviewIntv(null); fetchData();
      toast.success('Merci pour votre avis');
    } catch { toast.error('Envoi impossible'); }
  };
  const handleDemande = async (form) => {
    try {
      await pAxios.post(CHAT_API + '/portal/message', {
        content: `📋 Demande d'intervention : ${form.service_type}${form.date ? ' · souhaité le ' + form.date : ''}${form.notes ? '\n\n' + form.notes : ''}`,
      });
    } catch (e) { throw e; }
  };
  const handleSaveProfile = async (data) => {
    try {
      const r = await pAxios.patch(`${API_URL}/me`, data);
      onRefreshClient?.(r.data);
    } catch (e) { throw e; }
  };
  const handleMarkNotif = async (id) => {
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    try { await pAxios.post(`${API_URL}/notifications/${id}/read`); } catch {}
  };

  const advisor = useMemo(() => {
    const firstQuote = quotes[0];
    if (firstQuote?.created_by_name) return { name: firstQuote.created_by_name, status: 'Répond en ~5 min' };
    return { name: 'Votre conseiller', status: 'Répond en ~5 min' };
  }, [quotes]);

  // Fidélité : 10 pts par euro facturé
  const loyalty = useMemo(() => {
    const totalPaid = invoices.filter(i => ['payée', 'payee'].includes(i.status)).reduce((s, i) => s + Number(i.amount_ttc || i.amount || 0), 0);
    const points = Math.floor(totalPaid / 10);
    return { points, next_reward: points >= 500 ? 1000 : points >= 200 ? 500 : 200 };
  }, [invoices]);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="cpa-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{tokenStyle}</style>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ width: 26, height: 26, color: 'var(--emerald)', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 14, fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14 }}>
            Chargement de votre espace…
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="cpa-root">
      <style>{tokenStyle}</style>
      <div className="cpa-shell">
        {/* Top bar */}
        <div className="cpa-topbar">
          <div className="cpa-topbar-logo">Global <em>Clean</em> Home</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setNotifOpen(true)} className="cpa-icon-btn">
              <Bell style={{ width: 16, height: 16 }} />
              {unreadNotifs > 0 && <span className="badge">{unreadNotifs}</span>}
            </button>
            <button onClick={fetchData} className="cpa-icon-btn" title="Rafraîchir">
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Vues */}
        {tab === 'accueil' && (
          <ViewAccueil client={client} quotes={quotes} invoices={invoices} interventions={interventions}
            loyalty={loyalty} onOpenQuote={setOpenQuote} onOpenInvoice={() => setTab('invoices')}
            onOpenIntv={setOpenIntv} onSelectTab={setTab} />
        )}
        {tab === 'quotes' && <ViewQuotes quotes={quotes} onOpen={setOpenQuote} />}
        {tab === 'invoices' && <ViewInvoices invoices={invoices} onOpen={() => {}} onPay={handlePay} />}
        {tab === 'interventions' && <ViewInterventions interventions={interventions} onOpen={setOpenIntv} onReview={setReviewIntv} />}
        {tab === 'documents' && <ViewDocuments quotes={quotes} invoices={invoices} />}
        {tab === 'fidelite' && <ViewFidelite client={client} loyalty={loyalty} />}
        {tab === 'demande' && <ViewDemande client={client} onSubmit={handleDemande} />}
        {tab === 'conseiller' && <ViewConseiller messages={messages} advisor={advisor} onSend={handleSendMsg} />}
        {tab === 'profil' && <ViewProfil client={client} onSave={handleSaveProfile} onLogout={onLogout} />}
      </div>

      {/* Bottom nav */}
      <div className="cpa-nav">
        {[
          { k: 'accueil',       icon: Home,          label: 'Accueil' },
          { k: 'quotes',        icon: FileText,      label: 'Devis' },
          { k: 'invoices',      icon: CreditCard,    label: 'Factures' },
          { k: 'interventions', icon: Calendar,      label: 'Passages' },
          { k: 'conseiller',    icon: MessageSquare, label: 'Conseiller' },
          { k: 'profil',        icon: User,          label: 'Profil' },
        ].map(b => {
          const Icon = b.icon;
          const showUnread = b.k === 'conseiller' && messages.some(m => !m.read && m.from !== 'client');
          return (
            <button key={b.k} onClick={() => setTab(b.k)} className={`cpa-nav-btn ${tab === b.k ? 'active' : ''}`}>
              <Icon style={{ width: 18, height: 18 }} />
              <span>{b.label}</span>
              {showUnread && <div className="cpa-nav-dot" />}
            </button>
          );
        })}
      </div>

      {/* Quote modal plein écran */}
      {openQuote && (
        <BottomSheet onClose={() => setOpenQuote(null)}>
          <QuoteHeroFull
            quote={openQuote} advisor={advisor}
            onSign={() => setSignQuote(openQuote)}
            onRefuse={() => handleRefuse(openQuote)}
            onChat={() => { setOpenQuote(null); setTab('conseiller'); }}
            onDownload={() => handleDownloadQuote(openQuote)}
          />
        </BottomSheet>
      )}

      {signQuote && <SignatureSheet quote={signQuote} onClose={() => setSignQuote(null)} onConfirm={handleSign} />}
      {openIntv && <InterventionDetail intervention={openIntv} onClose={() => setOpenIntv(null)} />}
      {reviewIntv && <ReviewModal intervention={reviewIntv} onClose={() => setReviewIntv(null)} onSubmit={handleReview} />}
      {notifOpen && <NotificationsDrawer notifications={notifications} onClose={() => setNotifOpen(false)} onMarkRead={handleMarkNotif} />}
    </div>
  );
}

/* ═══════════ EXPORT ═══════════ */
export default function ClientPortalAtelier() {
  const [client, setClient] = useState(null);
  const [checking, setChecking] = useState(true);
  const [magicError, setMagicError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magic = params.get('token') || params.get('magic');
    if (magic) {
      axios.post(`${API_URL}/auth/${magic}`, {}, { withCredentials: true })
        .then(r => {
          localStorage.setItem('portal_token', magic);
          pAxios.defaults.headers.common['X-Portal-Token'] = magic;
          setClient(r.data);
          setChecking(false);
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(() => { setMagicError('Lien invalide ou expiré'); setChecking(false); });
      return;
    }

    const token = localStorage.getItem('portal_token');
    if (!token) { setChecking(false); return; }
    pAxios.get(`${API_URL}/me`)
      .then(r => { setClient(r.data); setChecking(false); })
      .catch(() => { localStorage.removeItem('portal_token'); setChecking(false); });
  }, []);

  const logout = () => {
    localStorage.removeItem('portal_token');
    setClient(null);
  };

  if (checking) return (
    <div className="cpa-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{tokenStyle}</style>
    </div>
  );

  if (!client) return <PortalLogin onAuth={setClient} magicError={magicError} />;
  return <Dashboard client={client} onLogout={logout} onRefreshClient={setClient} />;
}
