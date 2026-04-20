// ClientPortalAtelier.jsx — Portail client, identité magazine atelier.
// Mobile-first : devis en hero noir XXL avec total TTC (Fraunces), checklist
// des inclusions, signature électronique, messagerie conseiller, factures,
// interventions planifiées + avis post-prestation.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText, CreditCard, CheckCircle, XCircle, Star, LogOut,
  Clock, Send, MessageSquare, Mail, ArrowRight, Shield,
  Home, Calendar, Phone, Download, ChevronRight, Check, X,
  MapPin, RefreshCw, AlertCircle, Sparkles,
} from 'lucide-react';
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

/* ═══ TOKENS ═══ */
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
    --rouge: oklch(0.48 0.15 25);
    --sepia: oklch(0.55 0.08 65);

    background:
      radial-gradient(ellipse at top left, oklch(0.95 0.04 165 / 0.55) 0%, transparent 45%),
      radial-gradient(ellipse at bottom right, oklch(0.96 0.04 80 / 0.50) 0%, transparent 50%),
      var(--bg);
    min-height: 100vh;
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding-bottom: 80px;
  }
  .cpa-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .cpa-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .cpa-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.18em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .cpa-italic  { font-style: italic; color: var(--emerald); font-weight: 400; }

  /* Hero devis — dark XXL */
  .cpa-quote-hero {
    background: linear-gradient(165deg, oklch(0.14 0.018 60) 0%, oklch(0.18 0.03 165) 100%);
    color: oklch(0.95 0.01 80);
    border-radius: 22px;
    padding: 24px 22px 20px;
    position: relative; overflow: hidden;
    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
  }
  .cpa-quote-hero::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 80% 20%, oklch(0.52 0.13 165 / 0.22), transparent 60%);
    pointer-events: none;
  }
  .cpa-quote-hero .lbl {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: oklch(0.72 0.04 80); font-weight: 500;
  }
  .cpa-amount {
    font-family: 'Fraunces', serif; font-weight: 300; line-height: 1;
    font-size: clamp(52px, 12vw, 76px); letter-spacing: -0.03em;
    color: oklch(0.95 0.01 80);
  }
  .cpa-amount-currency {
    font-size: 0.42em; color: oklch(0.72 0.13 85);
    font-style: italic; margin-left: 6px;
    letter-spacing: 0;
  }
  .cpa-quote-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0;
    border-top: 1px solid oklch(0.28 0.02 60);
    font-family: 'Fraunces', serif; font-size: 14px;
    color: oklch(0.92 0.04 85);
  }

  /* CTA */
  .cpa-cta {
    width: 100%;
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 15px 22px; border-radius: 999px;
    background: var(--emerald); color: white; border: none;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
    cursor: pointer; transition: all .2s;
    box-shadow: 0 8px 24px oklch(0.52 0.13 165 / 0.4);
  }
  .cpa-cta:hover { transform: translateY(-1px); box-shadow: 0 10px 28px oklch(0.52 0.13 165 / 0.5); }
  .cpa-cta:disabled { opacity: 0.5; cursor: wait; }

  .cpa-cta-secondary {
    width: 100%; display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; padding: 14px 20px; border-radius: 999px;
    background: transparent; color: oklch(0.92 0.04 85);
    border: 1px solid oklch(0.35 0.02 60);
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: all .15s;
  }
  .cpa-cta-secondary:hover { background: oklch(0.22 0.02 60); }

  .cpa-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 18px; padding: 18px 20px;
  }

  /* Bottom nav */
  .cpa-nav {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--paper); border-top: 1px solid var(--line);
    display: flex; padding: 8px 12px 14px; z-index: 50;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.04);
  }
  .cpa-nav-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 4px; padding: 8px 4px; background: transparent; border: none;
    cursor: pointer; color: var(--ink-3); transition: color .15s;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500;
  }
  .cpa-nav-btn.active { color: var(--emerald); }

  @keyframes cpa-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .cpa-fade { animation: cpa-fade .35s ease; }

  @media (min-width: 760px) {
    .cpa-shell { max-width: 480px; margin: 0 auto; padding: 24px 20px 100px; }
  }
