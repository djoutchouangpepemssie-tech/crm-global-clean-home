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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_COLORS = {
  ok: 'bg-emerald-500/10 text-emerald-500',
  warning: 'bg-amber-500/10 text-amber-500',
  critical: 'bg-red-500/10 text-red-500',
  overstock: 'bg-blue-500/10 text-blue-500',
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
    try {
      const res = await axios.post(`${BACKEND_URL}/api/enterprise/stock-advanced/valuation`, { method });
      setValuation(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [method]);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/stock-advanced/forecast`);
      setForecast(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const loadReconciliation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/stock-advanced/inventory-reconciliation`);
      setReconciliation(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'valuation') loadValuation();
    else if (tab === 'forecast') loadForecast();
    else if (tab === 'reconciliation') loadReconciliation();
  }, [tab, loadValuation, loadForecast, loadReconciliation]);

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="w-5 h-5 text-violet-500" />
        Stock Avancé
      </h3>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="valuation" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />Valorisation</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs gap-1"><TrendingUp className="w-3 h-3" />Prévisions</TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs gap-1"><Package className="w-3 h-3" />Réconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="valuation" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Select value={method} onValueChange={v => setMethod(v)}>
              <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weighted_average">Coût moyen pondéré</SelectItem>
                <SelectItem value="fifo">FIFO (PEPS)</SelectItem>
                <SelectItem value="lifo">LIFO (DEPS)</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={loadValuation}><RefreshCw className="w-3 h-3 mr-1" />Recalculer</Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : valuation ? (
            <>
              <Card className="bg-violet-500/5 border-violet-500/20">
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-muted-foreground">Valeur totale du stock ({valuation.method})</div>
                  <div className="text-2xl font-bold">{fmt(valuation.grand_total)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{valuation.item_count} article(s)</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3">Article</th>
                        <th className="text-right p-3">Quantité</th>
                        <th className="text-right p-3">Coût unitaire</th>
                        <th className="text-right p-3">Valeur totale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(valuation.items || []).map(item => (
                        <tr key={item.item_id} className="border-t hover:bg-muted/20">
                          <td className="p-3">{item.name || item.item_id}</td>
                          <td className="p-3 text-right font-mono">{item.quantity}</td>
                          <td className="p-3 text-right font-mono">{fmt(item.unit_cost)}</td>
                          <td className="p-3 text-right font-mono font-medium">{fmt(item.total_valuation)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-medium">
                      <tr>
                        <td colSpan={3} className="p-3 text-right">TOTAL</td>
                        <td className="p-3 text-right font-mono">{fmt(valuation.grand_total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="forecast" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : forecast ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-red-500/5 border-red-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Critique</div>
                  <div className="text-2xl font-bold text-red-500">{forecast.critical}</div>
                </CardContent></Card>
                <Card className="bg-amber-500/5 border-amber-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Attention</div>
                  <div className="text-2xl font-bold text-amber-500">{forecast.warning}</div>
                </CardContent></Card>
                <Card className="bg-blue-500/5 border-blue-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Surstock</div>
                  <div className="text-2xl font-bold text-blue-500">{forecast.overstock}</div>
                </CardContent></Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total articles</div>
                  <div className="text-2xl font-bold">{(forecast.forecasts || []).length}</div>
                </CardContent></Card>
              </div>

              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3">Article</th>
                        <th className="text-right p-3">Stock actuel</th>
                        <th className="text-right p-3">Conso. moy/jour</th>
                        <th className="text-right p-3">Jours restants</th>
                        <th className="text-right p-3">Stock optimal</th>
                        <th className="text-right p-3">À commander</th>
                        <th className="text-center p-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(forecast.forecasts || []).map(f => (
                        <tr key={f.item_id} className="border-t hover:bg-muted/20">
                          <td className="p-3">{f.name || f.item_id}</td>
                          <td className="p-3 text-right font-mono">{f.current_qty}</td>
                          <td className="p-3 text-right font-mono">{f.avg_daily_consumption}</td>
                          <td className="p-3 text-right font-mono">{f.days_remaining >= 999 ? '∞' : f.days_remaining}</td>
                          <td className="p-3 text-right font-mono">{f.optimal_stock}</td>
                          <td className="p-3 text-right font-mono">{f.reorder_qty > 0 ? f.reorder_qty : '—'}</td>
                          <td className="p-3 text-center">
                            <Badge className={`text-[10px] ${STATUS_COLORS[f.status]}`}>{f.status}</Badge>
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

        <TabsContent value="reconciliation" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : reconciliation ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-muted/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total articles</div>
                  <div className="text-xl font-bold">{reconciliation.total_items}</div>
                </CardContent></Card>
                <Card className={`${reconciliation.discrepancies > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground">Écarts</div>
                    <div className={`text-xl font-bold ${reconciliation.discrepancies > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {reconciliation.discrepancies}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Conformes</div>
                  <div className="text-xl font-bold text-emerald-500">{reconciliation.total_items - reconciliation.discrepancies}</div>
                </CardContent></Card>
              </div>

              {reconciliation.discrepancy_items?.length > 0 && (
                <Card className="border-red-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-500">
                      <AlertTriangle className="w-4 h-4" />
                      Articles avec écarts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-red-500/5">
                        <tr>
                          <th className="text-left p-3">Article</th>
                          <th className="text-right p-3">Stock BD</th>
                          <th className="text-right p-3">Stock théorique</th>
                          <th className="text-right p-3">Écart</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconciliation.discrepancy_items.map(item => (
                          <tr key={item.item_id} className="border-t">
                            <td className="p-3">{item.name || item.item_id}</td>
                            <td className="p-3 text-right font-mono">{item.db_quantity}</td>
                            <td className="p-3 text-right font-mono">{item.theoretical_quantity}</td>
                            <td className={`p-3 text-right font-mono font-medium ${item.difference > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
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
