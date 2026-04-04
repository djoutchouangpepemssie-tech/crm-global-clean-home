import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Send, FileText, Download, Search, CheckCircle, Clock, XCircle, Mic, Copy, AlertTriangle } from 'lucide-react';
import VoiceQuote from './VoiceQuote';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const formatEUR = (val) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);

const QUOTE_STATUS = {
  'brouillon': { label: 'Brouillon', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', icon: Clock },
  'envoyé':    { label: 'Envoyé',    color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.2)',   icon: Send },
  'envoye':    { label: 'Envoyé',    color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.2)',   icon: Send },
  'accepté':   { label: 'Accepté',   color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.2)',   icon: CheckCircle },
  'accepte':   { label: 'Accepté',   color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.2)',   icon: CheckCircle },
  'refusé':    { label: 'Refusé',    color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',    border: 'rgba(244,63,94,0.2)',    icon: XCircle },
  'refusé':    { label: 'Refusé',    color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',    border: 'rgba(244,63,94,0.2)',    icon: XCircle },
  'expiré':    { label: 'Expiré',    color: '#f97316', bg: 'rgba(249,115,22,0.1)',   border: 'rgba(249,115,22,0.2)',   icon: AlertTriangle },
};

const PIPELINE = [
  { key: 'brouillon', label: 'Brouillons', color: '#94a3b8' },
  { key: 'envoyé',    label: 'Envoyés',    color: '#60a5fa', extra: ['envoye'] },
  { key: 'accepté',   label: 'Acceptés',   color: '#34d399', extra: ['accepte'] },
  { key: 'refusé',    label: 'Refusés',    color: '#f43f5e', extra: ['refusé'] },
  { key: 'expiré',    label: 'Expirés',    color: '#f97316' },
];

const STATUS_CHIPS = [
  { key: '', label: 'Tous' },
  { key: 'brouillon', label: 'Brouillons' },
  { key: 'envoyé', label: 'Envoyés' },
  { key: 'accepté', label: 'Acceptés' },
  { key: 'refusé', label: 'Refusés' },
  { key: 'expiré', label: 'Expirés' },
];

const getDaysUntilExpiry = (quote) => {
  if (!quote.valid_until && !quote.expiry_date) return null;
  const expiry = new Date(quote.valid_until || quote.expiry_date);
  const now = new Date();
  const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return diff;
};

const QuotesList = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(null);
  const [duplicating, setDuplicating] = useState(null);
  const [showVoice, setShowVoice] = useState(false);
  const [activeStatus, setActiveStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
    } catch { toast.error("Erreur lors de l'envoi"); }
    finally { setSending(null); }
  };

  const handleDuplicate = async (quoteId, e) => {
    e.stopPropagation();
    setDuplicating(quoteId);
    try {
      await axios.post(`${API_URL}/quotes/${quoteId}/duplicate`, {}, { withCredentials: true });
      toast.success('Devis dupliqué');
      fetchQuotes();
    } catch {
      toast.info('Duplication : fonctionnalité à venir');
    } finally {
      setDuplicating(null);
    }
  };

  const handleCreateInvoice = async (quoteId, e) => {
    e.stopPropagation();
    try {
      await axios.post(`${API_URL}/invoices/from-quote/${quoteId}`, {}, { withCredentials: true });
      toast.success('Facture créée avec succès');
      navigate('/invoices');
    } catch { toast.error('Erreur lors de la création'); }
  };

  const pipelineCount = (pipelineKey, extra = []) => {
    const keys = [pipelineKey, ...extra];
    return quotes.filter(q => keys.includes(q.status)).length;
  };

  const filtered = quotes.filter(q => {
    const matchSearch =
      (q.service_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.lead_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !activeStatus || q.status === activeStatus || (activeStatus === 'envoyé' && q.status === 'envoye') || (activeStatus === 'accepté' && q.status === 'accepte');
    const matchDate =
      (!dateFrom || new Date(q.created_at) >= new Date(dateFrom)) &&
      (!dateTo || new Date(q.created_at) <= new Date(dateTo + 'T23:59:59'));
    return matchSearch && matchStatus && matchDate;
  });

  const stats = {
    total: quotes.length,
    brouillon: quotes.filter(q => q.status === 'brouillon').length,
    envoye: quotes.filter(q => ['envoyé', 'envoye'].includes(q.status)).length,
    accepte: quotes.filter(q => ['accepté', 'accepte'].includes(q.status)).length,
    totalAmount: quotes.reduce((sum, q) => sum + (q.amount || 0), 0),
    acceptedAmount: quotes.filter(q => ['accepté', 'accepte'].includes(q.status)).reduce((sum, q) => sum + (q.amount || 0), 0),
  };

  const pipelineTotal = stats.total || 1;

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
              <h1 className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'Manrope,sans-serif' }}>Devis</h1>
            </div>
            <p className="text-slate-500 text-sm">
              <span className="text-violet-400 font-semibold">{filtered.length}</span> devis · CA accepté&nbsp;
              <span className="text-emerald-400 font-semibold">{formatEUR(stats.acceptedAmount)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowVoice(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
              <Mic className="w-4 h-4" /> Devis vocal
            </button>
            <button onClick={() => navigate('/quotes/new')} data-testid="create-quote-button"
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all text-sm font-medium"
              style={{ boxShadow: '0 0 15px rgba(139,92,246,0.25)' }}>
              <Plus className="w-4 h-4" /> Nouveau devis
            </button>
          </div>
        </div>

        {/* ── STATUS PIPELINE BAR ── */}
        <div className="section-card p-4 mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pipeline devis</p>
          {/* Bar segments */}
          <div className="flex h-3 rounded-full overflow-hidden gap-px mb-3">
            {PIPELINE.map(p => {
              const count = pipelineCount(p.key, p.extra);
              const pct = (count / pipelineTotal) * 100;
              if (pct === 0) return null;
              return (
                <div key={p.key} style={{ width: `${pct}%`, background: p.color, minWidth: count > 0 ? '4px' : 0, transition: 'width 0.5s ease' }}
                  title={`${p.label}: ${count}`} />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {PIPELINE.map(p => {
              const count = pipelineCount(p.key, p.extra);
              return (
                <div key={p.key} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="text-xs text-slate-500">{p.label}</span>
                  <span className="text-xs font-bold" style={{ color: p.color }}>{count}</span>
                </div>
              );
            })}
            <div className="ml-auto text-xs text-slate-500">
              Total CA : <span className="font-bold text-violet-400">{formatEUR(stats.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="section-card p-4 mb-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Rechercher un devis..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
          </div>
          {/* Status chips */}
          <div className="flex flex-wrap gap-2">
            {STATUS_CHIPS.map(chip => {
              const isActive = activeStatus === chip.key;
              const count = chip.key === ''
                ? quotes.length
                : pipelineCount(chip.key, chip.key === 'envoyé' ? ['envoye'] : chip.key === 'accepté' ? ['accepte'] : []);
              return (
                <button key={chip.key} onClick={() => setActiveStatus(chip.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}>
                  {chip.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-white/8 text-slate-500'}`}>{count}</span>
                </button>
              );
            })}
          </div>
          {/* Date range */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-500">Du</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-2 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500" />
            <span className="text-xs text-slate-500">au</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-2 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-slate-500 hover:text-slate-300 underline">Effacer</button>
            )}
          </div>
        </div>

        {/* ── QUOTE CARDS GRID ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="quotes-grid">
          {loading ? (
            [...Array(6)].map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-violet-500/5 border border-violet-500/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-slate-400 font-semibold mb-1">Aucun devis trouvé</p>
              <p className="text-slate-600 text-sm mb-4">
                {search || activeStatus ? 'Modifiez vos filtres pour voir plus de résultats.' : 'Créez votre premier devis.'}
              </p>
              <button onClick={() => navigate('/quotes/new')}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all">
                + Créer un devis
              </button>
            </div>
          ) : filtered.map((quote, idx) => {
            const s = QUOTE_STATUS[quote.status] || QUOTE_STATUS['brouillon'];
            const StatusIcon = s.icon;
            const daysLeft = getDaysUntilExpiry(quote);
            const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && !['accepté', 'accepte', 'refusé'].includes(quote.status);
            const isExpired = daysLeft !== null && daysLeft < 0 && !['accepté', 'accepte', 'refusé'].includes(quote.status);

            return (
              <div key={quote.quote_id} data-testid={`quote-card-${quote.quote_id}`}
                className="section-card p-5 hover:border-violet-500/20 transition-all cursor-pointer group relative overflow-hidden"
                style={{ animation: `fadeInUp 0.25s ease both`, animationDelay: `${idx * 35}ms` }}
                onClick={() => navigate(`/leads/${quote.lead_id}`)}>

                {/* Top gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-0.5 opacity-70"
                  style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-slate-200 text-sm truncate group-hover:text-slate-100">
                      {quote.lead_name || quote.service_type}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{quote.service_type}</p>
                    <p className="text-xs text-slate-600">{formatDateTime(quote.created_at)}</p>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                    style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                    <StatusIcon className="w-3 h-3" />
                    {s.label}
                  </span>
                </div>

                {/* Amount — big & bold */}
                <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)' }}>
                  <p className="text-xs text-slate-500 mb-1">Montant TTC</p>
                  <p className="text-2xl font-black text-violet-400" style={{ fontFamily: 'Manrope,sans-serif' }}>
                    {formatEUR(quote.amount)}
                  </p>
                  {quote.surface && <p className="text-xs text-slate-500 mt-1">{quote.surface} m²</p>}
                </div>

                {/* Expiry warning */}
                {isExpiringSoon && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                  </div>
                )}
                {isExpired && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e' }}>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Devis expiré
                  </div>
                )}

                {/* Details preview */}
                {quote.details && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{quote.details}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-white/5 flex-wrap">
                  <a href={`${API_URL}/exports/quote/${quote.quote_id}/pdf`}
                    data-testid={`download-quote-pdf-${quote.quote_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium transition-all">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </a>

                  {/* Duplicate button */}
                  <button
                    data-testid={`duplicate-quote-button-${quote.quote_id}`}
                    disabled={duplicating === quote.quote_id}
                    onClick={(e) => handleDuplicate(quote.quote_id, e)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                    <Copy className="w-3.5 h-3.5" />
                    {duplicating === quote.quote_id ? '...' : 'Dupliquer'}
                  </button>

                  {quote.status === 'brouillon' && (
                    <button data-testid={`send-quote-button-${quote.quote_id}`}
                      disabled={sending === quote.quote_id}
                      onClick={(e) => handleSendQuote(quote.quote_id, e)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                      <Send className="w-3.5 h-3.5" />
                      {sending === quote.quote_id ? 'Envoi...' : 'Envoyer'}
                    </button>
                  )}

                  {['envoyé', 'envoye', 'accepté', 'accepte'].includes(quote.status) && (
                    <button data-testid={`create-invoice-button-${quote.quote_id}`}
                      onClick={(e) => handleCreateInvoice(quote.quote_id, e)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-lg text-xs font-medium transition-all">
                      <FileText className="w-3.5 h-3.5" /> Convertir en facture
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default QuotesList;
