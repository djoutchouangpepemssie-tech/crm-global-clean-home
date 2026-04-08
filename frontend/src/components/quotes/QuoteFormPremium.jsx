import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import BACKEND_URL from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import { Badge } from '../ui/badge';
import {
  FileText, Plus, Trash2, Calculator, Save, Send, Copy, ArrowLeft, User, Package
} from 'lucide-react';

const TVA_RATES = {
  exonere: { label: 'Exonéré (0%)', rate: 0 },
  standard: { label: 'Standard (20%)', rate: 20 },
  intermediaire: { label: 'Intermédiaire (10%)', rate: 10 },
  reduit: { label: 'Réduit (5.5%)', rate: 5.5 },
  super_reduit: { label: 'Super réduit (2.1%)', rate: 2.1 },
};

const SERVICE_TYPES = [
  'Ménage domicile', 'Nettoyage bureaux', 'Nettoyage canapé',
  'Nettoyage matelas', 'Nettoyage tapis', 'Nettoyage vitres',
  'Grand nettoyage', 'Déménagement nettoyage', 'Autre',
];

const emptyLine = () => ({
  id: Date.now() + Math.random(),
  description: '',
  quantity: 1,
  unit_price: 0,
  unit: 'unité',
  discount_percent: 0,
  tva_rate: 'exonere',
  stock_item_id: null,
});

