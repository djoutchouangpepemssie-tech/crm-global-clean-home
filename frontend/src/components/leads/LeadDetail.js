import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, FileText, MessageSquare, Plus } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDateTime, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newInteraction, setNewInteraction] = useState({ type: 'note', content: '' });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchLeadData();
  }, [id]);

  const fetchLeadData = async () => {
    setLoading(true);
    try {
      const [leadRes, interactionsRes, quotesRes] = await Promise.all([
        axios.get(`${API_URL}/leads/${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/interactions?lead_id=${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/quotes?lead_id=${id}`, { withCredentials: true })
      ]);
      setLead(leadRes.data);
      setInteractions(interactionsRes.data);
      setQuotes(quotesRes.data);
    } catch (error) {
      console.error('Error fetching lead data:', error);
      toast.error('Erreur lors du chargement du lead');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.patch(`${API_URL}/leads/${id}`, { status: newStatus }, { withCredentials: true });
      setLead({ ...lead, status: newStatus });
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!newInteraction.content.trim()) return;

    try {
      await axios.post(
        `${API_URL}/interactions`,
        { lead_id: id, ...newInteraction },
        { withCredentials: true }
      );
      toast.success('Interaction ajoutée');
      setNewInteraction({ type: 'note', content: '' });
      fetchLeadData();
    } catch (error) {
      console.error('Error adding interaction:', error);
      toast.error('Erreur lors de l\'ajout de l\'interaction');
    }
  };

  const handleCreateQuote = () => {
    navigate('/quotes/new', { state: { lead } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!lead) return <div className="p-8">Lead introuvable</div>;

  const statusOptions = [
    { value: 'nouveau', label: 'Nouveau' },
    { value: 'contacté', label: 'Contacté' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'devis_envoyé', label: 'Devis envoyé' },
    { value: 'gagné', label: 'Gagné' },
    { value: 'perdu', label: 'Perdu' }
  ];

  return (
    <div className="p-8" data-testid="lead-detail-page">
      {/* Header */}
      <div className="mb-8">
        <button
          data-testid="back-button"
          onClick={() => navigate('/leads')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux leads
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {lead.name}
            </h1>
            <p className="text-slate-600 mt-1">{lead.service_type}</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              data-testid="status-select"
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-0 cursor-pointer ${getStatusColor(lead.status)}`}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              data-testid="create-quote-button"
              onClick={handleCreateQuote}
              className="flex items-center gap-2 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
            >
              <FileText className="w-5 h-5" />
              Créer un devis
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations de contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="text-slate-900">{lead.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Téléphone</p>
                  <p className="text-slate-900">{lead.phone}</p>
                </div>
              </div>
              {lead.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Adresse</p>
                    <p className="text-slate-900">{lead.address}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Créé le</p>
                  <p className="text-slate-900">{formatDateTime(lead.created_at)}</p>
                </div>
              </div>
            </div>
            {lead.message && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Message</p>
                <p className="text-slate-900">{lead.message}</p>
              </div>
            )}
          </div>

          {/* Quotes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm" data-testid="quotes-section">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Devis ({quotes.length})</h2>
            {quotes.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Aucun devis créé</p>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <div
                    key={quote.quote_id}
                    data-testid={`quote-item-${quote.quote_id}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/quotes/${quote.quote_id}`)}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{quote.service_type}</p>
                      <p className="text-sm text-slate-600">{formatDateTime(quote.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(quote.amount)}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                        {getStatusLabel(quote.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm" data-testid="interactions-section">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Historique des interactions</h2>
            
            {/* Add interaction form */}
            <form onSubmit={handleAddInteraction} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex gap-3">
                <select
                  data-testid="interaction-type-select"
                  value={newInteraction.type}
                  onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="note">Note</option>
                  <option value="appel">Appel</option>
                  <option value="email">Email</option>
                  <option value="relance">Relance</option>
                </select>
                <input
                  type="text"
                  data-testid="interaction-content-input"
                  placeholder="Ajouter une note..."
                  value={newInteraction.content}
                  onChange={(e) => setNewInteraction({ ...newInteraction, content: e.target.value })}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="submit"
                  data-testid="add-interaction-button"
                  className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
                >
                  Ajouter
                </button>
              </div>
            </form>

            {/* Interactions list */}
            <div className="space-y-4">
              {interactions.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Aucune interaction</p>
              ) : (
                interactions.map((interaction) => (
                  <div key={interaction.interaction_id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900 capitalize">{interaction.type}</span>
                        <span className="text-xs text-slate-500">{formatDateTime(interaction.created_at)}</span>
                      </div>
                      <p className="text-slate-700">{interaction.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - Details */}
        <div className="space-y-6">
          {/* Service details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Détails du service</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Service</p>
                <p className="text-slate-900 font-medium">{lead.service_type}</p>
              </div>
              {lead.surface && (
                <div>
                  <p className="text-sm text-slate-600">Surface</p>
                  <p className="text-slate-900 font-medium">{lead.surface} m²</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-600">Probabilité</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-600 rounded-full transition-all"
                      style={{ width: `${lead.probability}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{lead.probability}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Source tracking */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Tracking</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Source</p>
                <p className="text-slate-900 font-medium">{lead.source || 'Direct'}</p>
              </div>
              {lead.campaign && (
                <div>
                  <p className="text-sm text-slate-600">Campagne</p>
                  <p className="text-slate-900 font-medium">{lead.campaign}</p>
                </div>
              )}
              {lead.utm_source && (
                <div>
                  <p className="text-sm text-slate-600">UTM Source</p>
                  <p className="text-slate-900 font-medium">{lead.utm_source}</p>
                </div>
              )}
              {lead.utm_medium && (
                <div>
                  <p className="text-sm text-slate-600">UTM Medium</p>
                  <p className="text-slate-900 font-medium">{lead.utm_medium}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
