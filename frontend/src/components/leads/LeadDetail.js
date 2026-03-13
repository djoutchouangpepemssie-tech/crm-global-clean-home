import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, FileText, MessageSquare, Plus, Send, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDateTime, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newInteraction, setNewInteraction] = useState({ type: 'note', content: '' });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(null);

  const fetchLeadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, interactionsRes, quotesRes, emailsRes] = await Promise.all([
        axios.get(`${API_URL}/leads/${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/interactions?lead_id=${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/quotes?lead_id=${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/emails/lead/${id}`, { withCredentials: true }).catch(() => ({ data: { emails: [] } })),
      ]);
      setLead(leadRes.data);
      setInteractions(interactionsRes.data);
      setQuotes(quotesRes.data);
      setEmails(emailsRes.data.emails || []);
    } catch (error) {
      console.error('Error fetching lead data:', error);
      toast.error('Erreur lors du chargement du lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

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

  const handleSendQuote = async (quoteId) => {
    setSendingQuote(quoteId);
    try {
      const res = await axios.post(`${API_URL}/quotes/${quoteId}/send`, {}, { withCredentials: true });
      toast.success(res.data.email_sent ? 'Devis envoye par email' : 'Devis marque comme envoye');
      fetchLeadData();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du devis');
    } finally {
      setSendingQuote(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-pulse bg-slate-200 rounded h-6 w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!lead) return <div className="p-4 md:p-8">Lead introuvable</div>;

  const statusOptions = [
    { value: 'nouveau', label: 'Nouveau' },
    { value: 'contacté', label: 'Contacté' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'devis_envoyé', label: 'Devis envoyé' },
    { value: 'gagné', label: 'Gagné' },
    { value: 'perdu', label: 'Perdu' }
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-24 md:pb-6 lg:pb-8" data-testid="lead-detail-page">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <button
          data-testid="back-button"
          onClick={() => navigate('/leads')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux leads
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {lead.name}
            </h1>
            <p className="text-slate-600 mt-1 text-sm">{lead.service_type}</p>
          </div>
          {/* Desktop action buttons */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-wrap">
            <select
              data-testid="status-select"
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold border-0 cursor-pointer ${getStatusColor(lead.status)}`}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              data-testid="whatsapp-button"
              onClick={async () => {
                try {
                  const res = await axios.post(`${API_URL}/whatsapp/send`, {
                    lead_id: lead.lead_id,
                    message: `Bonjour ${lead.name}, merci pour votre demande. Notre equipe vous contactera rapidement. - Global Clean Home`,
                  }, { withCredentials: true });
                  window.open(res.data.whatsapp_link, '_blank');
                  toast.success('WhatsApp ouvert');
                } catch { toast.error('Erreur WhatsApp'); }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              data-testid="create-quote-button"
              onClick={handleCreateQuote}
              className="flex items-center gap-1.5 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm"
            >
              <FileText className="w-4 h-4" />
              Creer un devis
            </button>
          </div>
          {/* Mobile status only */}
          <div className="sm:hidden">
            <select
              data-testid="status-select-mobile"
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border-0 cursor-pointer ${getStatusColor(lead.status)}`}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left column - Info */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6 overflow-hidden">
          {/* Contact info */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Informations de contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm text-slate-900 truncate">{lead.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Telephone</p>
                  <p className="text-sm text-slate-900">{lead.phone}</p>
                </div>
              </div>
              {lead.address && (
                <div className="flex items-center gap-3 min-w-0">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Adresse</p>
                    <p className="text-sm text-slate-900 truncate">{lead.address}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Cree le</p>
                  <p className="text-sm text-slate-900">{formatDateTime(lead.created_at)}</p>
                </div>
              </div>
            </div>
            {lead.message && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Message</p>
                <p className="text-sm text-slate-900 break-words">{lead.message}</p>
              </div>
            )}
          </div>

          {/* Quotes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden" data-testid="quotes-section">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Devis ({quotes.length})</h2>
            {quotes.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">Aucun devis cree</p>
            ) : (
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <div
                    key={quote.quote_id}
                    data-testid={`quote-item-${quote.quote_id}`}
                    className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{quote.service_type}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(quote.created_at)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-slate-900 text-sm">{formatCurrency(quote.amount)}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(quote.status)}`}>
                          {getStatusLabel(quote.status)}
                        </span>
                      </div>
                    </div>
                    {quote.status === 'brouillon' && (
                      <button
                        data-testid={`send-quote-lead-${quote.quote_id}`}
                        disabled={sendingQuote === quote.quote_id}
                        onClick={() => handleSendQuote(quote.quote_id)}
                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg active:bg-violet-800 hover:bg-violet-700 transition-colors font-medium text-xs touch-manipulation select-none cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingQuote === quote.quote_id ? 'Envoi...' : 'Envoyer par email'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email History */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden" data-testid="emails-section">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 mb-4">
              Emails ({emails.length})
            </h2>
            {emails.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">Aucun email echange</p>
            ) : (
              <div className="space-y-2">
                {emails.map((email) => (
                  <div key={email.email_id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      email.direction === 'sent' ? 'bg-violet-100' : 'bg-blue-100'
                    }`}>
                      {email.direction === 'sent'
                        ? <ArrowUpRight className="w-4 h-4 text-violet-600" />
                        : <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{email.subject}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {email.direction === 'sent' ? `Vers ${email.to_email}` : `De ${email.from_email}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDateTime(email.sent_at || email.received_at || email.created_at)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                      email.type === 'quote' ? 'bg-violet-100 text-violet-700'
                        : email.type === 'invoice' ? 'bg-green-100 text-green-700'
                        : email.type === 'followup' ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {email.type === 'quote' ? 'Devis' : email.type === 'invoice' ? 'Facture' : email.type === 'followup' ? 'Relance' : email.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden" data-testid="interactions-section">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Historique des interactions</h2>
            
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
                      <p className="text-sm text-slate-700 break-words">{interaction.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - Details */}
        <div className="space-y-4 md:space-y-6 overflow-hidden">
          {/* Service details */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Details du service</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Service</p>
                <p className="text-sm text-slate-900 font-medium truncate">{lead.service_type}</p>
              </div>
              {lead.surface && (
                <div>
                  <p className="text-xs text-slate-500">Surface</p>
                  <p className="text-sm text-slate-900 font-medium">{lead.surface} m2</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Probabilite</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-600 rounded-full"
                      style={{ width: `${lead.probability}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-slate-900 flex-shrink-0">{lead.probability}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Source tracking */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Tracking</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Source</p>
                <p className="text-sm text-slate-900 font-medium truncate">{lead.source || 'Direct'}</p>
              </div>
              {lead.campaign && (
                <div>
                  <p className="text-xs text-slate-500">Campagne</p>
                  <p className="text-sm text-slate-900 font-medium truncate">{lead.campaign}</p>
                </div>
              )}
              {lead.utm_source && (
                <div>
                  <p className="text-xs text-slate-500">UTM Source</p>
                  <p className="text-sm text-slate-900 font-medium truncate">{lead.utm_source}</p>
                </div>
              )}
              {lead.utm_medium && (
                <div>
                  <p className="text-xs text-slate-500">UTM Medium</p>
                  <p className="text-sm text-slate-900 font-medium truncate">{lead.utm_medium}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky footer actions */}
      <div className="fixed bottom-14 left-0 right-0 z-30 bg-white border-t border-slate-200 p-3 flex gap-2 sm:hidden" data-testid="mobile-lead-actions">
        <a
          href={`tel:${lead.phone}`}
          data-testid="mobile-call-btn"
          className="flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-slate-100 text-slate-700 rounded-xl font-medium text-sm active:bg-slate-200 transition-colors touch-manipulation"
        >
          <Phone className="w-4 h-4" />
          Appeler
        </a>
        <button
          data-testid="mobile-whatsapp-btn"
          onClick={async () => {
            try {
              const res = await axios.post(`${API_URL}/whatsapp/send`, {
                lead_id: lead.lead_id,
                message: `Bonjour ${lead.name}, merci pour votre demande. Notre equipe vous contactera rapidement. - Global Clean Home`,
              }, { withCredentials: true });
              window.open(res.data.whatsapp_link, '_blank');
            } catch { toast.error('Erreur WhatsApp'); }
          }}
          className="flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-green-600 text-white rounded-xl font-medium text-sm active:bg-green-800 transition-colors touch-manipulation"
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          data-testid="mobile-quote-btn"
          onClick={handleCreateQuote}
          className="flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-violet-600 text-white rounded-xl font-medium text-sm active:bg-violet-800 transition-colors touch-manipulation"
        >
          <FileText className="w-4 h-4" />
          Devis
        </button>
      </div>
    </div>
  );
};

export default LeadDetail;
