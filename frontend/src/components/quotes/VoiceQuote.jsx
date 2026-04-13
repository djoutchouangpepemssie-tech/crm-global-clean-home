import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Mic, MicOff, Loader, FileText, X, CheckCircle, Volume2, RefreshCw, Sparkles, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api';

const SERVICES = [
  { id: 'Ménage domicile',    emoji: '🏠', prix_m2: 3.5,  min: 89  },
  { id: 'Nettoyage canapé',   emoji: '🛋️', prix_m2: null, min: 79  },
  { id: 'Nettoyage matelas',  emoji: '🛏️', prix_m2: null, min: 69  },
  { id: 'Nettoyage bureaux',  emoji: '🏢', prix_m2: 4.0,  min: 150 },
  { id: 'Nettoyage tapis',    emoji: '🪣', prix_m2: 8.0,  min: 49  },
  { id: 'Nettoyage vitres',   emoji: '🪟', prix_m2: 5.0,  min: 59  },
  { id: 'Grand nettoyage',    emoji: '✨', prix_m2: 5.0,  min: 199 },
];

const EXEMPLES = [
  "Ménage pour Madame Martin, appartement 65m² à Paris 16e, le 15 mai, budget 200 euros",
  "Nettoyage canapé 3 places pour M. Dupont, adresse 12 rue de Rivoli Paris, urgent cette semaine",
  "Grand nettoyage bureaux 120m² société Tech Corp, Paris 8e, devis pour contrat mensuel",
  "Nettoyage matelas double et simple pour famille Leblanc, Neuilly-sur-Seine",
];

