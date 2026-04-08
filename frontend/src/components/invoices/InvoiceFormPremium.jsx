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
  Receipt, Plus, Trash2, Calculator, Save, ArrowLeft, User, CreditCard, FileText,
  CheckCircle, AlertTriangle
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../ui/dialog';

const TVA_RATES = {
  exonere: { label: 'Exonéré (0%)', rate: 0 },
  standard: { label: 'Standard (20%)', rate: 20 },
  intermediaire: { label: 'Intermédiaire (10%)', rate: 10 },
  reduit: { label: 'Réduit (5.5%)', rate: 5.5 },
};

const PAYMENT_METHODS = [
  { value: 'virement', label: '🏦 Virement bancaire' },
  { value: 'carte', label: '💳 Carte bancaire' },
  { value: 'especes', label: '💶 Espèces' },
  { value: 'cheque', label: '📝 Chèque' },
  { value: 'stripe', label: '⚡ Stripe' },
];

const STATUS_COLORS = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  partiellement_payée: 'bg-blue-100 text-blue-800',
  payée: 'bg-green-100 text-green-800',
  en_retard: 'bg-red-100 text-red-800',
  annulée: 'bg-gray-100 text-gray-800',
};

const emptyLine = () => ({
  id: Date.now() + Math.random(),
  description: '',
  quantity: 1,
  unit_price: 0,
  unit: 'unité',
  discount_percent: 0,
  tva_rate: 'exonere',
});

