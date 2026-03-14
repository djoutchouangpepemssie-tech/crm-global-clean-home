import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const LeadForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service_type: 'Ménage',
    surface: '',
    address: '',
    message: '',
    source: 'Direct'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/leads`,
        {
          ...formData,
          surface: formData.surface ? parseFloat(formData.surface) : null
        },
        { withCredentials: true }
      );
      toast.success('Lead créé avec succès');
      navigate('/leads');
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error('Erreur lors de la création du lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8" data-testid="lead-form-page">
      <div className="max-w-3xl mx-auto">
        <button
          data-testid="back-button"
          onClick={() => navigate('/leads')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux leads
        </button>

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Nouveau lead
          </h1>
          <p className="text-slate-600 mt-1">Ajoutez un nouveau prospect</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Nom complet <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                data-testid="name-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="Jean Dupont"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Email <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                data-testid="email-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="jean@example.com"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Téléphone <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                data-testid="phone-input"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
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
              >
                <option value="Ménage">Ménage</option>
                <option value="Canapé">Canapé</option>
                <option value="Matelas">Matelas</option>
                <option value="Tapis">Tapis</option>
                <option value="Bureaux">Bureaux</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Surface (m²)</label>
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
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Source</label>
              <select
                name="source"
                data-testid="source-select"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="Direct">Direct</option>
                <option value="Google Ads">Google Ads</option>
                <option value="SEO">SEO</option>
                <option value="Meta Ads">Meta Ads</option>
                <option value="Referral">Referral</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Adresse</label>
            <input
              type="text"
              name="address"
              data-testid="address-input"
              value={formData.address}
              onChange={handleChange}
              placeholder="15 Avenue des Champs-Élysées, 75008 Paris"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Message</label>
            <textarea
              name="message"
              data-testid="message-textarea"
              value={formData.message}
              onChange={handleChange}
              placeholder="Détails de la demande du client..."
              rows={4}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="flex-1 px-6 min-h-[48px] border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              data-testid="create-lead-submit"
              disabled={loading}
              className="flex-1 px-6 min-h-[48px] bg-violet-600 text-white rounded-lg hover:bg-violet-700 active:bg-violet-800 transition-colors font-medium disabled:opacity-50 touch-manipulation"
            >
              {loading ? 'Création...' : 'Créer le lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadForm;
