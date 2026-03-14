import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FileText, CreditCard, CheckCircle, XCircle, Star, LogOut, Clock, Send, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api/portal';

// ============= Magic Link Login =============
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
      if (res.data.magic_token) {
        setToken(res.data.magic_token);
      }
      toast.success('Lien envoyé !');
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/${token}`, {}, { withCredentials: true });
      onAuth(res.data);
    } catch {
      toast.error('Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-4" data-testid="portal-login">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Espace Client
          </h1>
          <p className="text-slate-600 mt-2">Global Clean Home</p>
        </div>

        {!sent ? (
          <form onSubmit={requestLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Votre email</label>
              <input
                type="email"
                data-testid="portal-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              data-testid="portal-send-link"
              disabled={loading}
              className="w-full py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Recevoir mon lien d\'accès'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="bg-green-50 text-green-800 rounded-xl p-4">
              <CheckCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="font-medium">Lien envoyé !</p>
              <p className="text-sm mt-1">Vérifiez votre boîte email</p>
            </div>
            {token && (
              <div className="mt-4">
                <p className="text-xs text-slate-400 mb-2">Mode test : cliquez pour accéder</p>
                <button
                  data-testid="portal-use-token"
                  onClick={authenticate}
                  disabled={loading}
                  className="w-full py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Connexion...' : 'Accéder à mon espace'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============= Portal Dashboard =============
const PortalDashboard = ({ user, onLogout }) => {
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('quotes');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, iRes, rRes] = await Promise.all([
        axios.get(`${API_URL}/quotes`, { withCredentials: true }),
        axios.get(`${API_URL}/invoices`, { withCredentials: true }),
        axios.get(`${API_URL}/reviews`, { withCredentials: true }),
      ]);
      setQuotes(qRes.data);
      setInvoices(Array.isArray(iRes.data) ? iRes.data : iRes.data.invoices || []);
      setReviews(rRes.data);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const respondQuote = async (quoteId, action) => {
    try {
      await axios.post(`${API_URL}/quotes/${quoteId}/respond`, { action }, { withCredentials: true });
      toast.success(action === 'accept' ? 'Devis accepté !' : 'Devis refusé');
      fetchData();
    } catch {
      toast.error('Erreur');
    }
  };

  const payInvoice = async (invoiceId) => {
    try {
      const res = await axios.post(`${API_URL}/invoices/${invoiceId}/pay`, {}, { withCredentials: true });
      window.location.href = res.data.url;
    } catch {
      toast.error('Erreur de paiement');
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/reviews`, { rating: reviewRating, comment: reviewComment }, { withCredentials: true });
      toast.success('Merci pour votre avis !');
      setReviewComment('');
      setReviewRating(5);
      fetchData();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleLogout = async () => {
    await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
    onLogout();
  };

  const tabs = [
    { id: 'quotes', label: 'Mes devis', icon: FileText, count: quotes.length },
    { id: 'invoices', label: 'Mes factures', icon: CreditCard, count: invoices.length },
    { id: 'reviews', label: 'Mes avis', icon: Star, count: reviews.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50" data-testid="portal-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Espace Client
            </h1>
            <p className="text-sm text-slate-500">Bienvenue, {user.lead_name}</p>
          </div>
          <button
            data-testid="portal-logout"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6" data-testid="portal-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              data-testid={`portal-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse bg-slate-200 rounded h-6 w-32"></div>
          </div>
        ) : (
          <>
            {/* Quotes Tab */}
            {activeTab === 'quotes' && (
              <div className="space-y-4" data-testid="portal-quotes-list">
                {quotes.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Aucun devis pour le moment</p>
                  </div>
                ) : quotes.map(q => (
                  <div key={q.quote_id} data-testid={`portal-quote-${q.quote_id}`} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg">{q.service_type}</h3>
                        <p className="text-sm text-slate-500 mt-1">{formatDateTime(q.created_at)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        q.status === 'accepté' ? 'bg-green-100 text-green-800' :
                        q.status === 'refusé' ? 'bg-red-100 text-red-800' :
                        q.status === 'envoyé' ? 'bg-purple-100 text-purple-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 mb-4">
                      <div>
                        <p className="text-sm text-slate-500">Montant</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(q.amount)}</p>
                      </div>
                      {q.surface && (
                        <div>
                          <p className="text-sm text-slate-500">Surface</p>
                          <p className="font-medium text-slate-900">{q.surface} m²</p>
                        </div>
                      )}
                    </div>
                    {q.details && <p className="text-sm text-slate-600 mb-4">{q.details}</p>}
                    
                    {q.status === 'envoyé' && (
                      <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                          data-testid={`accept-quote-${q.quote_id}`}
                          onClick={() => respondQuote(q.quote_id, 'accept')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Accepter
                        </button>
                        <button
                          data-testid={`reject-quote-${q.quote_id}`}
                          onClick={() => respondQuote(q.quote_id, 'reject')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors font-medium"
                        >
                          <XCircle className="w-5 h-5" />
                          Refuser
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="space-y-4" data-testid="portal-invoices-list">
                {invoices.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Aucune facture</p>
                  </div>
                ) : invoices.map(inv => (
                  <div key={inv.invoice_id} data-testid={`portal-invoice-${inv.invoice_id}`} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{inv.service_type}</h3>
                        <p className="text-sm text-slate-500 font-mono">{inv.invoice_id}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        inv.status === 'payée' ? 'bg-green-100 text-green-800' :
                        inv.status === 'en_retard' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inv.status === 'payée' ? 'Payée' : inv.status === 'en_retard' ? 'En retard' : 'En attente'}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 mb-4">
                      <div>
                        <p className="text-sm text-slate-500">Montant TTC</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(inv.amount_ttc)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Échéance</p>
                        <p className="font-medium text-slate-900">{formatDateTime(inv.due_date)}</p>
                      </div>
                    </div>
                    
                    {inv.status === 'en_attente' && (
                      <button
                        data-testid={`portal-pay-${inv.invoice_id}`}
                        onClick={() => payInvoice(inv.invoice_id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium"
                      >
                        <CreditCard className="w-5 h-5" />
                        Payer maintenant
                      </button>
                    )}

                    {inv.status === 'payée' && (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Payée le {formatDateTime(inv.paid_at)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-6" data-testid="portal-reviews">
                {/* Submit review form */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-violet-600" />
                    Laisser un avis
                  </h3>
                  <form onSubmit={submitReview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                      <div className="flex gap-2" data-testid="review-stars">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            type="button"
                            data-testid={`star-${n}`}
                            onClick={() => setReviewRating(n)}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star className={`w-8 h-8 ${n <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Commentaire</label>
                      <textarea
                        data-testid="review-comment"
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Partagez votre expérience..."
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      data-testid="submit-review"
                      className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium"
                    >
                      <Send className="w-4 h-4" />
                      Envoyer mon avis
                    </button>
                  </form>
                </div>

                {/* Past reviews */}
                {reviews.map(rev => (
                  <div key={rev.review_id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`w-5 h-5 ${n <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      ))}
                    </div>
                    {rev.comment && <p className="text-slate-700">{rev.comment}</p>}
                    <p className="text-sm text-slate-400 mt-2">{formatDateTime(rev.created_at)}</p>
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

// ============= Main Portal Component =============
const ClientPortal = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${API_URL}/me`, { withCredentials: true });
        setUser(res.data);
      } catch {
        // Not authenticated
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-400">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <PortalLogin onAuth={setUser} />;
  }

  return <PortalDashboard user={user} onLogout={() => setUser(null)} />;
};

export default ClientPortal;
