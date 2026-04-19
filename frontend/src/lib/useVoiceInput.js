// useVoiceInput.js — Hook pour capture vocale via Web Speech API native.
// Marche sur Chrome, Edge, Safari desktop + iOS, Chrome Android. Firefox non
// supporté (fallback : afficher un message discret à l'utilisateur).
//
// Usage :
//   const voice = useVoiceInput({ lang: 'fr-FR', onFinal: (text) => ... });
//   voice.start() / voice.stop()
//   voice.listening, voice.transcript, voice.error, voice.supported

import { useCallback, useEffect, useRef, useState } from 'react';

// Détecte l'API (préfixée ou standard)
const SpeechRecognitionApi =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function useVoiceInput({
  lang = 'fr-FR',
  continuous = false,        // false : une seule phrase ; true : flux continu
  interimResults = true,     // true : affiche le texte en direct pendant qu'on parle
  onFinal,                   // callback(finalText) quand une phrase est finalisée
  silenceTimeoutMs = 1500,   // auto-stop après N ms de silence (0 = désactivé)
} = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const silenceTimer = useRef(null);
  const stoppedByUser = useRef(false);
  const accumulatedFinal = useRef(''); // ← accumule les segments finaux d'une session
  const fired = useRef(false);         // ← garde : onFinal ne tire qu'UNE fois par session
  const supported = Boolean(SpeechRecognitionApi);

  // Reset silence timer à chaque nouvelle parole
  const bumpSilenceTimer = useCallback(() => {
    if (!silenceTimeoutMs) return;
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    }, silenceTimeoutMs);
  }, [silenceTimeoutMs]);

  const stop = useCallback(() => {
    stoppedByUser.current = true;
    if (silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setError('Votre navigateur ne prend pas en charge la reconnaissance vocale. Utilisez Chrome, Edge ou Safari.');
      return;
    }
    setError(null);
    setTranscript('');
    setFinalTranscript('');
    accumulatedFinal.current = '';
    fired.current = false;
    stoppedByUser.current = false;

    const rec = new SpeechRecognitionApi();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = interimResults;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);

    // onend : on ne déclenche onFinal QU'ICI, avec TOUT le texte accumulé.
    // Évite le spam quand Web Speech découpe une phrase en plusieurs segments finaux.
    rec.onend = () => {
      setListening(false);
      if (silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null; }
      recognitionRef.current = null;
      const fullFinal = accumulatedFinal.current.trim();
      if (fullFinal && !fired.current && onFinal) {
        fired.current = true;
        onFinal(fullFinal);
      }
    };

    rec.onerror = (e) => {
      const msg = {
        'no-speech':     'Je n\'ai rien entendu. Réessaie en parlant plus clairement.',
        'audio-capture': 'Aucun micro détecté. Vérifie que ton micro est branché.',
        'not-allowed':   'Accès au micro refusé. Autorise le micro dans les paramètres du navigateur.',
        'aborted':       null, // arrêt volontaire, pas une vraie erreur
        'network':       'Problème réseau pendant la reconnaissance vocale.',
      }[e.error] ?? `Erreur reconnaissance : ${e.error}`;
      if (msg) setError(msg);
    };

    rec.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += txt;
        else interim += txt;
      }
      if (final) {
        accumulatedFinal.current = (accumulatedFinal.current + ' ' + final).trim();
        setFinalTranscript(accumulatedFinal.current);
      }
      // Affichage live pendant qu'on parle
      setTranscript((accumulatedFinal.current + ' ' + interim).trim());
      bumpSilenceTimer();
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      setError('Impossible de démarrer la reconnaissance : ' + (e?.message || 'erreur inconnue'));
    }
  }, [supported, lang, continuous, interimResults, onFinal, bumpSilenceTimer]);

  // Cleanup si le composant démonte pendant l'écoute
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, []);

  return {
    supported,
    listening,
    transcript,
    finalTranscript,
    error,
    start,
    stop,
    toggle: () => (listening ? stop() : start()),
    clearError: () => setError(null),
  };
}
