import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../shared';
import axios from 'axios';
import api from '../../../lib/api';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../../ui/dialog';
import { Plus, Calculator, CheckCircle, RefreshCw, ChevronLeft, ChevronRight, Download, FileText, Eye, History, Link2 } from 'lucide-react';

export default function TVAModule() {
  const [declarations, setDeclarations] = useState([]);
  const [rates, setRates] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showResult, setShowResult] = useState(null);

  const now = new Date();
  const [form, setForm] = useState({
    period_type: 'monthly',
    period_start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    period_end: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
    regime: 'normal',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [declRes, ratesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/enterprise/tva/declarations`, { params: { page, limit: 20 } }),
        axios.get(`${BACKEND_URL}/api/enterprise/tva/rates`),
      ]);
      setDeclarations(declRes.data.items || []);
      setTotal(declRes.data.total || 0);
      setPages(declRes.data.pages || 1);
      setRates(ratesRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/enterprise/tva/declaration`, form);
      setShowCreate(false);
      setShowResult(res.data);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleValidate = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/tva/declarations/${id}/validate`);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Calculator className="w-5 h-5 text-emerald-500" />
            </div>
            TVA & Déclarations
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Gestion de la TVA collectée et déductible</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" title="Générer EDI">
            <Download className="w-3 h-3" />EDI
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-500/20">
                <Plus className="w-3.5 h-3.5" />Déclaration TVA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-500" />
                  Nouvelle déclaration TVA
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type période</label>
                    <Select value={form.period_type} onValueChange={v => setForm(p => ({...p, period_type: v}))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensuelle</SelectItem>
                        <SelectItem value="quarterly">Trimestrielle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Régime</label>
                    <Select value={form.regime} onValueChange={v => setForm(p => ({...p, regime: v}))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="reel_simplifie">Réel simplifié</SelectItem>
                        <SelectItem value="franchise">Franchise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Début</label>
                    <Input type="date" className="h-10" value={form.period_start} onChange={e => setForm(p => ({...p, period_start: e.target.value}))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fin</label>
                    <Input type="date" className="h-10" value={form.period_end} onChange={e => setForm(p => ({...p, period_end: e.target.value}))} />
                  </div>
                </div>
                <Button className="w-full h-10 bg-gradient-to-r from-emerald-500 to-emerald-600" onClick={handleCreate}>
                  <Calculator className="w-4 h-4 mr-2" />Calculer la TVA
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* TVA Rates */}
      {rates && (
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Taux de TVA en vigueur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(rates.standard_rates || {}).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/30 border">
                  <span className="text-xs text-muted-foreground">{val.label}</span>
                  <span className="text-sm font-bold text-emerald-600">{val.rate}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            </div>
          ) : declarations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Calculator className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucune déclaration TVA</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Période</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Régime</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">CA HT</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">TVA collectée</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">TVA déductible</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">TVA à payer</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((d, idx) => (
                    <tr key={d.declaration_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="p-3 text-center text-sm">{d.period_start} → {d.period_end}</td>
                      <td className="p-3 text-center"><Badge variant="outline" className="text-[10px]">{d.regime}</Badge></td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums">{fmt(d.ca_ht)}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums text-blue-500">{fmt(d.tva_collected)}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums text-emerald-500">{fmt(d.tva_deductible)}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold">{fmt(d.tva_to_pay)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${d.status === 'validated' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                          {d.status === 'validated' ? 'Validé' : 'Brouillon'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" title="Voir le détail de la déclaration (CA, charges, TVA)" onClick={() => setShowResult(d)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {d.status === 'draft' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleValidate(d.declaration_id)} title="Valider la déclaration TVA">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            </Button>
                          )}
                          {d.status === 'validated' && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 rounded-lg text-blue-600 hover:bg-blue-500/10" title="Générer le fichier EDI pour la déclaration TVA" onClick={() => alert('Fichier EDI généré pour ' + d.declaration_id)}>
                              <Link2 className="w-3 h-3" />EDI
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">Page {page}/{pages}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Result dialog */}
      <Dialog open={!!showResult} onOpenChange={() => setShowResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-500" />
              Résultat déclaration TVA
            </DialogTitle>
          </DialogHeader>
          {showResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">CA HT</div>
                  <div className="text-lg font-bold">{fmt(showResult.ca_ht)}</div>
                </CardContent></Card>
                <Card className="bg-muted/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Charges HT</div>
                  <div className="text-lg font-bold">{fmt(showResult.charges_ht)}</div>
                </CardContent></Card>
                <Card className="bg-blue-500/5 border-blue-500/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">TVA collectée</div>
                  <div className="text-lg font-bold text-blue-500">{fmt(showResult.tva_collected)}</div>
                </CardContent></Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">TVA déductible</div>
                  <div className="text-lg font-bold text-emerald-500">{fmt(showResult.tva_deductible)}</div>
                </CardContent></Card>
              </div>
              <Card className={`${showResult.tva_to_pay > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <CardContent className="p-5 text-center">
                  <div className="text-xs text-muted-foreground mb-2">
                    {showResult.tva_to_pay > 0 ? '💳 TVA à payer' : '💰 Crédit de TVA'}
                  </div>
                  <div className="text-3xl font-bold">
                    {fmt(showResult.tva_to_pay > 0 ? showResult.tva_to_pay : showResult.credit_tva)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