`;

/* ═══ HELPERS ═══ */
const fmtEur = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};
const fmtTime = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

/* ═══ LOGIN MAGIC LINK ═══ */
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
          <h1 className="cpa-display" style={{ fontSize: 42, fontWeight: 300, lineHeight: 1, margin: 0 }}>
            Votre <em className="cpa-italic">espace</em>
          </h1>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', marginTop: 8 }}>
            Consultez vos devis, signez, suivez vos interventions.
          </p>
        </div>

        <div className="cpa-card" style={{ padding: '24px 22px' }}>
          {magicError && (
            <div style={{ padding: 12, borderRadius: 10, background: 'oklch(0.94 0.07 25)', color: 'var(--rouge)', fontSize: 12, marginBottom: 14 }}>
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
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--emerald-soft)', color: 'var(--emerald-deep)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Check style={{ width: 24, height: 24 }} />
              </div>
              <h3 className="cpa-display" style={{ fontSize: 20, fontStyle: 'italic', margin: '0 0 6px' }}>
                Lien envoyé
              </h3>
              <p style={{ fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>
                Ouvre ton email et clique sur le lien pour accéder à ton espace.
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

/* ═══ QUOTE HERO (écran principal d'un devis à signer) ═══ */
function QuoteHero({ quote, onAccept, onRefuse, onSign, onChat, advisor }) {
  const inclusions = useMemo(() => {
    if (Array.isArray(quote.line_items) && quote.line_items.length) {
      return quote.line_items.slice(0, 6).map(li => li.label || li.description || '').filter(Boolean);
    }
    return [
      quote.service_type || 'Prestation personnalisée',
      quote.frequency && quote.frequency !== 'unique'
        ? `Récurrence · ${quote.frequency}${quote.interventions_count > 1 ? ` · ${quote.interventions_count} passages` : ''}`
        : null,
      'Matériel & produits fournis',
      'Équipe formée · RC Pro',
      'Résultat garanti',
    ].filter(Boolean).slice(0, 5);
  }, [quote]);

  const ht = Number(quote.amount_ht ?? (quote.tva_rate ? quote.amount / (1 + quote.tva_rate / 100) : quote.amount) ?? 0);
  const ttc = Number(quote.amount ?? 0);
  const tva = ttc - ht;

  return (
    <div className="cpa-quote-hero cpa-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, position: 'relative' }}>
        <div className="lbl">Devis {quote.quote_number || quote.quote_id?.slice(-8).toUpperCase()}</div>
        {quote.is_recurring && (
          <span style={{ padding: '3px 9px', borderRadius: 999, background: 'oklch(0.52 0.13 165)', color: 'white', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Récurrent
          </span>
        )}
      </div>

      <h1 className="cpa-display" style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.05, margin: '0 0 20px', color: 'oklch(0.95 0.01 80)', position: 'relative' }}>
        Votre <em className="cpa-italic" style={{ color: 'oklch(0.72 0.13 85)' }}>devis</em> est prêt.
      </h1>

      {/* Total TTC XXL */}
      <div style={{
        border: '1px solid oklch(0.30 0.02 60)', borderRadius: 16, padding: '16px 18px',
        background: 'oklch(0.12 0.015 60)', position: 'relative', marginBottom: 16,
      }}>
        <div className="lbl" style={{ marginBottom: 8 }}>Total TTC</div>
        <div className="cpa-amount">
          {fmtEur(ttc)}
          <span className="cpa-amount-currency">€</span>
        </div>
        <div className="cpa-mono" style={{ fontSize: 10, color: 'oklch(0.70 0.03 80)', letterSpacing: '0.08em', marginTop: 6 }}>
          {fmtEur(ht)} € HT · TVA {fmtEur(tva)} €
        </div>
      </div>

      {/* Inclusions */}
      <div style={{ border: '1px solid oklch(0.30 0.02 60)', borderRadius: 16, padding: '6px 18px', marginBottom: 18, position: 'relative' }}>
        {inclusions.map((t, i) => (
          <div key={i} className="cpa-quote-item" style={{ borderTop: i === 0 ? 'none' : '1px solid oklch(0.28 0.02 60)' }}>
            <span>{t}</span>
            <Check style={{ width: 16, height: 16, color: 'oklch(0.65 0.13 165)' }} />
          </div>
        ))}
      </div>

      {/* Actions */}
      {(quote.status === 'envoyé' || quote.status === 'envoye') && (
        <>
          <button onClick={onSign} className="cpa-cta">
            Accepter et signer <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={onChat} className="cpa-cta-secondary" style={{ flex: 1 }}>
              <MessageSquare style={{ width: 13, height: 13 }} /> Discuter
            </button>
            <button onClick={onRefuse} className="cpa-cta-secondary" style={{ flex: 1, borderColor: 'oklch(0.35 0.12 25)', color: 'oklch(0.85 0.12 25)' }}>
              <X style={{ width: 13, height: 13 }} /> Refuser
            </button>
          </div>
        </>
      )}
      {(quote.status === 'accepté' || quote.status === 'accepte' || quote.status === 'signé') && (
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'oklch(0.22 0.07 165)', color: 'oklch(0.85 0.10 165)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14,
          textAlign: 'center',
        }}>
          ✓ Devis {quote.status === 'signé' ? 'signé' : 'accepté'} — merci de votre confiance.
        </div>
      )}

      {/* Advisor card */}
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
            <div className="lbl">Votre conseiller</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'oklch(0.95 0.01 80)' }}>
              {advisor.name || 'Global Clean Home'}
            </div>
            <div className="cpa-mono" style={{ fontSize: 10, color: 'oklch(0.72 0.04 80)', letterSpacing: '0.06em' }}>
              {advisor.status || 'Répond en ~5 min'}
            </div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: 'oklch(0.65 0.15 145)' }} />
        </div>
      )}
    </div>
  );
}

/* ═══ SIGNATURE MODAL (cursive typée) ═══ */
function SignatureSheet({ quote, onClose, onConfirm }) {
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  const sign = async () => {
    if (!fullName.trim()) return toast.error('Entrez votre nom');
    setSaving(true);
    await onConfirm(fullName);
    setSaving(false);
  };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', zIndex: 95 }}>
      <div onClick={e => e.stopPropagation()}
        className="cpa-fade"
        style={{
          background: 'var(--paper)', width: '100%',
          borderRadius: '24px 24px 0 0', maxHeight: '90vh', overflowY: 'auto',
          padding: '22px 20px 24px',
        }}>
        <div style={{ width: 40, height: 4, background: 'var(--line)', borderRadius: 999, margin: '0 auto 14px' }} />

        <div className="cpa-label" style={{ marginBottom: 4 }}>Signature électronique</div>
        <h2 className="cpa-display" style={{ fontSize: 24, fontWeight: 300, margin: '0 0 6px' }}>
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
              fontFamily: 'Fraunces, serif', fontSize: 22, fontStyle: 'italic',
              color: 'var(--ink)',
            }}
          />
          {fullName && (
            <div style={{
              marginTop: 14, padding: '18px 14px', borderRadius: 10,
              background: 'var(--emerald-soft)', border: '1px dashed var(--emerald)',
              textAlign: 'center',
            }}>
              <div className="cpa-label" style={{ color: 'var(--emerald-deep)', marginBottom: 6 }}>Aperçu signature</div>
              <div style={{
                fontFamily: 'Caveat, cursive, Fraunces, serif', fontSize: 36,
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
          En signant, je confirme accepter le devis pour le montant de <strong style={{ fontStyle: 'normal' }}>{fmtEur(quote.amount)} € TTC</strong> et les conditions commerciales associées. Cette signature est juridiquement opposable (art. 1367 du Code civil).
        </div>

        <button onClick={sign} disabled={!fullName.trim() || saving} className="cpa-cta" style={{ width: '100%' }}>
          {saving ? 'Signature en cours…' : 'Valider ma signature'} <Check style={{ width: 14, height: 14 }} />
        </button>
        <button onClick={onClose} style={{
          width: '100%', marginTop: 8, background: 'transparent', border: 0,
          color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: 10, cursor: 'pointer',
        }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

/* ═══ VIEW ACCUEIL ═══ */
function ViewAccueil({ client, quotes, invoices, interventions, onOpenQuote, onOpenInvoice, onSelectTab }) {
  const pendingQuote = quotes.find(q => q.status === 'envoyé' || q.status === 'envoye');
  const urgentInvoice = invoices.find(i => i.status === 'en_retard') || invoices.find(i => i.status === 'en_attente');
  const upcoming = interventions.filter(i => i.status !== 'terminée').sort((a, b) =>
    (a.scheduled_date || '').localeCompare(b.scheduled_date || '')
  )[0];

  const firstName = (client?.name || client?.full_name || '').split(' ')[0] || '';

  return (
    <div className="cpa-fade" style={{ padding: '24px 20px 40px' }}>
      <div style={{ marginBottom: 18 }}>
        <div className="cpa-label">Espace Client</div>
        <h1 className="cpa-display" style={{ fontSize: 38, fontWeight: 300, lineHeight: 1, margin: '10px 0 6px' }}>
          Bonjour <em className="cpa-italic">{firstName || 'vous'}</em>.
        </h1>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)' }}>
          {quotes.length} devis · {invoices.length} facture{invoices.length > 1 ? 's' : ''} · {interventions.length} intervention{interventions.length > 1 ? 's' : ''}
        </div>
      </div>

      {pendingQuote && (
        <div onClick={() => onOpenQuote(pendingQuote)} style={{ cursor: 'pointer', marginBottom: 16 }}>
          <QuoteHeroPreview quote={pendingQuote} />
        </div>
      )}

      {urgentInvoice && (
        <div className="cpa-card cpa-fade" style={{ marginBottom: 16, borderColor: urgentInvoice.status === 'en_retard' ? 'var(--rouge)' : 'var(--gold)' }}
          onClick={() => onOpenInvoice(urgentInvoice)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div className="cpa-label" style={{ color: urgentInvoice.status === 'en_retard' ? 'var(--rouge)' : 'var(--gold)' }}>
                {urgentInvoice.status === 'en_retard' ? 'Facture en retard' : 'Facture à régler'}
              </div>
              <div className="cpa-display" style={{ fontSize: 20, fontWeight: 500, marginTop: 4 }}>
                {urgentInvoice.invoice_number || 'Facture'}
              </div>
              <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                Échéance · {fmtDate(urgentInvoice.due_date)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="cpa-display" style={{ fontSize: 26, fontWeight: 500, color: urgentInvoice.status === 'en_retard' ? 'var(--rouge)' : 'var(--ink)', lineHeight: 1 }}>
                {fmtEur(urgentInvoice.amount_ttc || urgentInvoice.amount)} €
              </div>
              <div className="cpa-mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4 }}>TTC</div>
            </div>
          </div>
        </div>
      )}

      {upcoming && (
        <div className="cpa-card" style={{ marginBottom: 16 }}>
          <div className="cpa-label" style={{ marginBottom: 4 }}>Prochaine intervention</div>
          <div className="cpa-display" style={{ fontSize: 20, fontWeight: 500, margin: '2px 0 4px' }}>
            {upcoming.title || upcoming.service_type}
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 10 }}>
            {fmtDate(upcoming.scheduled_date)} · {upcoming.scheduled_time || ''}
          </div>
          {upcoming.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)' }}>
              <MapPin style={{ width: 12, height: 12, color: 'var(--ink-3)' }} />
              {upcoming.address}
            </div>
          )}
        </div>
      )}

      {/* Quick tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        <button onClick={() => onSelectTab('quotes')} style={tileStyle}>
          <FileText style={{ width: 18, height: 18, color: 'var(--emerald)' }} />
          <div>
            <div className="cpa-label" style={{ marginBottom: 2 }}>Devis</div>
            <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{quotes.length}</div>
          </div>
        </button>
        <button onClick={() => onSelectTab('invoices')} style={tileStyle}>
          <CreditCard style={{ width: 18, height: 18, color: 'var(--gold)' }} />
          <div>
            <div className="cpa-label" style={{ marginBottom: 2 }}>Factures</div>
            <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{invoices.length}</div>
          </div>
        </button>
        <button onClick={() => onSelectTab('interventions')} style={tileStyle}>
          <Calendar style={{ width: 18, height: 18, color: 'var(--sepia)' }} />
          <div>
            <div className="cpa-label" style={{ marginBottom: 2 }}>Passages</div>
            <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{interventions.length}</div>
          </div>
        </button>
        <button onClick={() => onSelectTab('messages')} style={tileStyle}>
          <MessageSquare style={{ width: 18, height: 18, color: 'var(--ink)' }} />
          <div>
            <div className="cpa-label" style={{ marginBottom: 2 }}>Conseiller</div>
            <div className="cpa-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>Écrire</div>
          </div>
        </button>
      </div>
    </div>
  );
}

const tileStyle = {
  padding: '14px 16px', borderRadius: 16,
  background: 'var(--paper)', border: '1px solid var(--line)', textAlign: 'left',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
};

/* Preview compact sur l'accueil */
function QuoteHeroPreview({ quote }) {
  return (
    <div style={{
      background: 'linear-gradient(165deg, oklch(0.14 0.018 60) 0%, oklch(0.18 0.03 165) 100%)',
      color: 'oklch(0.95 0.01 80)',
      borderRadius: 18, padding: '18px 20px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div className="cpa-mono" style={{ fontSize: 9, color: 'oklch(0.70 0.03 80)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Nouveau devis · {quote.quote_number || ''}
        </div>
        <ArrowRight style={{ width: 14, height: 14, color: 'oklch(0.72 0.13 85)' }} />
      </div>
      <div className="cpa-display" style={{ fontSize: 22, fontWeight: 300, lineHeight: 1.1, color: 'oklch(0.95 0.01 80)' }}>
        Votre <em style={{ fontStyle: 'italic', color: 'oklch(0.72 0.13 85)' }}>devis</em> est prêt
      </div>
      <div className="cpa-display" style={{ fontSize: 28, fontWeight: 500, color: 'oklch(0.72 0.13 85)', marginTop: 4 }}>
        {fmtEur(quote.amount)} <span style={{ fontSize: 15, fontStyle: 'italic', opacity: 0.9 }}>€ TTC</span>
      </div>
    </div>
  );
}

/* ═══ VIEW QUOTES LIST ═══ */
function ViewQuotes({ quotes, onOpen }) {
  return (
    <div className="cpa-fade" style={{ padding: '24px 20px 40px' }}>
      <div className="cpa-label">Vos devis</div>
      <h1 className="cpa-display" style={{ fontSize: 32, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Les <em className="cpa-italic">propositions</em>
      </h1>
      {quotes.length === 0 ? (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Aucun devis pour le moment.
        </div>
      ) : (
        <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
          {quotes.map((q, i) => {
            const isPending = ['envoyé', 'envoye'].includes(q.status);
            const isAccepted = ['accepté', 'accepte', 'signé'].includes(q.status);
            const tone = isAccepted ? 'var(--emerald)' : isPending ? 'var(--gold)' : 'var(--ink-3)';
            return (
              <div key={q.quote_id} onClick={() => onOpen(q)} style={{
                padding: '16px 18px', borderBottom: i < quotes.length - 1 ? '1px solid var(--line-2)' : 0,
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                      {q.quote_number || q.quote_id?.slice(-8).toUpperCase()}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999,
                      background: `color-mix(in oklch, ${tone} 14%, transparent)`, color: tone,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
                    }}>
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

/* ═══ VIEW INVOICES LIST ═══ */
function ViewInvoices({ invoices, onOpen }) {
  return (
    <div className="cpa-fade" style={{ padding: '24px 20px 40px' }}>
      <div className="cpa-label">Vos factures</div>
      <h1 className="cpa-display" style={{ fontSize: 32, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Le <em className="cpa-italic">grand livre</em>
      </h1>
      {invoices.length === 0 ? (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Aucune facture.
        </div>
      ) : (
        <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
          {invoices.map((inv, i) => {
            const status = inv.status || 'en_attente';
            const tone = status === 'payée' || status === 'payee' ? 'var(--emerald)'
              : status === 'en_retard' ? 'var(--rouge)' : 'var(--gold)';
            return (
              <div key={inv.invoice_id} onClick={() => onOpen(inv)} style={{
                padding: '16px 18px', borderBottom: i < invoices.length - 1 ? '1px solid var(--line-2)' : 0,
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="cpa-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                      {inv.invoice_number}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999,
                      background: `color-mix(in oklch, ${tone} 14%, transparent)`, color: tone,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
                    }}>
                      {status === 'payée' || status === 'payee' ? 'Réglée' : status === 'en_retard' ? 'En retard' : 'À régler'}
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
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══ VIEW INTERVENTIONS ═══ */
function ViewInterventions({ interventions, onReview }) {
  const upcoming = interventions.filter(i => i.status !== 'terminée');
  const past = interventions.filter(i => i.status === 'terminée');

  return (
    <div className="cpa-fade" style={{ padding: '24px 20px 40px' }}>
      <div className="cpa-label">Vos passages</div>
      <h1 className="cpa-display" style={{ fontSize: 32, fontWeight: 300, margin: '8px 0 18px', lineHeight: 1 }}>
        Les <em className="cpa-italic">interventions</em>
      </h1>

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div className="cpa-label" style={{ marginBottom: 10 }}>À venir</div>
          <div className="cpa-card" style={{ padding: 0, overflow: 'hidden' }}>
            {upcoming.map((i, idx) => (
              <div key={i.intervention_id} style={{
                padding: '14px 18px', borderBottom: idx < upcoming.length - 1 ? '1px solid var(--line-2)' : 0,
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
                  padding: '14px 18px', borderBottom: idx < past.length - 1 ? '1px solid var(--line-2)' : 0,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                        <Star key={n} style={{
                          width: 14, height: 14,
                          color: n <= i.review_rating ? 'var(--gold)' : 'var(--line)',
                          fill: n <= i.review_rating ? 'var(--gold)' : 'transparent',
                        }} />
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => onReview(i)} className="cpa-mono" style={{
                      padding: '6px 10px', borderRadius: 999, border: '1px solid var(--emerald)',
                      color: 'var(--emerald)', background: 'var(--emerald-soft)',
                      fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                      fontWeight: 600, cursor: 'pointer',
                    }}>Laisser un avis</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {interventions.length === 0 && (
        <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Aucune intervention planifiée.
        </div>
      )}
    </div>
  );
}

/* ═══ VIEW MESSAGES ═══ */
function ViewMessages({ messages, onSend }) {
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="cpa-fade" style={{ padding: '24px 20px 120px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 90px)' }}>
      <div className="cpa-label">Votre conseiller</div>
      <h1 className="cpa-display" style={{ fontSize: 30, fontWeight: 300, margin: '8px 0 16px', lineHeight: 1 }}>
        Le <em className="cpa-italic">salon</em>
      </h1>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div className="cpa-card" style={{ textAlign: 'center', padding: 40, fontStyle: 'italic', color: 'var(--ink-3)' }}>
            Aucun échange.<br/>Écris au conseiller, il répond sous 5 min.
          </div>
        ) : messages.map((m, i) => {
          const mine = m.from === 'client' || m.sender === 'client' || m.author_type === 'client';
          return (
            <div key={m.id || i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                background: mine ? 'var(--ink)' : 'var(--paper)',
                color: mine ? 'var(--bg)' : 'var(--ink)',
                border: mine ? 'none' : '1px solid var(--line)',
                borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontFamily: 'Fraunces, serif', fontSize: 14,
              }}>
                {m.content || m.text}
                <div className="cpa-mono" style={{ fontSize: 9, marginTop: 4, letterSpacing: '0.04em', opacity: 0.7 }}>
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

/* ═══ REVIEW MODAL ═══ */
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
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', zIndex: 95 }}>
      <div onClick={e => e.stopPropagation()}
        className="cpa-fade"
        style={{ background: 'var(--paper)', width: '100%', borderRadius: '24px 24px 0 0', padding: '22px 20px 24px' }}>
        <div style={{ width: 40, height: 4, background: 'var(--line)', borderRadius: 999, margin: '0 auto 14px' }} />
        <div className="cpa-label">Votre avis</div>
        <h2 className="cpa-display" style={{ fontSize: 24, fontWeight: 300, margin: '4px 0 18px' }}>
          Votre <em className="cpa-italic">retour</em> compte
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setRating(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Star style={{
                width: 38, height: 38,
                color: n <= rating ? 'var(--gold)' : 'var(--line)',
                fill: n <= rating ? 'var(--gold)' : 'transparent',
              }} />
            </button>
          ))}
        </div>

        <textarea
          value={comment} onChange={e => setComment(e.target.value)}
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
      </div>
    </div>
  );
}

/* ═══ DASHBOARD PRINCIPAL ═══ */
function Dashboard({ client, onLogout }) {
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('accueil');
  const [openQuote, setOpenQuote] = useState(null);
  const [signQuote, setSignQuote] = useState(null);
  const [reviewIntv, setReviewIntv] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [q, i, r, iv] = await Promise.allSettled([
        pAxios.get(`${API_URL}/quotes`),
        pAxios.get(`${API_URL}/invoices`),
        pAxios.get(`${API_URL}/reviews`),
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

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (tab === 'messages') {
      loadMessages();
      const t = setInterval(loadMessages, 10000);
      return () => clearInterval(t);
    }
  }, [tab, loadMessages]);

  const handleAccept = async (quote) => {
    try {
      await pAxios.post(`${API_URL}/quotes/${quote.quote_id}/respond`, { action: 'accept' });
      toast.success('Devis accepté');
      setOpenQuote(null); fetchData();
    } catch { toast.error('Erreur'); }
  };
  const handleRefuse = async (quote) => {
    if (!window.confirm('Refuser ce devis ?')) return;
    try {
      await pAxios.post(`${API_URL}/quotes/${quote.quote_id}/respond`, { action: 'refuse' });
      toast.success('Devis refusé');
      setOpenQuote(null); fetchData();
    } catch { toast.error('Erreur'); }
  };
  const handleSign = async (fullName) => {
    try {
      await pAxios.post(`${API_URL}/quotes/${signQuote.quote_id}/sign`, { signature: fullName });
      toast.success('✓ Devis signé');
      setSignQuote(null); setOpenQuote(null); fetchData();
    } catch { toast.error('Signature impossible'); }
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
      toast.success('Merci pour votre avis');
      setReviewIntv(null); fetchData();
    } catch { toast.error('Envoi impossible'); }
  };

  const advisor = useMemo(() => {
    const firstQuote = quotes[0];
    if (firstQuote?.created_by_name) return { name: firstQuote.created_by_name, status: 'Répond en ~5 min' };
    return { name: 'Votre conseiller', status: 'Répond en ~5 min' };
  }, [quotes]);

  if (loading) {
    return (
      <div className="cpa-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{tokenStyle}</style>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ width: 26, height: 26, color: 'var(--emerald)', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 14, fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14 }}>
            Chargement…
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
        {tab === 'accueil' && (
          <ViewAccueil
            client={client} quotes={quotes} invoices={invoices} interventions={interventions}
            onOpenQuote={setOpenQuote} onOpenInvoice={() => setTab('invoices')} onSelectTab={setTab}
          />
        )}
        {tab === 'quotes' && <ViewQuotes quotes={quotes} onOpen={setOpenQuote} />}
        {tab === 'invoices' && <ViewInvoices invoices={invoices} onOpen={() => {}} />}
        {tab === 'interventions' && <ViewInterventions interventions={interventions} onReview={setReviewIntv} />}
        {tab === 'messages' && <ViewMessages messages={messages} onSend={handleSendMsg} />}
      </div>

      {/* Bottom nav */}
      <div className="cpa-nav">
        {[
          { k: 'accueil',       icon: Home,          label: 'Accueil' },
          { k: 'quotes',        icon: FileText,      label: 'Devis' },
          { k: 'invoices',      icon: CreditCard,    label: 'Factures' },
          { k: 'interventions', icon: Calendar,      label: 'Passages' },
          { k: 'messages',      icon: MessageSquare, label: 'Conseiller' },
        ].map(b => {
          const Icon = b.icon;
          return (
            <button key={b.k} onClick={() => setTab(b.k)} className={`cpa-nav-btn ${tab === b.k ? 'active' : ''}`}>
              <Icon style={{ width: 18, height: 18 }} />
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quote hero modal */}
      {openQuote && (
        <div onClick={() => setOpenQuote(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', zIndex: 90 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--paper)', width: '100%', borderRadius: '24px 24px 0 0', maxHeight: '94vh', overflowY: 'auto', padding: '20px 18px 24px' }}>
            <div style={{ width: 40, height: 4, background: 'var(--line)', borderRadius: 999, margin: '0 auto 14px' }} />
            <QuoteHero
              quote={openQuote}
              onAccept={() => handleAccept(openQuote)}
              onRefuse={() => handleRefuse(openQuote)}
              onSign={() => setSignQuote(openQuote)}
              onChat={() => { setOpenQuote(null); setTab('messages'); }}
              advisor={advisor}
            />
          </div>
        </div>
      )}

      {/* Sign sheet */}
      {signQuote && (
        <SignatureSheet quote={signQuote} onClose={() => setSignQuote(null)} onConfirm={handleSign} />
      )}

      {/* Review modal */}
      {reviewIntv && (
        <ReviewModal intervention={reviewIntv} onClose={() => setReviewIntv(null)} onSubmit={handleReview} />
      )}
    </div>
  );
}

/* ═══ EXPORT ═══ */
export default function ClientPortalAtelier() {
  const [client, setClient] = useState(null);
  const [checking, setChecking] = useState(true);
  const [magicError, setMagicError] = useState(null);

  useEffect(() => {
    // Support du magic link dans l'URL
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
  return <Dashboard client={client} onLogout={logout} />;
}
