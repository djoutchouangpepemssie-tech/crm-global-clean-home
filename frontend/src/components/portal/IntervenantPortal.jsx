import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Home, Calendar, CheckSquare, Clock, MapPin, User, LogOut,
  Play, CheckCircle, XCircle, Camera, Phone, MessageSquare,
  ChevronRight, RefreshCw, AlertCircle, Star, Package,
  Navigation, Zap, Award, List, LayoutGrid, X, Check,
  Send, Bell, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';

const API = BACKEND_URL + '/api/intervenant';
const iAxios = axios.create({ withCredentials: true });
iAxios.interceptors.request.use(config => {
  const token = localStorage.getItem('intervenant_token');
  if (token) config.headers['X-Intervenant-Token'] = token;
  return config;
});

const STATUS = {
  planifiée:  { label:'Planifiée',  color:'#60a5fa', bg:'rgba(96,165,250,0.15)',  dot:'bg-blue-400' },
  en_cours:   { label:'En cours',   color:'#f59e0b', bg:'rgba(245,158,11,0.15)',  dot:'bg-amber-400 animate-pulse' },
  terminée:   { label:'Terminée',   color:'#10b981', bg:'rgba(16,185,129,0.15)',  dot:'bg-emerald-400' },
  annulée:    { label:'Annulée',    color:'#f43f5e', bg:'rgba(244,63,94,0.15)',   dot:'bg-red-400' },
};

const SERVICE_ICONS = {'Ménage':'🏠','menage':'🏠','Canapé':'🛋️','canape':'🛋️','Matelas':'🛏️','matelas':'🛏️','Tapis':'🪣','tapis':'🪣','Bureaux':'🏢','bureaux':'🏢'};
const getIcon = (type='') => { const k = Object.keys(SERVICE_ICONS).find(k=>(type||'').toLowerCase().includes(k.toLowerCase())); return SERVICE_ICONS[k]||'🧹'; };

