import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Package, RefreshCw, AlertTriangle, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react';

const STATUS_COLORS = {
  ok: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  overstock: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export default function StockAdvanced() {
  const [tab, setTab] = useState('valuation');
  const [valuation, setValuation] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [method, setMethod] = useState('weighted_average');
  const [loading, setLoading] = useState(false);

  const loadValuation = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.post(`${BACKEND_URL}/api/enterprise/stock-advanced/valuation`, { method }); setValuation(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [method]);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get(`${BACKEND_URL}/api/enterprise/stock-advanced/forecast`); setForecast(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const loadReconciliation = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get(`${BACKEND_URL}/api/enterprise/stock-advanced/inventory-reconciliation`); setReconciliation(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'valuation') loadValuation();
    else if (tab === 'forecast') loadForecast();
    else if (tab === 'reconciliation') loadReconciliation();
  }, [tab, loadValuation, loadForecast, loadReconciliation]);

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const Loader = () => (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
        <div className="p-2 rounded-xl bg-amber-500/10">
          <Package className="w-5 h-5 text-amber-500" />
        </div>
        Stock Avancé
      </h3>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto p-1.5 bg-muted/50 rounded-xl">
          <TabsTrigger value="valuation" className="text-xs gap-1.5 rounded-lg px-4 py-2"><BarChart3 className="w-3.5 h-3.5" />Valorisation</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs gap-1.5 rounded-lg px-4 py-2"><TrendingUp className="w-3.5 h-3.5" />Prévisions</TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs gap-1.5 rounded-lg px-4 py-2"><Package className="w-3.5 h-3.5" />Réconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="valuation" className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-52 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weighted_average">Coût moyen pondéré</SelectItem>
                <SelectItem value="fifo">FIFO (PEPS)</SelectItem>
                <SelectItem value="lifo">LIFO (DEPS)</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={loadValuation} className="gap-1.5 h-10">
              <RefreshCw className="w-3.5 h-3.5" />Recalculer
            </Button>
          </div>

          {loading ? <Loader /> : valuation ? (
            <>
              <Card className="bg-violet-500/5 border-violet-500/20">
                <CardContent className="p-5 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Valeur totale ({valuation.method})</div>
                  <div className="text-3xl font-bold text-violet-500">{fmt(valuation.grand_total)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{valuation.item_count} article(s)</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Article</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quantité</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Coût unitaire</th>
                        <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(valuation.items || []).map((item, idx) => (
                        <tr key={item.item_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                          <td className="p-3 pl-5 text-sm font-medium">{item.name || item.item_id}</td>
                          <td className="p-3 text-right font-mono text-sm tabular-nums">{item.quantity}</td>
                          <td className="p-3 text-right font-mono text-sm tabular-nums">{fmt(item.unit_cost)}</td>
                          <td className="p-3 pr-5 text-right font-mono text-sm tabular-nums font-semibold">{fmt(item.total_valuation)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-semibold">
                      <tr>
                        <td colSpan={3} className="p-3 text-right text-xs text-muted-foreground uppercase">Total</td>
                        <td className="p-3 pr-5 text-right font-mono tabular-nums">{fmt(valuation.grand_total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="forecast" className="mt-6 space-y-4">
          {loading ? <Loader /> : forecast ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-red-500/5 border-red-500/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Critique</div>
                  <div className="text-2xl font-bold text-red-500">{forecast.critical}</div>
                </CardContent></Card>
                <Card className="bg-amber-500/5 border-amber-500/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Attention</div>
                  <div className="text-2xl font-bold text-amber-500">{forecast.warning}</div>
                </CardContent></Card>
                <Card className="bg-blue-500/5 border-blue-500/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Surstock</div>
                  <div className="text-2xl font-bold text-blue-500">{forecast.overstock}</div>
                </CardContent></Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total</div>
                  <div className="text-2xl font-bold">{(forecast.forecasts || []).length}</div>
                </CardContent></Card>
              </div>

              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Article</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conso/jour</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Jours rest.</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Optimal</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">À commander</th>
                        <th className="text-center p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(forecast.forecasts || []).map((f, idx) => (
                        <tr key={f.item_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                          <td className="p-3 pl-5 text-sm font-medium">{f.name || f.item_id}</td>
                          <td className="p-3 text-right font-mono text-sm tabular-nums">{f.current_qty}</td>
                          <td className="p-3 text-right font-mono text-sm tabular-nums">{f.avg_daily_consumption}</td>
                          <td className="p-3 text-right font-mono text-sm tabular-nums">{f.days_remaining >= 999 ? '∞' : f.days_remaining}</td>
                          <td className="p-3 text-right font-mono text-sm tabular-nums">{f.optimal_stock}</td>
                          <td className="p-3 text-right font-mono text-sm tabular-nums">{f.reorder_qty > 0 ? f.reorder_qty : '—'}</td>
                          <td className="p-3 pr-5 text-center">
                            <Badge className={`text-[10px] ${STATUS_COLORS[f.status] || ''}`}>{f.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-6 space-y-4">
          {loading ? <Loader /> : reconciliation ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-muted/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total articles</div>
                  <div className="text-xl font-bold">{reconciliation.total_items}</div>
                </CardContent></Card>
                <Card className={`${reconciliation.discrepancies > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Écarts</div>
                    <div className={`text-xl font-bold ${reconciliation.discrepancies > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{reconciliation.discrepancies}</div>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Conformes</div>
                  <div className="text-xl font-bold text-emerald-500">{reconciliation.total_items - reconciliation.discrepancies}</div>
                </CardContent></Card>
              </div>

              {reconciliation.discrepancy_items?.length > 0 && (
                <Card className="border-red-500/30 overflow-hidden">
                  <CardHeader className="pb-2 bg-red-500/5">
                    <CardTitle className="text-sm font-semibold text-red-500 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />Articles avec écarts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-red-500/5">
                        <tr>
                          <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Article</th>
                          <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stock BD</th>
                          <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Théorique</th>
                          <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Écart</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconciliation.discrepancy_items.map((item, idx) => (
                          <tr key={item.item_id} className="border-t hover:bg-muted/20 transition-colors">
                            <td className="p-3 pl-5 text-sm">{item.name || item.item_id}</td>
                            <td className="p-3 text-right font-mono text-sm tabular-nums">{item.db_quantity}</td>
                            <td className="p-3 text-right font-mono text-sm tabular-nums">{item.theoretical_quantity}</td>
                            <td className={`p-3 pr-5 text-right font-mono text-sm tabular-nums font-semibold ${item.difference > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {item.difference > 0 ? '+' : ''}{item.difference}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
