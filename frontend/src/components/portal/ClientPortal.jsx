import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FileText, CreditCard, CheckCircle, XCircle, Star, LogOut, Clock, Send, MessageSquare, Sparkles, Mail, ArrowRight, Shield, Zap, Home } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api/portal';

// ============= Login =============
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
      toast.success('Lien envoyé !');
    } catch { toast.error('Erreur lors de l\'envoi'); }
    finally { setLoading(false); }
  };

  const authenticate = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/${token}`, {}, { withCredentials: true });
      onAuth(res.data);
    } catch { toast.error('Lien invalide ou expiré'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{background:'hsl(224,71%,4%)'}} data-testid="portal-login">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0" style={{background:'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(37,99,235,0.2))'}} />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1s'}} />
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',backgroundSize:'32px 32px'}} />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg" style={{fontFamily:'Manrope,sans-serif'}}>Global Clean Home</span>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-full text-violet-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              Espace Client Sécurisé
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight" style={{fontFamily:'Manrope,sans-serif'}}>
              Votre espace
              <span className="block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                personnel
              </span>
            </h1>
            <p className="text-slate-400 text-lg mb-8">Consultez vos devis, payez vos factures et laissez un avis depuis un seul endroit.</p>
            <div className="space-y-3">
              {[
                { icon: FileText, text: 'Consultez et acceptez vos devis' },
                { icon: CreditCard, text: 'Payez vos factures en ligne' },
                { icon: Star, text: 'Partagez votre expérience' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {[{icon:Shield,text:'Accès sécurisé'},{icon:Zap,text:'Sans mot de passe'},{icon:Mail,text:'Lien par email'}].map((s,i) => (
              <div key={i} className="flex items-center gap-1.5 text-slate-500 text-xs">
                <s.icon className="w-3.5 h-3.5" />
                {s.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-200" style={{fontFamily:'Manrope,sans-serif'}}>Global Clean Home</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-100 mb-2" style={{fontFamily:'Manrope,sans-serif'}}>Bonjour 👋</h2>
            <p className="text-slate-400 text-sm">Entrez votre email pour accéder à votre espace client</p>
          </div>

          {!sent ? (
            <form onSubmit={requestLink} className="space-y-4">
              <div className="relative p-6 rounded-2xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <label className="block text-xs font-medium text-slate-400 mb-2">Votre adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="email" data-testid="portal-email-input"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com" required
                    className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm" />
                </div>
                <button type="submit" data-testid="portal-send-link" disabled={loading}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50"
                  style={{boxShadow:'0 0 20px rgba(139,92,246,0.3)'}}>
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Mail className="w-4 h-4" /> Recevoir mon lien d'accès</>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-600 text-center">Un lien magique sera envoyé à votre adresse email</p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl text-center" style={{background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)'}}>
                <div className="w-12 h-12 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <p className="font-semibold text-green-400">Email envoyé !</p>
                <p className="text-sm text-slate-400 mt-1">Vérifiez votre boîte mail et cliquez sur le lien</p>
              </div>
              {token && (
                <div className="p-4 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <p className="text-xs text-slate-500 mb-3 text-center">Mode démonstration</p>
                  <button data-testid="portal-use-token" onClick={authenticate} disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50">
                    {loading ? 'Connexion...' : <><ArrowRight className="w-4 h-4" /> Accéder à mon espace</>}
                  </button>
                </div>
              )}
              <button onClick={() => setSent(false)} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-2">
                ← Utiliser un autre email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============= Dashboard =============
const PortalDashboard = ({ user, onLogout }) => {
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('quotes');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [hoveredStar, setHoveredStar] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, iRes, rRes] = await Promise.all([
        axios.get(`${API_URL}/quotes`, { withCredentials: true }),
        axios.get(`${API_URL}/invoices`, { withCredentials: true }),
        axios.get(`${API_URL}/reviews`, { withCredentials: true }),
      ]);
      setQuotes(Array.isArray(qRes.data) ? qRes.data : qRes.data.quotes || []);
      setInvoices(Array.isArray(iRes.data) ? iRes.data : iRes.data.invoices || []);
      setReviews(Array.isArray(rRes.data) ? rRes.data : rRes.data.reviews || []);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const respondQuote = async (quoteId, action) => {
    try {
      await axios.post(`${API_URL}/quotes/${quoteId}/respond`, { action }, { withCredentials: true });
      toast.success(action === 'accept' ? '✓ Devis accepté !' : 'Devis refusé');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const payInvoice = async (invoiceId) => {
    try {
      const res = await axios.post(`${API_URL}/invoices/${invoiceId}/pay`, {}, { withCredentials: true });
      window.location.href = res.data.url;
    } catch { toast.error('Erreur de paiement'); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/reviews`, { rating: reviewRating, comment: reviewComment }, { withCredentials: true });
      toast.success('Merci pour votre avis ! ⭐');
      setReviewComment(''); setReviewRating(5);
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const handleLogout = async () => {
    await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
    onLogout();
  };

  const tabs = [
    { id: 'quotes', label: 'Devis', icon: FileText, count: quotes.length },
    { id: 'invoices', label: 'Factures', icon: CreditCard, count: invoices.length },
    { id: 'reviews', label: 'Avis', icon: Star, count: reviews.length },
  ];

  const pendingQuotes = quotes.filter(q => q.status === 'envoyé').length;
  const pendingInvoices = invoices.filter(i => i.status === 'en_attente').length;

  return (
    <div className="min-h-screen" style={{background:'hsl(224,71%,4%)'}} data-testid="portal-dashboard">
      
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 px-4 md:px-6 py-4"
        style={{background:'hsl(224,71%,5%)',backdropFilter:'blur(10px)'}}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Espace Client</p>
              <p className="text-xs text-slate-500">Bienvenue, {user.lead_name}</p>
            </div>
          </div>
          <button data-testid="portal-logout" onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all text-sm">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-6">

        {/* Alert banners */}
        {(pendingQuotes > 0 || pendingInvoices > 0) && (
          <div className="mb-6 space-y-2">
            {pendingQuotes > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)'}}>
                <div className="w-8 h-8 bg-violet-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-violet-300">{pendingQuotes} devis en attente de réponse</p>
                  <p className="text-xs text-slate-500">Cliquez sur "Devis" pour accepter ou refuser</p>
                </div>
                <button onClick={() => setActiveTab('quotes')} className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1">
                  Voir <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
            {pendingInvoices > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)'}}>
                <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-300">{pendingInvoices} facture(s) en attente de paiement</p>
                  <p className="text-xs text-slate-500">Réglez vos factures en ligne en toute sécurité</p>
                </div>
                <button onClick={() => setActiveTab('invoices')} className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1">
                  Payer <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}} data-testid="portal-tabs">
          {tabs.map(tab => (
            <button key={tab.id} data-testid={`portal-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={activeTab === tab.id ? {boxShadow:'0 0 15px rgba(139,92,246,0.3)'} : {}}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl h-40" style={{background:'rgba(255,255,255,0.03)'}} />
            ))}
          </div>
        ) : (
          <>
            {/* Quotes */}
            {activeTab === 'quotes' && (
              <div className="space-y-4" data-testid="portal-quotes-list">
                {quotes.length === 0 ? (
                  <div className="text-center py-16 rounded-xl" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Aucun devis pour le moment</p>
                    <p className="text-slate-600 text-sm mt-1">Vos devis apparaîtront ici</p>
                  </div>
                ) : quotes.map(q => {
                  const statusStyle = {
                    'accepté': {color:'#34d399',bg:'rgba(52,211,153,0.1)',border:'rgba(52,211,153,0.2)',label:'Accepté'},
                    'accepte': {color:'#34d399',bg:'rgba(52,211,153,0.1)',border:'rgba(52,211,153,0.2)',label:'Accepté'},
                    'refusé': {color:'#f43f5e',bg:'rgba(244,63,94,0.1)',border:'rgba(244,63,94,0.2)',label:'Refusé'},
                    'envoyé': {color:'#a78bfa',bg:'rgba(167,139,250,0.1)',border:'rgba(167,139,250,0.2)',label:'En attente'},
                    'envoye': {color:'#a78bfa',bg:'rgba(167,139,250,0.1)',border:'rgba(167,139,250,0.2)',label:'En attente'},
                    'brouillon': {color:'#94a3b8',bg:'rgba(148,163,184,0.1)',border:'rgba(148,163,184,0.2)',label:'Brouillon'},
                  }[q.status] || {color:'#94a3b8',bg:'rgba(148,163,184,0.1)',border:'rgba(148,163,184,0.2)',label:q.status};

                  return (
                    <div key={q.quote_id} data-testid={`portal-quote-${q.quote_id}`}
                      className="rounded-2xl overflow-hidden"
                      style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                      
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-slate-100 text-lg">{q.service_type}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(q.created_at)}</p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold"
                            style={{color:statusStyle.color,background:statusStyle.bg,border:`1px solid ${statusStyle.border}`}}>
                            {statusStyle.label}
                          </span>
                        </div>

                        {/* Amount highlight */}
                        <div className="mb-4 p-4 rounded-xl" style={{background:'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(37,99,235,0.05))',border:'1px solid rgba(139,92,246,0.15)'}}>
                          <p className="text-xs text-slate-500 mb-1">Montant du devis</p>
                          <p className="text-3xl font-bold text-violet-400" style={{fontFamily:'Manrope,sans-serif'}}>{formatCurrency(q.amount)}</p>
                          <p className="text-xs text-slate-500 mt-1">Micro-entreprise — TVA non applicable</p>
                        </div>

                        {q.surface && (
                          <div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
                            <span className="bg-white/5 px-2 py-1 rounded-lg">📐 {q.surface} m²</span>
                          </div>
                        )}

                        {q.details && (
                          <div className="mb-4 p-3 rounded-xl" style={{background:'rgba(0,0,0,0.2)',border:'1px solid rgba(255,255,255,0.05)'}}>
                            <p className="text-xs font-medium text-slate-400 mb-1">Détails :</p>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{q.details}</p>
                          </div>
                        )}

                        {['envoyé','envoye'].includes(q.status) && (
                          <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button data-testid={`accept-quote-${q.quote_id}`}
                              onClick={() => respondQuote(q.quote_id, 'accept')}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-xl font-medium text-sm transition-all">
                              <CheckCircle className="w-4 h-4" /> Accepter
                            </button>
                            <button data-testid={`reject-quote-${q.quote_id}`}
                              onClick={() => respondQuote(q.quote_id, 'reject')}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl font-medium text-sm transition-all">
                              <XCircle className="w-4 h-4" /> Refuser
                            </button>
                          </div>
                        )}

                        {['accepté','accepte'].includes(q.status) && (
                          <div className="flex items-center gap-2 mt-3 p-3 bg-green-500/10 border border-green-500/15 rounded-xl">
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-sm text-green-400 font-medium">Devis accepté — Nous vous contacterons bientôt</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Invoices */}
            {activeTab === 'invoices' && (
              <div className="space-y-4" data-testid="portal-invoices-list">
                {invoices.length === 0 ? (
                  <div className="text-center py-16 rounded-xl" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <CreditCard className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Aucune facture</p>
                    <p className="text-slate-600 text-sm mt-1">Vos factures apparaîtront ici après acceptation d'un devis</p>
                  </div>
                ) : invoices.map(inv => {
                  const isPaid = ['payée','payee'].includes(inv.status);
                  const isLate = inv.status === 'en_retard';
                  return (
                    <div key={inv.invoice_id} data-testid={`portal-invoice-${inv.invoice_id}`}
                      className="rounded-2xl overflow-hidden"
                      style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${isPaid ? 'rgba(52,211,153,0.15)' : isLate ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.07)'}`}}>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-slate-100">{inv.service_type}</h3>
                            <p className="text-xs font-mono text-slate-600 mt-0.5">#{inv.invoice_id?.slice(-8)}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            isPaid ? 'bg-green-500/15 text-green-400' :
                            isLate ? 'bg-red-500/15 text-red-400' :
                            'bg-amber-500/15 text-amber-400'
                          }`}>
                            {isPaid ? '✓ Payée' : isLate ? '⚠ En retard' : '⏳ En attente'}
                          </span>
                        </div>

                        <div className="mb-4 p-4 rounded-xl" style={{background:isPaid ? 'rgba(52,211,153,0.05)' : 'rgba(245,158,11,0.05)',border:`1px solid ${isPaid ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)'}`}}>
                          <p className="text-xs text-slate-500 mb-1">Montant</p>
                          <p className="text-3xl font-bold" style={{color: isPaid ? '#34d399' : '#f59e0b',fontFamily:'Manrope,sans-serif'}}>
                            {formatCurrency(inv.amount_ttc)}
                          </p>
                          {inv.due_date && !isPaid && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Échéance : {formatDateTime(inv.due_date)}
                            </p>
                          )}
                        </div>

                        {inv.status === 'en_attente' && (
                          <button data-testid={`portal-pay-${inv.invoice_id}`} onClick={() => payInvoice(inv.invoice_id)}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all"
                            style={{boxShadow:'0 0 20px rgba(139,92,246,0.3)'}}>
                            <CreditCard className="w-4 h-4" /> Payer maintenant — {formatCurrency(inv.amount_ttc)}
                          </button>
                        )}

                        {isPaid && (
                          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/15 rounded-xl">
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-sm text-green-400 font-medium">
                              Payée{inv.paid_at ? ` le ${formatDateTime(inv.paid_at)}` : ''} — Merci !
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-4" data-testid="portal-reviews">
                {/* Submit form */}
                <div className="rounded-2xl p-5" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <h3 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-violet-400" />
                    Laisser un avis
                  </h3>
                  <form onSubmit={submitReview} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-3">Votre note</label>
                      <div className="flex gap-2" data-testid="review-stars">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} type="button" data-testid={`star-${n}`}
                            onClick={() => setReviewRating(n)}
                            onMouseEnter={() => setHoveredStar(n)}
                            onMouseLeave={() => setHoveredStar(0)}
                            className="transition-transform hover:scale-125 active:scale-95">
                            <Star className={`w-9 h-9 transition-all ${
                              n <= (hoveredStar || reviewRating)
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                                : 'text-slate-700'
                            }`} />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-slate-400 self-center">
                          {['','Décevant','Passable','Bien','Très bien','Excellent !'][hoveredStar || reviewRating]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Votre commentaire</label>
                      <textarea data-testid="review-comment" value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Partagez votre expérience avec Global Clean Home..."
                        rows={4}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm resize-none" />
                    </div>
                    <button type="submit" data-testid="submit-review"
                      className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium text-sm transition-all"
                      style={{boxShadow:'0 0 15px rgba(139,92,246,0.25)'}}>
                      <Send className="w-4 h-4" /> Envoyer mon avis
                    </button>
                  </form>
                </div>

                {/* Past reviews */}
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 text-sm">Aucun avis pour le moment</div>
                ) : reviews.map(rev => (
                  <div key={rev.review_id} className="rounded-2xl p-5"
                    style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
                    <div className="flex items-center gap-1 mb-3">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-5 h-5 ${n <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                      ))}
                      <span className="ml-2 text-xs text-slate-500">{rev.rating}/5</span>
                    </div>
                    {rev.comment && <p className="text-slate-300 text-sm leading-relaxed">{rev.comment}</p>}
                    <p className="text-xs text-slate-600 mt-3">{formatDateTime(rev.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============= Main =============
const ClientPortal = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Vérifier si token dans URL
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/${urlToken}`, {}, { withCredentials: true });
          setUser(res.data);
          // Nettoyer le token de l'URL
          window.history.replaceState({}, '', '/portal');
          setLoading(false);
          return;
        } catch { /* token invalide, continuer */ }
      }
      // Vérifier session existante
      axios.get(`${API_URL}/me`, { withCredentials: true })
        .then(res => setUser(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    checkAuth();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'hsl(224,71%,4%)'}}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Chargement...</p>
      </div>
    </div>
  );

  if (!user) return <PortalLogin onAuth={setUser} />;
  return <PortalDashboard user={user} onLogout={() => setUser(null)} />;
};

export default ClientPortal;