// ── LOGIN ──
const IntervenantLogin = ({ onAuth }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/request`, { email });
      if (res.data.dev_code) setCode(res.data.dev_code);
      setStep(2);
      toast.success('Code envoyé par email !');
    } catch { toast.error('Email non reconnu'); }
    finally { setLoading(false); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/verify`, { email, code }, { withCredentials: true });
      localStorage.setItem('intervenant_token', res.data.token);
      iAxios.defaults.headers.common['X-Intervenant-Token'] = res.data.token;
      onAuth(res.data.agent);
    } catch { toast.error('Code invalide'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{background:'linear-gradient(135deg,#0f172a,#1e1b4b)'}}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{background:'radial-gradient(circle,#10b981,transparent)'}}/>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15"
          style={{background:'radial-gradient(circle,#f97316,transparent)'}}/>
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-2xl"
            style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
            <span className="text-3xl">🧹</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1" style={{fontFamily:'Manrope,sans-serif'}}>
            Portail Intervenant
          </h1>
          <p className="text-slate-400 text-sm">Global Clean Home — Espace agent</p>
        </div>
        <div className="rounded-2xl p-8" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',backdropFilter:'blur(20px)'}}>
          {step === 1 ? (
            <>
              <h2 className="text-lg font-bold text-slate-100 mb-2">Connexion</h2>
              <p className="text-slate-400 text-sm mb-6">Entrez votre email professionnel pour recevoir un code de connexion.</p>
              <form onSubmit={requestCode} className="space-y-4">
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                  placeholder="votre@globalcleanhome.com"
                  className="w-full px-4 py-3 rounded-xl border text-sm text-slate-200 placeholder-slate-600 outline-none"
                  style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.1)'}}/>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                  {loading ? '⏳ Envoi...' : '📱 Recevoir mon code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-100 mb-2">Code de vérification</h2>
              <p className="text-slate-400 text-sm mb-6">Entrez le code reçu par email à <strong>{email}</strong></p>
              <form onSubmit={verifyCode} className="space-y-4">
                <input type="text" value={code} onChange={e=>setCode(e.target.value)} required
                  placeholder="000000" maxLength={6}
                  className="w-full px-4 py-3 rounded-xl border text-center text-2xl font-black text-slate-200 tracking-widest outline-none"
                  style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.1)'}}/>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                  {loading ? '⏳ Vérification...' : '✅ Se connecter'}
                </button>
                <button type="button" onClick={()=>setStep(1)} className="w-full text-xs text-slate-500 hover:text-slate-400">
                  ← Changer d'email
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── CHECKLIST MODAL ──
const ChecklistModal = ({ intervention, onClose, onComplete }) => {
  const checklists = {
    default: ['Matériel vérifié et complet','Zone de travail sécurisée','Client informé du début','Prestation réalisée selon cahier des charges','Zone nettoyée et rangée','Client satisfait et informé','Photos avant/après prises'],
    menage: ['Aspirateur effectué','Sols lavés','Sanitaires nettoyés et désinfectés','Cuisine nettoyée','Poussières époussetées','Vitres nettoyées','Déchets évacués'],
    canape: ['Dépoussiérage préalable','Traitement taches spécifiques','Injection-extraction effectuée','Séchage vérifié','Résultat contrôlé avec client'],
    matelas: ['Dépoussiérage préalable','Traitement anti-acariens','Injection-extraction effectuée','Séchage vérifié','Protège-matelas replacé'],
    tapis: ['Dépoussiérage préalable','Traitement taches','Shampooing effectué','Rinçage complet','Séchage contrôlé'],
    bureaux: ['Postes de travail nettoyés','Sanitaires désinfectés','Parties communes nettoyées','Poubelles vidées','Sols nettoyés','Accès sécurisé'],
  };

  const type = (intervention.service_type||'').toLowerCase();
  const items = type.includes('canap') ? checklists.canape :
                type.includes('matelas') ? checklists.matelas :
                type.includes('tapis') ? checklists.tapis :
                type.includes('bureau') ? checklists.bureaux :
                type.includes('ménage') || type.includes('menage') ? checklists.menage :
                checklists.default;

  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState('');
  const allDone = items.every((_,i)=>checked[i]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.8)'}}>
      <div className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in"
        style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)'}}>
        <div className="sticky top-0 p-5 border-b border-white/10" style={{background:'hsl(224,71%,6%)'}}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-100">Checklist intervention</h3>
              <p className="text-xs text-slate-500">{intervention.title||intervention.service_type}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
              <X className="w-4 h-4"/>
            </button>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{width:`${(Object.values(checked).filter(Boolean).length/items.length)*100}%`, background:'linear-gradient(90deg,#10b981,#059669)'}}/>
          </div>
          <p className="text-xs text-emerald-400 mt-1">{Object.values(checked).filter(Boolean).length}/{items.length} complétés</p>
        </div>
        <div className="p-5 space-y-2">
          {items.map((item,i)=>(
            <button key={i} onClick={()=>setChecked(p=>({...p,[i]:!p[i]}))}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                checked[i] ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/5 bg-white/2 hover:bg-white/5'
              }`}>
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                checked[i] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
              }`}>
                {checked[i] && <Check className="w-3.5 h-3.5 text-white"/>}
              </div>
              <span className={`text-sm font-medium ${checked[i]?'text-emerald-300 line-through':'text-slate-300'}`}>{item}</span>
            </button>
          ))}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-400 mb-2">Notes / Observations</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
              placeholder="Problèmes rencontrés, matériel supplémentaire nécessaire..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm text-slate-200 placeholder-slate-600 outline-none resize-none"
              style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.1)'}}/>
          </div>
        </div>
        <div className="p-5 border-t border-white/10">
          <button onClick={()=>onComplete(checked, notes)} disabled={!allDone}
            className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 transition-all"
            style={{background:'linear-gradient(135deg,#10b981,#059669)',boxShadow:allDone?'0 4px 16px rgba(16,185,129,0.3)':'none'}}>
            {allDone ? '✅ Terminer l\'intervention' : `⏳ ${items.length - Object.values(checked).filter(Boolean).length} tâche(s) restante(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── DASHBOARD INTERVENANT ──
const IntervenantDashboard = ({ agent, onLogout }) => {
  const [interventions, setInterventions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('accueil');
  const [loading, setLoading] = useState(true);
  const [selectedIntv, setSelectedIntv] = useState(null);
  const [showChecklist, setShowChecklist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const messagesEndRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [intvRes, taskRes] = await Promise.allSettled([
        iAxios.get(`${API}/interventions`),
        iAxios.get(`${API}/tasks`),
      ]);
      setInterventions(intvRes.status==='fulfilled' ? (intvRes.value.data.interventions||intvRes.value.data||[]) : []);
      setTasks(taskRes.status==='fulfilled' ? (taskRes.value.data||[]) : []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await iAxios.get(`${API}/messages`);
      setMessages(res.data.messages||[]);
    } catch {}
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);
  useEffect(()=>{ if(activeTab==='messages') fetchMessages(); },[activeTab,fetchMessages]);
  useEffect(()=>{ if(activeTab==='messages'){ const t=setInterval(fetchMessages,10000); return()=>clearInterval(t); } },[activeTab,fetchMessages]);
  useEffect(()=>{ messagesEndRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const handleCheckIn = async (id) => {
    try {
      await iAxios.post(`${API}/interventions/${id}/checkin`, { lat: null, lng: null });
      toast.success('✅ Check-in enregistré !');
      fetchData();
    } catch { toast.error('Erreur check-in'); }
  };

  const handleCheckOut = async (id) => {
    setShowChecklist(interventions.find(i=>(i.intervention_id||i.id)===id));
  };

  const handleCompleteChecklist = async (checked, notes) => {
    const id = showChecklist.intervention_id || showChecklist.id;
    try {
      await iAxios.post(`${API}/interventions/${id}/checkout`, {
        checklist: checked,
        notes,
        completed_items: Object.values(checked).filter(Boolean).length,
      });
      toast.success('🎉 Intervention terminée !');
      setShowChecklist(null);
      fetchData();
    } catch { toast.error('Erreur checkout'); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    try {
      await iAxios.post(`${API}/messages`, { content: newMsg });
      setNewMsg('');
      fetchData();
      fetchMessages();
    } catch { toast.error('Erreur envoi'); }
  };

  const prenom = agent?.name?.split(' ')[0] || 'Agent';
  const today = new Date().toISOString().slice(0,10);
  const todayIntvs = interventions.filter(i=>(i.scheduled_date||'').startsWith(today));
  const enCours = interventions.find(i=>i.status==='en_cours');
  const upcoming = interventions.filter(i=>i.status==='planifiée').slice(0,5);

  const TABS = [
    { id:'accueil',   label:'Accueil',         icon:Home },
    { id:'planning',  label:'Planning',         icon:Calendar, notif: todayIntvs.length },
    { id:'tasks',     label:'Tâches',           icon:CheckSquare, notif: tasks.filter(t=>t.status==='pending').length },
    { id:'messages',  label:'Messages',         icon:MessageSquare },
    { id:'profil',    label:'Mon profil',       icon:User },
  ];

  return (
    <div className="min-h-screen" style={{background:'hsl(224,71%,4%)'}}>

      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b" style={{background:'rgba(15,23,42,0.95)',borderColor:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)'}}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base"
              style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>🧹</div>
            <div>
              <p className="text-sm font-black text-slate-100">Global Clean Home</p>
              <p className="text-[10px] text-slate-500">Portail Intervenant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {enCours && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 animate-pulse"
                style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)'}}>
                <div className="w-2 h-2 rounded-full bg-amber-400"/>EN COURS
              </div>
            )}
            <button onClick={onLogout} className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <LogOut className="w-4 h-4"/>
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-0 overflow-x-auto scrollbar-none">
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all flex-shrink-0 relative ${
                activeTab===tab.id ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}>
              <tab.icon className="w-3.5 h-3.5"/>
              <span className="hidden sm:block">{tab.label}</span>
              {tab.notif > 0 && (
                <span className="absolute top-1 right-0 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                  style={{background:'#10b981'}}>{tab.notif}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
        ) : (
          <>

          {/* ACCUEIL */}
          {activeTab==='accueil' && (
            <div className="space-y-4">
              {/* Banner */}
              <div className="rounded-2xl p-5 relative overflow-hidden"
                style={{background:'linear-gradient(135deg,#10b981,#059669)',boxShadow:'0 8px 32px rgba(16,185,129,0.3)'}}>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-30"
                  style={{background:'radial-gradient(circle,white,transparent)'}}/>
                <p className="text-white/70 text-sm mb-1">Bienvenue !</p>
                <h2 className="text-2xl font-black text-white mb-1" style={{fontFamily:'Manrope,sans-serif'}}>
                  Bonjour {prenom} 👋
                </h2>
                <p className="text-white/70 text-sm">{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label:"Aujourd'hui", value:todayIntvs.length, color:'#10b981', icon:'📅'},
                  {label:'En attente', value:interventions.filter(i=>i.status==='planifiée').length, color:'#60a5fa', icon:'⏳'},
                  {label:'Tâches', value:tasks.filter(t=>t.status==='pending').length, color:'#f59e0b', icon:'✅'},
                ].map(s=>(
                  <div key={s.label} className="p-3 rounded-2xl border text-center"
                    style={{background:`${s.color}10`,borderColor:`${s.color}25`}}>
                    <p className="text-xl mb-1">{s.icon}</p>
                    <p className="text-xl font-black" style={{color:s.color,fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
                    <p className="text-[10px] font-medium" style={{color:`${s.color}cc`}}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Intervention en cours */}
              {enCours && (
                <div className="rounded-2xl p-4 border" style={{background:'rgba(245,158,11,0.08)',borderColor:'rgba(245,158,11,0.2)'}}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
                    <p className="text-sm font-bold text-amber-300">Intervention en cours</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)'}}>
                      {getIcon(enCours.service_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-200 truncate">{enCours.title||enCours.service_type}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3"/>{enCours.address||'—'}
                      </p>
                    </div>
                    <button onClick={()=>handleCheckOut(enCours.intervention_id||enCours.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                      style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                      <CheckCircle className="w-3.5 h-3.5"/> Terminer
                    </button>
                  </div>
                </div>
              )}

              {/* Prochaines interventions */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Prochaines interventions</p>
                {upcoming.length===0 ? (
                  <div className="rounded-2xl border border-white/5 p-8 text-center">
                    <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3"/>
                    <p className="text-slate-500 text-sm">Aucune intervention planifiée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map(intv=>(
                      <div key={intv.intervention_id||intv.id}
                        className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/4 transition-all cursor-pointer"
                        onClick={()=>setSelectedIntv(intv)}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{background:'rgba(96,165,250,0.15)',border:'1px solid rgba(96,165,250,0.3)'}}>
                          {getIcon(intv.service_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-200 truncate">{intv.title||intv.service_type}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3"/>{intv.scheduled_date} {intv.scheduled_time||''}
                            </span>
                          </div>
                          {intv.address && <p className="text-xs text-slate-600 flex items-center gap-1 truncate mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0"/>{intv.address}
                          </p>}
                        </div>
                        {intv.status==='planifiée' && (
                          <button onClick={e=>{e.stopPropagation();handleCheckIn(intv.intervention_id||intv.id);}}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
                            style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                            <Play className="w-3 h-3"/> Démarrer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PLANNING */}
          {activeTab==='planning' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-100">Mon planning</h2>
                <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 text-slate-400 border border-white/5">
                  <RefreshCw className="w-4 h-4"/>
                </button>
              </div>

              {/* Aujourd'hui */}
              {todayIntvs.length > 0 && (
                <div className="rounded-2xl p-4 border" style={{background:'rgba(16,185,129,0.05)',borderColor:'rgba(16,185,129,0.2)'}}>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">📅 Aujourd'hui</p>
                  <div className="space-y-3">
                    {todayIntvs.map(intv=>{
                      const sc = STATUS[intv.status]||STATUS.planifiée;
                      return (
                        <div key={intv.intervention_id||intv.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{background:sc.bg,border:`1px solid ${sc.color}40`}}>
                            {getIcon(intv.service_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-200 truncate text-sm">{intv.title||intv.service_type}</p>
                            <p className="text-xs text-slate-500">{intv.scheduled_time||'—'} {intv.duration_hours?`· ${intv.duration_hours}h`:''}</p>
                            {intv.address && <p className="text-xs text-slate-600 truncate">{intv.address}</p>}
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            {intv.status==='planifiée' && (
                              <button onClick={()=>handleCheckIn(intv.intervention_id||intv.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                style={{background:'#10b981'}}>▶ Start</button>
                            )}
                            {intv.status==='en_cours' && (
                              <button onClick={()=>handleCheckOut(intv.intervention_id||intv.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                style={{background:'#3b82f6'}}>✓ Fin</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toutes les interventions */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Toutes les interventions</p>
                {interventions.length===0 ? (
                  <div className="rounded-2xl border border-white/5 p-10 text-center">
                    <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3"/>
                    <p className="text-slate-500">Aucune intervention assignée</p>
                  </div>
                ) : interventions.map(intv=>{
                  const sc = STATUS[intv.status]||STATUS.planifiée;
                  return (
                    <div key={intv.intervention_id||intv.id}
                      className="p-4 rounded-2xl border border-white/5 bg-white/2"
                      style={{borderLeft:`3px solid ${sc.color}`}}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getIcon(intv.service_type)}</span>
                          <div>
                            <p className="font-bold text-slate-200 text-sm">{intv.title||intv.service_type}</p>
                            <p className="text-xs text-slate-500">{intv.scheduled_date} · {intv.scheduled_time||'—'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{color:sc.color,background:sc.bg}}>{sc.label}</span>
                      </div>
                      {intv.address && (
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(intv.address)}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                          <Navigation className="w-3 h-3"/>{intv.address}
                        </a>
                      )}
                      {intv.lead_phone && (
                        <a href={`tel:${intv.lead_phone}`}
                          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors mt-1">
                          <Phone className="w-3 h-3"/>{intv.lead_phone}
                        </a>
                      )}
                      <div className="flex gap-2 mt-3">
                        {intv.status==='planifiée' && (
                          <button onClick={()=>handleCheckIn(intv.intervention_id||intv.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                            style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                            <Play className="w-3 h-3"/> Démarrer
                          </button>
                        )}
                        {intv.status==='en_cours' && (
                          <button onClick={()=>handleCheckOut(intv.intervention_id||intv.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                            style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)'}}>
                            <CheckCircle className="w-3 h-3"/> Terminer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TÂCHES */}
          {activeTab==='tasks' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-100">Mes tâches</h2>
              {tasks.length===0 ? (
                <div className="rounded-2xl border border-white/5 p-10 text-center">
                  <CheckSquare className="w-12 h-12 text-slate-700 mx-auto mb-3"/>
                  <p className="text-slate-500">Aucune tâche assignée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task=>(
                    <div key={task.task_id} className="p-4 rounded-2xl border border-white/5 bg-white/2">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          task.priority==='urgente'?'bg-red-500 animate-pulse':
                          task.priority==='haute'?'bg-orange-500':'bg-blue-400'
                        }`}/>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-200 text-sm">{task.title}</p>
                          {task.description && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
                          {task.due_date && (
                            <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3"/>
                              {new Date(task.due_date).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          task.priority==='urgente'?'text-red-400 bg-red-500/10':
                          task.priority==='haute'?'text-orange-400 bg-orange-500/10':'text-blue-400 bg-blue-500/10'
                        }`}>{task.priority||'normale'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MESSAGES */}
          {activeTab==='messages' && (
            <div className="flex flex-col" style={{height:'calc(100vh - 200px)'}}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-slate-100">Messages</h2>
                <button onClick={fetchMessages} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5">
                  <RefreshCw className="w-3.5 h-3.5"/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.length===0 && (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <MessageSquare className="w-10 h-10 text-slate-700"/>
                    <p className="text-slate-500 text-sm">Aucun message</p>
                  </div>
                )}
                {messages.map((msg,i)=>{
                  const isMe = msg.sender==='agent' || msg.from_agent;
                  return (
                    <div key={i} className={`flex ${isMe?'justify-end':'justify-start'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-auto"
                          style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>🏠</div>
                      )}
                      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${isMe?'rounded-br-sm':'rounded-bl-sm'}`}
                        style={isMe
                          ? {background:'linear-gradient(135deg,#10b981,#059669)',color:'white'}
                          : {background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'#e2e8f0'}}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe?'text-white/60':'text-slate-600'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
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
                  className="flex-1 px-4 py-3 rounded-2xl border text-sm text-slate-200 placeholder-slate-600 outline-none"
                  style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.1)'}}/>
                <button onClick={sendMessage} disabled={!newMsg.trim()}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                  <Send className="w-4 h-4"/>
                </button>
              </div>
            </div>
          )}

          {/* PROFIL */}
          {activeTab==='profil' && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-slate-100">Mon profil</h2>
              <div className="rounded-2xl p-6 border border-white/5 bg-white/2 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
                  style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                  {agent?.name?.charAt(0)||'A'}
                </div>
                <p className="text-xl font-black text-slate-100">{agent?.name||'Agent'}</p>
                <p className="text-sm text-emerald-400 font-semibold mt-1">{agent?.role||'Technicien'}</p>
                <p className="text-xs text-slate-500 mt-1">{agent?.email||'—'}</p>
              </div>
              <div className="space-y-3">
                {[
                  {label:'Interventions totales', value:interventions.length},
                  {label:'Interventions terminées', value:interventions.filter(i=>i.status==='terminée').length},
                  {label:'En attente', value:interventions.filter(i=>i.status==='planifiée').length},
                ].map(s=>(
                  <div key={s.label} className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/2">
                    <p className="text-sm text-slate-400">{s.label}</p>
                    <p className="text-lg font-black text-emerald-400" style={{fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
                  </div>
                ))}
              </div>
              <button onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold">
                <LogOut className="w-4 h-4"/> Se déconnecter
              </button>
            </div>
          )}

          </>
        )}
      </div>

      {/* MODAL DÉTAIL */}
      {selectedIntv && !showChecklist && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.8)'}}
          onClick={()=>setSelectedIntv(null)}>
          <div className="rounded-2xl p-6 max-w-md w-full animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{background:STATUS[selectedIntv.status]?.bg||'rgba(96,165,250,0.15)'}}>
                  {getIcon(selectedIntv.service_type)}
                </div>
                <div>
                  <p className="font-black text-slate-100">{selectedIntv.title||selectedIntv.service_type}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{color:STATUS[selectedIntv.status]?.color,background:STATUS[selectedIntv.status]?.bg}}>
                    {STATUS[selectedIntv.status]?.label}
                  </span>
                </div>
              </div>
              <button onClick={()=>setSelectedIntv(null)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <div className="space-y-2 mb-5">
              {[
                {icon:Clock, color:'#a78bfa', label:`${selectedIntv.scheduled_date||'—'} à ${selectedIntv.scheduled_time||'—'}${selectedIntv.duration_hours?` · ${selectedIntv.duration_hours}h`:''}`},
                ...(selectedIntv.address?[{icon:MapPin, color:'#60a5fa', label:selectedIntv.address}]:[]),
                ...(selectedIntv.lead_name?[{icon:User, color:'#34d399', label:selectedIntv.lead_name}]:[]),
                ...(selectedIntv.lead_phone?[{icon:Phone, color:'#f59e0b', label:selectedIntv.lead_phone}]:[]),
              ].map((item,i)=>(
                <div key={i} className="flex items-center gap-3 text-sm text-slate-400 p-3 rounded-xl bg-white/3 border border-white/5">
                  <item.icon className="w-4 h-4 flex-shrink-0" style={{color:item.color}}/>
                  <span>{item.label}</span>
                </div>
              ))}
              {selectedIntv.description && (
                <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-sm text-slate-400">
                  {selectedIntv.description}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {selectedIntv.status==='planifiée' && (
                <button onClick={()=>{handleCheckIn(selectedIntv.intervention_id||selectedIntv.id);setSelectedIntv(null);}}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                  style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                  <Play className="w-4 h-4"/> Démarrer
                </button>
              )}
              {selectedIntv.status==='en_cours' && (
                <button onClick={()=>{setShowChecklist(selectedIntv);setSelectedIntv(null);}}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                  style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)'}}>
                  <CheckCircle className="w-4 h-4"/> Terminer
                </button>
              )}
              {selectedIntv.address && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedIntv.address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
                  <Navigation className="w-4 h-4"/>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHECKLIST */}
      {showChecklist && (
        <ChecklistModal
          intervention={showChecklist}
          onClose={()=>setShowChecklist(null)}
          onComplete={handleCompleteChecklist}
        />
      )}

      {/* Barre mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t px-2 py-2"
        style={{background:'rgba(15,23,42,0.98)',borderColor:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)'}}>
        <div className="flex justify-around">
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative ${activeTab===tab.id?'text-emerald-400':'text-slate-600'}`}>
              <tab.icon className="w-5 h-5"/>
              <span className="text-[9px] font-semibold">{tab.label}</span>
              {tab.notif > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-white text-[8px] font-black flex items-center justify-center"
                  style={{background:'#10b981'}}>{tab.notif}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── MAIN ──
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
      finally { setChecking(false); }
    };
    check();
  },[]);

  const handleLogout = () => {
    localStorage.removeItem('intervenant_token');
    setAgent(null);
    toast.success('Déconnecté');
  };

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'hsl(224,71%,4%)'}}>
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"/>
        <span className="text-slate-500 text-sm">Chargement...</span>
      </div>
    </div>
  );

  if (!agent) return <IntervenantLogin onAuth={setAgent}/>;
  return <IntervenantDashboard agent={agent} onLogout={handleLogout}/>;
};

export default IntervenantPortal;
