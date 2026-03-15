import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, Euro, User, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const SERVICES_LABELS = {
  'menage-domicile': 'Ménage à domicile',
  'nettoyage-canape': 'Nettoyage canapé',
  'nettoyage-matelas': 'Nettoyage matelas',
  'nettoyage-tapis': 'Nettoyage tapis',
  'nettoyage-bureaux': 'Nettoyage bureaux',
  'Ménage': 'Ménage à domicile',
  'Canapé': 'Nettoyage canapé',
  'Matelas': 'Nettoyage matelas',
  'Tapis': 'Nettoyage tapis',
  'Bureaux': 'Nettoyage bureaux',
};

const QuoteForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lead = location.state?.lead;

  // Extraire les services depuis le lead
  const leadServices = lead?.services || [lead?.service_type || 'menage-domicile'];
  const leadDetails = lead?.service_details || {};
  const leadMessage = lead?.message || '';

  // Générer automatiquement les détails du devis depuis les données du lead
  const generateDetails = () => {
    const parts = [];
    
    if (lead?.name) parts.push(`Client : ${lead.name}`);
    if (lead?.address) parts.push(`Adresse : ${lead.address}`);
    if (lead?.date_preference) parts.push(`Date souhaitée : ${lead.date_preference}`);
    parts.push('');
    parts.push('=== PRESTATIONS DEMANDÉES ===');

    leadServices.forEach(svcId => {
      const label = SERVICES_LABELS[svcId] || svcId;
      const details = leadDetails[svcId] || {};
      parts.push(`\n• ${label.toUpperCase()}`);

      if (svcId === 'menage-domicile') {
        if (details.surface) parts.push(`  - Surface : ${details.surface} m²`);
        if (details.nombrePieces) parts.push(`  - Pièces : ${details.nombrePieces}`);
        if (details.etatLogement) {
          const etats = { 'entretien-normal': 'Entretien normal', 'tres-sale': 'Très sale', 'apres-demenagement': 'Après déménagement', 'en-profondeur': 'Grand ménage' };
          parts.push(`  - État : ${etats[details.etatLogement] || details.etatLogement}`);
        }
        if (details.frequence) {
          const freqs = { 'ponctuel': 'Ponctuel', 'regulier-hebdo': 'Hebdomadaire', 'regulier-2semaines': 'Toutes les 2 semaines', 'regulier-mensuel': 'Mensuel' };
          parts.push(`  - Fréquence : ${freqs[details.frequence] || details.frequence}`);
        }
        const jours = details.joursIntervention || details.joursSelectionnes || [];
        if (jours.length > 0) parts.push(`  - Jours : ${jours.join(', ')}`);
        if (details.heuresEstimees) parts.push(`  - Temps estimé : ${details.heuresEstimees.min}–${details.heuresEstimees.max}h`);
      } else if (svcId === 'nettoyage-bureaux') {
        if (details.surfaceBureau) parts.push(`  - Surface : ${details.surfaceBureau} m²`);
        if (details.frequenceBureau) {
          const freqs = { 'ponctuel': 'Ponctuel', 'quotidien': 'Quotidien (lun-ven)', 'hebdo': '1x/semaine', '2-3-fois': '2-3x/semaine' };
          parts.push(`  - Fréquence : ${freqs[details.frequenceBureau] || details.frequenceBureau}`);
        }
        if (details.espacesInclus?.length > 0) parts.push(`  - Espaces : ${details.espacesInclus.join(', ')}`);
      } else if (svcId === 'nettoyage-canape') {
        const sofas = details.sofas || [];
        parts.push(`  - Nombre : ${sofas.length || details.quantity || 1} canapé(s)`);
        sofas.forEach((s, i) => {
          const prix = s.places === 1 ? 50 : s.places === 2 ? 70 : 90;
          parts.push(`  - Canapé ${i+1} : ${s.places} places → ${prix}€`);
        });
      } else if (svcId === 'nettoyage-matelas') {
        const mattresses = details.mattresses || [];
        parts.push(`  - Nombre : ${mattresses.length || details.quantity || 1} matelas`);
        const sizes = { 1: '1 place (40€)', 2: '2 places (70€)', 3: 'King size (90€)', 4: 'Super King (120€)' };
        mattresses.forEach((m, i) => parts.push(`  - Matelas ${i+1} : ${sizes[m.places] || m.places + ' places'}`));
      } else if (svcId === 'nettoyage-tapis') {
        if (details.quantity) parts.push(`  - Nombre : ${details.quantity} tapis`);
        if (details.surface) parts.push(`  - Surface totale : ${details.surface} m²`);
      }
    });

    parts.push('');
    parts.push('=== CONDITIONS ===');
    parts.push('- Devis valable 30 jours');
    parts.push('- Paiement à la prestation');
    parts.push('- Intervention sous 24-48h après confirmation');

    return parts.join('\n');
  };

  // Calculer le montant automatiquement
  const calculateAmount = () => {
    let total = 0;
    leadServices.forEach(svcId => {
      const details = leadDetails[svcId] || {};
      if (svcId === 'menage-domicile') {
        const surface = details.surface || lead?.surface || 0;
        const heures = details.heuresEstimees?.min || Math.ceil(surface / 20) || 2;
        const freqMult = details.frequence === 'regulier-hebdo' ? 4 : details.frequence === 'regulier-2semaines' ? 2 : 1;
        const joursMult = (details.joursIntervention || []).length || 1;
        total += heures * 25 * freqMult * joursMult;
      } else if (svcId === 'nettoyage-bureaux') {
        const surface = details.surfaceBureau || 0;
        const isRegulier = ['hebdo', '2-3-fois', 'quotidien'].includes(details.frequenceBureau);
        const tarif = surface < 50 ? (isRegulier ? 2.80 : 3.50) : surface < 150 ? (isRegulier ? 2.40 : 3.00) : (isRegulier ? 2.00 : 2.50);
        const freqMult = details.frequenceBureau === 'quotidien' ? 20 : details.frequenceBureau === 'hebdo' ? 4 : details.frequenceBureau === '2-3-fois' ? 10 : 1;
        total += surface * tarif * freqMult;
      } else if (svcId === 'nettoyage-canape') {
        (details.sofas || []).forEach(s => { total += s.places === 1 ? 50 : s.places === 2 ? 70 : 90; });
        if (!details.sofas?.length) total += (details.quantity || 1) * 70;
      } else if (svcId === 'nettoyage-matelas') {
        (details.mattresses || []).forEach(m => { total += m.places === 1 ? 40 : m.places === 2 ? 70 : m.places === 3 ? 90 : 120; });
        if (!details.mattresses?.length) total += (details.quantity || 1) * 70;
      } else if (svcId === 'nettoyage-tapis') {
        total += (details.surface || 6) * 15;
      }
    });
    return total > 0 ? total.toFixed(2) : (lead?.estimated_price || '');
  };

  const [formData, setFormData] = useState({
    lead_id: lead?.lead_id || '',
    service_type: SERVICES_LABELS[leadServices[0]] || leadServices[0] || 'Ménage',
    surface: lead?.surface || leadDetails[leadServices[0]]?.surface || '',
    amount: '',
    details: generateDetails()
  });

  useEffect(() => {
    const amount = calculateAmount();
    setFormData(prev => ({ ...prev, amount: String(amount) }));
  }, []);

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
      toast.success('Devis créé avec succès !');
      navigate(`/quotes/${response.data.quote_id}`);
    } catch (error) {
      toast.error('Erreur lors de la création du devis');
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
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">{lead.name}</span>
                <span className="text-blue-600">• {lead.email}</span>
                <span className="text-blue-600">• {lead.phone}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {leadServices.map(s => (
                  <span key={s} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {SERVICES_LABELS[s] || s}
                  </span>
                ))}
              </div>
              {lead.address && <p className="text-sm text-blue-700 mt-2">📍 {lead.address}</p>}
              {lead.date_preference && <p className="text-sm text-blue-700">📅 Date souhaitée : {lead.date_preference}</p>}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6" data-testid="quote-form">
          
          {/* Lead ID caché */}
          <input type="hidden" name="lead_id" value={formData.lead_id} />

          {/* Services */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-violet-600" /> Services demandés
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
              {leadServices.map(s => (
                <span key={s} className="px-3 py-1.5 bg-violet-100 text-violet-800 rounded-full text-sm font-medium">
                  ✓ {SERVICES_LABELS[s] || s}
                </span>
              ))}
            </div>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Euro className="w-4 h-4 text-green-600" /> Montant (€) <span className="text-rose-600">*</span>
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
            {lead?.estimated_price && (
              <p className="text-sm text-green-600 mt-1">💡 Prix estimé par le client : {lead.estimated_price}€</p>
            )}
          </div>

          {/* Détails */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Détails du devis <span className="text-rose-600">*</span>
            </label>
            <textarea
              name="details"
              data-testid="details-textarea"
              value={formData.details}
              onChange={handleChange}
              rows={16}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono text-sm"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">
              Annuler
            </button>
            <button type="submit" data-testid="create-quote-submit" className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> Créer le devis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteForm;