export default function InvoiceFormPremium() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('id');
  const fromQuoteId = searchParams.get('from_quote');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [isNew, setIsNew] = useState(!invoiceId);

  const [form, setForm] = useState({
    lead_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    service_type: 'Ménage domicile',
    lines: [emptyLine()],
    global_discount_percent: 0,
    tva_rate: 'exonere',
    notes: '',
    due_days: 30,
    payment_terms: 'Paiement à 30 jours',
  });

  const [totals, setTotals] = useState({
    total_ht: 0, total_tva: 0, total_ttc: 0, total_discount: 0,
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0, method: 'virement', reference: '', notes: '',
  });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Load invoice if editing
  useEffect(() => {
    if (!invoiceId) return;
    setIsNew(false);
    setLoading(true);
    axios.get(`${BACKEND_URL}/api/invoices/premium/${invoiceId}`)
      .then(res => {
        const inv = res.data;
        setInvoice(inv);
        setForm({
          lead_id: inv.lead_id || '',
          client_name: inv.client_name || '',
          client_email: inv.client_email || '',
          client_phone: inv.client_phone || '',
          client_address: inv.client_address || '',
          service_type: inv.service_type || '',
          lines: (inv.lines || []).map(l => ({ ...l, id: Date.now() + Math.random() })),
          global_discount_percent: inv.global_discount_percent || 0,
          tva_rate: inv.tva_rate || 'exonere',
          notes: inv.notes || '',
          due_days: 30,
          payment_terms: inv.payment_terms || '',
        });
        setTotals({
          total_ht: inv.total_ht || inv.amount_ht || 0,
          total_tva: inv.total_tva || inv.tva || 0,
          total_ttc: inv.total_ttc || inv.amount_ttc || 0,
          total_discount: inv.total_discount || 0,
        });
        // Pre-fill payment amount
        const remaining = (inv.total_ttc || inv.amount_ttc || 0) - (inv.paid_amount || 0);
        setPaymentForm(f => ({ ...f, amount: Math.max(0, remaining) }));
      })
      .catch(e => console.error('Error loading invoice:', e))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  // Convert from quote
  useEffect(() => {
    if (!fromQuoteId) return;
    setLoading(true);
    axios.post(`${BACKEND_URL}/api/quotes/premium/${fromQuoteId}/convert-to-invoice`)
      .then(res => {
        const inv = res.data;
        navigate(`/invoices/premium?id=${inv.invoice_id}`, { replace: true });
      })
      .catch(e => {
        console.error('Conversion error:', e);
        alert(e.response?.data?.detail || 'Erreur lors de la conversion');
        navigate('/quotes');
      })
      .finally(() => setLoading(false));
  }, [fromQuoteId, navigate]);

  // Recalculate
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

  useEffect(() => { if (isNew) recalculate(); }, [recalculate, isNew]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeLine = (id) => setForm(f => ({ ...f, lines: f.lines.filter(l => l.id !== id) }));
  const updateLine = (id, field, value) => {
    setForm(f => ({ ...f, lines: f.lines.map(l => l.id === id ? { ...l, [field]: value } : l) }));
  };

  // Save new invoice
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, lines: form.lines.map(({ id, ...rest }) => rest) };
      await axios.post(`${BACKEND_URL}/api/invoices/premium`, payload);
      navigate('/invoices');
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  // Record payment
  const handlePayment = async () => {
    if (!invoiceId) return;
    try {
      await axios.post(`${BACKEND_URL}/api/invoices/premium/${invoiceId}/payment`, paymentForm);
      // Reload invoice
      const res = await axios.get(`${BACKEND_URL}/api/invoices/premium/${invoiceId}`);
      setInvoice(res.data);
      const remaining = (res.data.total_ttc || res.data.amount_ttc || 0) - (res.data.paid_amount || 0);
      setPaymentForm(f => ({ ...f, amount: Math.max(0, remaining), reference: '', notes: '' }));
      setPaymentDialogOpen(false);
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur paiement');
    }
  };

  // Actions
  const handleMarkOverdue = async () => {
    await axios.post(`${BACKEND_URL}/api/invoices/premium/${invoiceId}/mark-overdue`);
    const res = await axios.get(`${BACKEND_URL}/api/invoices/premium/${invoiceId}`);
    setInvoice(res.data);
  };

  const handleCancel = async () => {
    if (!window.confirm('Annuler cette facture ?')) return;
    await axios.post(`${BACKEND_URL}/api/invoices/premium/${invoiceId}/cancel`);
    navigate('/invoices');
  };

  const handleDuplicate = async () => {
    const res = await axios.post(`${BACKEND_URL}/api/invoices/premium/${invoiceId}/duplicate`);
    navigate(`/invoices/premium?id=${res.data.invoice_id}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  // Edit/View mode for existing invoice
  if (invoice && !isNew) {
    const remaining = (invoice.total_ttc || invoice.amount_ttc || 0) - (invoice.paid_amount || 0);

    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/invoices')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6 text-green-600" />
              Facture {invoice.reference || invoice.invoice_id}
            </h1>
            <Badge className={STATUS_COLORS[invoice.status] || ''}>
              {invoice.status?.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="flex gap-2">
            {invoice.status !== 'payée' && invoice.status !== 'annulée' && (
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button><CreditCard className="h-4 w-4 mr-1" /> Enregistrer paiement</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enregistrer un paiement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Montant (reste: {remaining.toFixed(2)}€)</label>
                      <Input type="number" step="0.01" value={paymentForm.amount}
                        onChange={e => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Méthode</label>
                      <Select value={paymentForm.method} onValueChange={v => setPaymentForm(f => ({ ...f, method: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Référence</label>
                      <Input value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} placeholder="N° transaction..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                    </div>
                    <Button className="w-full" onClick={handlePayment}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Valider le paiement
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" onClick={handleDuplicate}><FileText className="h-4 w-4 mr-1" /> Dupliquer</Button>
            {invoice.status !== 'payée' && (
              <>
                <Button variant="outline" onClick={handleMarkOverdue}><AlertTriangle className="h-4 w-4 mr-1" /> En retard</Button>
                <Button variant="destructive" onClick={handleCancel}>Annuler</Button>
              </>
            )}
          </div>
        </div>

        {/* Invoice details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle><User className="h-5 w-5 inline mr-2" />Client</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold text-lg">{invoice.client_name || 'N/A'}</p>
              {invoice.client_email && <p>📧 {invoice.client_email}</p>}
              {invoice.client_phone && <p>📞 {invoice.client_phone}</p>}
              {invoice.client_address && <p>📍 {invoice.client_address}</p>}
              <p className="text-gray-500">Service : {invoice.service_type}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle><Calculator className="h-5 w-5 inline mr-2" />Montants</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between"><span>Total HT</span><span className="font-medium">{(invoice.total_ht || invoice.amount_ht || 0).toFixed(2)} €</span></div>
              {(invoice.total_discount || 0) > 0 && (
                <div className="flex justify-between text-orange-600"><span>Remises</span><span>- {invoice.total_discount.toFixed(2)} €</span></div>
              )}
              <div className="flex justify-between"><span>TVA</span><span>{(invoice.total_tva || invoice.tva || 0).toFixed(2)} €</span></div>
              <hr />
              <div className="flex justify-between text-lg font-bold"><span>Total TTC</span><span>{(invoice.total_ttc || invoice.amount_ttc || 0).toFixed(2)} €</span></div>
              <hr />
              <div className="flex justify-between text-green-600"><span>Payé</span><span>{(invoice.paid_amount || 0).toFixed(2)} €</span></div>
              <div className="flex justify-between font-semibold"><span>Reste à payer</span><span className={remaining > 0 ? 'text-red-600' : 'text-green-600'}>{remaining.toFixed(2)} €</span></div>
              <p className="text-xs text-gray-500">Échéance : {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : 'N/A'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Lines */}
        {invoice.lines && invoice.lines.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Détail des prestations</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Qté</th>
                    <th className="pb-2">Prix unit.</th>
                    <th className="pb-2">Remise</th>
                    <th className="pb-2">HT</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{line.description}</td>
                      <td>{line.quantity} {line.unit}</td>
                      <td>{(line.unit_price || 0).toFixed(2)} €</td>
                      <td>{line.discount_percent > 0 ? `${line.discount_percent}%` : '-'}</td>
                      <td className="font-medium">{(line.amount_ht || 0).toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Payments history */}
        {invoice.payments && invoice.payments.length > 0 && (
          <Card>
            <CardHeader><CardTitle><CreditCard className="h-5 w-5 inline mr-2" />Historique des paiements</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invoice.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <span className="font-medium">{p.amount?.toFixed(2)} €</span>
                      <span className="text-gray-500 ml-2">via {p.method}</span>
                      {p.reference && <span className="text-gray-400 ml-2">Réf: {p.reference}</span>}
                    </div>
                    <span className="text-xs text-gray-500">
                      {p.recorded_at ? new Date(p.recorded_at).toLocaleDateString('fr-FR') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // New invoice form
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-green-600" /> Nouvelle facture
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Sauvegarde...' : 'Créer la facture'}
        </Button>
      </div>

      {/* Client */}
      <Card>
        <CardHeader><CardTitle><User className="h-5 w-5 inline mr-2" />Client</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nom *</label>
            <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Téléphone</label>
            <Input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Adresse</label>
            <Input value={form.client_address} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lignes de facturation</span>
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-1" /> Ligne</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {form.lines.map(line => {
              const lineHT = (line.quantity || 0) * (line.unit_price || 0) * (1 - (line.discount_percent || 0) / 100);
              return (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="col-span-12 md:col-span-5">
                    <Input placeholder="Description" value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <Input type="number" step="0.5" value={line.quantity} onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <Input type="number" step="0.01" value={line.unit_price} onChange={e => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <Input type="number" value={line.discount_percent} onChange={e => updateLine(line.id, 'discount_percent', parseFloat(e.target.value) || 0)} placeholder="%" />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <Select value={line.tva_rate} onValueChange={v => updateLine(line.id, 'tva_rate', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TVA_RATES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-12 md:col-span-1 flex items-center justify-between">
                    <span className="text-sm font-semibold">{lineHT.toFixed(2)}€</span>
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

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="max-w-sm ml-auto space-y-2">
            <div className="flex justify-between"><span>Total HT</span><span>{totals.total_ht.toFixed(2)} €</span></div>
            {totals.total_discount > 0 && (
              <div className="flex justify-between text-orange-600"><span>Remises</span><span>-{totals.total_discount.toFixed(2)} €</span></div>
            )}
            <div className="flex justify-between"><span>TVA</span><span>{totals.total_tva.toFixed(2)} €</span></div>
            <hr />
            <div className="flex justify-between text-xl font-bold"><span>Total TTC</span><span className="text-green-600">{totals.total_ttc.toFixed(2)} €</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
