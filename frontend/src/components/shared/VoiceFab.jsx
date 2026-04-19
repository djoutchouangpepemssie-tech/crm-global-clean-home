// VoiceFab.jsx — Bouton flottant de commande vocale globale.
// Disponible sur TOUTES les pages du CRM. Transcription → Claude →
// exécution de l'action (navigation, création, recherche, layout).
//
// Phase 3.1 : couvre les commandes de navigation et de layout dashboard.
// Phase 3.2 (à venir) : créer un lead/devis/facture à la voix, changer
// un statut, etc.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, Loader } from 'lucide-react';
import useVoiceInput from '../../lib/useVoiceInput';
import api from '../../lib/api';

// Table des intentions de navigation rapide (heuristique locale, avant Claude).
// Ordre IMPORTANT : plus spécifique d'abord (ex: "nouveau devis" avant "devis").
const NAV_KEYWORDS = [
  // Créations (les plus spécifiques d'abord)
  { regex: /(nouveau lead|créer (un )?lead|ajoute(r)? (un )?lead|ajoute(r)? (un )?prospect)/i, path: '/leads/new' },
  { regex: /(nouveau devis|créer (un )?devis|ajoute(r)? (un )?devis)/i,                        path: '/quotes/new' },
  { regex: /(nouvelle facture|créer (une )?facture|ajoute(r)? (une )?facture)/i,               path: '/invoices/new' },

  // Pages principales
  { regex: /(tableau de bord|dashboard|\baccueil\b)/i,                   path: '/dashboard' },
  { regex: /(vue directeur|mode directeur|directeur)/i,                  path: '/director' },
  { regex: /(\bleads?\b|\bprospects?\b|clients potentiels)/i,            path: '/leads' },
  { regex: /(\bdevis\b|\bdeviser\b)/i,                                   path: '/quotes' },
  { regex: /(\bfactures?\b|facturation|compta)/i,                        path: '/invoices' },
  { regex: /(\btâches?\b|\btasks?\b|à faire|to-?do)/i,                   path: '/tasks' },
  { regex: /(\bplanning\b|agenda|calendrier|rendez-?vous|rdvs?)/i,        path: '/planning' },
  { regex: /(\bcarte\b|\bmap\b|localisation)/i,                          path: '/map' },
  { regex: /(\bkanban\b|tableau kanban)/i,                               path: '/kanban' },
  { regex: /(analytics|statistiques|\bstats\b)/i,                        path: '/analytics' },
  { regex: /(\bseo\b|référencement)/i,                                   path: '/seo' },
  { regex: /(\brentabilit[ée]\b|roi)/i,                                  path: '/rentabilite' },
  { regex: /(\bfinance\b|finances)/i,                                    path: '/finance' },
  { regex: /(satisfaction|avis|reviews?)/i,                              path: '/satisfaction' },
  { regex: /(\bchat\b|messagerie|messages)/i,                            path: '/chat' },
  { regex: /(intégrations?|\bplugs?\b|connecter)/i,                      path: '/integrations' },
  { regex: /(paramètres|settings|réglages|config)/i,                     path: '/settings' },
];

