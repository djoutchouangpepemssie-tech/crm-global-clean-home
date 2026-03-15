import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, Euro, User, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const SERVICES_LABELS = {
  'menage-domicile': 'Menage a domicile',
  'nettoyage-canape': 'Nettoyage canape',
  'nettoyage-matelas': 'Nettoyage matelas',
  'nettoyage-tapis': 'Nettoyage tapis',
  'nettoyage-bureaux': 'Nettoyage bureaux',
};

// Parser le message texte pour extraire les infos structurées
const parseLeadMessage = (message) => {
  if (!message) return { services: [], price: 0, details: {}, date: '' };
  
  const lines = message.split('\n');
  const result = { services: [], price: 0, details: {}, date: '' };
  let currentService = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('Services:')) {
      result.services = trimmed.replace('Services:', '').trim().split(',').map(s => s.trim());
    } else if (trimmed.startsWith('Prix estime:')) {
      result.price = parseFloat(trimmed.replace('Prix estime:', '').replace('EUR', '').trim()) || 0;
    } else if (trimmed.startsWith('Date souhaitee:')) {
      result.date = trimmed.replace('Date souhaitee:', '').trim();
    } else if (trimmed.startsWith('-- ') && trimmed.endsWith(' --')) {
      currentService = trimmed.replace(/-- /g, '').replace(/ --/g, '').trim();
      result.details[currentService] = {};
    } else if (currentService && trimmed.startsWith('Surface:')) {
      result.details[currentService].surface = trimmed.replace('Surface:', '').replace('m2', '').trim();
    } else if (currentService && trimmed.startsWith('Frequence:')) {
      result.details[currentService].frequence = trimmed.replace('Frequence:', '').trim();
    } else if (currentService && trimmed.startsWith('Espaces:')) {
      result.details[currentService].espaces = trimmed.replace('Espaces:', '').trim();
    } else if (currentService && trimmed.startsWith('Pieces:')) {
      result.details[currentService].pieces = trimmed.replace('Pieces:', '').trim();
    } else if (currentService && trimmed.startsWith('Etat:')) {
      result.details[currentService].etat = trimmed.replace('Etat:', '').trim();
    } else if (currentService && trimmed.startsWith('Jours:')) {
      result.details[currentService].jours = trimmed.replace('Jours:', '').trim();
    } else if (currentService && trimmed.startsWith('Nombre:')) {
      result.details[currentService].nombre = trimmed.replace('Nombre:', '').trim();
    } else if (currentService && trimmed.startsWith('Canape ')) {
      if (!result.details[currentService].canapes) result.details[currentService].canapes = [];
      result.details[currentService].canapes.push(trimmed);
    } else if (currentService && trimmed.startsWith('Matelas ')) {
      if (!result.details[currentService].matelas) result.details[currentService].matelas = [];
      result.details[currentService].matelas.push(trimmed);
    } else if (currentService && trimmed.startsWith('Temps estime:')) {
      result.details[currentService].temps = trimmed.replace('Temps estime:', '').trim();
    }
  }
  return result;
};

// Générer le texte du devis depuis les données parsées
const generateDevisText = (lead, parsed) => {
  const lines = [];
  lines.push('CLIENT : ' + (lead?.name || ''));
  lines.push('Email : ' + (lead?.email || ''));
  lines.push('Telephone : ' + (lead?.phone || ''));
  if (lead?.address) lines.push('Adresse : ' + lead.address);
  if (parsed.date) lines.push('Date souhaitee : ' + parsed.date);
  lines.push('');
  lines.push('=== PRESTATIONS DEMANDEES ===');

  for (const [svcName, details] of Object.entries(parsed.details)) {
    lines.push('');
    lines.push('• ' + svcName.toUpperCase());
    if (details.surface) lines.push('  - Surface : ' + details.surface + ' m2');
    if (details.pieces) lines.push('  - Nombre de pieces : ' + details.pieces);
    if (details.etat) lines.push('  - Etat du logement : ' + details.etat);
    if (details.frequence) lines.push('  - Frequence : ' + details.frequence);
    if (details.jours) lines.push('  - Jours intervention : ' + details.jours);
    if (details.temps) lines.push('  - Temps estime : ' + details.temps);
    if (details.espaces) lines.push('  - Espaces inclus : ' + details.espaces);
    if (details.nombre) lines.push('  - Nombre : ' + details.nombre);
    if (details.canapes) details.canapes.forEach(c => lines.push('  - ' + c));
    if (details.matelas) details.matelas.forEach(m => lines.push('  - ' + m));
  }

  lines.push('');
  lines.push('=== TARIFICATION ===');
  if (parsed.price > 0) lines.push('Montant estime : ' + parsed.price + ' EUR');
  lines.push('');
  lines.push('=== CONDITIONS ===');
  lines.push('- Devis valable 30 jours');
  lines.push('- Paiement a la prestation');
  lines.push('- Intervention sous 24-48h apres confirmation');
  lines.push('- Produits et equipements fournis par notre equipe');

  return lines.join('\n');
};

const QuoteForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lead = location.state?.lead;
  const parsed = parseLeadMessage(lead?.message || '');
  
  const services = lead?.services || parsed.services || [lead?.service_type || 'menage-domicile'];
  const estimatedPrice = lead?.estimated_price || parsed.price || '';

  const [formData, setFormData] = useState({
    lead_id: lead?.lead_id || '',
    service_type: services[0] || 'Menage',
    surface: lead?.surface || '',
    amount: String(estimatedPrice),
    details: generateDevisText(lead, parsed)
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lead_id || !formData.amount || !formData.details) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/quotes`, {
        ...formData,
        surface: formData.surface ? parseFloat(formData.surface) : null,
        amount: parseFloat(formData.amount)
      }, { withCredentials: true });
      toast.success('Devis cree avec succes !');
      navigate(`/quotes/${response.data.quote_id}`);
    } catch (error) {
      toast.error('Erreur lors de la creation du devis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8" data-testid="quote-form-page">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Nouveau devis</h1>
          {lead && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">{lead.name}</span>
                <span className="text-blue-600">• {lead.email}</span>
                <span className="text-blue-600">• {lead.phone}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {services.map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    ✓ {s}
                  </span>
                ))}
              </div>
              {lead.address && <p className="text-sm text-blue-700">📍 {lead.address}</p>}
              {parsed.date && <p className="text-sm text-blue-700 mt-1">📅 Date souhaitee : {parsed.date}</p>}
              {parsed.price > 0 && <p className="text-sm text-green-700 font-semibold mt-1">💰 Prix estime : {parsed.price} EUR</p>}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6" data-testid="quote-form">
          <input type="hidden" name="lead_id" value={formData.lead_id} />
          <input type="hidden" name="service_type" value={formData.service_type} />

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Euro className="w-4 h-4 text-green-600" /> Montant (EUR) <span className="text-rose-600">*</span>
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
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-lg font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Details du devis <span className="text-rose-600">*</span>
            </label>
            <textarea
              name="details"
              data-testid="details-textarea"
              value={formData.details}
              onChange={handleChange}
              rows={20}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono text-sm"
              required
            />
          </div>

          <div className="flex gap-4 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">
              Annuler
            </button>
            <button type="submit" data-testid="create-quote-submit" disabled={loading} className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> {loading ? 'Creation...' : 'Creer le devis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteForm;
