import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Send, FileText, Download, Search, CheckCircle, Clock, XCircle,
  Mic, Copy, AlertTriangle, TrendingUp, Eye, Trash2, MoreHorizontal,
  ArrowRight, Sparkles, Filter, Calendar, X, ChevronDown, RefreshCw,
  DollarSign, BarChart3, Zap
} from 'lucide-react';
import VoiceQuote from './VoiceQuote';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

/* ── Formatters ── */
const formatEUR = (val) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);

const formatCompact = (val) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(val || 0);

/* ── Status Configuration ── */
const QUOTE_STATUS = {
  'brouillon': { label: 'Brouillon', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)', gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', icon: Clock },
  'envoyé':    { label: 'Envoyé',    color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.15)',   gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)', icon: Send },
  'envoye':    { label: 'Envoyé',    color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.15)',   gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)', icon: Send },
  'accepté':   { label: 'Accepté',   color: '#34d399', bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.15)',   gradient: 'linear-gradient(135deg, #34d399, #10b981)', icon: CheckCircle },
  'accepte':   { label: 'Accepté',   color: '#34d399', bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.15)',   gradient: 'linear-gradient(135deg, #34d399, #10b981)', icon: CheckCircle },
  'refusé':    { label: 'Refusé',    color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',    border: 'rgba(244,63,94,0.15)',    gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)', icon: XCircle },
  'expiré':    { label: 'Expiré',    color: '#f97316', bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.15)',   gradient: 'linear-gradient(135deg, #f97316, #ea580c)', icon: AlertTriangle },
};

const PIPELINE = [
  { key: 'brouillon', label: 'Brouillons', color: '#94a3b8', icon: Clock },
  { key: 'envoyé',    label: 'Envoyés',    color: '#60a5fa', extra: ['envoye'], icon: Send },
  { key: 'accepté',   label: 'Acceptés',   color: '#34d399', extra: ['accepte'], icon: CheckCircle },
  { key: 'refusé',    label: 'Refusés',    color: '#f43f5e', extra: ['refusé'], icon: XCircle },
  { key: 'expiré',    label: 'Expirés',    color: '#f97316', icon: AlertTriangle },
];

const STATUS_CHIPS = [
  { key: '', label: 'Tous', icon: BarChart3 },
  { key: 'brouillon', label: 'Brouillons', icon: Clock },
  { key: 'envoyé', label: 'Envoyés', icon: Send },
  { key: 'accepté', label: 'Acceptés', icon: CheckCircle },
  { key: 'refusé', label: 'Refusés', icon: XCircle },
  { key: 'expiré', label: 'Expirés', icon: AlertTriangle },
];

const getDaysUntilExpiry = (quote) => {
  if (!quote.valid_until && !quote.expiry_date) return null;
  const expiry = new Date(quote.valid_until || quote.expiry_date);
  const now = new Date();
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

/* ── Premium Skeleton Component ── */
const QuoteSkeleton = ({ index }) => (
  <div
    className="section-card overflow-hidden relative"
    style={{
      animation: `skeletonFadeIn 0.5s ease both`,
      animationDelay: `${index * 80}ms`
    }}
  >
    {/* Top accent shimmer */}
    <div className="h-1 w-full shimmer" style={{ background: 'rgba(139,92,246,0.1)' }} />
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="shimmer h-4 w-3/5 rounded-lg" />
          <div className="shimmer h-3 w-2/5 rounded-lg" />
        </div>
        <div className="shimmer h-7 w-20 rounded-full" />
      </div>
      {/* Amount block */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.06)' }}>
        <div className="shimmer h-3 w-20 rounded-lg mb-2" />
        <div className="shimmer h-8 w-32 rounded-lg" />
      </div>
      {/* Details */}
      <div className="space-y-2">
        <div className="shimmer h-3 w-full rounded-lg" />
        <div className="shimmer h-3 w-4/5 rounded-lg" />
      </div>
      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-white/5">
        <div className="shimmer h-9 w-20 rounded-lg" />
        <div className="shimmer h-9 w-24 rounded-lg" />
        <div className="shimmer h-9 flex-1 rounded-lg" />
      </div>
    </div>
  </div>
);

/* ── Premium Empty State ── */
const EmptyState = ({ search, activeStatus, onNavigate }) => (
  <div className="col-span-full flex items-center justify-center py-24">
    <div
      className="text-center max-w-sm mx-auto"
      style={{ animation: 'emptyStateIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' }}
    >
      {/* Animated icon */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.05))',
            border: '1px solid rgba(139,92,246,0.1)',
            animation: 'emptyPulse 3s ease-in-out infinite'
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <FileText className="w-10 h-10 text-violet-400/40" style={{ animation: 'floatIcon 3s ease-in-out infinite' }} />
        </div>
        {/* Orbiting dots */}
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-500/20" style={{ animation: 'orbitDot 4s linear infinite' }} />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-indigo-500/20" style={{ animation: 'orbitDot 4s linear infinite reverse' }} />
      </div>

      <h3 className="text-lg font-bold text-slate-200 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
        {search || activeStatus ? 'Aucun résultat' : 'Aucun devis'}
      </h3>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">
        {search || activeStatus
          ? 'Essayez de modifier vos filtres ou votre recherche pour trouver ce que vous cherchez.'
          : 'Commencez par créer votre premier devis. Utilisez le mode vocal ou le formulaire classique.'}
      </p>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onNavigate('/quotes/new')}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            boxShadow: '0 4px 20px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          Créer un devis
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  </div>
);

/* ── Confirmation Modal ── */
const ConfirmAction = ({ message, onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ animation: 'modalBgIn 0.2s ease both' }}
    onClick={onCancel}
  >
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div
      className="relative section-card p-6 max-w-sm w-full"
      style={{
        animation: 'modalCardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
      }}
      onClick={e => e.stopPropagation()}
    >
      <p className="text-slate-200 text-sm mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
        >
          Confirmer
        </button>
      </div>
    </div>
  </div>
);

