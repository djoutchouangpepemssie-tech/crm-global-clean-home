import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
import { Plus, Calculator, CheckCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="w-5 h-5 text-violet-500" />
          TVA & Fiscalité
        </h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-3 h-3" />Déclaration TVA</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle déclaration TVA</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Type période</label>
                  <Select value={form.period_type} onValueChange={v => setForm(p => ({...p, period_type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensuelle</SelectItem>
                      <SelectItem value="quarterly">Trimestrielle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Régime</label>
                  <Select value={form.regime} onValueChange={v => setForm(p => ({...p, regime: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="reel_simplifie">Réel simplifié</SelectItem>
                      <SelectItem value="franchise">Franchise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Début période</label>
                  <Input type="date" value={form.period_start} onChange={e => setForm(p => ({...p, period_start: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Fin période</label>
                  <Input type="date" value={form.period_end} onChange={e => setForm(p => ({...p, period_end: e.target.value}))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate}>Calculer la TVA</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TVA Rates */}
      {rates && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Taux de TVA en vigueur</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(rates.standard_rates || {}).map(([key, val]) => (
                <Badge key={key} variant="outline" className="px-3 py-1">
                  {val.label}: <span className="font-bold ml-1">{val.rate}%</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Declarations Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : declarations.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Aucune déclaration TVA</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">N°</th>
                    <th className="text-center p-3">Période</th>
                    <th className="text-center p-3">Régime</th>
                    <th className="text-right p-3">CA HT</th>
                    <th className="text-right p-3">TVA collectée</th>
                    <th className="text-right p-3">TVA déductible</th>
                    <th className="text-right p-3">TVA à payer</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map(d => (
                    <tr key={d.declaration_id} className="border-t hover:bg-muted/20">
                      <td className="p-3 font-mono text-[10px]">{d.declaration_id}</td>
                      <td className="p-3 text-center">{d.period_start} → {d.period_end}</td>
                      <td className="p-3 text-center"><Badge variant="outline" className="text-[10px]">{d.regime}</Badge></td>
                      <td className="p-3 text-right font-mono">{fmt(d.ca_ht)}</td>
                      <td className="p-3 text-right font-mono">{fmt(d.tva_collected)}</td>
                      <td className="p-3 text-right font-mono">{fmt(d.tva_deductible)}</td>
                      <td className="p-3 text-right font-mono font-medium">{fmt(d.tva_to_pay)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${d.status === 'validated' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {d.status === 'validated' ? 'Validé' : 'Brouillon'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {d.status === 'draft' && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleValidate(d.declaration_id)}>
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
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

      {/* Result dialog */}
      <Dialog open={!!showResult} onOpenChange={() => setShowResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Résultat déclaration TVA</DialogTitle></DialogHeader>
          {showResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-muted/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">CA HT</div>
                  <div className="font-bold">{fmt(showResult.ca_ht)}</div>
                </CardContent></Card>
                <Card className="bg-muted/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Charges HT</div>
                  <div className="font-bold">{fmt(showResult.charges_ht)}</div>
                </CardContent></Card>
                <Card className="bg-blue-500/5 border-blue-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">TVA collectée</div>
                  <div className="font-bold">{fmt(showResult.tva_collected)}</div>
                </CardContent></Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">TVA déductible</div>
                  <div className="font-bold">{fmt(showResult.tva_deductible)}</div>
                </CardContent></Card>
              </div>
              <Card className={`${showResult.tva_to_pay > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    {showResult.tva_to_pay > 0 ? 'TVA à payer' : 'Crédit de TVA'}
                  </div>
                  <div className="text-2xl font-bold">
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
