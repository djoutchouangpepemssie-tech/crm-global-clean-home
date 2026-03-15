import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, Euro, User, FileText, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const SERVICES_LABELS = {
  'menage-domicile': 'Ménage à domicile',
  'menage': 'Ménage à domicile',
  'nettoyage-canape': 'Nettoyage canapé',
  'canape': 'Nettoyage canapé',
  'nettoyage-matelas': 'Nettoyage matelas',
  'matelas': 'Nettoyage matelas',
  'nettoyage-tapis': 'Nettoyage tapis',
  'tapis': 'Nettoyage tapis',
  'nettoyage-bureaux': 'Nettoyage bureaux',
  'bureaux': 'Nettoyage bureaux',
};

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
    } else if (currentService) {
      if (trimmed.startsWith('Surface:')) result.details[currentService].surface = trimmed.replace('Surface:', '').replace('m2', '').trim();
      else if (trimmed.startsWith('Pieces:')) result.details[currentService].pieces = trimmed.replace('Pieces:', '').trim();
      else if (trimmed.startsWith('Etat:')) result.details[currentService].etat = trimmed.replace('Etat:', '').trim();
      else if (trimmed.startsWith('Frequence:')) result.details[currentService].frequence = trimmed.replace('Frequence:', '').trim();
      else if (trimmed.startsWith('Jours:')) result.details[currentService].jours = trimmed.replace('Jours:', '').trim();
      else if (trimmed.startsWith('Espaces:')) result.details[currentService].espaces = trimmed.replace('Espaces:', '').trim();
      else if (trimmed.startsWith('Nombre:')) result.details[currentService].nombre = trimmed.replace('Nombre:', '').trim();
      else if (trimmed.startsWith('Temps estime:')) result.details[currentService].temps = trimmed.replace('Temps estime:', '').trim();
    }
  }
  return result;
};

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
    if (details.pieces) lines.push('  - Pieces : ' + details.pieces);
    if (details.etat) lines.push('  - Etat : ' + details.etat);
    if (details.frequence) lines.push('  - Frequence : ' + details.frequence);
    if (details.jours) lines.push('  - Jours : ' + details.jours);
    if (details.espaces) lines.push('  - Espaces : ' + details.espaces);
    if (details.nombre) lines.push('  - Nombre : ' + details.nombre);
    if (details.temps) lines.push('  - Temps estime : ' + details.temps);
  }
  lines.push('');
  lines.push('=== CONDITIONS ===');
  lines.push('- Devis valable 30 jours');
  lines.push('- Paiement a la prestation');
  lines.push('- Intervention sous 24-48h apres confirmation');
  lines.push('- Produits et equipements fournis par notre equipe');
  return lines.join('\n');
};

const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm";

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
    details: generateDevisText(lead, parsed),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lead_id || !formData.amount || !formData.details) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/quotes`, {
        ...formData,
        surface: formData.surface ? parseFloat(formData.surface) : null,
        amount: parseFloat(formData.amount),
      }, { withCredentials: true });
      toast.success('Devis créé avec succès !');
      navigate(`/leads/${formData.lead_id}`);
    } catch {
      toast.error('Erreur lors de la création du devis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="quote-form-page">
      <div className="max-w-3xl mx-auto">
        
        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 mb-6 transition-all group text-sm">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>
              Nouveau devis
            </h1>
          </div>
          <p className="text-slate-500 text-sm">Créez un devis personnalisé pour votre client</p>
        </div>

        {/* Lead info card */}
        {lead && (
          <div className="mb-6 p-5 rounded-2xl" style={{background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.2)'}}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                {(lead.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-100">{lead.name}</p>
                <p className="text-xs text-slate-500">{lead.email} · {lead.phone}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {services.map((s, i) => (
                <span key={i} className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-full text-xs font-medium">
                  ✓ {SERVICES_LABELS[s] || s}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
              {lead.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {lead.address}
                </span>
              )}
              {parsed.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {parsed.date}
                </span>
              )}
              {estimatedPrice > 0 && (
                <span className="text-green-400 font-semibold">
                  💰 Prix estimé : {estimatedPrice} EUR
                </span>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" data-testid="quote-form">
          <input type="hidden" name="lead_id" value={formData.lead_id} />
          <input type="hidden" name="service_type" value={formData.service_type} />

          {/* Montant */}
          <div className="section-card p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-3">
              <Euro className="w-4 h-4 text-green-400" />
              Montant (EUR) <span className="text-rose-500">*</span>
            </label>
            <input type="number" name="amount" data-testid="amount-input"
              value={formData.amount}
              onChange={(e) => setFormData(p => ({...p, amount: e.target.value}))}
              placeholder="500.00" step="0.01" min="0"
              className={inputClass + " text-2xl font-bold text-violet-400"}
              required />
            <p className="text-xs text-slate-600 mt-2">Micro-entreprise — TVA non applicable (art. 293B du CGI)</p>
          </div>

          {/* Détails */}
          <div className="section-card p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-3">
              <FileText className="w-4 h-4 text-violet-400" />
              Détails du devis <span className="text-rose-500">*</span>
            </label>
            <textarea name="details" data-testid="details-textarea"
              value={formData.details}
              onChange={(e) => setFormData(p => ({...p, details: e.target.value}))}
              rows={20}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 text-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none font-mono text-xs leading-relaxed"
              required />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl font-medium text-sm transition-all">
              Annuler
            </button>
            <button type="submit" data-testid="create-quote-submit" disabled={loading}
              className="flex-1 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{boxShadow:'0 0 20px rgba(139,92,246,0.3)'}}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><CheckCircle className="w-4 h-4" /> Créer le devis</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteForm;
