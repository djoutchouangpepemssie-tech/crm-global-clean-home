import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Users, Mail, Phone, MapPin, MessageSquare, Tag } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const inputClass = "w-full px-4 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm";
const labelClass = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider";

const LeadForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    service_type: 'Ménage', surface: '',
    address: '', message: '', source: 'Direct'
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
      await axios.post(`${API_URL}/leads`,
        { ...formData, surface: formData.surface ? parseFloat(formData.surface) : null, manual: true },
        { withCredentials: true }
      );
      toast.success('Lead créé avec succès ✓');
      navigate('/leads');
    } catch {
      toast.error('Erreur lors de la création du lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="lead-form-page">
      <div className="max-w-3xl mx-auto">

        <button data-testid="back-button" onClick={() => navigate('/leads')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 mb-6 transition-all group text-sm">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour aux leads
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>
              Nouveau lead
            </h1>
          </div>
          <p className="text-slate-500 text-sm">Ajoutez un nouveau prospect manuellement</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="lead-form">

          {/* Infos contact */}
          <div className="section-card p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" /> Informations de contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nom complet <span className="text-rose-500">*</span></label>
                <input type="text" name="name" data-testid="name-input"
                  value={formData.name} onChange={handleChange}
                  placeholder="Jean Dupont" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="email" name="email" data-testid="email-input"
                    value={formData.email} onChange={handleChange}
                    placeholder="jean@example.com" required
                    className={inputClass + " pl-9"} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Téléphone <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="tel" name="phone" data-testid="phone-input"
                    value={formData.phone} onChange={handleChange}
                    placeholder="+33 6 12 34 56 78" required
                    className={inputClass + " pl-9"} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Adresse</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" name="address" data-testid="address-input"
                    value={formData.address} onChange={handleChange}
                    placeholder="15 Avenue, 75008 Paris"
                    className={inputClass + " pl-9"} />
                </div>
              </div>
            </div>
          </div>

          {/* Service */}
          <div className="section-card p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-400" /> Service & Source
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Service <span className="text-rose-500">*</span></label>
                <select name="service_type" data-testid="service-type-select"
                  value={formData.service_type} onChange={handleChange}
                  className={inputClass}>
                  <option value="Ménage" className="bg-slate-800">Ménage à domicile</option>
                  <option value="Canapé" className="bg-slate-800">Nettoyage canapé</option>
                  <option value="Matelas" className="bg-slate-800">Nettoyage matelas</option>
                  <option value="Tapis" className="bg-slate-800">Nettoyage tapis</option>
                  <option value="Bureaux" className="bg-slate-800">Nettoyage bureaux</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Surface (m²)</label>
                <input type="number" name="surface" data-testid="surface-input"
                  value={formData.surface} onChange={handleChange}
                  placeholder="50" step="0.1" min="0" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Source</label>
                <select name="source" data-testid="source-select"
                  value={formData.source} onChange={handleChange}
                  className={inputClass}>
                  <option value="Direct" className="bg-slate-800">Direct</option>
                  <option value="Google Ads" className="bg-slate-800">Google Ads</option>
                  <option value="SEO" className="bg-slate-800">SEO</option>
                  <option value="Meta Ads" className="bg-slate-800">Meta Ads</option>
                  <option value="Referral" className="bg-slate-800">Referral</option>
                  <option value="Recommandation" className="bg-slate-800">Recommandation</option>
                </select>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="section-card p-5">
            <label className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-400" /> Message / Notes
            </label>
            <textarea name="message" data-testid="message-textarea"
              value={formData.message} onChange={handleChange}
              placeholder="Détails de la demande, notes importantes..."
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none text-sm" />
          </div>

          {/* Info */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
            <p className="text-xs text-blue-400">ℹ️ Aucun email automatique ne sera envoyé au client. L'email sera envoyé uniquement quand vous enverrez un devis.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/leads')}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl font-medium text-sm transition-all">
              Annuler
            </button>
            <button type="submit" data-testid="create-lead-submit" disabled={loading}
              className="flex-1 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              style={{boxShadow:'0 0 20px rgba(139,92,246,0.3)'}}>
              {loading ? 'Création...' : '+ Créer le lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadForm;
