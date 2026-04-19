// VoiceFab.jsx — Agent vocal complet : contrôle tout le CRM.
//
// Architecture :
// 1. User parle → transcription (Web Speech API)
// 2. Envoi à POST /api/voice/agent
// 3. Backend (Claude + tools) planifie une séquence d'actions :
//    [{type:'navigate', path}, {type:'api_call', action, params, destructive}]
// 4. Frontend exécute séquentiellement :
//    - navigate → React Router
//    - api_call → appel API avec l'auth user (confirmation si destructive)
// 5. Feedback temps réel + résumé final
//
// Fallback navigation (sans IA) conservé pour les commandes simples
// quand ANTHROPIC_API_KEY n'est pas configuré.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, Loader, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import useVoiceInput from '../../lib/useVoiceInput';
import api from '../../lib/api';

// Navigation locale de secours (si agent IA pas configuré)
const NAV_KEYWORDS = [
  { regex: /(nouveau lead|créer (un )?lead|ajoute(r)? (un )?lead)/i,       path: '/leads/new' },
  { regex: /(nouveau devis|créer (un )?devis|ajoute(r)? (un )?devis)/i,    path: '/quotes/new' },
  { regex: /(nouvelle facture|créer (une )?facture)/i,                      path: '/invoices/new' },
  { regex: /(tableau de bord|dashboard|\baccueil\b)/i,                      path: '/dashboard' },
  { regex: /(vue directeur|mode directeur|directeur)/i,                     path: '/director' },
  { regex: /(\bleads?\b|\bprospects?\b)/i,                                  path: '/leads' },
  { regex: /(\bdevis\b)/i,                                                  path: '/quotes' },
  { regex: /(\bfactures?\b|facturation)/i,                                  path: '/invoices' },
  { regex: /(\btâches?\b|\btasks?\b|à faire)/i,                             path: '/tasks' },
  { regex: /(\bplanning\b|agenda|calendrier)/i,                             path: '/planning' },
  { regex: /(\bcarte\b|\bmap\b)/i,                                          path: '/map' },
  { regex: /(\bkanban\b)/i,                                                 path: '/kanban' },
  { regex: /(analytics|statistiques|\bstats\b)/i,                           path: '/analytics' },
  { regex: /(paramètres|settings|réglages)/i,                               path: '/settings' },
];

// Mapping action → endpoint HTTP (pour l'exécution frontend)
const ACTION_MAP = {
  send_quote:         (p) => ({ method: 'POST',  path: `/quotes/${p.quote_id}/send`,       body: null }),
  mark_invoice_paid:  (p) => ({ method: 'POST',  path: `/invoices/${p.invoice_id}/mark-paid`, body: null }),
  send_reminder:      (p) => ({ method: 'POST',  path: `/invoices/${p.invoice_id}/remind`, body: null }),
  update_lead_status: (p) => ({ method: 'PATCH', path: `/leads/${p.lead_id}`,              body: { status: p.status } }),
  add_interaction:    (p) => ({ method: 'POST',  path: '/interactions',                    body: { lead_id: p.lead_id, type: p.type, content: p.content } }),
};