/* ── Stats Card Micro-Component ── */
const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <div
    className="section-card p-4 group hover:border-violet-500/15 transition-all duration-500 relative overflow-hidden"
    style={{ animation: `statsSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both`, animationDelay: `${delay}ms` }}
  >
    <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500"
      style={{ background: color }} />
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-lg font-bold text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>{value}</p>
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
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
  const [confirmAction, setConfirmAction] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => { fetchQuotes(); }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/quotes`, { withCredentials: true });
      const raw = res.data;
      setQuotes(Array.isArray(raw) ? raw : (raw?.items || raw?.quotes || []));
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQuotes();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleSendQuote = async (quoteId, e) => {
    e?.stopPropagation();
    setConfirmAction({
      message: 'Envoyer ce devis au client ? Il recevra un email avec le PDF en pièce jointe.',
      onConfirm: async () => {
        setConfirmAction(null);
        setSending(quoteId);
        try {
          const res = await axios.post(`${API_URL}/quotes/${quoteId}/send`, {}, { withCredentials: true });
          toast.success(res.data.email_sent ? '✓ Devis envoyé par email' : 'Devis marqué comme envoyé');
          fetchQuotes();
        } catch { toast.error("Erreur lors de l'envoi"); }
        finally { setSending(null); }
      }
    });
  };

  const handleDuplicate = async (quoteId, e) => {
    e?.stopPropagation();
    setDuplicating(quoteId);
    try {
      await axios.post(`${API_URL}/quotes/${quoteId}/duplicate`, {}, { withCredentials: true });
      toast.success('Devis dupliqué avec succès');
      fetchQuotes();
    } catch {
      toast.info('Duplication : fonctionnalité à venir');
    } finally {
      setDuplicating(null);
    }
  };

  const handleCreateInvoice = async (quoteId, e) => {
    e?.stopPropagation();
    setConfirmAction({
      message: 'Convertir ce devis en facture ? Une nouvelle facture sera créée avec les mêmes informations.',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await axios.post(`${API_URL}/invoices/from-quote/${quoteId}`, {}, { withCredentials: true });
          toast.success('Facture créée avec succès');
          navigate('/invoices');
        } catch { toast.error('Erreur lors de la création'); }
      }
    });
  };

  const pipelineCount = useCallback((pipelineKey, extra = []) => {
    const keys = [pipelineKey, ...extra];
    return quotes.filter(q => keys.includes(q.status)).length;
  }, [quotes]);

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
    refuse: quotes.filter(q => q.status === 'refusé').length,
    totalAmount: quotes.reduce((sum, q) => sum + (q.amount || 0), 0),
    acceptedAmount: quotes.filter(q => ['accepté', 'accepte'].includes(q.status)).reduce((sum, q) => sum + (q.amount || 0), 0),
  };

  const conversionRate = stats.total > 0 ? Math.round((stats.accepte / stats.total) * 100) : 0;
  const pipelineTotal = stats.total || 1;

  return (
    <>
      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmAction
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {showVoice && (
        <VoiceQuote
          onQuoteCreated={() => { fetchQuotes(); setShowVoice(false); }}
          onClose={() => setShowVoice(false)}
        />
      )}

      <div className="p-4 md:p-6 lg:p-8" data-testid="quotes-page" style={{ animation: 'pageIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>

        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
          style={{ animation: 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
                <FileText className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Devis
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">
                  <span className="text-violet-400 font-bold">{filtered.length}</span> devis · Taux de conversion{' '}
                  <span className="text-emerald-400 font-bold">{conversionRate}%</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all duration-300"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowVoice(true)}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}>
              <Mic className="w-4 h-4 group-hover:animate-pulse" />
              <span className="hidden sm:inline">Devis vocal</span>
            </button>
            <button onClick={() => navigate('/quotes/new')} data-testid="create-quote-button"
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                boxShadow: '0 4px 20px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}>
              <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
              Nouveau devis
            </button>
          </div>
        </div>

        {/* ═══ STATS CARDS ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={BarChart3} label="Total devis" value={stats.total} color="#8b5cf6" delay={0} />
          <StatCard icon={DollarSign} label="CA Total" value={formatCompact(stats.totalAmount)} color="#60a5fa" delay={60} />
          <StatCard icon={TrendingUp} label="CA Accepté" value={formatCompact(stats.acceptedAmount)} color="#34d399" delay={120} />
          <StatCard icon={Zap} label="Conversion" value={`${conversionRate}%`} color="#f59e0b" delay={180} />
        </div>

        {/* ═══ PIPELINE BAR (Premium) ═══ */}
        <div className="section-card p-5 mb-6" style={{ animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Pipeline devis
            </p>
            <p className="text-xs text-slate-500">
              Total : <span className="font-bold text-violet-400">{formatEUR(stats.totalAmount)}</span>
            </p>
          </div>

          {/* Segmented bar */}
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {PIPELINE.map(p => {
              const count = pipelineCount(p.key, p.extra);
              const pct = (count / pipelineTotal) * 100;
              if (pct === 0) return null;
              return (
                <div key={p.key}
                  className="relative rounded-full overflow-hidden cursor-pointer transition-all duration-700 ease-out hover:brightness-110"
                  style={{ width: `${pct}%`, minWidth: count > 0 ? '6px' : 0 }}
                  title={`${p.label}: ${count}`}
                  onClick={() => setActiveStatus(activeStatus === p.key ? '' : p.key)}
                >
                  <div className="absolute inset-0" style={{ background: p.color, opacity: 0.85 }} />
                  <div className="absolute inset-0" style={{
                    background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)`
                  }} />
                </div>
              );
            })}
          </div>

          {/* Pipeline legend — interactive */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {PIPELINE.map(p => {
              const count = pipelineCount(p.key, p.extra);
              const PIcon = p.icon;
              const isActive = activeStatus === p.key;
              return (
                <button key={p.key}
                  onClick={() => setActiveStatus(isActive ? '' : p.key)}
                  className={`flex items-center gap-2 py-1 px-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
                >
                  <PIcon className="w-3.5 h-3.5" style={{ color: p.color }} />
                  <span className="text-xs text-slate-400">{p.label}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: p.color }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ FILTERS ═══ */}
        <div className="section-card mb-6 overflow-hidden" style={{ animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' }}>
          {/* Search + Filter toggle */}
          <div className="p-4 flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Rechercher par nom, service, détails..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30 transition-all duration-300"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 border ${
                showFilters || dateFrom || dateTo
                  ? 'bg-violet-600/15 border-violet-500/20 text-violet-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtres</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Status chips */}
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {STATUS_CHIPS.map(chip => {
              const isActive = activeStatus === chip.key;
              const ChipIcon = chip.icon;
              const count = chip.key === ''
                ? quotes.length
                : pipelineCount(chip.key, chip.key === 'envoyé' ? ['envoye'] : chip.key === 'accepté' ? ['accepte'] : []);
              const statusConf = QUOTE_STATUS[chip.key];
              const chipColor = statusConf?.color || '#8b5cf6';
              return (
                <button key={chip.key} onClick={() => setActiveStatus(chip.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 border"
                  style={{
                    background: isActive ? `${chipColor}15` : 'rgba(255,255,255,0.03)',
                    borderColor: isActive ? `${chipColor}30` : 'rgba(255,255,255,0.07)',
                    color: isActive ? chipColor : '#94a3b8',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isActive ? `0 4px 12px ${chipColor}15` : 'none'
                  }}
                >
                  <ChipIcon className="w-3.5 h-3.5" />
                  {chip.label}
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                    style={{
                      background: isActive ? `${chipColor}20` : 'rgba(255,255,255,0.05)',
                      color: isActive ? chipColor : '#64748b'
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Collapsible date filters */}
          <div className="overflow-hidden transition-all duration-500 ease-out" style={{
            maxHeight: showFilters ? '120px' : '0px',
            opacity: showFilters ? 1 : 0
          }}>
            <div className="px-4 pb-4 flex flex-wrap gap-3 items-center border-t border-white/5 pt-4">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">Période</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all duration-300" />
              <span className="text-xs text-slate-500">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all duration-300" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 rounded-xl transition-all duration-300 border border-rose-500/10">
                  <X className="w-3 h-3" /> Effacer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ QUOTE CARDS GRID ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="quotes-grid">
          {loading ? (
            [...Array(6)].map((_, i) => <QuoteSkeleton key={i} index={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState search={search} activeStatus={activeStatus} onNavigate={navigate} />
          ) : filtered.map((quote, idx) => {
            const s = QUOTE_STATUS[quote.status] || QUOTE_STATUS['brouillon'];
            const StatusIcon = s.icon;
            const daysLeft = getDaysUntilExpiry(quote);
            const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && !['accepté', 'accepte', 'refusé'].includes(quote.status);
            const isExpired = daysLeft !== null && daysLeft < 0 && !['accepté', 'accepte', 'refusé'].includes(quote.status);
            const isMenuOpen = openMenuId === quote.quote_id;

            return (
              <div key={quote.quote_id} data-testid={`quote-card-${quote.quote_id}`}
                className="section-card group relative overflow-hidden cursor-pointer"
                style={{
                  animation: `cardSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both`,
                  animationDelay: `${idx * 50}ms`,
                  transition: 'border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${s.color}25`;
                  e.currentTarget.style.boxShadow = `0 8px 32px ${s.color}08, 0 0 0 1px ${s.color}10`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.transform = '';
                }}
                onClick={() => navigate(`/leads/${quote.lead_id}`)}>

                {/* Top gradient accent line */}
                <div className="h-1 w-full" style={{ background: s.gradient, opacity: 0.6 }} />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-bold text-slate-200 text-sm truncate transition-colors duration-300 group-hover:text-white"
                        style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {quote.lead_name || quote.service_type}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 truncate">{quote.service_type}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{formatDateTime(quote.created_at)}</p>
                    </div>

                    {/* Status Badge — premium */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-300"
                      style={{
                        color: s.color,
                        background: s.bg,
                        border: `1px solid ${s.border}`,
                        boxShadow: `0 2px 8px ${s.color}10`
                      }}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {s.label}
                    </div>
                  </div>

                  {/* Amount Block — premium */}
                  <div className="mb-4 p-4 rounded-xl relative overflow-hidden transition-all duration-300 group-hover:scale-[1.01]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(99,102,241,0.03))',
                      border: '1px solid rgba(139,92,246,0.08)'
                    }}>
                    {/* Subtle shimmer on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.03) 50%, transparent 100%)',
                        animation: 'shinePass 2s ease-in-out infinite'
                      }} />
                    <div className="relative">
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Montant TTC</p>
                      <p className="text-2xl font-black text-transparent bg-clip-text"
                        style={{
                          fontFamily: 'Manrope, sans-serif',
                          backgroundImage: 'linear-gradient(135deg, #a78bfa, #818cf8)'
                        }}>
                        {formatEUR(quote.amount)}
                      </p>
                      {quote.surface && (
                        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-violet-500/50" />
                          {quote.surface} m²
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expiry warnings — premium */}
                  {isExpiringSoon && (
                    <div className="flex items-center gap-2.5 mb-4 px-3.5 py-2.5 rounded-xl text-xs font-bold"
                      style={{
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(245,158,11,0.04))',
                        border: '1px solid rgba(249,115,22,0.15)',
                        color: '#f97316',
                        animation: daysLeft <= 1 ? 'urgentPulse 2s ease-in-out infinite' : 'none'
                      }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(249,115,22,0.15)' }}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <span>
                        {daysLeft === 0 ? 'Expire aujourd\'hui !' : `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  )}
                  {isExpired && (
                    <div className="flex items-center gap-2.5 mb-4 px-3.5 py-2.5 rounded-xl text-xs font-bold"
                      style={{
                        background: 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(239,68,68,0.04))',
                        border: '1px solid rgba(244,63,94,0.15)',
                        color: '#f43f5e'
                      }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(244,63,94,0.15)' }}>
                        <XCircle className="w-3.5 h-3.5" />
                      </div>
                      <span>Devis expiré depuis {Math.abs(daysLeft)} jour{Math.abs(daysLeft) > 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Details preview */}
                  {quote.details && (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">{quote.details}</p>
                  )}

                  {/* ── Action Buttons ── */}
                  <div className="flex gap-2 pt-4 border-t border-white/[0.04] flex-wrap items-center">
                    {/* PDF Download */}
                    <a href={`${API_URL}/exports/quote/${quote.quote_id}/pdf`}
                      data-testid={`download-quote-pdf-${quote.quote_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 border bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:bg-violet-500/15 hover:border-violet-500/20 active:scale-95"
                      title="Télécharger le PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">PDF</span>
                    </a>

                    {/* Duplicate */}
                    <button
                      data-testid={`duplicate-quote-button-${quote.quote_id}`}
                      disabled={duplicating === quote.quote_id}
                      onClick={(e) => handleDuplicate(quote.quote_id, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 border bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:bg-indigo-500/15 hover:border-indigo-500/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Copy className={`w-3.5 h-3.5 ${duplicating === quote.quote_id ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{duplicating === quote.quote_id ? '...' : 'Dupliquer'}</span>
                    </button>

                    {/* Primary Action — Send or Convert */}
                    {quote.status === 'brouillon' && (
                      <button data-testid={`send-quote-button-${quote.quote_id}`}
                        disabled={sending === quote.quote_id}
                        onClick={(e) => handleSendQuote(quote.quote_id, e)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                        style={{
                          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))',
                          border: '1px solid rgba(124,58,237,0.2)',
                          color: '#c4b5fd'
                        }}
                      >
                        <Send className={`w-3.5 h-3.5 ${sending === quote.quote_id ? 'animate-pulse' : ''}`} />
                        {sending === quote.quote_id ? 'Envoi...' : 'Envoyer'}
                      </button>
                    )}

                    {['envoyé', 'envoye', 'accepté', 'accepte'].includes(quote.status) && (
                      <button data-testid={`create-invoice-button-${quote.quote_id}`}
                        onClick={(e) => handleCreateInvoice(quote.quote_id, e)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 active:scale-95"
                        style={{
                          background: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(16,185,129,0.06))',
                          border: '1px solid rgba(52,211,153,0.15)',
                          color: '#6ee7b7'
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Facturer
                      </button>
                    )}

                    {/* Quick view */}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/leads/${quote.lead_id}`); }}
                      className="p-2 rounded-lg transition-all duration-300 border bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-white hover:bg-white/10 active:scale-95"
                      title="Voir le lead"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Results count footer */}
        {!loading && filtered.length > 0 && (
          <div className="mt-6 text-center"
            style={{ animation: 'fadeIn 0.5s ease 0.3s both' }}>
            <p className="text-xs text-slate-600">
              {filtered.length} devis affiché{filtered.length > 1 ? 's' : ''}
              {filtered.length !== quotes.length && ` sur ${quotes.length}`}
            </p>
          </div>
        )}
      </div>

      {/* ═══ STYLES ═══ */}
      <style>{`
        @keyframes pageIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes statsSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes skeletonFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes emptyStateIn {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes emptyPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.04); opacity: 0.8; }
        }

        @keyframes floatIcon {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }

        @keyframes orbitDot {
          from { transform: rotate(0deg) translateX(12px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(12px) rotate(-360deg); }
        }

        @keyframes urgentPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(249,115,22,0.2); }
          50%      { opacity: 0.85; box-shadow: 0 0 16px 2px rgba(249,115,22,0.15); }
        }

        @keyframes shinePass {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes modalBgIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes modalCardIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Responsive optimizations */
        @media (max-width: 640px) {
          [data-testid="quotes-grid"] > div {
            margin-bottom: 0;
          }
        }
      `}</style>
    </>
  );
};

export default QuotesList;
