import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Filter, Download, Check } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import LeadScoreBadge from '../shared/LeadScoreBadge';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const LeadsList = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    service_type: '',
    source: '',
    period: '30d'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.service_type) params.append('service_type', filters.service_type);
      if (filters.source) params.append('source', filters.source);
      if (filters.period) params.append('period', filters.period);

      const response = await axios.get(`${API_URL}/leads?${params.toString()}`, {
        withCredentials: true
      });
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Erreur lors du chargement des leads');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.service_type) params.append('service_type', filters.service_type);
      if (filters.source) params.append('source', filters.source);

      const response = await axios.get(
        `${API_URL}/leads/export?${params.toString()}`,
        { 
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export CSV réussi');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedLeads.length === 0) {
      toast.error('Sélectionnez une action et au moins un lead');
      return;
    }

    try {
      const updateData = { lead_ids: selectedLeads };
      
      if (bulkAction.startsWith('status-')) {
        updateData.status = bulkAction.replace('status-', '');
      } else if (bulkAction === 'export') {
        // Handle individual export
        return;
      }

      await axios.post(`${API_URL}/leads/bulk`, updateData, { withCredentials: true });
      toast.success(`${selectedLeads.length} lead(s) mis à jour`);
      setSelectedLeads([]);
      setBulkAction('');
      fetchLeads();
    } catch (error) {
      console.error('Error bulk update:', error);
      toast.error('Erreur lors de la mise à jour groupée');
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.lead_id));
    }
  };

  const toggleSelectLead = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  );

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'nouveau', label: 'Nouveau' },
    { value: 'contacté', label: 'Contacté' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'devis_envoyé', label: 'Devis envoyé' },
    { value: 'gagné', label: 'Gagné' },
    { value: 'perdu', label: 'Perdu' }
  ];

  const serviceOptions = [
    { value: '', label: 'Tous les services' },
    { value: 'Ménage', label: 'Ménage' },
    { value: 'Canapé', label: 'Canapé' },
    { value: 'Matelas', label: 'Matelas' },
    { value: 'Tapis', label: 'Tapis' },
    { value: 'Bureaux', label: 'Bureaux' }
  ];

  const sourceOptions = [
    { value: '', label: 'Toutes les sources' },
    { value: 'Google Ads', label: 'Google Ads' },
    { value: 'SEO', label: 'SEO' },
    { value: 'Meta Ads', label: 'Meta Ads' },
    { value: 'Direct', label: 'Direct' }
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8" data-testid="leads-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Leads</h1>
          <p className="text-slate-600 mt-1 text-sm">{filteredLeads.length} lead(s) trouve(s)</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            data-testid="export-csv-button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>
          <button
            data-testid="create-lead-button"
            onClick={() => navigate('/leads/new')}
            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau lead
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedLeads.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 md:p-4 mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" data-testid="bulk-actions-bar">
          <span className="text-violet-900 font-medium text-sm">
            {selectedLeads.length} lead(s) selectionne(s)
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-4 py-2 border border-violet-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Action groupée...</option>
              <option value="status-contacté">→ Marquer contacté</option>
              <option value="status-en_attente">→ Marquer en attente</option>
              <option value="status-perdu">→ Marquer perdu</option>
            </select>
            <button
              onClick={handleBulkAction}
              className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
              disabled={!bulkAction}
            >
              Appliquer
            </button>
            <button
              onClick={() => setSelectedLeads([])}
              className="px-4 py-2 text-violet-600 hover:text-violet-700 font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 mb-4 md:mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                data-testid="search-input"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <select
            data-testid="filter-status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            data-testid="filter-service"
            value={filters.service_type}
            onChange={(e) => setFilters({ ...filters, service_type: e.target.value })}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {serviceOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            data-testid="filter-source"
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {sourceOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads table / cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid="leads-table">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Chargement...</p>
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Aucun lead trouve</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 lg:px-6 py-4 text-left">
                      <input type="checkbox" checked={selectedLeads.length === filteredLeads.length} onChange={toggleSelectAll}
                        className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500" />
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nom</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Service</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden xl:table-cell">Source</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Score</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden xl:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.lead_id} data-testid={`lead-row-${lead.lead_id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 lg:px-6 py-4">
                        <input type="checkbox" checked={selectedLeads.includes(lead.lead_id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelectLead(lead.lead_id); }}
                          className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500" />
                      </td>
                      <td className="px-4 lg:px-6 py-4 cursor-pointer" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm flex-shrink-0">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-medium text-slate-900 text-sm">{lead.name}</div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 cursor-pointer" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                        <div className="text-sm text-slate-900">{lead.email}</div>
                        <div className="text-xs text-slate-500">{lead.phone}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden lg:table-cell cursor-pointer" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                        <div className="text-sm text-slate-900">{lead.service_type}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden xl:table-cell cursor-pointer" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                        <div className="text-sm text-slate-900">{lead.source || 'Direct'}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 cursor-pointer" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                        <LeadScoreBadge score={lead.score || 50} />
                      </td>
                      <td className="px-4 lg:px-6 py-4 cursor-pointer" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-slate-500 hidden xl:table-cell cursor-pointer" onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <div key={lead.lead_id} data-testid={`lead-card-${lead.lead_id}`}
                  onClick={() => navigate(`/leads/${lead.lead_id}`)}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm flex-shrink-0">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium text-slate-900 text-sm truncate">{lead.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${getStatusColor(lead.status)}`}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{lead.service_type} &middot; {lead.source || 'Direct'}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-slate-400">{lead.email}</p>
                        <LeadScoreBadge score={lead.score || 50} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadsList;
