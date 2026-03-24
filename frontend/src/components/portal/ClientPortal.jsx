import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  FileText, CreditCard, CheckCircle, XCircle, Star, LogOut,
  Clock, Send, MessageSquare, Sparkles, Mail, ArrowRight,
  Shield, Zap, Home, PenTool, Calendar, Phone, User,
  Download, Eye, ChevronRight, Bell, Settings, HelpCircle,
  MapPin, Package, Repeat, AlertCircle, Check, X,
  ThumbsUp, Heart, ExternalLink, RefreshCw, Info
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';

const API_URL = BACKEND_URL + '/api/portal';
const CHAT_API = BACKEND_URL + '/api/chat';

const portalAxios = axios.create({ withCredentials: true });
portalAxios.interceptors.request.use(config => {
  const token = localStorage.getItem('portal_token');
  if (token) {
    config.headers['X-Portal-Token'] = token;
    config.headers['x-portal-token'] = token;
  }
  return config;
});
// Init token au chargement
const _initToken = localStorage.getItem('portal_token');
if (_initToken) portalAxios.defaults.headers.common['X-Portal-Token'] = _initToken;

/* ── HELPERS ── */
const STATUS_QUOTE = {
  'envoyé':   { label:'En attente',  color:'#f59e0b', bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.25)',  icon:'⏳' },
  'envoye':   { label:'En attente',  color:'#f59e0b', bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.25)',  icon:'⏳' },
  'accepté':  { label:'Accepté',     color:'#10b981', bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.25)',  icon:'✅' },
  'accepte':  { label:'Accepté',     color:'#10b981', bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.25)',  icon:'✅' },
  'refusé':   { label:'Refusé',      color:'#f43f5e', bg:'rgba(244,63,94,0.12)',   border:'rgba(244,63,94,0.25)',   icon:'❌' },
  'signé':    { label:'Signé',       color:'#8b5cf6', bg:'rgba(139,92,246,0.12)',  border:'rgba(139,92,246,0.25)', icon:'✍️' },
  'brouillon':{ label:'Brouillon',   color:'#64748b', bg:'rgba(100,116,139,0.12)', border:'rgba(100,116,139,0.25)', icon:'📝' },
};

const STATUS_INVOICE = {
  'en_attente': { label:'À régler',   color:'#f59e0b', bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.25)' },
  'payée':      { label:'Payée',      color:'#10b981', bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.25)' },
  'en_retard':  { label:'En retard',  color:'#f43f5e', bg:'rgba(244,63,94,0.12)',   border:'rgba(244,63,94,0.25)' },
  'annulée':    { label:'Annulée',    color:'#64748b', bg:'rgba(100,116,139,0.12)', border:'rgba(100,116,139,0.25)' },
};

const SERVICE_ICONS = { 'Ménage':'🏠','menage':'🏠','Canapé':'🛋️','canape':'🛋️','Matelas':'🛏️','matelas':'🛏️','Tapis':'🪣','tapis':'🪣','Bureaux':'🏢','bureaux':'🏢' };
const getServiceIcon = (type='') => {
  const k = Object.keys(SERVICE_ICONS).find(k => (type||'').toLowerCase().includes(k.toLowerCase()));
  return SERVICE_ICONS[k] || '🧹';
};