export default function QuoteFormPremium() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [form, setForm] = useState({
    lead_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    service_type: 'Ménage domicile',
    surface: '',
    lines: [emptyLine()],
    global_discount_percent: 0,
    tva_rate: 'exonere',
    notes: '',
    validity_days: 30,
    payment_terms: 'Paiement à réception',
  });

  const [totals, setTotals] = useState({
    total_ht: 0, total_tva: 0, total_ttc: 0, total_discount: 0,
  });

  // Load leads and stock for autocomplete
  useEffect(() => {
    const loadData = async () => {
      try {
        const [leadsRes, stockRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/leads?page_size=200`),
          axios.get(`${BACKEND_URL}/api/stock?page_size=200`).catch(() => ({ data: { items: [] } })),
        ]);
        setLeads(leadsRes.data.items || []);
        setStockItems(stockRes.data.items || []);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, []);

  // Load existing quote for edit
  useEffect(() => {
    if (!editId) return;
    const loadQuote = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${BACKEND_URL}/api/quotes/premium/${editId}`);
        const q = res.data;
        setForm({
          lead_id: q.lead_id || '',
          client_name: q.client_name || '',
          client_email: q.client_email || '',
          client_phone: q.client_phone || '',
          client_address: q.client_address || '',
          service_type: q.service_type || 'Ménage domicile',
          surface: q.surface || '',
          lines: (q.lines || []).map(l => ({ ...l, id: Date.now() + Math.random() })),
          global_discount_percent: q.global_discount_percent || 0,
          tva_rate: q.tva_rate || 'exonere',
          notes: q.notes || '',
          validity_days: q.validity_days || 30,
          payment_terms: q.payment_terms || '',
        });
      } catch (e) {
        console.error('Error loading quote:', e);
      } finally {
        setLoading(false);
      }
    };
    loadQuote();
  }, [editId]);

  // Recalculate totals when lines change
  const recalculate = useCallback(() => {
    let ht = 0, tva = 0, ttc = 0, discount = 0;
    form.lines.forEach(line => {
      const subtotal = (line.quantity || 0) * (line.unit_price || 0);
      const lineDiscount = subtotal * (line.discount_percent || 0) / 100;
      const lineHT = subtotal - lineDiscount;
      const tvaRate = TVA_RATES[line.tva_rate]?.rate || 0;
      const lineTVA = lineHT * tvaRate / 100;
      ht += lineHT;
      tva += lineTVA;
      ttc += lineHT + lineTVA;
      discount += lineDiscount;
    });

    // Global discount
    if (form.global_discount_percent > 0) {
      const gd = ht * form.global_discount_percent / 100;
      ht -= gd;
      discount += gd;
      const globalTvaRate = TVA_RATES[form.tva_rate]?.rate || 0;
      tva = ht * globalTvaRate / 100;
      ttc = ht + tva;
    }

    setTotals({
      total_ht: Math.round(ht * 100) / 100,
      total_tva: Math.round(tva * 100) / 100,
      total_ttc: Math.round(ttc * 100) / 100,
      total_discount: Math.round(discount * 100) / 100,
    });
  }, [form.lines, form.global_discount_percent, form.tva_rate]);

  useEffect(() => { recalculate(); }, [recalculate]);

  // Lead selection auto-fills client info
  const handleLeadSelect = (leadId) => {
    setForm(f => ({ ...f, lead_id: leadId }));
    const lead = leads.find(l => l.lead_id === leadId);
    if (lead) {
      setForm(f => ({
        ...f,
        client_name: lead.name || f.client_name,
        client_email: lead.email || f.client_email,
        client_phone: lead.phone || f.client_phone,
        client_address: lead.address || f.client_address,
      }));
    }
  };

  // Line management
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeLine = (id) => setForm(f => ({
    ...f, lines: f.lines.filter(l => l.id !== id),
  }));
  const updateLine = (id, field, value) => {
    setForm(f => ({
      ...f,
      lines: f.lines.map(l => l.id === id ? { ...l, [field]: value } : l),
    }));
  };

  // Add stock item as line
  const addStockLine = (item) => {
    const newLine = {
      ...emptyLine(),
      description: item.name,
      unit_price: item.unit_price || 0,
      unit: item.unit || 'unité',
      stock_item_id: item.item_id,
    };
    setForm(f => ({ ...f, lines: [...f.lines, newLine] }));
  };

  // Save
  const handleSave = async (andSend = false) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        surface: form.surface ? parseFloat(form.surface) : null,
        lines: form.lines.map(({ id, ...rest }) => rest),
      };

      let result;
      if (editId) {
        result = await axios.patch(`${BACKEND_URL}/api/quotes/premium/${editId}`, payload);
      } else {
        result = await axios.post(`${BACKEND_URL}/api/quotes/premium`, payload);
      }

      if (andSend && result.data.quote_id) {
        await axios.post(`${BACKEND_URL}/api/quotes/${result.data.quote_id}/send`);
      }

      navigate('/quotes');
    } catch (e) {
      console.error('Save error:', e);
      alert(e.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/quotes')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            {editId ? 'Modifier le devis' : 'Nouveau devis premium'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Sauvegarde...' : 'Enregistrer brouillon'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <Send className="h-4 w-4 mr-1" /> Enregistrer & Envoyer
          </Button>
        </div>
      </div>

      {/* Client Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Informations client
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Lead associé</label>
            <Select value={form.lead_id} onValueChange={handleLeadSelect}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un lead..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun (saisie manuelle)</SelectItem>
                {leads.map(l => (
                  <SelectItem key={l.lead_id} value={l.lead_id}>
                    {l.name} - {l.email || l.phone || ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Nom du client *</label>
            <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Nom complet" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Téléphone</label>
            <Input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">Adresse</label>
            <Input value={form.client_address} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Service Info */}
      <Card>
        <CardHeader>
          <CardTitle>Service & Détails</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Type de service</label>
            <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Surface (m²)</label>
            <Input type="number" value={form.surface} onChange={e => setForm(f => ({ ...f, surface: e.target.value }))} placeholder="ex: 80" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Validité (jours)</label>
            <Input type="number" value={form.validity_days} onChange={e => setForm(f => ({ ...f, validity_days: parseInt(e.target.value) || 30 }))} />
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lignes du devis</span>
            <div className="flex gap-2">
              {stockItems.length > 0 && (
                <Select onValueChange={(itemId) => {
                  const item = stockItems.find(i => i.item_id === itemId);
                  if (item) addStockLine(item);
                }}>
                  <SelectTrigger className="w-48">
                    <Package className="h-4 w-4 mr-1" />
                    <SelectValue placeholder="Ajouter du stock" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockItems.map(item => (
                      <SelectItem key={item.item_id} value={item.item_id}>
                        {item.name} ({item.unit_price}€)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Ligne
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-4">Description</div>
              <div className="col-span-1">Qté</div>
              <div className="col-span-1">Unité</div>
              <div className="col-span-2">Prix unit.</div>
              <div className="col-span-1">Remise %</div>
              <div className="col-span-2">TVA</div>
              <div className="col-span-1"></div>
            </div>

            {form.lines.map((line, idx) => {
              const lineSubtotal = (line.quantity || 0) * (line.unit_price || 0);
              const lineDiscount = lineSubtotal * (line.discount_percent || 0) / 100;
              const lineHT = lineSubtotal - lineDiscount;

              return (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="col-span-12 md:col-span-4">
                    <Input
                      placeholder="Description de la prestation"
                      value={line.description}
                      onChange={e => updateLine(line.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <Input
                      type="number" step="0.5" min="0"
                      value={line.quantity}
                      onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <Select value={line.unit} onValueChange={v => updateLine(line.id, 'unit', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unité">unité</SelectItem>
                        <SelectItem value="heure">heure</SelectItem>
                        <SelectItem value="m²">m²</SelectItem>
                        <SelectItem value="forfait">forfait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <Input
                      type="number" step="0.01" min="0"
                      value={line.unit_price}
                      onChange={e => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <Input
                      type="number" min="0" max="100"
                      value={line.discount_percent}
                      onChange={e => updateLine(line.id, 'discount_percent', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Select value={line.tva_rate} onValueChange={v => updateLine(line.id, 'tva_rate', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TVA_RATES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 md:col-span-1 flex items-center gap-1">
                    <span className="text-sm font-semibold whitespace-nowrap">{lineHT.toFixed(2)}€</span>
                    {form.lines.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeLine(line.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Totals + Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Options</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Remise globale (%)</label>
              <Input
                type="number" min="0" max="100" step="0.5"
                value={form.global_discount_percent}
                onChange={e => setForm(f => ({ ...f, global_discount_percent: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Régime TVA par défaut</label>
              <Select value={form.tva_rate} onValueChange={v => setForm(f => ({ ...f, tva_rate: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TVA_RATES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Conditions de paiement</label>
              <Input
                value={form.payment_terms}
                onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}
                placeholder="Paiement à réception"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes / Observations</label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes internes ou mention légale..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Récapitulatif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Sous-total HT</span>
                <span className="font-medium">{(totals.total_ht + totals.total_discount).toFixed(2)} €</span>
              </div>
              {totals.total_discount > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Remises</span>
                  <span>- {totals.total_discount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Total HT</span>
                <span className="font-semibold">{totals.total_ht.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA</span>
                <span>{totals.total_tva.toFixed(2)} €</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total TTC</span>
                <span className="text-blue-600">{totals.total_ttc.toFixed(2)} €</span>
              </div>

              {form.tva_rate === 'exonere' && (
                <p className="text-xs text-gray-500 italic mt-2">
                  TVA non applicable, art. 293 B du CGI
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
