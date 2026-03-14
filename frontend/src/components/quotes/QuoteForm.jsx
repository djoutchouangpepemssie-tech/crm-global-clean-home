import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const QuoteForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const leadFromState = location.state?.lead;

  const [formData, setFormData] = useState({
    lead_id: leadFromState?.lead_id || '',
    service_type: leadFromState?.service_type || 'Ménage',
    surface: leadFromState?.surface || '',
    amount: '',
    details: ''
  });
  const [loading, setLoading] = useState(false);

  // Auto-calculate amount based on service and surface
  const calculateAmount = (service, surface) => {
    if (!surface) return '';
    
    const rates = {
      'Ménage': 25,
      'Canapé': 40,
      'Matelas': 35,
      'Tapis': 30,
      'Bureaux': 20
    };
    
    const rate = rates[service] || 25;
    return (surface * rate).toFixed(2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate amount when surface or service changes
      if (name === 'surface' || name === 'service_type') {
        const newSurface = name === 'surface' ? value : prev.surface;
        const newService = name === 'service_type' ? value : prev.service_type;
        updated.amount = calculateAmount(newService, newSurface);
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.lead_id || !formData.amount || !formData.details) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/quotes`,
        {
          ...formData,
          surface: formData.surface ? parseFloat(formData.surface) : null,
          amount: parseFloat(formData.amount)
        },
        { withCredentials: true }
      );
      
      toast.success('Devis créé avec succès');
      navigate(`/quotes/${response.data.quote_id}`);
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Erreur lors de la création du devis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8" data-testid="quote-form-page">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <button
          data-testid="back-button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Nouveau devis
          </h1>
          <p className="text-slate-600 mt-1">Créez un devis pour un lead</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 shadow-sm space-y-6">
          {/* Lead ID */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Lead ID <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              name="lead_id"
              data-testid="lead-id-input"
              value={formData.lead_id}
              onChange={handleChange}
              placeholder="lead_abc123"
              disabled={!!leadFromState}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-50 disabled:text-slate-500"
              required
            />
            <p className="text-sm text-slate-500 mt-1">Identifiant du lead concerné</p>
          </div>

          {/* Service type */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Type de service <span className="text-rose-600">*</span>
            </label>
            <select
              name="service_type"
              data-testid="service-type-select"
              value={formData.service_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="Ménage">Ménage</option>
              <option value="Canapé">Canapé</option>
              <option value="Matelas">Matelas</option>
              <option value="Tapis">Tapis</option>
              <option value="Bureaux">Bureaux</option>
            </select>
          </div>

          {/* Surface */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Surface (m²)
            </label>
            <input
              type="number"
              name="surface"
              data-testid="surface-input"
              value={formData.surface}
              onChange={handleChange}
              placeholder="50"
              step="0.1"
              min="0"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-sm text-slate-500 mt-1">La surface permet le calcul automatique du montant</p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Montant (€) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              name="amount"
              data-testid="amount-input"
              value={formData.amount}
              onChange={handleChange}
              placeholder="500.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Détails du devis <span className="text-rose-600">*</span>
            </label>
            <textarea
              name="details"
              data-testid="details-textarea"
              value={formData.details}
              onChange={handleChange}
              placeholder="Décrivez les prestations incluses dans ce devis..."
              rows={6}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 min-h-[48px] border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              data-testid="create-quote-submit"
              disabled={loading}
              className="flex-1 px-6 min-h-[48px] bg-violet-600 text-white rounded-lg hover:bg-violet-700 active:bg-violet-800 transition-colors font-medium disabled:opacity-50 touch-manipulation"
            >
              {loading ? 'Création...' : 'Créer le devis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteForm;