/* ── PAGE LOGIN ── */
const PortalLogin = ({ onAuth }) => {
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
      toast.success('Lien de connexion envoyé !');
    } catch { toast.error('Erreur lors de l\'envoi'); }
    finally { setLoading(false); }
  };

  const authenticate = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/${token}`, {}, { withCredentials: true });
      localStorage.setItem('portal_token', token);
      // Forcer la mise à jour de l'intercepteur
      portalAxios.defaults.headers.common['X-Portal-Token'] = token;
      onAuth(res.data);
    } catch { toast.error('Lien invalide ou expiré'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)'}}>

      {/* Blobs décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{background:'radial-gradient(circle,#f97316,transparent)'}} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-15"
          style={{background:'radial-gradient(circle,#8b5cf6,transparent)'}} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-2xl"
            style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1" style={{fontFamily:'Manrope,sans-serif'}}>
            Espace Client
          </h1>
          <p className="text-slate-400 text-sm">Global Clean Home — Paris & IDF</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',backdropFilter:'blur(20px)',boxShadow:'0 24px 80px rgba(0,0,0,0.4)'}}>
          {!sent ? (
            <>
              <h2 className="text-lg font-bold text-slate-100 mb-2">Connexion sécurisée</h2>
              <p className="text-slate-400 text-sm mb-6">Entrez votre email pour recevoir un lien de connexion magique.</p>
              <form onSubmit={requestLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Adresse email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="votre@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all text-slate-200 placeholder-slate-600"
                      style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.1)'}}
                      onFocus={e => e.target.style.borderColor='#f97316'}
                      onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 4px 16px rgba(249,115,22,0.4)'}}>
                  {loading ? '⏳ Envoi...' : '✉️ Recevoir mon lien de connexion'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-100 mb-2">Email envoyé ! 📧</h2>
                <p className="text-slate-400 text-sm">Vérifiez votre boîte mail et cliquez sur le lien.</p>
              </div>
              {token && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl text-xs text-amber-400 text-center"
                    style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)'}}>
                    Mode démo — Cliquez ci-dessous pour vous connecter
                  </div>
                  <button onClick={authenticate} disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                    style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                    {loading ? '⏳ Connexion...' : '🚀 Accéder à mon espace'}
                  </button>
                </div>
              )}
              <button onClick={() => setSent(false)} className="w-full mt-3 text-xs text-slate-500 hover:text-slate-400 transition-colors">
                ← Utiliser un autre email
              </button>
            </>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[{i:'🔒',l:'Connexion sécurisée'},{i:'📄',l:'Vos devis en ligne'},{i:'💳',l:'Paiement facile'}].map(f => (
            <div key={f.l} className="text-center p-3 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-xl mb-1">{f.i}</p>
              <p className="text-[10px] text-slate-500 font-medium">{f.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── PORTAL DASHBOARD ── */
const PortalDashboard = ({ user, onLogout }) => {
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('accueil');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [signingQuote, setSigningQuote] = useState(null);
  const [signatureData, setSignatureData] = useState('');
  const messagesEndRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, iRes, rRes, intRes] = await Promise.allSettled([
        portalAxios.get(`${API_URL}/quotes`),
        portalAxios.get(`${API_URL}/invoices`),
        portalAxios.get(`${API_URL}/reviews`),
        portalAxios.get(`${API_URL}/interventions`),
      ]);
      setQuotes(qRes.status==='fulfilled' ? (qRes.value.data.quotes || qRes.value.data || []) : []);
      setInvoices(iRes.status==='fulfilled' ? (iRes.value.data.invoices || iRes.value.data || []) : []);
      setReviews(rRes.status==='fulfilled' ? (rRes.value.data.reviews || rRes.value.data || []) : []);
      setInterventions(intRes.status==='fulfilled' ? (intRes.value.data.interventions || intRes.value.data || []) : []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await portalAxios.get(CHAT_API + '/portal/conversation');
      setMessages(res.data.messages || []);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (activeTab === 'messages') { fetchMessages(); }
  }, [activeTab, fetchMessages]);
  useEffect(() => {
    if (activeTab === 'messages') {
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchMessages]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    try {
      await portalAxios.post(CHAT_API + '/portal/message', { content: newMessage });
      setNewMessage('');
      await fetchMessages();
    } catch { toast.error('Erreur'); }
    finally { setSendingMessage(false); }
  };

  const respondQuote = async (quoteId, action) => {
    try {
      await portalAxios.post(`${API_URL}/quotes/${quoteId}/respond`, { action });
      toast.success(action === 'accept' ? '✅ Devis accepté !' : 'Devis refusé');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const signQuote = async (quoteId) => {
    const sig = signatureData.trim() || 'Signé électroniquement';
    try {
      await portalAxios.post(
        `${API_URL}/quotes/${quoteId}/sign`,
        { signature: sig, signed_at: new Date().toISOString() },
        { headers: { 'X-Portal-Token': localStorage.getItem('portal_token') || '' } }
      );
      toast.success('✍️ Devis signé avec succès !');
      setSigningQuote(null);
      setSignatureData('');
      fetchData();
      setActiveTab('quotes');
    } catch(e) {
      console.error('Sign error:', e);
      toast.error('Erreur lors de la signature. Réessayez.');
    }
  };

  const submitReview = async () => {
    if (!reviewComment.trim()) { toast.error('Veuillez écrire un commentaire'); return; }
    try {
      await portalAxios.post(`${API_URL}/reviews`, { rating: reviewRating, comment: reviewComment });
      toast.success('⭐ Merci pour votre avis !');
      setReviewComment('');
      setReviewRating(5);
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  // Stats rapides
  const pendingQuotes = quotes.filter(q => ['envoyé','envoye'].includes(q.status)).length;
  const pendingInvoices = invoices.filter(i => i.status === 'en_attente').length;
  const totalPaid = invoices.filter(i => i.status === 'payée').reduce((t, i) => t + (i.amount_ttc || 0), 0);
  const nextIntervention = interventions.find(i => i.status === 'planifiée');
  const prenom = user?.name?.split(' ')[0] || 'Client';

  const TABS = [
    { id:'accueil',       label:'Accueil',        icon:Home,         notif: 0 },
    { id:'quotes',        label:'Devis',           icon:FileText,     notif: pendingQuotes },
    { id:'invoices',      label:'Factures',        icon:CreditCard,   notif: pendingInvoices },
    { id:'interventions', label:'Interventions',   icon:Calendar,     notif: 0 },
    { id:'messages',      label:'Messages',        icon:MessageSquare,notif: 0 },
    { id:'reviews',       label:'Avis',            icon:Star,         notif: 0 },
    { id:'signature',     label:'Signature',       icon:PenTool,      notif: quotes.filter(q=>['envoyé','envoye'].includes(q.status)).length },
  ];

  return (
    <div className="min-h-screen" style={{background:'hsl(224,71%,4%)'}}>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-50 border-b" style={{background:'rgba(15,23,42,0.95)',borderColor:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)'}}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base shadow-lg"
              style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>🏠</div>
            <div>
              <p className="text-sm font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Global Clean Home</p>
              <p className="text-[10px] text-slate-500">Espace Client</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-xs">
                {prenom.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-slate-200 hidden sm:block">{prenom}</span>
            </div>
            <button onClick={onLogout} className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all flex-shrink-0 relative ${
                activeTab === tab.id ? 'text-orange-400 border-orange-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{tab.label}</span>
              {tab.notif > 0 && (
                <span className="absolute -top-0 -right-0 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                  style={{background:'#f97316'}}>
                  {tab.notif}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENU ── */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : (
          <>

          {/* ── ACCUEIL ── */}
          {activeTab === 'accueil' && (
            <div className="space-y-5">
              {/* Welcome banner */}
              <div className="rounded-2xl p-6 relative overflow-hidden"
                style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 8px 32px rgba(249,115,22,0.3)'}}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-30"
                  style={{background:'radial-gradient(circle,white,transparent)'}} />
                <p className="text-white/70 text-sm mb-1">Bienvenue dans votre espace !</p>
                <h2 className="text-2xl font-black text-white mb-3" style={{fontFamily:'Manrope,sans-serif'}}>
                  Bonjour {prenom} 👋
                </h2>
                <p className="text-white/80 text-sm">
                  {user?.email && `Connecté avec ${user.email}`}
                </p>
              </div>

              {/* Stats rapides */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:'Devis en attente', value: pendingQuotes, color:'#f59e0b', icon:'📄', onClick:()=>setActiveTab('quotes') },
                  { label:'Factures à payer', value: pendingInvoices, color:'#f43f5e', icon:'💳', onClick:()=>setActiveTab('invoices') },
                  { label:'Total payé', value:`${totalPaid.toLocaleString('fr-FR')}€`, color:'#10b981', icon:'💰', onClick:()=>setActiveTab('invoices') },
                  { label:'Interventions', value: interventions.length, color:'#8b5cf6', icon:'🧹', onClick:()=>setActiveTab('interventions') },
                ].map(s => (
                  <button key={s.label} onClick={s.onClick}
                    className="p-4 rounded-2xl border text-left hover:scale-105 transition-all"
                    style={{background:`${s.color}10`, borderColor:`${s.color}25`}}>
                    <p className="text-2xl mb-2">{s.icon}</p>
                    <p className="text-xl font-black" style={{color:s.color, fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
                    <p className="text-xs font-medium" style={{color:`${s.color}cc`}}>{s.label}</p>
                  </button>
                ))}
              </div>

              {/* Prochaine intervention */}
              {nextIntervention && (
                <div className="rounded-2xl p-5 border" style={{background:'rgba(16,185,129,0.08)',borderColor:'rgba(16,185,129,0.2)'}}>
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-300">Prochaine intervention</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-200">{nextIntervention.title || nextIntervention.service_type}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {nextIntervention.scheduled_date} · {nextIntervention.scheduled_time||'—'}
                        {nextIntervention.address && ` · ${nextIntervention.address}`}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full text-emerald-400" style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)'}}>
                      Planifiée
                    </span>
                  </div>
                </div>
              )}

              {/* Devis en attente */}
              {pendingQuotes > 0 && (
                <div className="rounded-2xl p-5 border" style={{background:'rgba(245,158,11,0.08)',borderColor:'rgba(245,158,11,0.2)'}}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-sm font-bold text-amber-300">{pendingQuotes} devis en attente de votre réponse</p>
                        <p className="text-xs text-slate-500">Consultez vos devis et acceptez ou refusez</p>
                      </div>
                    </div>
                    <button onClick={()=>setActiveTab('quotes')}
                      className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
                      Voir <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Actions rapides */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Actions rapides</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon:'📄', label:'Voir mes devis', tab:'quotes' },
                    { icon:'💳', label:'Mes factures', tab:'invoices' },
                    { icon:'💬', label:'Nous contacter', tab:'messages' },
                    { icon:'⭐', label:'Laisser un avis', tab:'reviews' },
                  ].map(a => (
                    <button key={a.tab} onClick={() => setActiveTab(a.tab)}
                      className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/3 hover:bg-white/6 hover:border-white/10 transition-all text-left">
                      <span className="text-2xl">{a.icon}</span>
                      <span className="text-sm font-semibold text-slate-300">{a.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact rapide */}
              <div className="rounded-2xl p-5 border border-white/5 bg-white/3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contact direct</p>
                <div className="flex gap-3">
                  <a href="tel:+33622665308"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
                    style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                    <Phone className="w-4 h-4" /> Appeler
                  </a>
                  <a href="https://wa.me/33622665308" target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
                    style={{background:'#25D366'}}>
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── DEVIS ── */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-100">Mes devis</h2>
                <span className="text-xs text-slate-500">{quotes.length} devis</span>
              </div>
              {quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-white/5 bg-white/2">
                  <FileText className="w-12 h-12 text-slate-700" />
                  <p className="text-slate-500 font-medium">Aucun devis pour le moment</p>
                  <a href="tel:+33622665308" className="text-orange-400 hover:text-orange-300 text-sm font-semibold">
                    Demander un devis →
                  </a>
                </div>
              ) : (
                quotes.map(quote => {
                  const sc = STATUS_QUOTE[quote.status] || STATUS_QUOTE['brouillon'];
                  const icon = getServiceIcon(quote.service_type);
                  const isPending = ['envoyé','envoye'].includes(quote.status);
                  return (
                    <div key={quote.quote_id} className="rounded-2xl border overflow-hidden transition-all hover:border-white/15"
                      style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)'}}>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                              style={{background:sc.bg,border:`1px solid ${sc.border}`}}>
                              {icon}
                            </div>
                            <div>
                              <p className="font-black text-slate-100">{quote.service_type || 'Prestation de nettoyage'}</p>
                              <p className="text-xs text-slate-500 mt-0.5">Réf. {quote.quote_id}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                            style={{color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`}}>
                            {sc.icon} {sc.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>
                              {(quote.amount || 0).toLocaleString('fr-FR')}€
                            </p>
                            <p className="text-xs text-slate-500">TVA non applicable</p>
                          </div>
                          {quote.created_at && (
                            <p className="text-xs text-slate-500">
                              {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                        {quote.details && (
                          <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-xs text-slate-400 mb-4 line-clamp-3">
                            {quote.details.split('\n').slice(0,3).join(' · ')}
                          </div>
                        )}
                        {isPending && (
                          <div className="flex gap-2">
                            <button onClick={() => respondQuote(quote.quote_id, 'accept')}
                              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
                              style={{background:'linear-gradient(135deg,#10b981,#059669)',boxShadow:'0 4px 16px rgba(16,185,129,0.3)'}}>
                              <Check className="w-4 h-4" /> Accepter
                            </button>
                            <button onClick={() => setSigningQuote(quote.quote_id)}
                              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
                              style={{background:'linear-gradient(135deg,#8b5cf6,#6d28d9)'}}>
                              <PenTool className="w-4 h-4" /> Signer
                            </button>
                            <button onClick={() => respondQuote(quote.quote_id, 'refuse')}
                              className="px-4 py-3 rounded-xl font-bold text-sm transition-all"
                              style={{background:'rgba(244,63,94,0.1)',color:'#f43f5e',border:'1px solid rgba(244,63,94,0.2)'}}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── FACTURES ── */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-100">Mes factures</h2>
                <span className="text-xs text-slate-500">{invoices.length} facture(s)</span>
              </div>
              {/* Total payé */}
              {totalPaid > 0 && (
                <div className="rounded-2xl p-4 text-center border" style={{background:'rgba(16,185,129,0.08)',borderColor:'rgba(16,185,129,0.2)'}}>
                  <p className="text-xs text-emerald-400 font-semibold mb-1">Total payé</p>
                  <p className="text-3xl font-black text-emerald-400" style={{fontFamily:'Manrope,sans-serif'}}>{totalPaid.toLocaleString('fr-FR')}€</p>
                </div>
              )}
              {invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-white/5">
                  <CreditCard className="w-12 h-12 text-slate-700" />
                  <p className="text-slate-500 font-medium">Aucune facture</p>
                </div>
              ) : (
                invoices.map(inv => {
                  const sc = STATUS_INVOICE[inv.status] || STATUS_INVOICE['en_attente'];
                  const isLate = inv.status === 'en_retard';
                  const isPending = inv.status === 'en_attente';
                  return (
                    <div key={inv.invoice_id} className={`rounded-2xl border overflow-hidden transition-all ${isLate ? 'ring-1 ring-red-500/30' : ''}`}
                      style={{background:'rgba(255,255,255,0.03)',borderColor:isLate?'rgba(244,63,94,0.3)':'rgba(255,255,255,0.08)'}}>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-black text-slate-100">Facture {inv.invoice_id}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {inv.created_at ? new Date(inv.created_at).toLocaleDateString('fr-FR') : '—'}
                              {inv.due_date && ` · Échéance: ${new Date(inv.due_date).toLocaleDateString('fr-FR')}`}
                            </p>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                            style={{color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`}}>
                            {sc.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>
                              {(inv.amount_ttc || 0).toLocaleString('fr-FR')}€
                            </p>
                            <p className="text-xs text-slate-500">{inv.service_type || 'Prestation'}</p>
                          </div>
                          {isPending && (
                            <a href={`mailto:info@globalcleanhome.com?subject=Paiement facture ${inv.invoice_id}`}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
                              style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                              💳 Payer
                            </a>
                          )}
                        </div>
                        {isLate && (
                          <div className="mt-3 p-3 rounded-xl text-xs text-red-400 flex items-center gap-2"
                            style={{background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.2)'}}>
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            Cette facture est en retard de paiement. Merci de régulariser au plus tôt.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── INTERVENTIONS ── */}
          {activeTab === 'interventions' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-100">Mes interventions</h2>
              {interventions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-white/5">
                  <Calendar className="w-12 h-12 text-slate-700" />
                  <p className="text-slate-500 font-medium">Aucune intervention</p>
                </div>
              ) : (
                interventions.map(intv => {
                  const icon = getServiceIcon(intv.service_type || intv.title);
                  const statusColors = {
                    planifiée: { color:'#60a5fa', bg:'rgba(96,165,250,0.12)', label:'Planifiée' },
                    en_cours:  { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'En cours' },
                    terminée:  { color:'#10b981', bg:'rgba(16,185,129,0.12)', label:'Terminée' },
                    annulée:   { color:'#f43f5e', bg:'rgba(244,63,94,0.12)',  label:'Annulée' },
                  };
                  const sc = statusColors[intv.status] || statusColors.planifiée;
                  return (
                    <div key={intv.intervention_id || intv.id}
                      className="rounded-2xl border p-5 transition-all hover:border-white/15"
                      style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)'}}>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{background:sc.bg,border:`1px solid ${sc.color}40`}}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-black text-slate-100">{intv.title || intv.service_type}</p>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{color:sc.color,background:sc.bg}}>{sc.label}</span>
                          </div>
                          <div className="space-y-1 text-xs text-slate-500">
                            {intv.scheduled_date && (
                              <p className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3"/>
                                {intv.scheduled_date} · {intv.scheduled_time || '—'}
                                {intv.duration_hours && ` · ${intv.duration_hours}h`}
                              </p>
                            )}
                            {intv.address && (
                              <p className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" />{intv.address}
                              </p>
                            )}
                          </div>
                          {intv.status === 'terminée' && !reviews.find(r => r.intervention_id === intv.id) && (
                            <button onClick={() => setActiveTab('reviews')}
                              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
                              <Star className="w-3.5 h-3.5" /> Laisser un avis
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── MESSAGES ── */}
          {activeTab === 'messages' && (
            <div className="flex flex-col" style={{height:'calc(100vh - 200px)'}}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-black text-slate-100">Messages</h2>
                <button onClick={fetchMessages} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <MessageSquare className="w-10 h-10 text-slate-700" />
                    <p className="text-slate-500 text-sm">Envoyez votre premier message</p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isClient = msg.sender === 'client';
                  return (
                    <div key={i} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                      {!isClient && (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-auto"
                          style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>🏠</div>
                      )}
                      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${isClient ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                        style={isClient
                          ? {background:'linear-gradient(135deg,#f97316,#ea580c)',color:'white'}
                          : {background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'#e2e8f0'}}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isClient ? 'text-white/60' : 'text-slate-600'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Écrivez votre message..."
                  className="flex-1 px-4 py-3 rounded-2xl border text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
                  style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.1)'}}
                  onFocus={e => e.target.style.borderColor='#f97316'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
                <button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-50 transition-all hover:scale-105"
                  style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── AVIS ── */}
          {activeTab === 'reviews' && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-slate-100">Mes avis</h2>

              {/* Formulaire avis */}
              {!reviews.find(r => r.user_email === user?.email) && (
                <div className="rounded-2xl p-6 border" style={{background:'rgba(245,158,11,0.05)',borderColor:'rgba(245,158,11,0.2)'}}>
                  <p className="text-sm font-bold text-amber-300 mb-4">⭐ Donnez votre avis</p>
                  <div className="flex gap-2 mb-4">
                    {[1,2,3,4,5].map(s => (
                      <button key={s}
                        onClick={() => setReviewRating(s)}
                        onMouseEnter={() => setHoveredStar(s)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="transition-transform hover:scale-125">
                        <Star className={`w-8 h-8 ${s <= (hoveredStar || reviewRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-bold text-amber-400 self-center">{reviewRating}/5</span>
                  </div>
                  <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={4}
                    placeholder="Partagez votre expérience avec Global Clean Home..."
                    className="w-full px-4 py-3 rounded-2xl border text-sm text-slate-200 placeholder-slate-600 outline-none resize-none transition-all mb-4"
                    style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.1)'}}
                    onFocus={e => e.target.style.borderColor='#f97316'}
                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
                  <button onClick={submitReview}
                    className="w-full py-3 rounded-2xl font-bold text-white text-sm transition-all"
                    style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
                    ⭐ Publier mon avis
                  </button>
                </div>
              )}

              {/* Avis publiés */}
              {reviews.map((rev, i) => (
                <div key={i} className="rounded-2xl p-5 border border-white/5 bg-white/3">
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                    ))}
                    <span className="text-xs text-slate-500 ml-2">{rev.rating}/5</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic">"{rev.comment}"</p>
                  <p className="text-xs text-slate-600 mt-2">
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
              ))}

              {reviews.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Star className="w-10 h-10 text-slate-700" />
                  <p className="text-slate-500 text-sm">Vous n'avez pas encore laissé d'avis</p>
                </div>
              )}
            </div>
          )}

          {/* ── SIGNATURE ── */}
          {activeTab === 'signature' && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-slate-100">Signature électronique</h2>
              {quotes.filter(q => ['envoyé','envoye'].includes(q.status)).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-white/5">
                  <PenTool className="w-12 h-12 text-slate-700" />
                  <p className="text-slate-500 font-medium">Aucun devis à signer</p>
                  <p className="text-slate-600 text-sm">Les devis en attente apparaîtront ici</p>
                </div>
              ) : (
                quotes.filter(q => ['envoyé','envoye'].includes(q.status)).map(quote => (
                  <div key={quote.quote_id} className="rounded-2xl border p-5"
                    style={{background:'rgba(139,92,246,0.05)',borderColor:'rgba(139,92,246,0.2)'}}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                        <PenTool className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="font-black text-slate-100">{quote.service_type}</p>
                        <p className="text-xs text-slate-500">Montant: {(quote.amount||0).toLocaleString('fr-FR')}€</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Votre signature (tapez votre nom complet)</label>
                      <input value={signingQuote === quote.quote_id ? signatureData : ''}
                        onFocus={() => setSigningQuote(quote.quote_id)}
                        onChange={e => { setSigningQuote(quote.quote_id); setSignatureData(e.target.value); }}
                        placeholder={`${user?.name || 'Votre nom'} — ${new Date().toLocaleDateString('fr-FR')}`}
                        className="w-full px-4 py-3 rounded-xl border text-sm text-slate-200 outline-none transition-all"
                        style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(139,92,246,0.3)',fontFamily:'cursive,serif',fontSize:'16px'}}
                        onFocus={e => e.target.style.borderColor='#8b5cf6'}
                        onBlur={e => e.target.style.borderColor='rgba(139,92,246,0.3)'} />
                    </div>
                    <div className="p-3 rounded-xl text-xs text-slate-500 mb-4"
                      style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)'}}>
                      En signant ce devis, vous acceptez les conditions générales de vente de Global Clean Home et vous engagez à la réalisation de la prestation décrite ci-dessus.
                    </div>
                    <button onClick={() => { setSigningQuote(quote.quote_id); signQuote(quote.quote_id); }}
                      disabled={!signatureData.trim()}
                      className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
                      style={{background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',boxShadow:'0 4px 16px rgba(139,92,246,0.3)'}}>
                      ✍️ Signer et valider ce devis
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          </>
        )}
      </div>

      {/* Barre mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t px-2 py-2"
        style={{background:'rgba(15,23,42,0.98)',borderColor:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)'}}>
        <div className="flex justify-around">
          {TABS.slice(0,5).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative ${activeTab === tab.id ? 'text-orange-400' : 'text-slate-600'}`}>
              <tab.icon className="w-5 h-5" />
              <span className="text-[9px] font-semibold">{tab.label}</span>
              {tab.notif > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-white text-[8px] font-black flex items-center justify-center"
                  style={{background:'#f97316'}}>{tab.notif}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── MAIN EXPORT ── */
const ClientPortal = () => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await portalAxios.get(`${API_URL}/me`);
        setUser(res.data);
      } catch {}
      finally { setChecking(false); }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await portalAxios.post(`${API_URL}/logout`);
    } catch {}
    localStorage.removeItem('portal_token');
    setUser(null);
    toast.success('Déconnecté');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'hsl(224,71%,4%)'}}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!user) return <PortalLogin onAuth={data => { setUser(data); }} />;
  return <PortalDashboard user={user} onLogout={handleLogout} />;
};

export default ClientPortal;
