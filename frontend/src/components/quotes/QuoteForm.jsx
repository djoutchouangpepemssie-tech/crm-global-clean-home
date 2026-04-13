/**
 * QuoteForm — Vague 2 (fusion de l'ancien QuoteForm simple + QuoteFormPremium).
 *
 * Formulaire complet de création/édition de devis avec lignes de prestations,
 * calcul automatique HT/TVA/TTC, sélection du lead associé.
 *
 * Features :
 *   - react-hook-form + validation à la volée sur le client
 *   - Sélection d'un lead existant → auto-remplit les infos client
 *   - Lignes multi-prestations avec ajout/suppression dynamique
 *   - Calcul automatique : total HT par ligne (avec remise), TVA, TTC
 *   - Récapitulatif temps réel sur le côté
 *   - Branchement sur useCreateQuote → invalidation dashboard + leads
 *   - Mode création uniquement (édition à venir dans une vague future)
 *   - Pré-remplissage depuis location.state.lead (navigation depuis LeadDetail)
 *
 * Note : pour l'instant on utilise l'endpoint POST /api/quotes standard
 * (et non /api/quotes/premium qui est partiellement stub côté backend).
 * Le payload reste compatible : {lead_id, service_type, surface, amount, details}.
 * Les lignes détaillées sont sérialisées dans le champ `details`.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Save, Send, User, FileText, Tag, Calculator,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { useCreateQuote, useSendQuote, useLeadsList } from '../../hooks/api';
import { PageHeader } from '../shared';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

const SERVICE_TYPES = [
  'Ménage',
  'Canapé',
  'Matelas',
  'Tapis',
  'Bureaux',
  'Vitres',
  'Fin de chantier',
  'Déménagement',
  'Autre',
];

const UNITS = ['unité', 'heure', 'm²', 'forfait'];

const TVA_RATES = [
  { value: 0, label: 'Exonéré (art. 293B CGI)' },
  { value: 5.5, label: 'TVA 5,5%' },
  { value: 10, label: 'TVA 10%' },
  { value: 20, label: 'TVA 20% (standard)' },
];

function newLine(overrides = {}) {
  return {
    id: Math.random().toString(36).slice(2, 9),
    description: '',
    quantity: 1,
    unit: 'unité',
    unit_price: 0,
    discount_percent: 0,
    ...overrides,
  };
}

// Format de ligne prêt à écrire dans le champ "details" du backend
function serializeDetails(client, serviceType, lines, totals, notes, paymentTerms) {
  const lineText = lines
    .map(
      (l) =>
        `• ${l.description || '(sans description)'} — ${l.quantity} ${l.unit} × ${Number(l.unit_price).toFixed(2)}€${
          l.discount_percent > 0 ? ` (-${l.discount_percent}%)` : ''
        } = ${(l.quantity * l.unit_price * (1 - l.discount_percent / 100)).toFixed(2)}€ HT`
    )
    .join('\n');

  return [
    `CLIENT : ${client.name || ''}`,
    client.email && `Email : ${client.email}`,
    client.phone && `Téléphone : ${client.phone}`,
    client.address && `Adresse : ${client.address}`,
    '',
    `PRESTATION : ${serviceType}`,
    '',
    'DÉTAIL :',
    lineText,
    '',
    `Total HT : ${totals.ht.toFixed(2)} €`,
    totals.tva > 0 && `TVA : ${totals.tva.toFixed(2)} €`,
    `Total TTC : ${totals.ttc.toFixed(2)} €`,
    '',
    notes && `NOTES : ${notes}`,
    paymentTerms && `CONDITIONS DE PAIEMENT : ${paymentTerms}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export default function QuoteForm() {
  const navigate = useNavigate();
  const location = useLocation();

  // Lead éventuellement passé depuis LeadDetail ou LeadForm
  const seedLead = location.state?.lead || null;

  const [client, setClient] = useState({
    name: seedLead?.name || '',
    email: seedLead?.email || '',
    phone: seedLead?.phone || '',
    address: seedLead?.address || '',
    lead_id: seedLead?.lead_id || '',
  });
  const [serviceType, setServiceType] = useState(seedLead?.service_type || 'Ménage');
  const [surface, setSurface] = useState(seedLead?.surface || '');
  const [validityDays, setValidityDays] = useState(30);
  const [tvaRate, setTvaRate] = useState(0);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Paiement à réception');
  const [lines, setLines] = useState([
    newLine({
      description: seedLead ? `Prestation ${seedLead.service_type || 'Ménage'}` : '',
      unit_price: seedLead?.estimated_price || 0,
    }),
  ]);

  const createQuote = useCreateQuote();
  const sendQuote = useSendQuote();

  // Liste des leads pour le sélecteur
  const { data: allLeads = [] } = useLeadsList({ period: '90d', page: 1, page_size: 200 });

  // ── Calculs automatiques ───────────────────────────────────────
  const totals = useMemo(() => {
    const lineHTs = lines.map((l) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unit_price) || 0;
      const discount = Number(l.discount_percent) || 0;
      return qty * price * (1 - discount / 100);
    });
    const subTotalHT = lineHTs.reduce((s, v) => s + v, 0);
    const afterGlobalDiscount = subTotalHT * (1 - (Number(globalDiscountPercent) || 0) / 100);
    const tva = afterGlobalDiscount * ((Number(tvaRate) || 0) / 100);
    const ttc = afterGlobalDiscount + tva;
    return {
      subTotalHT,
      ht: afterGlobalDiscount,
      tva,
      ttc,
    };
  }, [lines, globalDiscountPercent, tvaRate]);

  // Sync depuis seedLead si l'utilisateur navigue avec state
  useEffect(() => {
    if (seedLead) {
      setClient({
        name: seedLead.name || '',
        email: seedLead.email || '',
        phone: seedLead.phone || '',
        address: seedLead.address || '',
        lead_id: seedLead.lead_id || '',
      });
    }
  }, [seedLead]);

  // ── Handlers ───────────────────────────────────────────────────
  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (id) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  const updateLine = (id, patch) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const handleSelectLead = async (leadId) => {
    try {
      const { data } = await api.get(`/leads/${leadId}`);
      setClient({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        lead_id: data.lead_id || leadId,
      });
      if (data.service_type) setServiceType(data.service_type);
      if (data.surface) setSurface(data.surface);
    } catch {
      toast.error('Impossible de charger les informations du lead');
    }
  };

  const validate = () => {
    if (!client.name.trim()) {
      toast.error('Le nom du client est requis');
      return false;
    }
    if (lines.length === 0 || lines.every((l) => !l.description.trim())) {
      toast.error('Au moins une ligne de prestation est requise');
      return false;
    }
    if (totals.ttc <= 0) {
      toast.error('Le montant total doit être supérieur à 0');
      return false;
    }
    return true;
  };

  const handleSave = async (sendAfter = false) => {
    if (!validate()) return;

    const payload = {
      lead_id: client.lead_id || undefined,
      service_type: serviceType,
      surface: surface ? Number(surface) : undefined,
      amount: Number(totals.ttc.toFixed(2)),
      details: serializeDetails(client, serviceType, lines, totals, notes, paymentTerms),
    };

    try {
      const created = await createQuote.mutateAsync(payload);
      if (sendAfter && created?.quote_id) {
        await sendQuote.mutateAsync(created.quote_id);
      }
      toast.success(sendAfter ? 'Devis créé et envoyé' : 'Devis créé');
      // Retour vers la liste (ou vers le lead si présent)
      if (client.lead_id) navigate(`/leads/${client.lead_id}`);
      else navigate('/quotes');
    } catch {
      /* erreur affichée par useCreateQuote */
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: 'Devis', to: '/quotes' },
          { label: 'Nouveau devis' },
        ]}
        title="Créer un devis"
        subtitle={seedLead ? `Pour ${seedLead.name}` : 'Création manuelle'}
        actions={[
          {
            label: 'Annuler',
            icon: ArrowLeft,
            onClick: () => navigate(-1),
          },
          {
            label: 'Brouillon',
            icon: Save,
            onClick: () => handleSave(false),
            loading: createQuote.isPending,
          },
          {
            label: 'Créer & envoyer',
            icon: Send,
            onClick: () => handleSave(true),
            loading: createQuote.isPending || sendQuote.isPending,
            variant: 'primary',
          },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Colonne gauche — formulaire */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bloc Client */}
          <div className="rounded-xl border border-slate-200 section-card/30 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-violet-600" />
              Client
            </h3>

            {/* Sélecteur de lead existant */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Lead associé (optionnel)
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {client.lead_id
                      ? allLeads.find((l) => l.lead_id === client.lead_id)?.name || client.name || 'Lead sélectionné'
                      : 'Aucun (saisie manuelle)'}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => setClient({ name: '', email: '', phone: '', address: '', lead_id: '' })}
                  >
                    Aucun (saisie manuelle)
                  </DropdownMenuItem>
                  {allLeads.map((l) => (
                    <DropdownMenuItem key={l.lead_id} onClick={() => handleSelectLead(l.lead_id)}>
                      <div className="flex flex-col items-start">
                        <span className="text-sm">{l.name}</span>
                        <span className="text-xs text-slate-500">{l.email}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Nom <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={client.name}
                  onChange={(e) => setClient({ ...client, name: e.target.value })}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <Input
                  type="email"
                  value={client.email}
                  onChange={(e) => setClient({ ...client, email: e.target.value })}
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Téléphone
                </label>
                <Input
                  type="tel"
                  value={client.phone}
                  onChange={(e) => setClient({ ...client, phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Adresse
                </label>
                <Input
                  value={client.address}
                  onChange={(e) => setClient({ ...client, address: e.target.value })}
                  placeholder="12 rue des Lilas, 75001 Paris"
                />
              </div>
            </div>
          </div>

          {/* Bloc Service */}
          <div className="rounded-xl border border-slate-200 section-card/30 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-600" />
              Prestation
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Service
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      {serviceType}
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {SERVICE_TYPES.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => setServiceType(s)}>
                        {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Surface (m²)
                </label>
                <Input
                  type="number"
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                  placeholder="80"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Validité (jours)
                </label>
                <Input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          {/* Bloc Lignes de prestations */}
          <div className="rounded-xl border border-slate-200 section-card/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-600" />
                Lignes de prestations
              </h3>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line) => {
                const lineHT = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0) * (1 - (Number(line.discount_percent) || 0) / 100);
                return (
                  <div
                    key={line.id}
                    className="grid grid-cols-12 gap-2 items-start pb-3 border-b border-slate-200 last:border-0 last:pb-0"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                        placeholder="Description"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1">
                      <Input
                        type="number"
                        step="0.5"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                        placeholder="Qté"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between font-normal h-9">
                            {line.unit}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {UNITS.map((u) => (
                            <DropdownMenuItem key={u} onClick={() => updateLine(line.id, { unit: u })}>
                              {u}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => updateLine(line.id, { unit_price: e.target.value })}
                        placeholder="Prix €"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-1">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={line.discount_percent}
                        onChange={(e) => updateLine(line.id, { discount_percent: e.target.value })}
                        placeholder="-%"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1">
                      <span className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {lineHT.toFixed(0)} €
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500"
                          aria-label="Supprimer la ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloc Notes */}
          <div className="rounded-xl border border-slate-200 section-card/30 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Notes & conditions
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Conditions de paiement
                </label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Paiement à réception"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Notes / mentions
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Remarques, mentions spéciales…"
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite — récapitulatif */}
        <div>
          <div className="rounded-xl border border-slate-200 section-card/30 p-6 sticky top-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-violet-600" />
              Récapitulatif
            </h3>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Remise globale (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={globalDiscountPercent}
                  onChange={(e) => setGlobalDiscountPercent(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Régime TVA
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between font-normal h-9">
                      {TVA_RATES.find((t) => t.value === Number(tvaRate))?.label || 'TVA'}
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {TVA_RATES.map((t) => (
                      <DropdownMenuItem key={t.value} onClick={() => setTvaRate(t.value)}>
                        {t.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Sous-total HT</span>
                <span className="font-medium">
                  {totals.subTotalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
              {Number(globalDiscountPercent) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    Remise globale ({globalDiscountPercent}%)
                  </span>
                  <span className="text-rose-600">
                    −{(totals.subTotalHT - totals.ht).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total HT</span>
                <span className="font-medium">
                  {totals.ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
              {tvaRate > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">TVA ({tvaRate}%)</span>
                  <span className="font-medium">
                    {totals.tva.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Total TTC</span>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {totals.ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
            </div>

            {tvaRate === 0 && (
              <p className="mt-3 text-[11px] text-slate-500 italic">
                TVA non applicable, art. 293 B du CGI.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