const VoiceQuote = ({ leadId = null, leadName = '', onQuoteCreated, onClose }) => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [quoteData, setQuoteData] = useState(null);
  const [step, setStep] = useState('idle'); // idle | recording | processing | preview | done
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

      // Auto-stop après 3s de silence
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        recognition.stop();
      }, 3000);
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
        // Délai pour récupérer le dernier transcript
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
    } catch (err) {
      // Fallback: analyse locale si backend indispo
      const local = analyzeLocally(text);
      setQuoteData(local);
      setStep('preview');
    } finally {
      setProcessing(false);
    }
  }, [transcript, leadId]);

  // Analyse locale de secours
  const analyzeLocally = (text) => {
    const lower = text.toLowerCase();
    let service = 'Ménage domicile';
    let surface = null;
    let amount = 89;
    let clientName = leadName || '';
    let address = '';
    let notes = text;

    // Détecter service
    if (lower.includes('canapé') || lower.includes('canape')) { service = 'Nettoyage canapé'; amount = 79; }
    else if (lower.includes('matelas')) { service = 'Nettoyage matelas'; amount = 69; }
    else if (lower.includes('bureau') || lower.includes('bureaux')) { service = 'Nettoyage bureaux'; amount = 150; }
    else if (lower.includes('tapis')) { service = 'Nettoyage tapis'; amount = 49; }
    else if (lower.includes('vitre') || lower.includes('fenêtre')) { service = 'Nettoyage vitres'; amount = 59; }
    else if (lower.includes('grand nettoyage') || lower.includes('fond')) { service = 'Grand nettoyage'; amount = 199; }

    // Détecter surface
    const surfaceMatch = text.match(/(\d+)\s*m²/);
    if (surfaceMatch) {
      surface = parseFloat(surfaceMatch[1]);
      const svc = SERVICES.find(s => s.id === service);
      if (svc?.prix_m2) amount = Math.max(svc.min, Math.round(surface * svc.prix_m2));
    }

    // Détecter prix mentionné
    const prixMatch = text.match(/(\d+)\s*euros?/i);
    if (prixMatch) amount = parseFloat(prixMatch[1]);

    // Détecter adresse Paris
    const addrMatch = text.match(/(?:à|rue|avenue|bd|boulevard|impasse)\s+[^,\.]+/i);
    if (addrMatch) address = addrMatch[0];

    // Détecter nom
    const nomMatch = text.match(/(?:M\.|Mme|Madame|Monsieur|pour)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)?)/);
    if (nomMatch && !clientName) clientName = nomMatch[1];

    return {
      service_type: service,
      surface,
      amount,
      client_name: clientName,
      address,
      details: text,
      notes,
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
      toast.success('✅ Devis créé avec succès !');
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

  const svcConfig = quoteData ? SERVICES.find(s => s.id === quoteData.service_type) || SERVICES[0] : null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.85)'}}>
      <div className="rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in"
        style={{background:'var(--bg-card)',border:'1px solid var(--border-default)'}}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400"/>
            </div>
            <div>
              <p className="font-black text-slate-100 text-sm">Devis par commande vocale</p>
              <p className="text-[10px] text-slate-500">Parlez — l&apos;IA génère le devis automatiquement</p>
            </div>
          </div>
          <button onClick={onClose || reset} className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5">
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── IDLE ── */}
          {step === 'idle' && (
            <div className="space-y-5">
              {!supported && (
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400">
                  ⚠️ Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.
                </div>
              )}

              {/* Bouton micro principal */}
              <div className="flex flex-col items-center gap-4 py-4">
                <button onClick={startRecording} disabled={!supported}
                  className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all disabled:opacity-40 group"
                  style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 8px 32px rgba(124,58,237,0.4)'}}>
                  <Mic className="w-10 h-10 text-white"/>
                  <div className="absolute inset-0 rounded-full bg-violet-500/20 scale-110 group-hover:scale-125 transition-transform"/>
                </button>
                <p className="text-sm font-semibold text-slate-400">Appuyez pour parler</p>
              </div>

              {/* Exemples */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exemples à essayer</p>
                <div className="space-y-2">
                  {EXEMPLES.map((ex, i) => (
                    <button key={i} onClick={() => handleUseExample(ex)}
                      className="w-full text-left p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all">
                      <p className="text-xs text-slate-400 leading-relaxed">&ldquo;{ex}&rdquo;</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Saisie manuelle */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ou saisissez le texte</p>
                <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
                  rows={3} placeholder="Décrivez le service, le client, l'adresse, la surface..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"/>
                {transcript && (
                  <button onClick={() => { setStep('processing'); analyzeWithAI(); }}
                    className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
                    🤖 Analyser avec l&apos;IA
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── RECORDING ── */}
          {step === 'recording' && (
            <div className="flex flex-col items-center gap-6 py-6">
              {/* Animation ondes */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                {[1,2,3].map(i => (
                  <div key={i} className="absolute inset-0 rounded-full border-2 border-violet-500/40 animate-ping"
                    style={{animationDelay:`${i*0.3}s`,animationDuration:'1.5s'}}/>
                ))}
                <button onClick={stopRecording}
                  className="relative w-24 h-24 rounded-full flex items-center justify-center"
                  style={{background:'linear-gradient(135deg,#ef4444,#dc2626)',boxShadow:'0 8px 32px rgba(239,68,68,0.4)'}}>
                  <MicOff className="w-10 h-10 text-white"/>
                </button>
              </div>

              <div className="text-center">
                <p className="text-lg font-black text-slate-100 mb-1">Je vous écoute...</p>
                <p className="text-xs text-slate-500">Parlez clairement · S&apos;arrête automatiquement</p>
              </div>

              {/* Transcription en temps réel */}
              <div className="w-full p-4 rounded-2xl border border-white/5 bg-white/2 min-h-16">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {transcript}
                  <span className="text-slate-500 italic">{interimTranscript}</span>
                  {!transcript && !interimTranscript && (
                    <span className="text-slate-600">En attente de votre voix...</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-violet-400 animate-pulse"/>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-slate-100 mb-2">Analyse en cours...</p>
                <p className="text-xs text-slate-500">L&apos;IA génère votre devis</p>
              </div>
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
                    style={{animationDelay:`${i*0.15}s`}}/>
                ))}
              </div>
              {transcript && (
                <div className="w-full p-3 rounded-xl border border-white/5 bg-white/2">
                  <p className="text-xs text-slate-500 italic">&ldquo;{transcript.slice(0, 120)}{transcript.length > 120 ? '...' : ''}&rdquo;</p>
                </div>
              )}
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && quoteData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-violet-400"/>
                <p className="text-sm font-black text-slate-200">Devis généré par l&apos;IA</p>
                {quoteData.confidence && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold ml-auto">
                    {Math.round(quoteData.confidence * 100)}% confiance
                  </span>
                )}
              </div>

              {/* Transcript source */}
              <div className="p-3 rounded-xl border border-white/5 bg-white/2">
                <p className="text-[10px] text-slate-500 font-bold mb-1">🎤 Transcription</p>
                <p className="text-xs text-slate-400 italic leading-relaxed">&ldquo;{transcript}&rdquo;</p>
              </div>

              {/* Devis généré */}
              <div className="p-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 space-y-3">
                {/* Service */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Service</span>
                  {editMode ? (
                    <select value={quoteData.service_type}
                      onChange={e => setQuoteData(p => ({...p, service_type: e.target.value}))}
                      className="bg-white/10 border border-white/10 text-slate-200 rounded-lg px-2 py-1 text-xs">
                      {SERVICES.map(s => <option key={s.id} value={s.id} className="bg-slate-800">{s.emoji} {s.id}</option>)}
                    </select>
                  ) : (
                    <span className="text-sm font-black text-slate-100">
                      {svcConfig?.emoji} {quoteData.service_type}
                    </span>
                  )}
                </div>

                {/* Surface */}
                {(quoteData.surface || editMode) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Surface</span>
                    {editMode ? (
                      <input type="number" value={quoteData.surface || ''}
                        onChange={e => setQuoteData(p => ({...p, surface: parseFloat(e.target.value)}))}
                        className="bg-white/10 border border-white/10 text-slate-200 rounded-lg px-2 py-1 text-xs w-24 text-right"
                        placeholder="m²"/>
                    ) : (
                      <span className="text-sm font-bold text-slate-300">{quoteData.surface} m²</span>
                    )}
                  </div>
                )}

                {/* Client */}
                {(quoteData.client_name || editMode) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Client</span>
                    {editMode ? (
                      <input value={quoteData.client_name || ''}
                        onChange={e => setQuoteData(p => ({...p, client_name: e.target.value}))}
                        className="bg-white/10 border border-white/10 text-slate-200 rounded-lg px-2 py-1 text-xs w-40 text-right"
                        placeholder="Nom client"/>
                    ) : (
                      <span className="text-sm font-bold text-slate-300">{quoteData.client_name}</span>
                    )}
                  </div>
                )}

                {/* Adresse */}
                {(quoteData.address || editMode) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Adresse</span>
                    {editMode ? (
                      <input value={quoteData.address || ''}
                        onChange={e => setQuoteData(p => ({...p, address: e.target.value}))}
                        className="bg-white/10 border border-white/10 text-slate-200 rounded-lg px-2 py-1 text-xs w-48 text-right"
                        placeholder="Adresse"/>
                    ) : (
                      <span className="text-sm font-bold text-slate-300 text-right max-w-48 truncate">{quoteData.address}</span>
                    )}
                  </div>
                )}

                {/* Prix */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-sm font-bold text-slate-400">Montant TTC</span>
                  {editMode ? (
                    <input type="number" value={quoteData.amount}
                      onChange={e => setQuoteData(p => ({...p, amount: parseFloat(e.target.value)}))}
                      className="bg-white/10 border border-white/10 text-violet-300 rounded-lg px-2 py-1 text-lg font-black w-28 text-right"/>
                  ) : (
                    <span className="text-2xl font-black text-violet-300" style={{fontFamily:'Manrope,sans-serif'}}>
                      {quoteData.amount} €
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => setEditMode(p => !p)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
                  {editMode ? '✅ Valider' : '✏️ Modifier'}
                </button>
                <button onClick={reset}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1"/> Recommencer
                </button>
              </div>

              <button onClick={handleCreateQuote}
                className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all"
                style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 4px 20px rgba(124,58,237,0.3)'}}>
                ✅ Créer ce devis
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400"/>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-slate-100 mb-2">Devis créé ! 🎉</p>
                <p className="text-sm text-slate-500">Le devis a été ajouté à la liste</p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={reset}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5">
                  Nouveau devis
                </button>
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
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
