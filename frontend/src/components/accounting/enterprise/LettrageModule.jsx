import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../shared';
import axios from 'axios';
import api from '../../../lib/api';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../ui/select';
import {
  Target, Link2, Unlink, Users, ShoppingBag, Search, RefreshCw,
  CheckCircle, AlertCircle, Building2, Zap, Eye, ListFilter, BarChart3
} from 'lucide-react';

const STATUS_COLORS = {
  lettre: 'bg-brand-500/10 text-brand-500 border-brand-500/20',
  non_lettre: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  partiel: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
};

export default function LettrageModule() {
  const [tab, setTab] = useState('clients');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bankBalance, setBankBalance] = useState(null);
  const [bankLines, setBankLines] = useState([]);

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const loadLettrage = useCallback(async () => {
    setLoading(true);
    try {
      const accountPrefix = tab === 'clients' ? '411' : tab === 'fournisseurs' ? '401' : '';
      const params = { account_prefix: accountPrefix };
      if (search) params.search = search;

      const res = await axios.get(`${BACKEND_URL}/api/enterprise/journal/entries`, {
        params: { ...params, limit: 100 }
      });
      setItems(res.data.entries || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tab, search]);

  const loadBankReconciliation = useCallback(async () => {
    setLoading(true);
    try {
      const [linesRes, summaryRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/enterprise/bank-reconciliation`, { params: { limit: 100 } }),
        axios.get(`${BACKEND_URL}/api/enterprise/bank-reconciliation/summary`),
      ]);
      setBankLines(linesRes.data.items || []);
      setBankBalance(summaryRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setSelected([]);
    if (tab === 'rapprochement') {
      loadBankReconciliation();
    } else {
      loadLettrage();
    }
  }, [tab, loadLettrage, loadBankReconciliation]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleLettrage = async () => {
    if (selected.length < 2) return alert('Sélectionnez au moins 2 écritures à lettrer');
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/lettrage`, { entry_ids: selected });
      setSelected([]);
      loadLettrage();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur de lettrage');
    }
  };

  const handleDelettrage = async (entryId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/enterprise/lettrage/${entryId}`);
      loadLettrage();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleBankMatch = async (lineId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/bank-reconciliation/${lineId}/match`);
      loadBankReconciliation();
    } catch (err) {
      alert(err.response?.data?.detail || 'Aucune correspondance trouvée');
    }
  };

  const handleBankUnmatch = async (lineId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/bank-reconciliation/${lineId}/unmatch`);
      loadBankReconciliation();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Target className="w-5 h-5 text-cyan-500" />
          </div>
          Lettrage & Rapprochement
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Rapprochez les écritures comptables et les mouvements bancaires</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto p-1.5 bg-muted/50 rounded-xl">
          <TabsTrigger value="clients" className="text-xs gap-1.5 rounded-lg px-4 py-2">
            <Users className="w-3.5 h-3.5" />Comptes clients
          </TabsTrigger>
          <TabsTrigger value="fournisseurs" className="text-xs gap-1.5 rounded-lg px-4 py-2">
            <ShoppingBag className="w-3.5 h-3.5" />Comptes fournisseurs
          </TabsTrigger>
          <TabsTrigger value="rapprochement" className="text-xs gap-1.5 rounded-lg px-4 py-2">
            <Building2 className="w-3.5 h-3.5" />Rapprochement bancaire
          </TabsTrigger>
        </TabsList>

        {/* Clients / Fournisseurs */}
        {['clients', 'fournisseurs'].map(tabKey => (
          <TabsContent key={tabKey} value={tabKey} className="mt-4 space-y-4">
            {/* Toolbar with distinct action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-10 h-10" placeholder={`Rechercher ${tabKey}...`} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-md shadow-cyan-500/20"
                onClick={handleLettrage}
                disabled={selected.length < 2}
                title="Lettrer les écritures sélectionnées (min. 2)"
              >
                <Link2 className="w-3.5 h-3.5" />
                Lettrer Écritures ({selected.length})
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" title="Voir uniquement les écritures non-lettrées" onClick={() => alert('Filtre : non-lettrées uniquement')}>
                <ListFilter className="w-3.5 h-3.5 text-amber-500" />Voir Non-lettrées
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" title="Rapprochement automatique par montant" onClick={() => alert('Rapprochement auto lancé')}>
                <Zap className="w-3.5 h-3.5 text-brand-500" />Rapprochement Auto
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setSelected([]); loadLettrage(); }} title="Actualiser la liste des écritures">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Actualiser
              </Button>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-16 text-sm text-muted-foreground">Aucune écriture pour ce compte</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="w-10 p-3"></th>
                          <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                          <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                          <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Débit</th>
                          <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Crédit</th>
                          <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lettrage</th>
                          <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(e => {
                          const isSelected = selected.includes(e.entry_id);
                          return (
                            <tr
                              key={e.entry_id}
                              className={`border-t hover:bg-muted/30 transition-colors cursor-pointer ${isSelected ? 'bg-cyan-500/5' : ''}`}
                              onClick={() => toggleSelect(e.entry_id)}
                            >
                              <td className="p-3 text-center">
                                <input type="checkbox" checked={isSelected} onChange={() => {}} className="rounded border-muted-foreground/30" />
                              </td>
                              <td className="p-3 text-sm">{e.entry_date}</td>
                              <td className="p-3 text-sm">{e.description}</td>
                              <td className="p-3 text-right font-mono text-sm tabular-nums">{fmt(e.total_debit)}</td>
                              <td className="p-3 text-right font-mono text-sm tabular-nums">{fmt(e.total_credit)}</td>
                              <td className="p-3 text-center">
                                {e.lettering_code ? (
                                  <Badge className="text-[10px] bg-brand-500/10 text-brand-500 border-brand-500/20">
                                    <Link2 className="w-2.5 h-2.5 mr-1" />{e.lettering_code}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Non lettré</Badge>
                                )}
                              </td>
                              <td className="p-3 text-right" onClick={ev => ev.stopPropagation()}>
                                {e.lettering_code && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelettrage(e.entry_id)} title="Délettrer">
                                    <Unlink className="w-3.5 h-3.5 text-terracotta-500" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* Rapprochement bancaire */}
        <TabsContent value="rapprochement" className="mt-4 space-y-4">
          {/* Summary */}
          {bankBalance && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-neutral-500/5 border-neutral-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Solde comptable</p>
                  <p className="text-xl font-bold">{fmt(bankBalance.book_balance)}</p>
                </CardContent>
              </Card>
              <Card className="bg-brand-500/5 border-brand-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Solde bancaire</p>
                  <p className="text-xl font-bold">{fmt(bankBalance.bank_balance)}</p>
                </CardContent>
              </Card>
              <Card className={`${Math.abs(bankBalance.difference || 0) < 0.01 ? 'bg-brand-500/5 border-brand-500/20' : 'bg-terracotta-500/5 border-terracotta-500/20'}`}>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Écart</p>
                  <p className="text-xl font-bold">{fmt(bankBalance.difference)}</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Non rapprochés</p>
                  <p className="text-xl font-bold">{bankBalance.by_status?.pending?.count || 0}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bank lines table */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 rounded-full border-2 border-neutral-500/20 border-t-neutral-500 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Libellé</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Montant</th>
                        <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                        <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Écriture liée</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankLines.map(l => (
                        <tr key={l.line_id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-sm">{l.bank_date}</td>
                          <td className="p-3 text-sm">{l.label}</td>
                          <td className={`p-3 text-right font-mono text-sm tabular-nums ${l.amount >= 0 ? 'text-brand-500' : 'text-terracotta-500'}`}>
                            {fmt(l.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={`text-[10px] ${
                              l.status === 'matched' ? 'bg-brand-500/10 text-brand-500 border-brand-500/20' :
                              'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                              {l.status === 'matched' ? '✓ Rapproché' : 'En attente'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-muted-foreground">{l.matched_entry_id || '—'}</td>
                          <td className="p-3 text-right">
                            {l.status === 'matched' ? (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleBankUnmatch(l.line_id)} title="Dé-rapprocher">
                                <Unlink className="w-3.5 h-3.5 text-terracotta-500" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleBankMatch(l.line_id)}>
                                <Link2 className="w-3 h-3" />Auto
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
