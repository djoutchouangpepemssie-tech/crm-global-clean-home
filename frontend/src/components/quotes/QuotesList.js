import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Send } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDateTime, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const QuotesList = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/quotes`, { withCredentials: true });
      setQuotes(response.data);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async (quoteId, e) => {
    e.stopPropagation();
    try {
      await axios.post(`${API_URL}/quotes/${quoteId}/send`, {}, { withCredentials: true });
      toast.success('Devis envoyé avec succès');
      fetchQuotes();
    } catch (error) {
      console.error('Error sending quote:', error);
      toast.error('Erreur lors de l\'envoi du devis');
    }
  };

  return (
    <div className="p-8" data-testid="quotes-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Devis</h1>
          <p className="text-slate-600 mt-1">{quotes.length} devis trouvé(s)</p>
        </div>
        <button
          data-testid="create-quote-button"
          onClick={() => navigate('/quotes/new')}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          Nouveau devis
        </button>
      </div>

      {/* Quotes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="quotes-grid">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Chargement...</p>
            </div>
          </div>
        ) : quotes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-500">Aucun devis trouvé</p>
          </div>
        ) : (
          quotes.map((quote) => (
            <div
              key={quote.quote_id}
              data-testid={`quote-card-${quote.quote_id}`}
              onClick={() => navigate(`/quotes/${quote.quote_id}`)}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">{quote.service_type}</h3>
                  <p className="text-sm text-slate-600 mt-1">{formatDateTime(quote.created_at)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                  {getStatusLabel(quote.status)}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm text-slate-600">Montant</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(quote.amount)}</p>
                </div>
                {quote.surface && (
                  <div>
                    <p className="text-sm text-slate-600">Surface</p>
                    <p className="text-slate-900 font-medium">{quote.surface} m²</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600 line-clamp-2">{quote.details}</p>
              </div>

              {quote.status === 'brouillon' && (
                <button
                  data-testid={`send-quote-button-${quote.quote_id}`}
                  onClick={(e) => handleSendQuote(quote.quote_id, e)}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm"
                >
                  <Send className="w-4 h-4" />
                  Envoyer le devis
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuotesList;
