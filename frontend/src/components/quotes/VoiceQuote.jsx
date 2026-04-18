/**
 * VoiceQuote — Atelier direction.
 *
 * Modal de dictée vocale : fond crème, accents terracotta, filets éditoriaux
 * (plus de glows violet, plus de gradients saturés). Logique 100% identique.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Mic, MicOff, FileText, X, CheckCircle, RefreshCw, Sparkles, AudioLines,
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api';

const SERVICES = [
  { id: 'Ménage domicile',    prix_m2: 3.5,  min: 89  },
  { id: 'Nettoyage canapé',   prix_m2: null, min: 79  },
  { id: 'Nettoyage matelas',  prix_m2: null, min: 69  },
  { id: 'Nettoyage bureaux',  prix_m2: 4.0,  min: 150 },
  { id: 'Nettoyage tapis',    prix_m2: 8.0,  min: 49  },
  { id: 'Nettoyage vitres',   prix_m2: 5.0,  min: 59  },
  { id: 'Grand nettoyage',    prix_m2: 5.0,  min: 199 },
];

const EXEMPLES = [
  "Ménage pour Madame Martin, appartement 65m² à Paris 16e, le 15 mai, budget 200 euros",
  "Nettoyage canapé 3 places pour M. Dupont, 12 rue de Rivoli Paris, urgent cette semaine",
  "Grand nettoyage bureaux 120m² société Tech Corp, Paris 8e, devis pour contrat mensuel",
  "Nettoyage matelas double et simple pour famille Leblanc, Neuilly-sur-Seine",
];

const VoiceQuote = ({ leadId = null, leadName = '', onQuoteCreated, onClose }) => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [quoteData, setQuoteData] = useState(null);
  const [step, setStep] = useState('idle');
  const [supported, setSupported] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Navigateur non supporté — utilisez Chrome'); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setRecording(true);
      setStep('recording');
      setTranscript('');
      setInterimTranscript('');
    };

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      setTranscript(prev => prev + final);
      setInterimTranscript(interim);

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => { recognition.stop(); }, 3000);
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') toast.error(`Erreur micro: ${e.error}`);
      setRecording(false);
      setStep('idle');
    };

    recognition.onend = () => {
      setRecording(false);
      setInterimTranscript('');
      if (transcript || recognitionRef.current?._finalText) {
        setStep('processing');
        setTimeout(() => analyzeWithAI(), 300);
      } else {
        setStep('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [transcript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    clearTimeout(timeoutRef.current);
  }, []);

  const analyzeWithAI = useCallback(async () => {
    const text = transcript.trim();
    if (!text) { setStep('idle'); return; }

    setProcessing(true);
    setStep('processing');

    try {
      const response = await fetch(`${API}/voice-quote/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transcript: text, lead_id: leadId }),
      });
      if (!response.ok) throw new Error('Erreur analyse');
      const data = await response.json();
      setQuoteData(data);
      setStep('preview');
    } catch {
      const local = analyzeLocally(text);
      setQuoteData(local);
      setStep('preview');
    } finally {
      setProcessing(false);
    }
  }, [transcript, leadId]);

  const analyzeLocally = (text) => {
    const lower = text.toLowerCase();
    let service = 'Ménage domicile';
    let surface = null;
    let amount = 89;
    let clientName = leadName || '';
    let address = '';

    if (lower.includes('canapé') || lower.includes('canape')) { service = 'Nettoyage canapé'; amount = 79; }
    else if (lower.includes('matelas')) { service = 'Nettoyage matelas'; amount = 69; }
    else if (lower.includes('bureau') || lower.includes('bureaux')) { service = 'Nettoyage bureaux'; amount = 150; }
    else if (lower.includes('tapis')) { service = 'Nettoyage tapis'; amount = 49; }
    else if (lower.includes('vitre') || lower.includes('fenêtre')) { service = 'Nettoyage vitres'; amount = 59; }
    else if (lower.includes('grand nettoyage') || lower.includes('fond')) { service = 'Grand nettoyage'; amount = 199; }

    const surfaceMatch = text.match(/(\d+)\s*m²/);
    if (surfaceMatch) {
      surface = parseFloat(surfaceMatch[1]);
      const svc = SERVICES.find(s => s.id === service);
      if (svc?.prix_m2) amount = Math.max(svc.min, Math.round(surface * svc.prix_m2));
    }
    const prixMatch = text.match(/(\d+)\s*euros?/i);
    if (prixMatch) amount = parseFloat(prixMatch[1]);
    const addrMatch = text.match(/(?:à|rue|avenue|bd|boulevard|impasse)\s+[^,\.]+/i);
    if (addrMatch) address = addrMatch[0];
    const nomMatch = text.match(/(?:M\.|Mme|Madame|Monsieur|pour)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)?)/);
    if (nomMatch && !clientName) clientName = nomMatch[1];

    return {
      service_type: service,
      surface,
      amount,
      client_name: clientName,
      address,
      details: text,
      notes: text,
      confidence: 0.75,
      lead_id: leadId,
    };
  };

  const handleUseExample = (example) => {
    setTranscript(example);
    setStep('processing');
    setTimeout(() => {
      const local = analyzeLocally(example);
      setQuoteData(local);
      setStep('preview');
    }, 500);
  };

  const handleCreateQuote = async () => {
    if (!quoteData) return;
    try {
      await axios.post(`${API}/quotes`, {
        lead_id: quoteData.lead_id || leadId,
        service_type: quoteData.service_type,
        surface: quoteData.surface,
        amount: quoteData.amount,
        details: quoteData.details || transcript,
      }, { withCredentials: true });
      toast.success('Devis créé');
      setStep('done');
      onQuoteCreated?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur création devis');
    }
  };

  const reset = () => {
    setStep('idle');
    setTranscript('');
    setInterimTranscript('');
    setQuoteData(null);
    setProcessing(false);
    setEditMode(false);
  };

  /* ── Styles atelier (classes réutilisables) ───────────────────── */
  const labelMono = 'font-mono text-[10px] uppercase tracking-[0.12em] font-semibold text-ink-600';
  const rowField = 'flex items-center justify-between gap-3 py-1';
  const inputBox =
    'bg-bg-base border border-ink-200 text-ink-900 placeholder-ink-400 rounded-md px-2.5 py-1.5 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(28, 25, 21, 0.72)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg overflow-hidden shadow-xl animate-fade-in"
        style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-default, #E5E0D6)',
          borderRadius: 'var(--radius-lg, 10px)',
        }}
      >
        {/* HEADER — bande crème + filet terracotta à gauche */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-ink-200 bg-bg-muted">
          <span className="absolute top-0 left-0 h-full w-[3px] bg-accent-600" aria-hidden />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-accent-100 border border-accent-200 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent-700" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-display font-semibold text-ink-900 text-sm leading-tight tracking-tight">
                Devis par commande vocale
              </p>
              <p className={`${labelMono} mt-0.5`}>
                Parlez — l&apos;IA génère le devis
              </p>
            </div>
          </div>
          <button
            onClick={onClose || reset}
            className="p-2 rounded-md text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── IDLE ── */}
          {step === 'idle' && (
            <div className="space-y-5">
              {!supported && (
                <div className="p-3 rounded-md border border-amber-300 bg-amber-50 text-xs text-amber-800">
                  Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.
                </div>
              )}

              {/* Bouton micro principal — anneau terracotta */}
              <div className="flex flex-col items-center gap-4 py-2">
                <button
                  onClick={startRecording}
                  disabled={!supported}
                  className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all disabled:opacity-40 group"
                  style={{
                    background: '#C2410C',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.08), inset 0 -2px 0 rgba(0,0,0,0.12)',
                  }}
                  aria-label="Démarrer la dictée"
                >
                  <Mic className="w-9 h-9 text-bg-base" strokeWidth={1.8} />
                  <div className="absolute -inset-2 rounded-full border border-accent-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <p className={labelMono}>Appuyez pour parler</p>
              </div>

              {/* Exemples */}
              <div>
                <p className={`${labelMono} mb-2`}>Exemples à essayer</p>
                <div className="space-y-2">
                  {EXEMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => handleUseExample(ex)}
                      className="w-full text-left p-3 rounded-md border border-ink-200 bg-bg-muted hover:bg-bg-base hover:border-accent-300 transition-all"
                    >
                      <p className="text-xs text-ink-700 leading-relaxed italic">
                        &ldquo;{ex}&rdquo;
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Saisie manuelle */}
              <div>
                <p className={`${labelMono} mb-2`}>Ou saisissez le texte</p>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  rows={3}
                  placeholder="Décrivez le service, le client, l'adresse, la surface…"
                  className={`w-full resize-none ${inputBox}`}
                />
                {transcript && (
                  <button
                    onClick={() => { setStep('processing'); analyzeWithAI(); }}
                    className="w-full mt-2 py-2.5 rounded-md text-sm font-semibold text-bg-base transition-colors"
                    style={{ background: '#C2410C' }}
                  >
                    Analyser avec l&apos;IA
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── RECORDING ── */}
          {step === 'recording' && (
            <div className="flex flex-col items-center gap-6 py-6">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Ondes terracotta (au lieu de violet) */}
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="absolute inset-0 rounded-full border border-accent-400/50 animate-ping"
                    style={{ animationDelay: `${i * 0.3}s`, animationDuration: '1.6s' }}
                  />
                ))}
                <button
                  onClick={stopRecording}
                  className="relative w-24 h-24 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: '#1C1915',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.12), inset 0 -2px 0 rgba(0,0,0,0.25)',
                  }}
                  aria-label="Arrêter la dictée"
                >
                  <MicOff className="w-9 h-9 text-bg-base" strokeWidth={1.8} />
                </button>
              </div>

              <div className="text-center">
                <p className="text-display font-semibold text-ink-900 text-lg tracking-tight mb-1">
                  Je vous écoute…
                </p>
                <p className={labelMono}>Parlez clairement · Arrêt auto</p>
              </div>

              <div className="w-full p-4 rounded-md border border-ink-200 bg-bg-muted min-h-[64px]">
                <p className="text-sm text-ink-800 leading-relaxed">
                  {transcript}
                  <span className="text-ink-500 italic">{interimTranscript}</span>
                  {!transcript && !interimTranscript && (
                    <span className="text-ink-400 italic">En attente de votre voix…</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-16 h-16 rounded-md bg-accent-50 border border-accent-200 flex items-center justify-center">
                <AudioLines className="w-7 h-7 text-accent-700 animate-pulse" strokeWidth={1.8} />
              </div>
              <div className="text-center">
                <p className="text-display font-semibold text-ink-900 text-lg tracking-tight mb-1">
                  Analyse en cours…
                </p>
                <p className={labelMono}>L&apos;IA génère votre devis</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-accent-600 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              {transcript && (
                <div className="w-full p-3 rounded-md border border-ink-200 bg-bg-muted">
                  <p className="text-xs text-ink-600 italic leading-relaxed">
                    &ldquo;{transcript.slice(0, 120)}{transcript.length > 120 ? '…' : ''}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && quoteData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-accent-700" strokeWidth={1.8} />
                <p className="text-display font-semibold text-ink-900 text-sm tracking-tight">
                  Devis généré
                </p>
                {quoteData.confidence && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200 font-semibold ml-auto tabular-nums tracking-wider">
                    {Math.round(quoteData.confidence * 100)}% CONFIANCE
                  </span>
                )}
              </div>

              {/* Transcript source */}
              <div className="p-3 rounded-md border border-ink-200 bg-bg-muted">
                <p className={`${labelMono} mb-1`}>Transcription</p>
                <p className="text-xs text-ink-700 italic leading-relaxed">
                  &ldquo;{transcript}&rdquo;
                </p>
              </div>

              {/* Devis généré — filet gauche terracotta */}
              <div className="relative p-4 rounded-md border border-ink-200 bg-bg-card overflow-hidden">
                <span className="absolute top-0 left-0 h-full w-[3px] bg-accent-600" aria-hidden />

                <div className="space-y-2 ml-1">
                  {/* Service */}
                  <div className={rowField}>
                    <span className={labelMono}>Service</span>
                    {editMode ? (
                      <select
                        value={quoteData.service_type}
                        onChange={e => setQuoteData(p => ({ ...p, service_type: e.target.value }))}
                        className={inputBox}
                      >
                        {SERVICES.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm font-medium text-ink-900">
                        {quoteData.service_type}
                      </span>
                    )}
                  </div>

                  {/* Surface */}
                  {(quoteData.surface || editMode) && (
                    <div className={rowField}>
                      <span className={labelMono}>Surface</span>
                      {editMode ? (
                        <input
                          type="number"
                          value={quoteData.surface || ''}
                          onChange={e => setQuoteData(p => ({ ...p, surface: parseFloat(e.target.value) }))}
                          className={`${inputBox} w-24 text-right tabular-nums`}
                          placeholder="m²"
                        />
                      ) : (
                        <span className="text-sm font-medium text-ink-800 tabular-nums">
                          {quoteData.surface} m²
                        </span>
                      )}
                    </div>
                  )}

                  {/* Client */}
                  {(quoteData.client_name || editMode) && (
                    <div className={rowField}>
                      <span className={labelMono}>Client</span>
                      {editMode ? (
                        <input
                          value={quoteData.client_name || ''}
                          onChange={e => setQuoteData(p => ({ ...p, client_name: e.target.value }))}
                          className={`${inputBox} w-40 text-right`}
                          placeholder="Nom"
                        />
                      ) : (
                        <span className="text-sm font-medium text-ink-800">
                          {quoteData.client_name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Adresse */}
                  {(quoteData.address || editMode) && (
                    <div className={rowField}>
                      <span className={labelMono}>Adresse</span>
                      {editMode ? (
                        <input
                          value={quoteData.address || ''}
                          onChange={e => setQuoteData(p => ({ ...p, address: e.target.value }))}
                          className={`${inputBox} w-48 text-right`}
                          placeholder="Adresse"
                        />
                      ) : (
                        <span className="text-sm font-medium text-ink-800 text-right max-w-[200px] truncate">
                          {quoteData.address}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Prix */}
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-ink-200">
                    <span className={labelMono}>Montant TTC</span>
                    {editMode ? (
                      <input
                        type="number"
                        value={quoteData.amount}
                        onChange={e => setQuoteData(p => ({ ...p, amount: parseFloat(e.target.value) }))}
                        className={`${inputBox} w-28 text-right text-lg font-semibold tabular-nums text-accent-700`}
                      />
                    ) : (
                      <span className="text-display text-2xl font-semibold text-accent-700 tracking-tight tabular-nums">
                        {quoteData.amount} €
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(p => !p)}
                  className="flex-1 py-2.5 rounded-md text-xs font-semibold border border-ink-200 text-ink-700 hover:text-ink-900 hover:bg-bg-muted transition-all"
                >
                  {editMode ? 'Valider' : 'Modifier'}
                </button>
                <button
                  onClick={reset}
                  className="flex-1 py-2.5 rounded-md text-xs font-semibold border border-ink-200 text-ink-700 hover:text-terracotta-700 hover:border-terracotta-300 hover:bg-terracotta-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recommencer
                </button>
              </div>

              <button
                onClick={handleCreateQuote}
                className="w-full py-3.5 rounded-md font-semibold text-bg-base text-sm transition-colors flex items-center justify-center gap-2"
                style={{
                  background: '#C2410C',
                  boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.12)',
                }}
              >
                <FileText className="w-4 h-4" strokeWidth={1.8} />
                Créer ce devis
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-16 h-16 rounded-md bg-brand-50 border border-brand-200 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-brand-700" strokeWidth={1.8} />
              </div>
              <div className="text-center">
                <p className="text-display font-semibold text-ink-900 text-xl tracking-tight mb-1">
                  Devis créé
                </p>
                <p className={labelMono}>Le devis a été ajouté à la liste</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={reset}
                  className="flex-1 py-3 rounded-md text-sm font-semibold border border-ink-200 text-ink-700 hover:text-ink-900 hover:bg-bg-muted transition-all"
                >
                  Nouveau devis
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-md text-sm font-semibold text-bg-base transition-colors"
                  style={{ background: '#1C1915' }}
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceQuote;