export default function VoiceFab() {
  const [expanded, setExpanded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [plan, setPlan] = useState(null);          // { summary, actions }
  const [executingIdx, setExecutingIdx] = useState(-1); // index de l'action en cours
  const [executionLog, setExecutionLog] = useState([]); // [{idx, status:'ok'|'error'|'skipped', message}]
  const [awaitingConfirm, setAwaitingConfirm] = useState(null); // { actionIdx, action }
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const hideTimer = useRef(null);

  const reset = () => {
    setPlan(null);
    setExecutingIdx(-1);
    setExecutionLog([]);
    setAwaitingConfirm(null);
    setError(null);
  };

  const hideSoon = (ms = 4000) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { setExpanded(false); reset(); }, ms);
  };

  // Exécute une action unique. Retourne true si OK.
  const runAction = useCallback(async (action) => {
    if (action.type === 'navigate') {
      navigate(action.path);
      return { ok: true, message: `→ ${action.path}` };
    }
    if (action.type === 'api_call') {
      const mapper = ACTION_MAP[action.action];
      if (!mapper) return { ok: false, message: `Action inconnue : ${action.action}` };
      const { method, path, body } = mapper(action.params || {});
      try {
        const fn = api[method.toLowerCase()];
        await (body ? fn(path, body) : fn(path));
        return { ok: true, message: action.description || `${method} ${path}` };
      } catch (e) {
        return { ok: false, message: e?.message || `Échec ${method} ${path}` };
      }
    }
    return { ok: false, message: `Type inconnu : ${action.type}` };
  }, [navigate]);

  // Parcours du plan : action par action, pause sur chaque destructive
  const executePlan = useCallback(async (actions, startFrom = 0) => {
    for (let i = startFrom; i < actions.length; i++) {
      const action = actions[i];
      setExecutingIdx(i);

      // Action destructive → demande confirmation
      if (action.type === 'api_call' && action.destructive) {
        setAwaitingConfirm({ actionIdx: i, action });
        return; // on interrompt ; la reprise se fait via confirmExecution()
      }

      const r = await runAction(action);
      setExecutionLog(prev => [...prev, { idx: i, ...r }]);
      if (!r.ok) break;
      await new Promise(res => setTimeout(res, 250)); // petit délai visuel
    }
    setExecutingIdx(-1);
    hideSoon(5000);
  }, [runAction]);

  // Reprise après confirmation
  const confirmExecution = useCallback(async (approved) => {
    if (!awaitingConfirm || !plan) return;
    const { actionIdx, action } = awaitingConfirm;
    setAwaitingConfirm(null);

    if (!approved) {
      setExecutionLog(prev => [...prev, { idx: actionIdx, ok: false, status: 'skipped', message: 'Annulé par l\'utilisateur' }]);
      executePlan(plan.actions, actionIdx + 1);
      return;
    }
    const r = await runAction(action);
    setExecutionLog(prev => [...prev, { idx: actionIdx, ...r }]);
    if (r.ok) executePlan(plan.actions, actionIdx + 1);
    else { setExecutingIdx(-1); hideSoon(5000); }
  }, [awaitingConfirm, plan, runAction, executePlan]);

  const handleCommand = useCallback(async (text) => {
    const instruction = text.trim();
    if (!instruction) return;
    reset();

    // Navigation rapide locale sans appel serveur (priorité aux routes simples)
    for (const { regex, path } of NAV_KEYWORDS) {
      if (regex.test(instruction)) {
        navigate(path);
        setPlan({ summary: `→ Ouverture de ${path}`, actions: [] });
        hideSoon(2500);
        return;
      }
    }

    // Sinon → agent IA
    setProcessing(true);
    try {
      const r = await api.post('/voice/agent', { instruction });
      const { summary, actions } = r.data || {};
      setPlan({ summary: summary || 'Plan prêt.', actions: actions || [] });
      setProcessing(false);
      if (actions && actions.length > 0) {
        executePlan(actions);
      } else {
        hideSoon(6000);
      }
    } catch (e) {
      setProcessing(false);
      const msg = e?.status === 503
        ? 'Agent IA désactivé (clé Claude absente). Essaie une commande de navigation simple : « ouvre les leads », « nouvelle facture »…'
        : e?.message || 'L\'agent n\'a pas pu traiter cette demande.';
      setError(msg);
      hideSoon(7000);
    }
  }, [navigate, executePlan]);

  const voice = useVoiceInput({
    lang: 'fr-FR',
    continuous: false,
    interimResults: true,
    silenceTimeoutMs: 1800,
    onFinal: (finalText) => {
      handleCommand(finalText);
      setExpanded(true);
    },
  });

  // Alt+Espace pour déclencher depuis n'importe où
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault();
        if (!voice.listening) { setExpanded(true); reset(); voice.start(); }
        else voice.stop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [voice]);

  if (!voice.supported) return null;

  const hasOutput = expanded && (voice.listening || voice.transcript || plan || processing || error);

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 150,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}>
        {hasOutput && (
          <div style={{
            background: 'oklch(0.165 0.012 60)', color: 'oklch(0.985 0.008 85)',
            padding: '14px 18px', borderRadius: 14, width: 380, maxWidth: 'calc(100vw - 48px)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
            animation: 'voiceFabIn 0.25s cubic-bezier(.16,1,.3,1)',
            maxHeight: '70vh', overflowY: 'auto',
          }}>
            {/* Header : état écoute */}
            {voice.listening && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: voice.transcript ? 10 : 0 }}>
                <span style={{ width: 6, height: 6, background: '#DC2626', borderRadius: 999, animation: 'pulse 1s infinite' }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', opacity: 0.7 }}>
                  À L'ÉCOUTE…
                </span>
              </div>
            )}

            {/* Transcription live */}
            {voice.transcript && (
              <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.4, marginBottom: 10 }}>
                « {voice.transcript} »
              </div>
            )}

            {/* Claude réfléchit */}
            {processing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, opacity: 0.8 }}>
                <Loader style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} />
                L'agent prépare le plan…
              </div>
            )}

            {/* Résumé du plan */}
            {plan?.summary && (
              <div style={{ fontSize: 13, marginBottom: plan.actions?.length ? 10 : 0, lineHeight: 1.5 }}>
                <span style={{ color: 'oklch(0.72 0.15 165)', marginRight: 6 }}>✦</span>
                {plan.summary}
              </div>
            )}

            {/* Liste des actions avec statut */}
            {plan?.actions?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {plan.actions.map((a, i) => {
                  const log = executionLog.find(l => l.idx === i);
                  const isRunning = executingIdx === i && !log;
                  const isDone = log?.ok;
                  const isFailed = log && !log.ok && log.status !== 'skipped';
                  const isSkipped = log?.status === 'skipped';

                  const bg = isDone ? 'rgba(5,150,105,0.18)'
                    : isFailed ? 'rgba(220,38,38,0.18)'
                    : isSkipped ? 'rgba(120,113,108,0.18)'
                    : isRunning ? 'rgba(59,130,246,0.22)'
                    : 'rgba(255,255,255,0.06)';

                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 10px', borderRadius: 8, background: bg,
                      fontSize: 12, lineHeight: 1.4,
                    }}>
                      <span style={{ width: 18, flexShrink: 0, marginTop: 1 }}>
                        {isDone  ? <Check style={{ width: 14, height: 14, color: '#10B981' }} /> :
                         isFailed ? <AlertTriangle style={{ width: 14, height: 14, color: '#F87171' }} /> :
                         isSkipped ? <X style={{ width: 14, height: 14, color: '#A8A29E' }} /> :
                         isRunning ? <Loader style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} /> :
                         <ArrowRight style={{ width: 14, height: 14, opacity: 0.5 }} />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: isRunning ? 600 : 400 }}>{a.description || a.path || a.action}</div>
                        {log?.message && log.message !== a.description && (
                          <div style={{ fontSize: 10, opacity: 0.6, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                            {log.message}
                          </div>
                        )}
                        {a.destructive && !log && !awaitingConfirm && (
                          <div style={{ fontSize: 10, color: '#FBBF24', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                            ⚠ ACTION IRRÉVERSIBLE
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirmation d'action destructive */}
            {awaitingConfirm && (
              <div style={{
                marginTop: 12, padding: '12px 14px', borderRadius: 10,
                background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.45)',
              }}>
                <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600, color: '#FBBF24' }}>
                  ⚠ Confirmation requise
                </div>
                <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.4 }}>
                  {awaitingConfirm.action.description}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => confirmExecution(true)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                             background: '#10B981', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Confirmer
                  </button>
                  <button onClick={() => confirmExecution(false)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8,
                             border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
                             color: 'inherit', fontSize: 12, cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div style={{ fontSize: 12, color: '#FCA5A5', marginTop: 10, padding: '8px 10px',
                           background: 'rgba(220, 38, 38, 0.15)', borderRadius: 8 }}>
                {error}
              </div>
            )}

            {/* Erreur vocale */}
            {voice.error && (
              <div style={{ fontSize: 12, color: '#FCA5A5', marginTop: 10 }}>
                {voice.error}
              </div>
            )}

            {/* Bouton fermer */}
            {!voice.listening && !processing && (plan || error) && !awaitingConfirm && executingIdx === -1 && (
              <button onClick={() => { setExpanded(false); reset(); }}
                style={{ marginTop: 10, background: 'none', border: '1px solid rgba(255,255,255,0.2)',
                         color: 'inherit', padding: '6px 12px', borderRadius: 6, fontSize: 11,
                         cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
                FERMER
              </button>
            )}
          </div>
        )}

        {/* FAB principal */}
        <button
          onClick={() => {
            if (voice.listening) { voice.stop(); }
            else { reset(); setExpanded(true); voice.start(); }
          }}
          title={voice.listening ? 'Arrêter l\'écoute (Alt+Espace)' : 'Parler à l\'agent (Alt+Espace)'}
          style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            cursor: processing ? 'wait' : 'pointer',
            background: voice.listening
              ? 'linear-gradient(135deg, #DC2626, #991B1B)'
              : 'linear-gradient(135deg, oklch(0.52 0.13 165), oklch(0.32 0.012 60))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
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

        {!hasOutput && (
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
