import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, PieChart,
  Plus, BarChart3, FileText, Wallet, ArrowUpRight, ArrowDownRight,
  Calendar, Filter
} from 'lucide-react';

const PERIODS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '3 mois' },
  { value: '365d', label: '1 an' },
];

const ENTRY_TYPES = [
  { value: 'revenue', label: '📈 Revenu', color: 'text-green-600' },
  { value: 'expense', label: '📉 Dépense', color: 'text-red-600' },
  { value: 'payment_in', label: '💰 Encaissement', color: 'text-blue-600' },
  { value: 'payment_out', label: '💸 Décaissement', color: 'text-orange-600' },
];

const CATEGORIES = [
  'services', 'produits', 'fournitures', 'transport', 'loyer',
  'publicité', 'assurance', 'salaires', 'paiements', 'autre',
];

export default function AccountingDashboard() {
  const [period, setPeriod] = useState('30d');
  const [dashboard, setDashboard] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [quotesStats, setQuotesStats] = useState(null);
  const [invoicesStats, setInvoicesStats] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const [newEntry, setNewEntry] = useState({
    entry_type: 'revenue', amount: 0, description: '',
    category: 'services', payment_method: '', notes: '',
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, quotesRes, invoicesRes, plRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/accounting/dashboard`, { params: { period } }),
        axios.get(`${BACKEND_URL}/api/quotes/premium/stats`, { params: { period } }).catch(() => ({ data: null })),
        axios.get(`${BACKEND_URL}/api/invoices/premium/stats`, { params: { period } }).catch(() => ({ data: null })),
        axios.get(`${BACKEND_URL}/api/accounting/profit-loss`).catch(() => ({ data: null })),
      ]);
      setDashboard(dashRes.data);
      setQuotesStats(quotesRes.data);
      setInvoicesStats(invoicesRes.data);
      setProfitLoss(plRes.data);
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadEntries = useCallback(async () => {
    try {
      const params = { page, page_size: 20 };
      if (filterType) params.entry_type = filterType;
      const res = await axios.get(`${BACKEND_URL}/api/accounting/entries`, { params });
      setEntries(res.data.items || []);
      setEntriesTotal(res.data.total || 0);
    } catch (e) {
      console.error('Error loading entries:', e);
    }
  }, [page, filterType]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleAddEntry = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/accounting/entries`, newEntry);
      setAddOpen(false);
      setNewEntry({ entry_type: 'revenue', amount: 0, description: '', category: 'services', payment_method: '', notes: '' });
      loadDashboard();
      loadEntries();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Supprimer cette écriture ?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/accounting/entries/${entryId}`);
      loadDashboard();
      loadEntries();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

  if (loading && !dashboard) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  const kpis = dashboard?.kpis || {};

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-emerald-600" /> Comptabilité
        </h1>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36"><Calendar className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Écriture</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle écriture comptable</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={newEntry.entry_type} onValueChange={v => setNewEntry(f => ({ ...f, entry_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" step="0.01" placeholder="Montant *" value={newEntry.amount || ''} onChange={e => setNewEntry(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                <Input placeholder="Description *" value={newEntry.description} onChange={e => setNewEntry(f => ({ ...f, description: e.target.value }))} />
                <Select value={newEntry.category} onValueChange={v => setNewEntry(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Méthode de paiement" value={newEntry.payment_method} onChange={e => setNewEntry(f => ({ ...f, payment_method: e.target.value }))} />
                <Textarea placeholder="Notes" value={newEntry.notes} onChange={e => setNewEntry(f => ({ ...f, notes: e.target.value }))} rows={2} />
                <Button className="w-full" onClick={handleAddEntry} disabled={!newEntry.description || newEntry.amount <= 0}>
                  Enregistrer l'écriture
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs text-gray-500">Chiffre d'affaires</span>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(kpis.chiffre_affaires)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-xs text-gray-500">Dépenses</span>
            </div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(kpis.depenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-gray-500">Bénéfice net</span>
            </div>
            <p className={`text-xl font-bold ${kpis.benefice_net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(kpis.benefice_net)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-gray-500">Trésorerie</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(kpis.tresorerie)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-gray-500">Encaissements</span>
            </div>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(kpis.paiements_recus)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-gray-500">Marge brute</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{kpis.marge_brute || 0}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="entries">Écritures</TabsTrigger>
          <TabsTrigger value="profitloss">Résultat</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Invoices summary */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Factures</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {invoicesStats ? (
                  <>
                    <div className="flex justify-between"><span>Total factures</span><span className="font-bold">{invoicesStats.total_invoices}</span></div>
                    <div className="flex justify-between"><span>Facturé</span><span className="font-bold">{formatCurrency(invoicesStats.total_invoiced)}</span></div>
                    <div className="flex justify-between text-green-600"><span>Encaissé</span><span className="font-bold">{formatCurrency(invoicesStats.total_paid)}</span></div>
                    <div className="flex justify-between text-red-600"><span>Impayé</span><span className="font-bold">{formatCurrency(invoicesStats.outstanding)}</span></div>
                    <div className="flex justify-between"><span>Taux de paiement</span><Badge>{invoicesStats.payment_rate}%</Badge></div>
                    {invoicesStats.by_status && Object.entries(invoicesStats.by_status).map(([status, data]) => (
                      <div key={status} className="flex justify-between text-sm text-gray-500">
                        <span>{status.replace(/_/g, ' ')}</span>
                        <span>{data.count} ({formatCurrency(data.total)})</span>
                      </div>
                    ))}
                  </>
                ) : <p className="text-gray-500">Aucune donnée</p>}
              </CardContent>
            </Card>

            {/* Quotes summary */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Devis</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {quotesStats ? (
                  <>
                    <div className="flex justify-between"><span>Total devis</span><span className="font-bold">{quotesStats.total_quotes}</span></div>
                    <div className="flex justify-between"><span>Montant total</span><span className="font-bold">{formatCurrency(quotesStats.total_amount)}</span></div>
                    <div className="flex justify-between"><span>Taux de conversion</span><Badge className="bg-blue-100 text-blue-800">{quotesStats.conversion_rate}%</Badge></div>
                    {quotesStats.by_status && Object.entries(quotesStats.by_status).map(([status, data]) => (
                      <div key={status} className="flex justify-between text-sm text-gray-500">
                        <span>{status}</span>
                        <span>{data.count} ({formatCurrency(data.total)})</span>
                      </div>
                    ))}
                  </>
                ) : <p className="text-gray-500">Aucune donnée</p>}
              </CardContent>
            </Card>

            {/* Revenue by category */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> CA par catégorie</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {dashboard?.by_category?.length > 0 ? dashboard.by_category.map((cat, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="capitalize">{cat.category}</span>
                    <span className="font-medium">{formatCurrency(cat.total)}</span>
                  </div>
                )) : <p className="text-gray-500 text-sm">Aucune donnée</p>}
              </CardContent>
            </Card>

            {/* Monthly revenue */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> CA mensuel</CardTitle></CardHeader>
              <CardContent>
                {dashboard?.monthly_revenue?.length > 0 ? (
                  <div className="space-y-2">
                    {dashboard.monthly_revenue.map((m, i) => {
                      const maxVal = Math.max(...dashboard.monthly_revenue.map(x => x.total));
                      const pct = maxVal > 0 ? (m.total / maxVal * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-sm w-20 text-gray-500">{m.month}</span>
                          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6">
                            <div className="bg-emerald-500 rounded-full h-6 flex items-center px-2" style={{ width: `${Math.max(pct, 5)}%` }}>
                              <span className="text-xs text-white font-medium">{formatCurrency(m.total)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-gray-500 text-sm">Aucune donnée</p>}
              </CardContent>
            </Card>

            {/* Payment methods */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Méthodes de paiement</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {dashboard?.by_payment_method?.length > 0 ? dashboard.by_payment_method.map((m, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="capitalize">{m.method}</span>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(m.total)}</span>
                      <span className="text-xs text-gray-500 ml-1">({m.count}x)</span>
                    </div>
                  </div>
                )) : <p className="text-gray-500 text-sm">Aucune donnée</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Entries Tab */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Écritures comptables ({entriesTotal})</span>
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={v => { setFilterType(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger className="w-44"><Filter className="h-4 w-4 mr-1" /><SelectValue placeholder="Filtrer par type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Aucune écriture</p>
              ) : (
                <div className="space-y-2">
                  {entries.map(entry => {
                    const typeInfo = ENTRY_TYPES.find(t => t.value === entry.entry_type) || ENTRY_TYPES[0];
                    const isIncome = entry.entry_type === 'revenue' || entry.entry_type === 'payment_in';
                    return (
                      <div key={entry.entry_id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-center gap-3">
                          {isIncome ? (
                            <ArrowUpRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{entry.description}</p>
                            <div className="flex gap-2 items-center mt-0.5">
                              <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                              {entry.payment_method && <span className="text-xs text-gray-400">{entry.payment_method}</span>}
                              <span className="text-xs text-gray-400">
                                {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('fr-FR') : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(entry.amount)}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry.entry_id)}>
                            ✕
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {entriesTotal > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                  <span className="text-sm text-gray-500 self-center">Page {page}</span>
                  <Button variant="outline" size="sm" disabled={entries.length < 20} onClick={() => setPage(p => p + 1)}>Suivant</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit/Loss Tab */}
        <TabsContent value="profitloss">
          <Card>
            <CardHeader>
              <CardTitle>Compte de résultat {profitLoss?.year}</CardTitle>
            </CardHeader>
            <CardContent>
              {profitLoss?.months?.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2">Mois</th>
                          <th className="pb-2 text-right">Revenus</th>
                          <th className="pb-2 text-right">Dépenses</th>
                          <th className="pb-2 text-right">Résultat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitLoss.months.map((m, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-2 font-medium">{m.month}</td>
                            <td className="text-right text-green-600">{formatCurrency(m.revenue)}</td>
                            <td className="text-right text-red-600">{formatCurrency(m.expenses)}</td>
                            <td className={`text-right font-bold ${m.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(m.profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold text-lg border-t-2">
                          <td className="pt-3">TOTAL</td>
                          <td className="pt-3 text-right text-green-600">{formatCurrency(profitLoss.totals?.revenue)}</td>
                          <td className="pt-3 text-right text-red-600">{formatCurrency(profitLoss.totals?.expenses)}</td>
                          <td className={`pt-3 text-right ${profitLoss.totals?.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(profitLoss.totals?.profit)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              ) : <p className="text-gray-500 text-center py-8">Aucune donnée pour cette année</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
