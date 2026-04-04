import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Search, Download, Users, Filter, X, ChevronDown, LayoutGrid, List,
  Phone, Mail, Edit, MessageSquare, Tag, UserCheck, Sparkles, TrendingUp,
  Clock, Zap, ArrowUpRight, Eye, Trash2, CheckCircle2, AlertCircle,
  RefreshCw, SlidersHorizontal, Star, Activity, Globe, BarChart3,
  UserPlus, FileSpreadsheet, Target, Flame, Snowflake, XCircle, Check
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import BACKEND_URL from '../../config.js';

const API_URL = BACKEND_URL + '/api';

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  'nouveau':      { label: 'Nouveau',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)', icon: Sparkles, gradient: 'linear-gradient(135deg, #60a5fa, #818cf8)' },
  'contacté':     { label: 'Contacté',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', icon: Phone, gradient: 'linear-gradient(135deg, #a78bfa, #c084fc)' },
  'contacte':     { label: 'Contacté',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', icon: Phone, gradient: 'linear-gradient(135deg, #a78bfa, #c084fc)' },
  'qualifié':     { label: 'Qualifié',     color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.25)', icon: Target, gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
  'en_attente':   { label: 'En attente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)', icon: Clock, gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  'devis_envoyé': { label: 'Devis envoyé', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)', icon: FileSpreadsheet, gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  'gagné':        { label: 'Gagné',        color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)', icon: CheckCircle2, gradient: 'linear-gradient(135deg, #34d399, #6ee7b7)' },
  'gagne':        { label: 'Gagné',        color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)', icon: CheckCircle2, gradient: 'linear-gradient(135deg, #34d399, #6ee7b7)' },
  'perdu':        { label: 'Perdu',        color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.25)', icon: XCircle, gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
};

const QUICK_FILTER_CHIPS = [
  { key: '', label: 'Tous', icon: Users },
  { key: 'nouveau', label: 'Nouveau', icon: Sparkles },
  { key: 'contacté', label: 'Contacté', icon: Phone },
  { key: 'qualifié', label: 'Qualifié', icon: Target },
  { key: 'devis_envoyé', label: 'Devis envoyé', icon: FileSpreadsheet },
  { key: 'gagné', label: 'Gagné', icon: CheckCircle2 },
  { key: 'perdu', label: 'Perdu', icon: XCircle },
];

const getStatusStyle = (status) =>
  STATUS_CONFIG[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', icon: Activity, gradient: 'linear-gradient(135deg, #94a3b8, #cbd5e1)' };

// ─── PREMIUM SCORE BAR ─────────────────────────────────────────────────────
const ScoreBar = ({ score = 50, size = 'md' }) => {
  const s = Math.min(100, Math.max(0, score || 0));
  const color = s < 30 ? '#f43f5e' : s < 60 ? '#f59e0b' : s < 80 ? '#34d399' : '#22d3ee';
  const label = s < 30 ? 'Froid' : s < 60 ? 'Tiède' : s < 80 ? 'Chaud' : 'Brûlant';
  const Icon = s < 30 ? Snowflake : s < 60 ? Activity : s < 80 ? TrendingUp : Flame;
  const h = size === 'lg' ? 'h-2' : 'h-1.5';

  return (
    <div className="flex items-center gap-2.5 min-w-[100px]">
      <div className={`flex-1 ${h} bg-white/[0.06] rounded-full overflow-hidden relative`}>
        <div
          className="h-full rounded-full relative overflow-hidden"
          style={{
            width: `${s}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="absolute inset-0 opacity-40" style={{
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
            animation: 'shimmerBar 2s infinite',
          }} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{s}</span>
      </div>
    </div>
  );
};

// ─── PREMIUM AVATAR ─────────────────────────────────────────────────────────
const LeadAvatar = ({ name, score, size = 'md' }) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  const s = score || 50;
  const ringColor = s < 30 ? '#f43f5e' : s < 60 ? '#f59e0b' : '#34d399';
  const dim = size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const textSize = size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className={`${dim} relative group/avatar`}>
      <div className={`${dim} rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/25 flex items-center justify-center text-violet-300 font-bold ${textSize} transition-all duration-300 group-hover/avatar:scale-105 group-hover/avatar:border-violet-400/40`}>
        {initial}
      </div>
      {/* Score indicator dot */}
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0c1c] transition-transform duration-300 group-hover/avatar:scale-110"
        style={{ background: ringColor }} />
    </div>
  );
};

// ─── LOADING SKELETON ───────────────────────────────────────────────────────
const SkeletonCard = ({ index }) => (
  <div
    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4"
    style={{ animation: `fadeInUp 0.4s ease both`, animationDelay: `${index * 80}ms` }}
  >
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-white/[0.06] skeleton-premium" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded-lg bg-white/[0.06] skeleton-premium" />
        <div className="h-3 w-20 rounded-lg bg-white/[0.04] skeleton-premium" style={{ animationDelay: '0.1s' }} />
      </div>
      <div className="h-6 w-16 rounded-full bg-white/[0.06] skeleton-premium" style={{ animationDelay: '0.2s' }} />
    </div>
    <div className="space-y-2">
      <div className="h-2 w-full rounded-full bg-white/[0.04] skeleton-premium" style={{ animationDelay: '0.15s' }} />
      <div className="flex justify-between">
        <div className="h-3 w-24 rounded-lg bg-white/[0.04] skeleton-premium" style={{ animationDelay: '0.25s' }} />
        <div className="h-3 w-16 rounded-lg bg-white/[0.04] skeleton-premium" style={{ animationDelay: '0.3s' }} />
      </div>
    </div>
  </div>
);

const SkeletonRow = ({ index }) => (
  <tr style={{ animation: `fadeInUp 0.3s ease both`, animationDelay: `${index * 60}ms` }}>
    <td className="px-4 py-4"><div className="w-4 h-4 rounded bg-white/[0.06] skeleton-premium" /></td>
    <td className="px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/[0.06] skeleton-premium" />
        <div className="h-4 w-28 rounded-lg bg-white/[0.06] skeleton-premium" />
      </div>
    </td>
    <td className="px-4 py-4"><div className="space-y-1.5"><div className="h-3.5 w-36 rounded-lg bg-white/[0.05] skeleton-premium" /><div className="h-3 w-24 rounded-lg bg-white/[0.04] skeleton-premium" /></div></td>
    <td className="px-4 py-4"><div className="h-3.5 w-16 rounded-lg bg-white/[0.05] skeleton-premium" /></td>
    <td className="px-4 py-4"><div className="h-3.5 w-14 rounded-lg bg-white/[0.05] skeleton-premium" /></td>
    <td className="px-4 py-4"><div className="h-2 w-20 rounded-full bg-white/[0.05] skeleton-premium" /></td>
    <td className="px-4 py-4"><div className="h-6 w-20 rounded-full bg-white/[0.05] skeleton-premium" /></td>
    <td className="px-4 py-4"><div className="h-3 w-16 rounded-lg bg-white/[0.04] skeleton-premium" /></td>
    <td className="px-4 py-4" />
  </tr>
);

// ─── PREMIUM EMPTY STATE ────────────────────────────────────────────────────
const EmptyState = ({ hasFilters, onClear, onCreateNew }) => (
  <div className="text-center py-24 px-8 relative overflow-hidden">
    {/* Background decoration */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      <div className="absolute top-20 left-20 w-2 h-2 rounded-full bg-violet-500/20 animate-pulse" />
      <div className="absolute top-32 right-24 w-1.5 h-1.5 rounded-full bg-indigo-500/20 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-20 left-1/3 w-1 h-1 rounded-full bg-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
    </div>

    <div className="relative z-10" style={{ animation: 'fadeInUp 0.5s ease both' }}>
      {/* Illustrated icon */}
      <div className="w-24 h-24 mx-auto mb-6 relative">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/15 rotate-6 transition-transform" />
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/8 to-indigo-500/8 border border-violet-500/10 -rotate-3 transition-transform" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border border-violet-500/20 flex items-center justify-center backdrop-blur-sm">
          {hasFilters ? (
            <Search className="w-10 h-10 text-violet-400/50" />
          ) : (
            <UserPlus className="w-10 h-10 text-violet-400/50" />
          )}
        </div>
        {/* Floating particles */}
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center" style={{ animation: 'floatUp 3s ease-in-out infinite' }}>
          <Sparkles className="w-3 h-3 text-violet-400/60" />
        </div>
        <div className="absolute -bottom-1 -left-3 w-5 h-5 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center" style={{ animation: 'floatUp 3s ease-in-out infinite 1.5s' }}>
          <Star className="w-2.5 h-2.5 text-indigo-400/60" />
        </div>
      </div>

      <h3 className="text-slate-200 font-bold text-xl mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
        {hasFilters ? 'Aucun résultat' : 'Commencez ici'}
      </h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-8">
        {hasFilters
          ? 'Aucun lead ne correspond à vos critères de recherche. Essayez de modifier vos filtres ou votre recherche.'
          : 'Votre pipeline est vide. Créez votre premier lead pour commencer à suivre vos prospects et opportunités.'}
      </p>

      {hasFilters ? (
        <button onClick={onClear}
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.15] text-slate-300 rounded-xl text-sm font-semibold transition-all duration-300">
          <RefreshCw className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
          Effacer les filtres
        </button>
      ) : (
        <button onClick={onCreateNew}
          className="group relative inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden"
          style={{ boxShadow: '0 0 25px rgba(139,92,246,0.3), 0 4px 15px rgba(139,92,246,0.2)' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          <span className="relative">Créer mon premier lead</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      )}
    </div>
  </div>
);

// ─── CONFIRMATION MODAL ─────────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, icon: IconComp, variant = 'danger' }) => {
  if (!isOpen) return null;
  const colors = variant === 'danger'
    ? { btn: 'bg-red-500 hover:bg-red-400', icon: 'text-red-400 bg-red-500/10 border-red-500/20', glow: 'rgba(244,63,94,0.15)' }
    : { btn: 'bg-violet-600 hover:bg-violet-500', icon: 'text-violet-400 bg-violet-500/10 border-violet-500/20', glow: 'rgba(139,92,246,0.15)' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] p-6 text-center"
        style={{
          background: 'linear-gradient(145deg, rgba(15,17,35,0.98), rgba(10,12,28,0.98))',
          boxShadow: `0 25px 60px rgba(0,0,0,0.5), 0 0 40px ${colors.glow}`,
          animation: 'modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
        <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${colors.icon} border flex items-center justify-center`}>
          {IconComp && <IconComp className="w-6 h-6" />}
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 rounded-xl text-sm font-semibold transition-all">
            Annuler
          </button>
          <button onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 ${colors.btn} text-white rounded-xl text-sm font-semibold transition-all`}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── STATUS DROPDOWN (inline) ───────────────────────────────────────────────
const StatusDropdown = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;
  const statuses = ['nouveau', 'contacté', 'qualifié', 'en_attente', 'devis_envoyé', 'gagné', 'perdu'];
  return (
    <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-white/[0.08] overflow-hidden z-50"
      style={{
        background: 'linear-gradient(145deg, rgba(15,17,35,0.98), rgba(10,12,28,0.98))',
        boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
        animation: 'dropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
      <div className="px-3 py-2 border-b border-white/[0.06]">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Changer le statut</span>
      </div>
      {statuses.map((s, i) => {
        const style = getStatusStyle(s);
        const IconComp = style.icon;
        return (
          <button key={s} onClick={() => { onSelect(s); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] transition-all text-left"
            style={{ animation: `fadeInUp 0.2s ease both`, animationDelay: `${i * 30}ms` }}>
            <IconComp className="w-3.5 h-3.5" style={{ color: style.color }} />
            <span className="text-sm text-slate-300">{style.label}</span>
          </button>
        );
      })}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const LeadsList = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', service_type: '', source: '', period: '30d' });
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [quickStatus, setQuickStatus] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { fetchLeads(); }, [filters]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (showStatusDropdown) setShowStatusDropdown(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showStatusDropdown]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const response = await axios.get(`${API_URL}/leads?${params.toString()}`, { withCredentials: true });
      const raw = response.data;
      setLeads(Array.isArray(raw) ? raw : (raw?.items || raw?.leads || []));
    } catch {
      toast.error('Erreur lors du chargement des leads');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLeads();
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API_URL}/leads/export`, { withCredentials: true, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export CSV réussi !', { icon: '📊' });
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedLeads.length === 0) return;
    try {
      await axios.post(`${API_URL}/leads/bulk`, { lead_ids: selectedLeads, status: newStatus }, { withCredentials: true });
      toast.success(`${selectedLeads.length} lead(s) mis à jour vers "${getStatusStyle(newStatus).label}"`, { icon: '✨' });
      setSelectedLeads([]);
      fetchLeads();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await axios.post(`${API_URL}/leads/bulk`, { lead_ids: selectedLeads, action: 'delete' }, { withCredentials: true });
      toast.success(`${selectedLeads.length} lead(s) supprimé(s)`, { icon: '🗑️' });
      setSelectedLeads([]);
      setShowDeleteConfirm(false);
      fetchLeads();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleWhatsApp = async (lead, e) => {
    e.stopPropagation();
    try {
      const res = await axios.post(`${API_URL}/whatsapp/send`, {
        lead_id: lead.lead_id,
        message: `Bonjour ${lead.name}, merci pour votre demande. - Global Clean Home`,
      }, { withCredentials: true });
      window.open(res.data.whatsapp_link, '_blank');
    } catch { toast.error('Erreur WhatsApp'); }
  };

  // Status count
  const countByStatus = useCallback((key) => {
    if (!key) return leads.length;
    return leads.filter(l => l.status === key || (key === 'contacté' && l.status === 'contacte') || (key === 'gagné' && l.status === 'gagne')).length;
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => leads.filter(lead => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (lead.name || '').toLowerCase().includes(term) ||
      (lead.email || '').toLowerCase().includes(term) ||
      (lead.phone || '').includes(searchTerm) ||
      (lead.service_type || '').toLowerCase().includes(term);
    const matchQuick = !quickStatus ||
      lead.status === quickStatus ||
      (quickStatus === 'contacté' && lead.status === 'contacte') ||
      (quickStatus === 'gagné' && lead.status === 'gagne');
    return matchSearch && matchQuick;
  }), [leads, searchTerm, quickStatus]);

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '30d').length;

  const toggleSelect = (id) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedLeads(selectedLeads.length === filteredLeads.length ? [] : filteredLeads.map(l => l.lead_id));
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 lg:p-8" data-testid="leads-page" style={{ animation: 'pageIn 0.5s ease both' }}>

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div style={{ animation: 'slideInLeft 0.4s ease both' }}>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-indigo-500/15 border border-violet-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Leads
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                <span className="text-violet-400 font-bold">{filteredLeads.length}</span> lead(s)
                {selectedLeads.length > 0 && (
                  <span className="text-indigo-400 ml-1">· {selectedLeads.length} sélectionné(s)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2" style={{ animation: 'slideInRight 0.4s ease both' }}>
          {/* View toggle */}
          <div className="flex gap-0.5 bg-white/[0.04] rounded-xl border border-white/[0.08] p-1">
            {[
              { mode: 'list', icon: List, label: 'Vue liste' },
              { mode: 'card', icon: LayoutGrid, label: 'Vue cartes' },
            ].map(({ mode, icon: Icon, label }) => (
              <button key={mode} onClick={() => setViewMode(mode)} title={label}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === mode
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                }`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={handleRefresh} title="Rafraîchir"
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-300">
            <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Export */}
          <button onClick={handleExportCSV} data-testid="export-csv-button"
            className="group flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.12] text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-300 text-sm font-medium">
            <Download className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* New lead */}
          <button onClick={() => navigate('/leads/new')} data-testid="create-lead-button"
            className="group relative flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all duration-300 text-sm font-semibold overflow-hidden"
            style={{ boxShadow: '0 0 20px rgba(139,92,246,0.25), 0 4px 12px rgba(139,92,246,0.15)' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90 relative z-10" />
            <span className="relative z-10">Nouveau lead</span>
          </button>
        </div>
      </div>

      {/* ═══ QUICK FILTER CHIPS ═══ */}
      <div className="flex flex-wrap gap-2 mb-5" style={{ animation: 'fadeInUp 0.4s ease both 0.1s' }}>
        {QUICK_FILTER_CHIPS.map((chip, i) => {
          const count = countByStatus(chip.key);
          const isActive = quickStatus === chip.key;
          const ChipIcon = chip.icon;
          const statusColor = chip.key ? (STATUS_CONFIG[chip.key]?.color || '#8b5cf6') : '#8b5cf6';
          return (
            <button key={chip.key} onClick={() => setQuickStatus(chip.key)}
              className={`group flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 border ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] hover:border-white/[0.12]'
              }`}
              style={isActive ? {
                background: `linear-gradient(135deg, ${statusColor}22, ${statusColor}11)`,
                borderColor: `${statusColor}40`,
                color: statusColor,
                boxShadow: `0 0 15px ${statusColor}15`,
              } : {}}
            >
              <ChipIcon className={`w-3 h-3 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              {chip.label}
              <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                isActive ? 'bg-white/20' : 'bg-white/[0.06] text-slate-500 group-hover:text-slate-400'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ SEARCH + FILTERS ═══ */}
      <div className="section-card mb-5 overflow-hidden" style={{ animation: 'fadeInUp 0.4s ease both 0.15s' }}>
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search with micro-interactions */}
            <div className={`relative flex-1 transition-all duration-500 ${searchFocused ? 'scale-[1.01]' : ''}`}>
              <div className={`absolute inset-0 rounded-xl transition-all duration-500 ${searchFocused ? 'opacity-100' : 'opacity-0'}`}
                style={{ boxShadow: '0 0 20px rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.75rem' }} />
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${searchFocused ? 'text-violet-400 scale-110' : 'text-slate-500'}`} />
              <input type="text" ref={searchRef} data-testid="search-input"
                placeholder="Rechercher par nom, email, téléphone..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40 transition-all duration-300"
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/[0.06] transition-all"
                  style={{ animation: 'scaleIn 0.2s ease' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300 ${
                showFilters
                  ? 'bg-violet-500/10 border-violet-500/25 text-violet-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
              }`}>
              <SlidersHorizontal className="w-4 h-4" />
              Filtres avancés
              {activeFiltersCount > 0 && (
                <span className="bg-violet-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expandable filter panel */}
        <div className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${showFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 pt-1 border-t border-white/[0.05]">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              {[
                { key: 'status', label: 'Statut', icon: Activity, options: [['', 'Tous les statuts'], ['nouveau', 'Nouveau'], ['contacté', 'Contacté'], ['qualifié', 'Qualifié'], ['en_attente', 'En attente'], ['gagné', 'Gagné'], ['perdu', 'Perdu']] },
                { key: 'service_type', label: 'Service', icon: Zap, options: [['', 'Tous les services'], ['Ménage', 'Ménage'], ['Canapé', 'Canapé'], ['Matelas', 'Matelas'], ['Tapis', 'Tapis'], ['Bureaux', 'Bureaux']] },
                { key: 'source', label: 'Source', icon: Globe, options: [['', 'Toutes les sources'], ['Google', 'Google'], ['SEO', 'SEO'], ['site_web', 'Site web'], ['Direct', 'Direct']] },
                { key: 'period', label: 'Période', icon: Clock, options: [['1d', "Aujourd'hui"], ['7d', '7 derniers jours'], ['30d', '30 derniers jours'], ['90d', '90 derniers jours']] },
              ].map(({ key, label, icon: FilterIcon, options }, idx) => (
                <div key={key} style={{ animation: `fadeInUp 0.3s ease both`, animationDelay: `${idx * 60}ms` }}>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">
                    <FilterIcon className="w-3 h-3" />
                    {label}
                  </label>
                  <select value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                    data-testid={`filter-${key}`}
                    className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] text-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40 transition-all duration-300 cursor-pointer appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    {options.map(([v, l]) => <option key={v} value={v} className="bg-[#0f1123]">{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {/* Clear all filters */}
            {activeFiltersCount > 0 && (
              <div className="flex justify-end mt-3">
                <button onClick={() => setFilters({ status: '', service_type: '', source: '', period: '30d' })}
                  className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-medium transition-all">
                  <X className="w-3 h-3" />
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TABLE / CARDS ═══ */}
      <div className="section-card overflow-hidden" data-testid="leads-table" style={{ animation: 'fadeInUp 0.4s ease both 0.2s' }}>
        {loading ? (
          /* ── LOADING SKELETONS ── */
          viewMode === 'card' ? (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} index={i} />)}
            </div>
          ) : (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
                    <th className="px-4 py-3 w-10" />
                    {['Client', 'Contact', 'Service', 'Source', 'Score', 'Statut', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {[...Array(6)].map((_, i) => <SkeletonRow key={i} index={i} />)}
                </tbody>
              </table>
            </div>
          )
        ) : filteredLeads.length === 0 ? (
          /* ── EMPTY STATE ── */
          <EmptyState
            hasFilters={!!quickStatus || !!searchTerm}
            onClear={() => { setQuickStatus(''); setSearchTerm(''); }}
            onCreateNew={() => navigate('/leads/new')}
          />
        ) : viewMode === 'card' ? (
          /* ═══ CARD VIEW ═══ */
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.map((lead, idx) => {
              const statusStyle = getStatusStyle(lead.status);
              const StatusIcon = statusStyle.icon;
              const isSelected = selectedLeads.includes(lead.lead_id);
              return (
                <div key={lead.lead_id}
                  data-testid={`lead-card-grid-${lead.lead_id}`}
                  onClick={() => navigate(`/leads/${lead.lead_id}`)}
                  className={`group cursor-pointer rounded-2xl border bg-white/[0.02] transition-all duration-300 p-5 relative overflow-hidden ${
                    isSelected
                      ? 'border-violet-500/40 bg-violet-500/[0.04] ring-1 ring-violet-500/20'
                      : 'border-white/[0.06] hover:border-violet-500/20 hover:bg-white/[0.04]'
                  }`}
                  style={{
                    animation: `cardSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both`,
                    animationDelay: `${idx * 50}ms`,
                  }}>
                  {/* Top accent gradient */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: statusStyle.gradient }} />

                  {/* Hover glow */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${statusStyle.color}08, transparent)` }} />

                  {/* Checkbox */}
                  <div className="absolute top-3 right-3 z-10"
                    onClick={e => { e.stopPropagation(); toggleSelect(lead.lead_id); }}>
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'bg-violet-500 border-violet-500'
                        : 'border-white/[0.15] opacity-0 group-hover:opacity-100 hover:border-violet-400/50'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <LeadAvatar name={lead.name} score={lead.score} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors truncate">{lead.name}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{lead.email || '—'}</p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{ color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}` }}>
                      <StatusIcon className="w-3 h-3" />
                      {statusStyle.label}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {lead.service_type && <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">{lead.service_type}</span>}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Score qualité</span>
                      <span className="text-[10px] text-slate-600">{lead.source || 'Direct'}</span>
                    </div>
                    <ScoreBar score={lead.score || 50} size="lg" />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-white/[0.04]">
                    {lead.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {lead.phone}
                      </span>
                    ) : <span />}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(lead.created_at)}
                    </span>
                  </div>

                  {/* Hover quick actions */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"
                    style={{ background: 'linear-gradient(to top, rgba(10,12,28,0.98) 30%, transparent)' }}>
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                        className="p-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 hover:scale-110 transition-all duration-200" title="Appeler">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={(e) => handleWhatsApp(lead, e)}
                      className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:scale-110 transition-all duration-200" title="WhatsApp">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
                        className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:scale-110 transition-all duration-200" title="Email">
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.lead_id}`); }}
                      className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 hover:scale-110 transition-all duration-200" title="Voir le détail">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ═══ LIST VIEW ═══ */
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                    <th className="px-4 py-3.5 text-left w-10">
                      <div onClick={toggleSelectAll}
                        className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          selectedLeads.length === filteredLeads.length && filteredLeads.length > 0
                            ? 'bg-violet-500 border-violet-500'
                            : 'border-white/[0.15] hover:border-violet-400/50'
                        }`}>
                        {selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </th>
                    {['Client', 'Contact', 'Service', 'Source', 'Score', 'Statut', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                    ))}
                    <th className="px-4 py-3.5 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, idx) => {
                    const statusStyle = getStatusStyle(lead.status);
                    const StatusIcon = statusStyle.icon;
                    const isSelected = selectedLeads.includes(lead.lead_id);
                    return (
                      <tr key={lead.lead_id}
                        data-testid={`lead-row-${lead.lead_id}`}
                        className={`group cursor-pointer transition-all duration-200 relative ${
                          isSelected
                            ? 'bg-violet-500/[0.04]'
                            : 'hover:bg-white/[0.025]'
                        }`}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          animation: `tableRowIn 0.35s ease both`,
                          animationDelay: `${idx * 30}ms`,
                        }}>
                        {/* Selection indicator */}
                        {isSelected && <td className="absolute left-0 top-0 bottom-0 w-[2px] bg-violet-500" style={{ padding: 0 }} />}

                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div onClick={() => toggleSelect(lead.lead_id)}
                            className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-violet-500 border-violet-500'
                                : 'border-white/[0.12] group-hover:border-white/[0.25] hover:border-violet-400/50'
                            }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-4 py-3.5" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <div className="flex items-center gap-3">
                            <LeadAvatar name={lead.name} score={lead.score} />
                            <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{lead.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <div className="text-sm text-slate-300">{lead.email || '—'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{lead.phone || '—'}</div>
                        </td>
                        <td className="px-4 py-3.5" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <span className="text-sm text-slate-400">{lead.service_type || '—'}</span>
                        </td>
                        <td className="px-4 py-3.5" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <span className="text-sm text-slate-400">{lead.source || 'Direct'}</span>
                        </td>
                        <td className="px-4 py-3.5" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <ScoreBar score={lead.score || 50} />
                        </td>
                        <td className="px-4 py-3.5" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                            style={{ color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}` }}>
                            <StatusIcon className="w-3 h-3" />
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-600" />
                            {formatDate(lead.created_at)}
                          </span>
                        </td>
                        {/* Quick actions on hover */}
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200" title="Appeler">
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button onClick={(e) => handleWhatsApp(lead, e)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200" title="WhatsApp">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200" title="Email">
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.lead_id}`); }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-200" title="Détail">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-white/[0.04]">
              {filteredLeads.map((lead, idx) => {
                const statusStyle = getStatusStyle(lead.status);
                const StatusIcon = statusStyle.icon;
                return (
                  <div key={lead.lead_id} data-testid={`lead-card-${lead.lead_id}`}
                    onClick={() => navigate(`/leads/${lead.lead_id}`)}
                    className="p-4 hover:bg-white/[0.03] transition-all duration-200 cursor-pointer active:bg-white/[0.05]"
                    style={{ animation: `slideInLeft 0.35s ease both`, animationDelay: `${idx * 40}ms` }}>
                    <div className="flex items-start gap-3">
                      <LeadAvatar name={lead.name} score={lead.score} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-bold text-slate-200 text-sm truncate">{lead.name}</h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold flex-shrink-0"
                            style={{ color: statusStyle.color, background: statusStyle.bg }}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {statusStyle.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2.5">{lead.service_type} · {lead.source || 'Direct'}</p>
                        <ScoreBar score={lead.score || 50} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ═══ FLOATING BULK ACTION BAR ═══ */}
      {selectedLeads.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 flex items-center gap-4 rounded-2xl max-w-3xl w-[calc(100%-2rem)]"
          data-testid="bulk-actions-bar"
          style={{
            background: 'linear-gradient(135deg, rgba(15,17,40,0.95), rgba(10,12,28,0.95))',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(139,92,246,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.1)',
            animation: 'bulkBarIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
          {/* Selected count */}
          <div className="flex items-center gap-2 pr-4 border-r border-white/[0.08]">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <span className="text-violet-300 text-sm font-bold">{selectedLeads.length}</span>
            </div>
            <span className="text-slate-400 text-xs font-medium hidden sm:block">sélectionné(s)</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {/* Status change */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={(e) => { e.stopPropagation(); setShowStatusDropdown(!showStatusDropdown); }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap">
                <Tag className="w-3.5 h-3.5" />
                Statut
                <ChevronDown className={`w-3 h-3 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>
              <StatusDropdown isOpen={showStatusDropdown} onClose={() => setShowStatusDropdown(false)} onSelect={handleBulkStatusChange} />
            </div>

            <button onClick={() => toast.info('Fonctionnalité d\'assignation à venir')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Assigner</span>
            </button>

            <button onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Delete with confirmation */}
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/8 hover:bg-red-500/15 border border-red-500/15 text-red-400 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap">
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
          </div>

          {/* Close */}
          <button onClick={() => setSelectedLeads([])}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] rounded-xl transition-all duration-200 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        icon={Trash2}
        variant="danger"
        title={`Supprimer ${selectedLeads.length} lead(s) ?`}
        message="Cette action est irréversible. Les leads sélectionnés seront définitivement supprimés de votre CRM."
      />

      {/* ═══ PREMIUM ANIMATIONS ═══ */}
      <style>{`
        @keyframes pageIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tableRowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bulkBarIn {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shimmerBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .skeleton-premium {
          position: relative;
          overflow: hidden;
        }
        .skeleton-premium::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
          animation: skeletonShimmer 1.8s ease-in-out infinite;
        }
        @keyframes skeletonShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LeadsList;
