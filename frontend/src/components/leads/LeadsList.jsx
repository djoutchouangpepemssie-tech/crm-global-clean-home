import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Download, Users, Filter, X, ChevronDown, LayoutGrid, List, Phone, Mail, Edit, MessageSquare, Tag, UserCheck } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const STATUS_CONFIG = {
  'nouveau':      { label: 'Nouveau',      color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' },
  'contacté':     { label: 'Contacté',     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  'contacte':     { label: 'Contacté',     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  'qualifié':     { label: 'Qualifié',     color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.2)' },
  'en_attente':   { label: 'En attente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
  'devis_envoyé': { label: 'Devis envoyé', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
  'gagné':        { label: 'Gagné',        color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)' },
  'gagne':        { label: 'Gagné',        color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)' },
  'perdu':        { label: 'Perdu',        color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.2)' },
};

const QUICK_FILTER_CHIPS = [
  { key: '', label: 'Tous' },
  { key: 'nouveau', label: 'Nouveau' },
  { key: 'contacté', label: 'Contacté' },
  { key: 'qualifié', label: 'Qualifié' },
  { key: 'devis_envoyé', label: 'Devis envoyé' },
  { key: 'gagné', label: 'Gagné' },
  { key: 'perdu', label: 'Perdu' },
];

const getStatusStyle = (status) =>
  STATUS_CONFIG[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };

const ScoreBar = ({ score = 50 }) => {
  const s = score || 0;
  const color = s < 30 ? '#f43f5e' : s < 60 ? '#f59e0b' : '#34d399';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{s}</span>
    </div>
  );
};

const LeadsList = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', service_type: '', source: '', period: '30d' });
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'card'
  const [quickStatus, setQuickStatus] = useState('');

  useEffect(() => { fetchLeads(); }, [filters]);

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
    }
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
      toast.success('Export CSV réussi');
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedLeads.length === 0) return;
    try {
      await axios.post(`${API_URL}/leads/bulk`, { lead_ids: selectedLeads, status: bulkAction.replace('status-', '') }, { withCredentials: true });
      toast.success(`${selectedLeads.length} lead(s) mis à jour`);
      setSelectedLeads([]); setBulkAction(''); fetchLeads();
    } catch { toast.error('Erreur lors de la mise à jour'); }
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

  // Status count for chips
  const countByStatus = (key) => {
    if (!key) return leads.length;
    return leads.filter(l => l.status === key || (key === 'contacté' && l.status === 'contacte')).length;
  };

  const filteredLeads = leads.filter(lead => {
    const matchSearch =
      (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone || '').includes(searchTerm);
    const matchQuick = !quickStatus ||
      lead.status === quickStatus ||
      (quickStatus === 'contacté' && lead.status === 'contacte') ||
      (quickStatus === 'gagné' && lead.status === 'gagne');
    return matchSearch && matchQuick;
  });

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '30d').length;

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="leads-page">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'Manrope,sans-serif' }}>Leads</h1>
          </div>
          <p className="text-slate-500 text-sm">
            <span className="text-violet-400 font-semibold">{filteredLeads.length}</span> lead(s) trouvé(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 bg-white/5 rounded-lg border border-white/10 p-1">
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vue liste">
              <List className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vue cartes">
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={handleExportCSV} data-testid="export-csv-button"
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg transition-all text-sm font-medium">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button onClick={() => navigate('/leads/new')} data-testid="create-lead-button"
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all text-sm font-medium"
            style={{ boxShadow: '0 0 15px rgba(139,92,246,0.25)' }}>
            <Plus className="w-4 h-4" />
            Nouveau lead
          </button>
        </div>
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_FILTER_CHIPS.map(chip => {
          const count = countByStatus(chip.key);
          const isActive = quickStatus === chip.key;
          return (
            <button key={chip.key} onClick={() => setQuickStatus(chip.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                isActive
                  ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/8'
              }`}>
              {chip.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-white/8 text-slate-500'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="section-card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" data-testid="search-input" placeholder="Rechercher un lead..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${showFilters ? 'bg-violet-500/15 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}>
            <Filter className="w-4 h-4" />
            Filtres
            {activeFiltersCount > 0 && <span className="bg-violet-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{activeFiltersCount}</span>}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-white/5 animate-fade-in">
            {[
              { key: 'status', label: 'Statut', options: [['', 'Tous statuts'], ['nouveau', 'Nouveau'], ['contacté', 'Contacté'], ['en_attente', 'En attente'], ['gagné', 'Gagné'], ['perdu', 'Perdu']] },
              { key: 'service_type', label: 'Service', options: [['', 'Tous services'], ['Ménage', 'Ménage'], ['Canapé', 'Canapé'], ['Matelas', 'Matelas'], ['Tapis', 'Tapis'], ['Bureaux', 'Bureaux']] },
              { key: 'source', label: 'Source', options: [['', 'Toutes sources'], ['Google', 'Google'], ['SEO', 'SEO'], ['site_web', 'Site web'], ['Direct', 'Direct']] },
              { key: 'period', label: 'Période', options: [['1d', "Aujourd'hui"], ['7d', '7 jours'], ['30d', '30 jours'], ['90d', '90 jours']] },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                <select value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                  data-testid={`filter-${key}`}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
                  {options.map(([v, l]) => <option key={v} value={v} className="bg-slate-800">{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table or Card View */}
      <div className="section-card overflow-hidden" data-testid="leads-table">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : filteredLeads.length === 0 ? (
          /* Better empty state */
          <div className="text-center py-20 px-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-violet-500/5 border border-violet-500/10 flex items-center justify-center">
              <Users className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-slate-300 font-semibold text-lg mb-1">Aucun lead trouvé</h3>
            <p className="text-slate-500 text-sm mb-2">
              {quickStatus || searchTerm
                ? 'Aucun lead ne correspond à vos critères. Essayez de modifier vos filtres.'
                : 'Commencez par créer votre premier lead pour démarrer.'}
            </p>
            {(quickStatus || searchTerm) ? (
              <button onClick={() => { setQuickStatus(''); setSearchTerm(''); }}
                className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-lg text-sm font-medium transition-all">
                Effacer les filtres
              </button>
            ) : (
              <button onClick={() => navigate('/leads/new')}
                className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all"
                style={{ boxShadow: '0 0 15px rgba(139,92,246,0.2)' }}>
                + Nouveau lead
              </button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          /* ── CARD VIEW ── */
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.map((lead, idx) => {
              const statusStyle = getStatusStyle(lead.status);
              return (
                <div key={lead.lead_id}
                  data-testid={`lead-card-grid-${lead.lead_id}`}
                  onClick={() => navigate(`/leads/${lead.lead_id}`)}
                  className="group cursor-pointer rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-violet-500/20 transition-all p-4 relative overflow-hidden"
                  style={{
                    animation: `fadeInUp 0.3s ease both`,
                    animationDelay: `${idx * 40}ms`,
                  }}>
                  {/* Top bar accent */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-60 transition-opacity group-hover:opacity-100"
                    style={{ background: `linear-gradient(90deg, ${statusStyle.color}, transparent)` }} />

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm flex-shrink-0">
                        {(lead.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">{lead.name}</h3>
                        <p className="text-xs text-slate-500">{lead.service_type || '—'}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                      style={{ color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}` }}>
                      {statusStyle.label}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Score</span>
                    </div>
                    <ScoreBar score={lead.score || 50} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {lead.phone}
                      </span>
                    )}
                    <span>{formatDate(lead.created_at)}</span>
                  </div>

                  {/* Hover quick actions */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0"
                    style={{ background: 'linear-gradient(to top, rgba(10,12,28,0.95), transparent)' }}>
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-green-500/15 border border-green-500/20 text-green-400 hover:bg-green-500/25 transition-all" title="Appeler">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={(e) => handleWhatsApp(lead, e)}
                      className="p-1.5 rounded-lg bg-green-500/15 border border-green-500/20 text-green-400 hover:bg-green-500/25 transition-all" title="WhatsApp">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/25 transition-all" title="Email">
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.lead_id}`); }}
                      className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/20 text-violet-400 hover:bg-violet-500/25 transition-all" title="Modifier">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <th className="px-4 py-3 text-left w-10">
                      <input type="checkbox"
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={() => setSelectedLeads(selectedLeads.length === filteredLeads.length ? [] : filteredLeads.map(l => l.lead_id))}
                        className="w-4 h-4 accent-violet-500 rounded" />
                    </th>
                    {['Client', 'Contact', 'Service', 'Source', 'Score', 'Statut', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, idx) => {
                    const statusStyle = getStatusStyle(lead.status);
                    return (
                      <tr key={lead.lead_id}
                        data-testid={`lead-row-${lead.lead_id}`}
                        className="group cursor-pointer transition-all hover:bg-white/3 relative"
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          animation: `fadeInUp 0.25s ease both`,
                          animationDelay: `${idx * 30}ms`,
                        }}>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedLeads.includes(lead.lead_id)}
                            onChange={() => setSelectedLeads(prev => prev.includes(lead.lead_id) ? prev.filter(id => id !== lead.lead_id) : [...prev, lead.lead_id])}
                            className="w-4 h-4 accent-violet-500 rounded" />
                        </td>
                        <td className="px-4 py-3" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs flex-shrink-0">
                              {(lead.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-200 group-hover:text-slate-100">{lead.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <div className="text-sm text-slate-300">{lead.email}</div>
                          <div className="text-xs text-slate-500">{lead.phone}</div>
                        </td>
                        <td className="px-4 py-3" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <span className="text-sm text-slate-400">{lead.service_type || '-'}</span>
                        </td>
                        <td className="px-4 py-3" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <span className="text-sm text-slate-400">{lead.source || 'Direct'}</span>
                        </td>
                        <td className="px-4 py-3" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <ScoreBar score={lead.score || 50} />
                        </td>
                        <td className="px-4 py-3" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}` }}>
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          {formatDate(lead.created_at)}
                        </td>
                        {/* Quick action icons (appear on row hover) */}
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-green-500/10 transition-all" title="Appeler">
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button onClick={(e) => handleWhatsApp(lead, e)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-green-500/10 transition-all" title="WhatsApp">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Email">
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.lead_id}`); }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all" title="Modifier">
                              <Edit className="w-3.5 h-3.5" />
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
            <div className="md:hidden divide-y divide-white/5">
              {filteredLeads.map((lead) => {
                const statusStyle = getStatusStyle(lead.status);
                return (
                  <div key={lead.lead_id} data-testid={`lead-card-${lead.lead_id}`}
                    onClick={() => navigate(`/leads/${lead.lead_id}`)}
                    className="p-4 hover:bg-white/3 transition-all cursor-pointer active:bg-white/5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm flex-shrink-0">
                        {(lead.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-slate-200 text-sm truncate">{lead.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                            style={{ color: statusStyle.color, background: statusStyle.bg }}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{lead.service_type} · {lead.source || 'Direct'}</p>
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

      {/* ── FLOATING BULK ACTION BAR ── */}
      {selectedLeads.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 flex items-center justify-between gap-3 animate-fade-in"
          data-testid="bulk-actions-bar"
          style={{
            background: 'rgba(10, 12, 28, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(139,92,246,0.2)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          }}>
          <span className="text-violet-300 font-semibold text-sm whitespace-nowrap">
            <span className="text-white font-bold">{selectedLeads.length}</span> lead(s) sélectionné(s)
          </span>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={() => {
              const newStatus = prompt('Nouveau statut (nouveau/contacté/qualifié/gagné/perdu) :');
              if (newStatus) { setBulkAction(`status-${newStatus}`); setTimeout(handleBulkAction, 0); }
            }}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/20 text-violet-300 rounded-xl text-xs font-semibold transition-all">
              <Tag className="w-3.5 h-3.5" /> Changer statut
            </button>
            <button onClick={() => toast.info('Fonctionnalité d\'assignation à venir')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-xs font-semibold transition-all">
              <UserCheck className="w-3.5 h-3.5" /> Assigner
            </button>
            <button onClick={() => toast.info('Fonctionnalité de tag à venir')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-xs font-semibold transition-all">
              <Tag className="w-3.5 h-3.5" /> Tagger
            </button>
            <button onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-xs font-semibold transition-all">
              <Download className="w-3.5 h-3.5" /> Exporter
            </button>
            <button onClick={async () => {
              if (!window.confirm(`Supprimer ${selectedLeads.length} lead(s) ?`)) return;
              try {
                await axios.post(`${API_URL}/leads/bulk`, { lead_ids: selectedLeads, action: 'delete' }, { withCredentials: true });
                toast.success('Leads supprimés');
                setSelectedLeads([]); fetchLeads();
              } catch { toast.error('Erreur suppression'); }
            }}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition-all">
              <X className="w-3.5 h-3.5" /> Supprimer
            </button>
            <button onClick={() => setSelectedLeads([])}
              className="p-2 text-slate-500 hover:text-slate-300 transition-colors rounded-xl hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Keyframe for row animation */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LeadsList;