export default function VoiceFab() {
  const [expanded, setExpanded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const hideTimer = useRef(null);

  // Détecte les instructions qui concernent le layout dashboard (garde anti-spam :
  // on n'appelle /layouts/.../command que si ça a l'air d'être une commande layout)
  const looksLikeLayoutCommand = (instr) => {
    const s = instr.toLowerCase();
    return /\b(ajoute|enl[èe]ve|retire|supprime|met(s|)|déplace|organise|passe|reset|réinitialise|par défaut|pleine largeur|à côté|en haut|à gauche|à droite)\b/.test(s)
      || /(pipeline|chiffre d'affaires|ca |revenu|activité|direct|insights?|recommandations?|actions rapides|cover|leads récents|kpi)/i.test(s);
  };

  const handleCommand = useCallback(async (text) => {
    const instruction = text.trim();
    if (!instruction) return;

    // 1) Navigation rapide (heuristique locale, sans appel serveur)
    for (const { regex, path } of NAV_KEYWORDS) {
      if (regex.test(instruction)) {
        navigate(path);
        setMessage(`→ ${path}`);
        hideMessageSoon(2500);
        return;
      }
    }

    // 2) Si l'instruction ressemble à une commande layout → endpoint /command
    if (looksLikeLayoutCommand(instruction)) {
      setProcessing(true);
      try {
        const r = await api.post('/layouts/dashboard/command', { instruction });
        setMessage(r.data?.explanation || 'Layout mis à jour.');
        if (window.location.pathname !== '/dashboard') navigate('/dashboard');
        hideMessageSoon();
      } catch (e) {
        const msg = e?.status === 503
          ? 'IA non configurée — essaie une commande simple : « ajoute le pipeline », « enlève les insights », « reset ».'
          : (e?.message || 'Impossible de traiter cette commande.');
        setMessage(msg);
        hideMessageSoon(5000);
      } finally {
        setProcessing(false);
      }
      return;
    }

    // 3) Aucune correspondance → on n'appelle PAS l'API (évite le spam 503)
    setMessage(`Je n'ai pas compris « ${instruction} ». Essaie : « ouvre les leads », « ajoute le pipeline », ou « nouvelle facture ».`);
    hideMessageSoon(6000);
  }, [navigate]);

  const hideMessageSoon = (ms = 3500) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setMessage(null), ms);
  };

  const voice = useVoiceInput({
    lang: 'fr-FR',
    continuous: false,
    interimResults: true,
    silenceTimeoutMs: 1800,
    onFinal: (finalText) => {
      handleCommand(finalText);
      setExpanded(false);
    },
  });

  // Raccourci clavier : Alt+Espace pour activer la voix depuis n'importe où
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault();
        if (!voice.listening) {
          setExpanded(true);
          voice.start();
        } else {
          voice.stop();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [voice]);

  // Si l'user arrête l'écoute sans rien dire, rétracter le panneau
  useEffect(() => {
    if (!voice.listening && !voice.transcript && !processing && expanded) {
      const t = setTimeout(() => setExpanded(false), 600);
      return () => clearTimeout(t);
    }
  }, [voice.listening, voice.transcript, processing, expanded]);

  if (!voice.supported) return null; // Pas de FAB si navigateur non compatible

  return (
    <>
      {/* FAB principal (en bas à droite) */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 150,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}>
        {/* Transcription en direct + message de feedback */}
        {(expanded || message) && (
          <div style={{
            background: 'oklch(0.165 0.012 60)', color: 'oklch(0.985 0.008 85)',
            padding: '14px 18px', borderRadius: 14, maxWidth: 360,
            boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
            animation: 'voiceFabIn 0.25s cubic-bezier(.16,1,.3,1)',
          }}>
            {voice.listening && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: voice.transcript ? 8 : 0 }}>
                <span style={{ width: 6, height: 6, background: '#DC2626', borderRadius: 999, animation: 'pulse 1s infinite' }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', opacity: 0.7 }}>
                  À L'ÉCOUTE
                </span>
              </div>
            )}
            {voice.transcript && (
              <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.4 }}>
                « {voice.transcript} »
              </div>
            )}
            {processing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, opacity: 0.8 }}>
                <Loader style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} />
                Claude réfléchit…
              </div>
            )}
            {message && !voice.listening && !processing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ color: 'oklch(0.72 0.15 165)' }}>✓</span>
                <span style={{ flex: 1 }}>{message}</span>
                <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer' }}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}
            {voice.error && (
              <div style={{ fontSize: 12, color: '#FCA5A5', marginTop: 6 }}>
                {voice.error}
              </div>
            )}
          </div>
        )}

        {/* Le bouton micro */}
        <button
          onClick={() => {
            setMessage(null);
            if (voice.listening) {
              voice.stop();
              setExpanded(false);
            } else {
              setExpanded(true);
              voice.start();
            }
          }}
          title={voice.listening ? 'Arrêter l\'écoute (Alt+Espace)' : 'Donner un ordre vocal (Alt+Espace)'}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            border: 'none', cursor: processing ? 'wait' : 'pointer',
            background: voice.listening
              ? 'linear-gradient(135deg, #DC2626, #991B1B)'
              : 'linear-gradient(135deg, oklch(0.52 0.13 165), oklch(0.32 0.012 60))',
            color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: voice.listening
              ? '0 0 0 6px rgba(220,38,38,0.25), 0 10px 30px rgba(0,0,0,0.3)'
              : '0 10px 30px rgba(0,0,0,0.25)',
            transition: 'all .2s',
            animation: voice.listening ? 'pulse 1.2s ease-in-out infinite' : 'none',
          }}
        >
          {processing ? <Loader style={{ width: 24, height: 24, animation: 'spin 0.7s linear infinite' }} />
           : voice.listening ? <MicOff style={{ width: 24, height: 24 }} />
           : <Mic style={{ width: 24, height: 24 }} />}
        </button>

        {/* Hint au premier usage */}
        {!expanded && !message && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--ink-3, #78716c)',
            background: 'rgba(255,255,255,0.9)', padding: '3px 8px', borderRadius: 999,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            border: '1px solid var(--line, #d6d3d1)',
          }}>
            Alt + Espace
          </span>
        )}
      </div>

      <style>{`
        @keyframes voiceFabIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
