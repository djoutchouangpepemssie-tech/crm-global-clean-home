import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Send, FileText, Download, Search, CheckCircle, Clock, XCircle, Mic } from 'lucide-react';
import VoiceQuote from './VoiceQuote';
import { formatDateTime, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const QUOTE_STATUS = {
  'brouillon': { label: 'Brouillon', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', icon: Clock },
  'envoyé': { label: 'Envoyé', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', icon: Send },
  'envoye': { label: 'Envoyé', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', icon: Send },
  'accepté': { label: 'Accepté', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', icon: CheckCircle },
  'accepte': { label: 'Accepté', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', icon: CheckCircle },
  'refusé': { label: 'Refusé', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', icon: XCircle },
};

const QuotesList = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(null);
  const [showVoice, setShowVoice] = useState(false);

  useEffect(() => { fetchQuotes(); }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/quotes`, { withCredentials: true });
      setQuotes(Array.isArray(res.data) ? res.data : res.data.quotes || []);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleSendQuote = async (quoteId, e) => {
    e.stopPropagation();
    setSending(quoteId);
    try {
      const res = await axios.post(`${API_URL}/quotes/${quoteId}/send`, {}, { withCredentials: true });
      toast.success(res.data.email_sent ? '✓ Devis envoyé par email' : 'Devis marqué comme envoyé');
      fetchQuotes();
    } catch { toast.error('Erreur lors de l\'envoi'); }
    finally { setSending(null); }
  };

  const handleCreateInvoice = async (quoteId, e) => {
    e.stopPropagation();
    try {
      await axios.post(`${API_URL}/invoices/from-quote/${quoteId}`, {}, { withCredentials: true });
      toast.success('Facture créée avec succès');
      navigate('/invoices');
    } catch { toast.error('Erreur lors de la création'); }
  };

  const filtered = quotes.filter(q =>
    (q.service_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (q.details || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: quotes.length,
    brouillon: quotes.filter(q => q.status === 'brouillon').length,
    envoye: quotes.filter(q => ['envoyé','envoye'].includes(q.status)).length,
    accepte: quotes.filter(q => ['accepté','accepte'].includes(q.status)).length,
    totalAmount: quotes.reduce((sum, q) => sum + (q.amount || 0), 0),
  };

  return (
    <>
      {showVoice && (
        <VoiceQuote
          onQuoteCreated={() => { fetchQuotes(); setShowVoice(false); }}
          onClose={() => setShowVoice(false)}
        />
      )}
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="quotes-page">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Devis</h1>
          </div>
          <p className="text-slate-500 text-sm"><span className="text-violet-400 font-semibold">{filtered.length}</span> devis trouvé(s)</p>
        </div>
        <button onClick={() => setShowVoice(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white mr-2"
            style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}>
            <Mic className="w-4 h-4"/> Devis vocal
          </button><button
            onClick={() => setShowVoice(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white mr-2"
            style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}>
            <Mic className="w-4 h-4"/> 🎤 Devis vocal
          </button><button onClick={() => navigate('/quotes/new')} data-testid="create-quote-button"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all text-sm font-medium"
          style={{boxShadow:'0 0 15px rgba(139,92,246,0.25)'}}>
          <Plus className="w-4 h-4" /> Nouveau devis
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total devis', value: stats.total, color: '#a78bfa' },
          { label: 'Brouillons', value: stats.brouillon, color: '#94a3b8' },
          { label: 'Envoyés', value: stats.envoye, color: '#60a5fa' },
          { label: 'Chiffre d\'affaires', value: formatCurrency(stats.totalAmount), color: '#34d399' },
        ].map((s, i) => (
          <div key={i} className="metric-card">
            <p className="text-2xl font-bold" style={{color: s.color, fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="section-card p-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Rechercher un devis..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="quotes-grid">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="skeleton h-56 rounded-xl" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucun devis trouvé</p>
            <button onClick={() => navigate('/quotes/new')} className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all">
              + Créer un devis
            </button>
          </div>
        ) : filtered.map((quote) => {
          const s = QUOTE_STATUS[quote.status] || QUOTE_STATUS['brouillon'];
          const StatusIcon = s.icon;
          return (
            <div key={quote.quote_id} data-testid={`quote-card-${quote.quote_id}`}
              className="section-card p-5 hover:border-violet-500/20 transition-all cursor-pointer group"
              onClick={() => navigate(`/leads/${quote.lead_id}`)}>
              
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-200 text-sm truncate group-hover:text-slate-100">{quote.service_type}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(quote.created_at)}</p>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2"
                  style={{color: s.color, background: s.bg, border: `1px solid ${s.border}`}}>
                  <StatusIcon className="w-3 h-3" />
                  {s.label}
                </span>
              </div>

              {/* Amount */}
              <div className="mb-4 p-3 rounded-lg" style={{background:'rgba(139,92,246,0.05)',border:'1px solid rgba(139,92,246,0.1)'}}>
                <p className="text-xs text-slate-500 mb-1">Montant</p>
                <p className="text-2xl font-bold text-violet-400" style={{fontFamily:'Manrope,sans-serif'}}>
                  {formatCurrency(quote.amount)}
                </p>
                {quote.surface && <p className="text-xs text-slate-500 mt-1">{quote.surface} m²</p>}
              </div>

              {/* Details preview */}
              {quote.details && (
                <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">{quote.details}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-white/5">
                <a href={`${API_URL}/exports/quote/${quote.quote_id}/pdf`}
                  data-testid={`download-quote-pdf-${quote.quote_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium transition-all">
                  <Download className="w-3.5 h-3.5" /> PDF
                </a>

                {quote.status === 'brouillon' && (
                  <button data-testid={`send-quote-button-${quote.quote_id}`}
                    disabled={sending === quote.quote_id}
                    onClick={(e) => handleSendQuote(quote.quote_id, e)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" />
                    {sending === quote.quote_id ? 'Envoi...' : 'Envoyer'}
                  </button>
                )}

                {['envoyé','envoye','accepté','accepte'].includes(quote.status) && (
                  <button data-testid={`create-invoice-button-${quote.quote_id}`}
                    onClick={(e) => handleCreateInvoice(quote.quote_id, e)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-lg text-xs font-medium transition-all">
                    <FileText className="w-3.5 h-3.5" /> Facturer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
};

export default QuotesList;
