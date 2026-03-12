import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Filter } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDate } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const LeadsList = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    service_type: '',
    source: '',
    period: '30d'
  });
  const [searchTerm, setSearchTerm] = useState('');

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
    <div className="p-8" data-testid="leads-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Leads</h1>
          <p className="text-slate-600 mt-1">{filteredLeads.length} lead(s) trouvé(s)</p>
        </div>
        <button
          data-testid="create-lead-button"
          onClick={() => navigate('/leads/new')}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          Nouveau lead
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

          {/* Status filter */}
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

          {/* Service filter */}
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

          {/* Source filter */}
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

      {/* Leads table */}
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
            <p className="text-slate-500">Aucun lead trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.lead_id}
                  data-testid={`lead-row-${lead.lead_id}`}
                  onClick={() => navigate(`/leads/${lead.lead_id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-medium text-slate-900">{lead.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{lead.email}</div>
                    <div className="text-sm text-slate-500">{lead.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{lead.service_type}</div>
                    {lead.surface && <div className="text-sm text-slate-500">{lead.surface} m²</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{lead.source || 'Direct'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDate(lead.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LeadsList;
