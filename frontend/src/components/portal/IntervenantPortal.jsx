import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from '../shared';
import axios from 'axios';
import api from '../../lib/api';
import {
  Home, Calendar, Clock, MapPin, User, LogOut, Play,
  CheckCircle, Phone, MessageSquare, ChevronRight,
  RefreshCw, Star, X, Check, Send, FileText, Upload,
  Navigation, Award, Shield, Bell, TrendingUp, Zap,
  ChevronDown, Mail, AlertCircle, Package, Camera
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';

const API = BACKEND_URL + '/api/intervenant';
const CRM = BACKEND_URL + '/api';

const iAxios = axios.create({ withCredentials: true });
iAxios.interceptors.request.use(config => {
  const token = localStorage.getItem('intervenant_token');
  if (token) {
    config.headers['X-Intervenant-Token'] = token;
  }
  return config;
});

const STATUS = {
  planifiée: { label:'Planifiée', color:'#60a5fa', bg:'rgba(96,165,250,0.12)', border:'rgba(96,165,250,0.25)' },
  en_cours:  { label:'En cours',  color:'#f59e0b', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.25)' },
  terminée:  { label:'Terminée',  color:'#047857', bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.25)' },
  annulée:   { label:'Annulée',   color:'#c2410c', bg:'rgba(194,65,12,0.12)',  border:'rgba(194,65,12,0.25)' },
};

const SVC = {'Ménage':'🏠','menage':'🏠','Canapé':'🛋️','canape':'🛋️','Matelas':'🛏️','matelas':'🛏️','Tapis':'🪣','tapis':'🪣','Bureaux':'🏢','bureaux':'🏢'};
const getIcon = (t='') => { const k=Object.keys(SVC).find(k=>(t||'').toLowerCase().includes(k.toLowerCase())); return SVC[k]||'🧹'; };

const DOCS_REQUIS = ["Pièce d'identité","Contrat de travail","Assurance RC Pro","RIB","Attestation URSSAF"];

/* ── LOGIN ── */
const Login = ({ onAuth }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/request`, { email });
      if (res.data.dev_code) {
        toast.success(`Code de connexion : ${res.data.dev_code}`, { duration: 10000 });
      } else {
        toast.success('Code envoyé par email !');
      }
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Email non reconnu. Contactez votre administrateur.');
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
    } catch {
      toast.error('Code invalide ou expiré');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{background:'linear-gradient(135deg,#1c1917 0%,#064e3b 100%)'}}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-15" style={{background:'radial-gradient(circle,#047857,transparent)'}}/>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-10" style={{background:'radial-gradient(circle,#f97316,transparent)'}}/>
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-2xl" style={{background:'linear-gradient(135deg,#047857,#059669)'}}>
            <span className="text-4xl">🧹</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1" style={{}}>Portail Agent</h1>
          <p className="text-brand-400/80 text-sm font-medium">Global Clean Home</p>
        </div>
        <div className="rounded-3xl p-8" style={{background:'rgba(255,255,255,0.05)',border:'1px solid var(--border-default)',backdropFilter:'blur(20px)'}}>
          {step === 1 ? (
            <>
              <h2 className="text-lg font-bold text-white mb-1">Connexion sécurisée</h2>
              <p className="text-neutral-400 text-sm mb-6">Entrez votre email pour recevoir votre code de connexion.</p>
              <form onSubmit={requestCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Email professionnel</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500"/>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                      placeholder="vous@globalcleanhome.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-all"
                      style={{background:'rgba(255,255,255,0.05)',borderColor:'var(--border-default)'}}/>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all"
                  style={{background:'linear-gradient(135deg,#047857,#059669)',boxShadow:'0 4px 20px rgba(16,185,129,0.4)'}}>
                  {loading ? '⏳ Envoi en cours...' : '📱 Recevoir mon code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-brand-400"/>
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Vérification</h2>
                <p className="text-neutral-400 text-sm">Code envoyé à <strong className="text-neutral-300">{email}</strong></p>
              </div>
              <form onSubmit={verifyCode} className="space-y-4">
                <input type="text" value={code} onChange={e=>setCode(e.target.value)} required
                  placeholder="• • • • • •" maxLength={6}
                  className="w-full px-4 py-4 rounded-xl border text-center text-3xl font-black text-neutral-200 tracking-[0.5em] outline-none transition-all"
                  style={{background:'rgba(255,255,255,0.05)',borderColor:'var(--border-default)'}}/>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#047857,#059669)',boxShadow:'0 4px 20px rgba(16,185,129,0.4)'}}>
                  {loading ? '⏳ Vérification...' : '🚀 Accéder à mon espace'}
                </button>
                <button type="button" onClick={()=>{setStep(1);setCode('');}} className="w-full text-xs text-neutral-500 hover:text-neutral-400 py-2">
                  ← Changer d'email
                </button>
              </form>
            </>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[{i:'📋',l:'Mes missions'},{i:'✅',l:'Checklists'},{i:'💬',l:'Messages'}].map(f=>(
            <div key={f.l} className="text-center p-3 rounded-2xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-xl mb-1">{f.i}</p>
              <p className="text-[10px] text-neutral-500 font-medium">{f.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── CHECKLIST MODAL ── */
const ChecklistModal = ({ intervention, onClose, onComplete }) => {
  const type = (intervention.service_type||'').toLowerCase();
  const items = type.includes('canap') ? ['Dépoussiérage préalable','Traitement des taches','Injection-extraction','Séchage vérifié','Résultat validé avec client'] :
    type.includes('matelas') ? ['Dépoussiérage','Anti-acariens appliqué','Injection-extraction','Séchage vérifié','Protège-matelas replacé'] :
    type.includes('tapis') ? ['Dépoussiérage','Traitement taches','Shampooing','Rinçage','Séchage contrôlé'] :
    type.includes('bureau') ? ['Postes nettoyés','Sanitaires désinfectés','Parties communes','Poubelles vidées','Sols nettoyés','Accès sécurisé'] :
    ['Matériel vérifié','Zone sécurisée','Client informé','Prestation réalisée','Zone rangée','Photos prises','Client satisfait'];

  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.85)'}}>
      <div className="rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto"
        style={{background:'var(--bg-card)',border:'1px solid var(--border-default)'}}>
        <div className="sticky top-0 p-5 border-b border-neutral-200" style={{background:'var(--bg-card)'}}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-black text-neutral-100">Checklist</h3>
              <p className="text-xs text-neutral-500">{intervention.title||intervention.service_type}</p>
            </div>
            <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-white rounded-xl"><X className="w-4 h-4"/></button>
          </div>
          <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{width:`${(done/items.length)*100}%`,background:'linear-gradient(90deg,#047857,#059669)'}}/>
          </div>
          <p className="text-xs text-brand-400 mt-1 font-semibold">{done}/{items.length} complétés</p>
        </div>
        <div className="p-5 space-y-2">
          {items.map((item,i)=>(
            <button key={i} onClick={()=>setChecked(p=>({...p,[i]:!p[i]}))}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${checked[i]?'border-brand-500/30 bg-brand-500/8':'border-neutral-100 bg-neutral-100 hover:bg-neutral-100'}`}>
              <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked[i]?'bg-brand-500 border-brand-500':'border-neutral-600'}`}>
                {checked[i] && <Check className="w-4 h-4 text-white"/>}
              </div>
              <span className={`text-sm font-medium ${checked[i]?'text-brand-300 line-through opacity-70':'text-neutral-300'}`}>{item}</span>
            </button>
          ))}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-neutral-400 mb-2">📝 Notes / Observations</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
              placeholder="Problèmes rencontrés, matériel supplémentaire..."
              className="w-full px-4 py-3 rounded-xl border text-sm text-neutral-200 placeholder-neutral-600 outline-none resize-none"
              style={{background:'rgba(255,255,255,0.05)',borderColor:'var(--border-default)'}}/>
          </div>
        </div>
        <div className="p-5 border-t border-neutral-200">
          <button onClick={()=>onComplete(checked,notes)} disabled={done<items.length}
            className="w-full py-4 rounded-2xl font-black text-white text-sm disabled:opacity-30 transition-all"
            style={{background:done===items.length?'linear-gradient(135deg,#047857,#059669)':'rgba(255,255,255,0.05)',boxShadow:done===items.length?'0 4px 20px rgba(16,185,129,0.4)':'none'}}>
            {done===items.length ? '🎉 Terminer l\'intervention' : `⏳ Encore ${items.length-done} tâche(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── DASHBOARD ── */
const Dashboard = ({ agent, onLogout }) => {
  const [interventions, setInterventions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accueil');
  const [showChecklist, setShowChecklist] = useState(null);
  const [selectedIntv, setSelectedIntv] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [intvRes, msgRes] = await Promise.allSettled([
        iAxios.get(`${API}/interventions`),
        iAxios.get(`${API}/messages`),
      ]);
      setInterventions(intvRes.status==='fulfilled' ? (intvRes.value.data?.interventions||intvRes.value.data||[]) : []);
      setMessages(msgRes.status==='fulfilled' ? (msgRes.value.data?.messages||[]) : []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);
  useEffect(()=>{
    if (activeTab==='messages') {
      const t = setInterval(()=>iAxios.get(`${API}/messages`).then(r=>setMessages(r.data?.messages||[])).catch(()=>{}), 8000);
      return ()=>clearInterval(t);
    }
  },[activeTab]);
  useEffect(()=>{ messagesEndRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const handleCheckIn = async (id) => {
    try {
      await iAxios.post(`${API}/interventions/${id}/checkin`, {});
      toast.success('✅ Arrivée enregistrée !');
      fetchData();
    } catch { toast.error('Erreur check-in'); }
  };

  const handleCompleteChecklist = async (checked, notes) => {
    const id = showChecklist.intervention_id || showChecklist.id;
    try {
      await iAxios.post(`${API}/interventions/${id}/checkout`, {
        checklist: checked, notes,
        completed_items: Object.values(checked).filter(Boolean).length,
      });
      toast.success('🎉 Intervention terminée avec succès !');
      setShowChecklist(null);
      fetchData();
    } catch { toast.error('Erreur lors de la clôture'); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSendingMsg(true);
    try {
      await iAxios.post(`${API}/messages`, { content: newMsg });
      setNewMsg('');
      const res = await iAxios.get(`${API}/messages`);
      setMessages(res.data?.messages||[]);
    } catch { toast.error('Erreur envoi'); }
    setSendingMsg(false);
  };

  const handleUploadDoc = async (e, docName) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Simuler upload - en prod envoyer vers storage
      await new Promise(r=>setTimeout(r,1000));
      setUploadedDocs(p=>[...p.filter(d=>d.name!==docName), {name:docName, file:file.name, date:new Date().toLocaleDateString('fr-FR')}]);
      // Notifier le bureau
      await iAxios.post(`${API}/messages`, {
        content: `📎 J'ai envoyé mon document : ${docName} (${file.name})`,
      });
      toast.success(`✅ ${docName} envoyé !`);
    } catch { toast.error('Erreur upload'); }
    setUploading(false);
  };

  const today = new Date().toISOString().slice(0,10);
  const todayIntvs = interventions.filter(i=>(i.scheduled_date||'').startsWith(today));
  const enCours = interventions.find(i=>i.status==='en_cours');
  const prenom = agent?.name?.split(' ')[0]||'Agent';
  const unreadMsgs = messages.filter(m=>!m.from_agent&&!m.read).length;

  const TABS = [
    { id:'accueil',   label:'Accueil',   icon:Home },
    { id:'planning',  label:'Planning',  icon:Calendar, notif:todayIntvs.length },
    { id:'messages',  label:'Messages',  icon:MessageSquare, notif:unreadMsgs },
    { id:'documents', label:'Documents', icon:FileText },
    { id:'profil',    label:'Profil',    icon:User },
  ];

  return (
    <div className="min-h-screen pb-20" style={{background:'hsl(224,71%,4%)'}}>

      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b" style={{background:'rgba(6,25,50,0.95)',borderColor:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)'}}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{background:'linear-gradient(135deg,#047857,#059669)'}}>🧹</div>
            <div>
              <p className="text-sm font-black text-neutral-100" style={{}}>Bonjour {prenom} 👋</p>
              <p className="text-[10px] text-brand-400/70 font-semibold">{agent?.role||'Technicien'} · Global Clean Home</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {enCours && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-amber-400 animate-pulse"
                style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)'}}>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"/>EN MISSION
              </div>
            )}
            <button onClick={onLogout} className="p-2 rounded-xl text-neutral-500 hover:text-terracotta-400 hover:bg-terracotta-500/10 transition-all">
              <LogOut className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
        ) : (
          <>

          {/* ── ACCUEIL ── */}
          {activeTab==='accueil' && (
            <div className="space-y-4">
              {/* Banner */}
              <div className="rounded-3xl p-6 relative overflow-hidden"
                style={{background:'linear-gradient(135deg,#064e3b,#065f46)',border:'1px solid rgba(16,185,129,0.3)'}}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{background:'radial-gradient(circle,#047857,transparent)'}}/>
                <p className="text-brand-400/80 text-sm font-semibold mb-1">
                  {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
                </p>
                <h2 className="text-2xl font-black text-white mb-3" style={{}}>
                  Bienvenue, {prenom} !
                </h2>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-black text-brand-400" style={{}}>{todayIntvs.length}</p>
                    <p className="text-xs text-brand-400/70 font-semibold">Auj.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-white" style={{}}>{interventions.filter(i=>i.status==='planifiée').length}</p>
                    <p className="text-xs text-neutral-400 font-semibold">À venir</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-neutral-300" style={{}}>{interventions.filter(i=>i.status==='terminée').length}</p>
                    <p className="text-xs text-neutral-500 font-semibold">Terminées</p>
                  </div>
                </div>
              </div>

              {/* Mission en cours */}
              {enCours && (
                <div className="rounded-3xl p-5 border" style={{background:'rgba(245,158,11,0.08)',borderColor:'rgba(245,158,11,0.25)'}}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"/>
                    <p className="text-sm font-black text-amber-300">🔥 Mission en cours</p>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)'}}>
                      {getIcon(enCours.service_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-neutral-100">{enCours.title||enCours.service_type}</p>
                      {enCours.address && <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/>{enCours.address}</p>}
                      {enCours.lead_name && <p className="text-xs text-neutral-500">👤 {enCours.lead_name}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={enCours.address?`https://maps.google.com/?q=${encodeURIComponent(enCours.address)}`:'#'} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border border-neutral-200 text-neutral-400 hover:text-neutral-200 transition-all">
                      <Navigation className="w-4 h-4"/> Itinéraire
                    </a>
                    <button onClick={()=>setShowChecklist(enCours)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white transition-all"
                      style={{background:'linear-gradient(135deg,#047857,#059669)',boxShadow:'0 4px 16px rgba(16,185,129,0.3)'}}>
                      <CheckCircle className="w-4 h-4"/> Terminer
                    </button>
                  </div>
                </div>
              )}

              {/* Prochaines missions */}
              {interventions.filter(i=>i.status==='planifiée').length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">📅 Prochaines missions</p>
                  {interventions.filter(i=>i.status==='planifiée').slice(0,3).map(intv=>(
                    <div key={intv.intervention_id||intv.id}
                      onClick={()=>setSelectedIntv(intv)}
                      className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-100 bg-neutral-100 hover:bg-neutral-100 cursor-pointer transition-all">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{background:'rgba(96,165,250,0.12)',border:'1px solid rgba(96,165,250,0.2)'}}>
                        {getIcon(intv.service_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-neutral-200 truncate text-sm">{intv.title||intv.service_type}</p>
                        <p className="text-xs text-neutral-500">{intv.scheduled_date} · {intv.scheduled_time||'—'}</p>
                        {intv.address && <p className="text-xs text-neutral-600 truncate">{intv.address}</p>}
                      </div>
                      <button onClick={e=>{e.stopPropagation();handleCheckIn(intv.intervention_id||intv.id);}}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
                        style={{background:'linear-gradient(135deg,#047857,#059669)'}}>
                        ▶ Start
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {interventions.length===0 && (
                <div className="rounded-2xl border border-neutral-100 p-10 text-center">
                  <Calendar className="w-12 h-12 text-neutral-700 mx-auto mb-3"/>
                  <p className="text-neutral-500 font-medium">Aucune mission pour le moment</p>
                  <p className="text-xs text-neutral-600 mt-1">Vos missions apparaîtront ici</p>
                </div>
              )}

              {/* Actions rapides */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {icon:'💬', label:'Contacter le bureau', tab:'messages'},
                  {icon:'📄', label:'Mes documents', tab:'documents'},
                ].map(a=>(
                  <button key={a.tab} onClick={()=>setActiveTab(a.tab)}
                    className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-100 bg-neutral-100 hover:bg-neutral-100 transition-all text-left">
                    <span className="text-2xl">{a.icon}</span>
                    <span className="text-sm font-semibold text-neutral-300">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PLANNING ── */}
          {activeTab==='planning' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-neutral-100">Mon planning</h2>
                <button onClick={fetchData} className="p-2 rounded-xl bg-white text-neutral-400 border border-neutral-100">
                  <RefreshCw className="w-4 h-4"/>
                </button>
              </div>

              {/* Aujourd'hui */}
              {todayIntvs.length > 0 && (
                <div className="rounded-2xl p-4 border" style={{background:'rgba(16,185,129,0.05)',borderColor:'rgba(16,185,129,0.2)'}}>
                  <p className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-3">📅 Aujourd'hui</p>
                  <div className="space-y-3">
                    {todayIntvs.map(intv=>{
                      const sc=STATUS[intv.status]||STATUS.planifiée;
                      return (
                        <div key={intv.intervention_id||intv.id}
                          className="p-4 rounded-2xl border" style={{background:sc.bg,borderColor:sc.border}}>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getIcon(intv.service_type)}</span>
                              <div>
                                <p className="font-bold text-neutral-100 text-sm">{intv.title||intv.service_type}</p>
                                <p className="text-xs" style={{color:sc.color}}>{intv.scheduled_time||'—'}{intv.duration_hours?` · ${intv.duration_hours}h`:''}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{color:sc.color,background:'rgba(0,0,0,0.3)'}}>{sc.label}</span>
                          </div>
                          {intv.address && (
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(intv.address)}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-300 mb-3 transition-colors">
                              <Navigation className="w-3 h-3"/>{intv.address}
                            </a>
                          )}
                          {intv.lead_phone && (
                            <a href={`tel:${intv.lead_phone}`} className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 mb-3 transition-colors">
                              <Phone className="w-3 h-3"/>{intv.lead_phone}
                            </a>
                          )}
                          <div className="flex gap-2">
                            {intv.status==='planifiée' && (
                              <button onClick={()=>handleCheckIn(intv.intervention_id||intv.id)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white"
                                style={{background:'linear-gradient(135deg,#047857,#059669)'}}>
                                ▶ Démarrer l'intervention
                              </button>
                            )}
                            {intv.status==='en_cours' && (
                              <button onClick={()=>setShowChecklist(intv)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white"
                                style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)'}}>
                                ✅ Checklist & Terminer
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toutes les interventions */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Toutes les missions</p>
                {interventions.length===0 ? (
                  <div className="rounded-2xl border border-neutral-100 p-10 text-center">
                    <Calendar className="w-10 h-10 text-neutral-700 mx-auto mb-3"/>
                    <p className="text-neutral-500 text-sm">Aucune mission assignée</p>
                  </div>
                ) : (
                  [...interventions].sort((a,b)=>(b.scheduled_date||'').localeCompare(a.scheduled_date||'')).map(intv=>{
                    const sc=STATUS[intv.status]||STATUS.planifiée;
                    return (
                      <div key={intv.intervention_id||intv.id}
                        className="p-4 rounded-2xl border border-neutral-100 bg-neutral-100"
                        style={{borderLeft:`3px solid ${sc.color}`}}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getIcon(intv.service_type)}</span>
                            <div>
                              <p className="font-bold text-neutral-200 text-sm">{intv.title||intv.service_type}</p>
                              <p className="text-xs text-neutral-500">{intv.scheduled_date} · {intv.scheduled_time||'—'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{color:sc.color,background:sc.bg}}>{sc.label}</span>
                        </div>
                        {intv.address && (
                          <a href={`https://maps.google.com/?q=${encodeURIComponent(intv.address)}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-300 transition-colors">
                            <Navigation className="w-3 h-3"/>{intv.address}
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          {activeTab==='messages' && (
            <div className="flex flex-col" style={{height:'calc(100vh - 200px)'}}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-neutral-100">Messages</h2>
                <button onClick={()=>iAxios.get(`${API}/messages`).then(r=>setMessages(r.data?.messages||[])).catch(()=>{})}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-white">
                  <RefreshCw className="w-3.5 h-3.5"/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.length===0 && (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <MessageSquare className="w-10 h-10 text-neutral-700"/>
                    <p className="text-neutral-500 text-sm">Aucun message</p>
                    <p className="text-xs text-neutral-600">Contactez le bureau directement</p>
                  </div>
                )}
                {messages.map((msg,i)=>{
                  const isMe = msg.from_agent || msg.sender==='agent';
                  return (
                    <div key={i} className={`flex ${isMe?'justify-end':'justify-start'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-auto"
                          style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>🏠</div>
                      )}
                      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm ${isMe?'rounded-br-sm':'rounded-bl-sm'}`}
                        style={isMe
                          ? {background:'linear-gradient(135deg,#047857,#059669)',color:'white'}
                          : {background:'rgba(255,255,255,0.07)',border:'1px solid var(--border-default)',color:'#e2e8f0'}}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe?'text-white/50':'text-neutral-600'}`}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef}/>
              </div>
              <div className="flex gap-2">
                <input value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
                  placeholder="Message au bureau..."
                  className="flex-1 px-4 py-3 rounded-2xl border text-sm text-neutral-200 placeholder-neutral-600 outline-none"
                  style={{background:'rgba(255,255,255,0.05)',borderColor:'var(--border-default)'}}/>
                <button onClick={sendMessage} disabled={sendingMsg||!newMsg.trim()}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#047857,#059669)'}}>
                  <Send className="w-4 h-4"/>
                </button>
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab==='documents' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-neutral-100 mb-1">Mes documents</h2>
                <p className="text-sm text-neutral-500">Envoyez vos documents RH directement depuis l'application.</p>
              </div>

              <div className="rounded-2xl p-4 border" style={{background:'rgba(96,165,250,0.05)',borderColor:'rgba(96,165,250,0.2)'}}>
                <p className="text-xs font-bold text-neutral-300 mb-1">📋 Documents requis</p>
                <p className="text-xs text-neutral-500">Veuillez fournir les documents suivants pour compléter votre dossier.</p>
              </div>

              <div className="space-y-3">
                {DOCS_REQUIS.map(doc=>{
                  const uploaded = uploadedDocs.find(d=>d.name===doc);
                  return (
                    <div key={doc} className={`p-4 rounded-2xl border transition-all ${uploaded?'border-brand-500/25 bg-brand-500/5':'border-neutral-100 bg-neutral-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${uploaded?'bg-brand-500/20 border border-brand-500/30':'bg-white border border-neutral-200'}`}>
                          <FileText className={`w-5 h-5 ${uploaded?'text-brand-400':'text-neutral-500'}`}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-neutral-200">{doc}</p>
                          {uploaded ? (
                            <p className="text-xs text-brand-400">✅ Envoyé le {uploaded.date} · {uploaded.file}</p>
                          ) : (
                            <p className="text-xs text-neutral-500">⏳ En attente</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {uploaded ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/20">Reçu ✓</span>
                          ) : (
                            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white cursor-pointer transition-all"
                              style={{background:'linear-gradient(135deg,#047857,#4f46e5)'}}>
                              <Upload className="w-3.5 h-3.5"/>
                              Envoyer
                              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                                onChange={e=>handleUploadDoc(e,doc)}/>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bouton contact si besoin */}
              <div className="rounded-2xl p-4 border border-neutral-100 bg-neutral-100 text-center">
                <p className="text-xs text-neutral-500 mb-3">Un problème avec un document ? Contactez le bureau.</p>
                <button onClick={()=>setActiveTab('messages')}
                  className="flex items-center justify-center gap-2 mx-auto px-4 py-2.5 rounded-xl text-sm font-bold text-brand-400 border border-brand-500/20 hover:bg-brand-500/10 transition-all">
                  <MessageSquare className="w-4 h-4"/> Contacter le bureau
                </button>
              </div>
            </div>
          )}

          {/* ── PROFIL ── */}
          {activeTab==='profil' && (
            <div className="space-y-5">
              {/* Card profil */}
              <div className="rounded-3xl p-6 text-center" style={{background:'linear-gradient(135deg,#064e3b,#065f46)',border:'1px solid rgba(16,185,129,0.2)'}}>
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4"
                  style={{background:'rgba(16,185,129,0.3)',border:'2px solid rgba(16,185,129,0.4)'}}>
                  {(agent?.name||'A').charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-black text-white mb-1">{agent?.name||'Agent'}</h3>
                <p className="text-brand-400 text-sm font-semibold mb-3 capitalize">{agent?.role||'Technicien'}</p>
                <p className="text-neutral-400 text-xs">{agent?.email||'—'}</p>
              </div>

              {/* Ma note */}
              <div className="rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-amber-400"/>
                  <p className="text-sm font-bold text-amber-300">Ma note</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s=>(
                      <Star key={s} className={`w-7 h-7 ${s<=(agent?.rating||5)?'fill-amber-400 text-amber-400':'text-neutral-700'}`}/>
                    ))}
                  </div>
                  <span className="text-xl font-black text-amber-400 ml-2">{agent?.rating||5}/5</span>
                </div>
                <p className="text-xs text-neutral-500 mt-2">Note attribuée par votre responsable</p>
              </div>

              {/* Mes stats */}
              <div className="rounded-2xl p-5 border border-neutral-100 bg-neutral-100">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-neutral-400"/>
                  <p className="text-sm font-bold text-neutral-300">Mes performances</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {label:"Planifiées", value:interventions.filter(i=>i.status==='planifiée').length, color:'#60a5fa'},
                    {label:"Terminées", value:interventions.filter(i=>i.status==='terminée').length, color:'#047857'},
                    {label:"Total", value:interventions.length, color:'#d97706'},
                  ].map(s=>(
                    <div key={s.label} className="text-center p-3 rounded-xl" style={{background:`${s.color}10`}}>
                      <p className="text-2xl font-black" style={{color:s.color}}>{s.value}</p>
                      <p className="text-[10px] font-semibold mt-0.5" style={{color:`${s.color}aa`}}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents status */}
              <div className="rounded-2xl p-5 border border-neutral-100 bg-neutral-100">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-brand-400"/>
                  <p className="text-sm font-bold text-neutral-300">Dossier RH</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500">{uploadedDocs.length}/{DOCS_REQUIS.length} documents envoyés</p>
                  <div className="flex-1 h-2 bg-white rounded-full overflow-hidden mx-3">
                    <div className="h-full rounded-full bg-brand-500 transition-all"
                      style={{width:`${(uploadedDocs.length/DOCS_REQUIS.length)*100}%`}}/>
                  </div>
                  <button onClick={()=>setActiveTab('documents')}
                    className="text-xs text-brand-400 font-bold hover:text-brand-300 transition-colors">
                    Voir →
                  </button>
                </div>
              </div>

              {/* Contact rapide bureau */}
              <div className="rounded-2xl p-4 border border-neutral-100 bg-neutral-100">
                <p className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider">Contact bureau</p>
                <div className="flex gap-3">
                  <a href="tel:+33622665308"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                    style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                    <Phone className="w-4 h-4"/> Appeler
                  </a>
                  <a href="https://wa.me/33622665308" target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                    style={{background:'#25D366'}}>
                    💬 WhatsApp
                  </a>
                </div>
              </div>

              <button onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-terracotta-500/20 text-terracotta-400 hover:bg-terracotta-500/10 transition-all text-sm font-bold">
                <LogOut className="w-4 h-4"/> Se déconnecter
              </button>
            </div>
          )}

          </>
        )}
      </div>

      {/* ── MODAL DÉTAIL INTERVENTION ── */}
      {selectedIntv && !showChecklist && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.8)'}} onClick={()=>setSelectedIntv(null)}>
          <div className="rounded-3xl p-6 max-w-md w-full animate-fade-in"
            style={{background:'var(--bg-card)',border:'1px solid var(--border-default)'}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{background:STATUS[selectedIntv.status]?.bg,border:`1px solid ${STATUS[selectedIntv.status]?.border}`}}>
                  {getIcon(selectedIntv.service_type)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-100">{selectedIntv.title||selectedIntv.service_type}</h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{color:STATUS[selectedIntv.status]?.color,background:STATUS[selectedIntv.status]?.bg}}>{STATUS[selectedIntv.status]?.label}</span>
                </div>
              </div>
              <button onClick={()=>setSelectedIntv(null)} className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-white rounded-xl"><X className="w-4 h-4"/></button>
            </div>
            <div className="space-y-2 mb-5">
              {[
                {icon:Clock, color:'#d97706', label:`${selectedIntv.scheduled_date||'—'} à ${selectedIntv.scheduled_time||'—'}${selectedIntv.duration_hours?` · ${selectedIntv.duration_hours}h`:''}`},
                ...(selectedIntv.address?[{icon:MapPin, color:'#60a5fa', label:selectedIntv.address}]:[]),
                ...(selectedIntv.lead_name?[{icon:User, color:'#047857', label:selectedIntv.lead_name}]:[]),
                ...(selectedIntv.lead_phone?[{icon:Phone, color:'#f59e0b', label:selectedIntv.lead_phone}]:[]),
              ].map((item,i)=>(
                <div key={i} className="flex items-center gap-3 text-sm text-neutral-400 p-3 rounded-xl bg-neutral-100 border border-neutral-100">
                  <item.icon className="w-4 h-4 flex-shrink-0" style={{color:item.color}}/>
                  <span>{item.label}</span>
                </div>
              ))}
              {selectedIntv.description && <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-100 text-sm text-neutral-400">{selectedIntv.description}</div>}
            </div>
            <div className="flex gap-2">
              {selectedIntv.address && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedIntv.address)}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border border-neutral-500/20 text-neutral-400 hover:bg-neutral-500/10 transition-all">
                  <Navigation className="w-4 h-4"/> Itinéraire
                </a>
              )}
              {selectedIntv.status==='planifiée' && (
                <button onClick={()=>{handleCheckIn(selectedIntv.intervention_id||selectedIntv.id);setSelectedIntv(null);}}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white"
                  style={{background:'linear-gradient(135deg,#047857,#059669)'}}>
                  <Play className="w-4 h-4"/> Démarrer
                </button>
              )}
              {selectedIntv.status==='en_cours' && (
                <button onClick={()=>{setShowChecklist(selectedIntv);setSelectedIntv(null);}}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white"
                  style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)'}}>
                  <CheckCircle className="w-4 h-4"/> Terminer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHECKLIST */}
      {showChecklist && <ChecklistModal intervention={showChecklist} onClose={()=>setShowChecklist(null)} onComplete={handleCompleteChecklist}/>}

      {/* ── BARRE NAVIGATION MOBILE ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t" style={{background:'rgba(6,25,50,0.98)',borderColor:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)'}}>
        <div className="max-w-lg mx-auto flex justify-around px-2 py-2">
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all relative ${activeTab===tab.id?'text-brand-400':'text-neutral-600'}`}>
              {activeTab===tab.id && <div className="absolute inset-0 rounded-2xl" style={{background:'rgba(16,185,129,0.1)'}}/>}
              <tab.icon className={`w-5 h-5 relative z-10 ${activeTab===tab.id?'text-brand-400':'text-neutral-600'}`}/>
              <span className="text-[9px] font-bold relative z-10">{tab.label}</span>
              {tab.notif > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[8px] font-black flex items-center justify-center z-20"
                  style={{background:'#047857'}}>{tab.notif}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── MAIN ── */
const IntervenantPortal = () => {
  const [agent, setAgent] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(()=>{
    const check = async () => {
      const token = localStorage.getItem('intervenant_token');
      if (!token) { setChecking(false); return; }
      iAxios.defaults.headers.common['X-Intervenant-Token'] = token;
      try {
        const res = await iAxios.get(`${API}/me`);
        setAgent(res.data);
      } catch { localStorage.removeItem('intervenant_token'); }
      setChecking(false);
    };
    check();
  },[]);

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'hsl(224,71%,4%)'}}>
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"/>
        <span className="text-neutral-500 text-sm font-medium">Connexion...</span>
      </div>
    </div>
  );

  if (!agent) return <Login onAuth={setAgent}/>;
  return <Dashboard agent={agent} onLogout={()=>{ localStorage.removeItem('intervenant_token'); setAgent(null); toast.success('Déconnecté'); }}/>;
};

export default IntervenantPortal;
