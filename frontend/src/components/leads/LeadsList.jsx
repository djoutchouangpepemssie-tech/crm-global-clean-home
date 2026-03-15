import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Download, Users, Filter, X, ChevronDown } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const STATUS_CONFIG = {
  'nouveau': { label: 'Nouveau', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
  'contacté': { label: 'Contacté', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  'contacte': { label: 'Contacté', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  'qualifié': { label: 'Qualifié', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' },
  'en_attente': { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  'devis_envoyé': { label: 'Devis envoyé', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  'gagné': { label: 'Gagné', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  'gagne': { label: 'Gagné', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  'perdu': { label: 'Perdu', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)' },
};

const getStatusStyle = (status) => STATUS_CONFIG[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };

const LeadsList = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', service_type: '', source: '', period: '30d' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchLeads(); }, [filters]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const response = await axios.get(`${API_URL}/leads?${params.toString()}`, { withCredentials: true });
      setLeads(Array.isArray(response.data) ? response.data : response.data.leads || []);
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
      toast.error('Erreur lors de l\'export');
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

  const filteredLeads = leads.filter(lead =>
    (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.phone || '').includes(searchTerm)
  );

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '30d').length;

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="leads-page">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Leads</h1>
          </div>
          <p className="text-slate-500 text-sm">
            <span className="text-violet-400 font-semibold">{filteredLeads.length}</span> lead(s) trouvé(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} data-testid="export-csv-button"
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg transition-all text-sm font-medium">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button onClick={() => navigate('/leads/new')} data-testid="create-lead-button"
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all text-sm font-medium"
            style={{boxShadow:'0 0 15px rgba(139,92,246,0.25)'}}>
            <Plus className="w-4 h-4" />
            Nouveau lead
          </button>
        </div>
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
              { key: 'status', label: 'Statut', options: [['','Tous statuts'],['nouveau','Nouveau'],['contacté','Contacté'],['en_attente','En attente'],['gagné','Gagné'],['perdu','Perdu']] },
              { key: 'service_type', label: 'Service', options: [['','Tous services'],['Ménage','Ménage'],['Canapé','Canapé'],['Matelas','Matelas'],['Tapis','Tapis'],['Bureaux','Bureaux']] },
              { key: 'source', label: 'Source', options: [['','Toutes sources'],['Google','Google'],['SEO','SEO'],['site_web','Site web'],['Direct','Direct']] },
              { key: 'period', label: 'Période', options: [['1d','Aujourd\'hui'],['7d','7 jours'],['30d','30 jours'],['90d','90 jours']] },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                <select value={filters[key]} onChange={(e) => setFilters({...filters, [key]: e.target.value})}
                  data-testid={`filter-${key}`}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
                  {options.map(([v, l]) => <option key={v} value={v} className="bg-slate-800">{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selectedLeads.length > 0 && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-4 flex items-center justify-between gap-3 animate-fade-in" data-testid="bulk-actions-bar">
          <span className="text-violet-300 font-medium text-sm">{selectedLeads.length} lead(s) sélectionné(s)</span>
          <div className="flex items-center gap-2">
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-sm focus:outline-none">
              <option value="" className="bg-slate-800">Action...</option>
              <option value="status-contacté" className="bg-slate-800">→ Contacté</option>
              <option value="status-perdu" className="bg-slate-800">→ Perdu</option>
              <option value="status-gagné" className="bg-slate-800">→ Gagné</option>
            </select>
            <button onClick={handleBulkAction} disabled={!bulkAction}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all">
              Appliquer
            </button>
            <button onClick={() => setSelectedLeads([])} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="section-card overflow-hidden" data-testid="leads-table">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucun lead trouvé</p>
            <p className="text-slate-600 text-sm mt-1">Créez votre premier lead ou modifiez vos filtres</p>
            <button onClick={() => navigate('/leads/new')} className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all">
              + Nouveau lead
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)'}}>
                    <th className="px-4 py-3 text-left w-10">
                      <input type="checkbox" checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={() => setSelectedLeads(selectedLeads.length === filteredLeads.length ? [] : filteredLeads.map(l => l.lead_id))}
                        className="w-4 h-4 accent-violet-500 rounded" />
                    </th>
                    {['Client', 'Contact', 'Service', 'Source', 'Score', 'Statut', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, idx) => {
                    const statusStyle = getStatusStyle(lead.status);
                    return (
                      <tr key={lead.lead_id} data-testid={`lead-row-${lead.lead_id}`}
                        className="group cursor-pointer transition-all hover:bg-white/3"
                        style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
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
                          <LeadScoreBadge score={lead.score || 50} />
                        </td>
                        <td className="px-4 py-3" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}`}}>
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                          {formatDate(lead.created_at)}
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
                            style={{color: statusStyle.color, background: statusStyle.bg}}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{lead.service_type} · {lead.source || 'Direct'}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-600 truncate">{lead.email}</p>
                          <LeadScoreBadge score={lead.score || 50} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadsList;
