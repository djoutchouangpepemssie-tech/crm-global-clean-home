import React, { useState, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Download, FileText, TrendingUp, DollarSign, RefreshCw, Wallet
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts';

export default function ReportsModule() {
  const [tab, setTab] = useState('pl');
  const [year, setYear] = useState(new Date().getFullYear());
  const [plData, setPlData] = useState(null);
  const [bsData, setBsData] = useState(null);
  const [cfData, setCfData] = useState(null);
  const [glData, setGlData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const loadPL = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get(`${BACKEND_URL}/api/enterprise/reports/profit-loss`, { params: { year } }); setPlData(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [year]);

  const loadBS = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get(`${BACKEND_URL}/api/enterprise/reports/balance-sheet`); setBsData(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const loadCF = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get(`${BACKEND_URL}/api/enterprise/reports/cash-flow`); setCfData(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const loadGL = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get(`${BACKEND_URL}/api/enterprise/export/grand-livre`); setGlData(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'pl' && !plData) loadPL();
    if (t === 'balance-sheet' && !bsData) loadBS();
    if (t === 'cash-flow' && !cfData) loadCF();
    if (t === 'grand-livre' && !glData) loadGL();
  };

  const SectionTable = ({ title, items, color }) => (
    items && items.length > 0 && (
      <div className="space-y-1">
        <h4 className={`text-xs font-semibold ${color || ''}`}>{title}</h4>
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-xs pl-4">
            <span className="text-muted-foreground">{item.code} — {item.label}</span>
            <span className="font-mono">{fmt(item.amount || item.balance)}</span>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Download className="w-5 h-5 text-violet-500" />
        Rapports Financiers
      </h3>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="pl" className="text-xs gap-1"><TrendingUp className="w-3 h-3" />Compte de résultat</TabsTrigger>
          <TabsTrigger value="balance-sheet" className="text-xs gap-1"><FileText className="w-3 h-3" />Bilan</TabsTrigger>
          <TabsTrigger value="cash-flow" className="text-xs gap-1"><Wallet className="w-3 h-3" />Trésorerie</TabsTrigger>
          <TabsTrigger value="grand-livre" className="text-xs gap-1"><FileText className="w-3 h-3" />Grand livre</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pl" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Input className="w-28 h-9" type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} />
            <Button size="sm" variant="outline" onClick={loadPL}><RefreshCw className="w-3 h-3 mr-1" />Charger</Button>
          </div>

          {loading ? <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div> :
          plData ? (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total produits</div>
                  <div className="text-lg font-bold text-emerald-500">{fmt(plData.produits?.total)}</div>
                </CardContent></Card>
                <Card className="bg-red-500/5 border-red-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total charges</div>
                  <div className="text-lg font-bold text-red-500">{fmt(plData.charges?.total)}</div>
                </CardContent></Card>
                <Card className={`${plData.resultat_net >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground">Résultat net</div>
                    <div className="text-lg font-bold">{fmt(plData.resultat_net)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-violet-500/5 border-violet-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Marge nette</div>
                  <div className="text-lg font-bold">{plData.marge_nette?.toFixed(1) || 0}%</div>
                </CardContent></Card>
              </div>

              {/* Detailed P&L */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-500">📈 Produits</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <SectionTable title="Exploitation" items={plData.produits?.exploitation} color="text-emerald-600" />
                    <SectionTable title="Financiers" items={plData.produits?.financiers} color="text-emerald-600" />
                    <SectionTable title="Exceptionnels" items={plData.produits?.exceptionnels} color="text-emerald-600" />
                    <div className="flex justify-between text-sm font-bold pt-2 border-t">
                      <span>TOTAL PRODUITS</span>
                      <span className="text-emerald-500">{fmt(plData.produits?.total)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-red-500">📉 Charges</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <SectionTable title="Exploitation" items={plData.charges?.exploitation} color="text-red-600" />
                    <SectionTable title="Financières" items={plData.charges?.financieres} color="text-red-600" />
                    <SectionTable title="Exceptionnelles" items={plData.charges?.exceptionnelles} color="text-red-600" />
                    <SectionTable title="Dotations" items={plData.charges?.dotations} color="text-red-600" />
                    <div className="flex justify-between text-sm font-bold pt-2 border-t">
                      <span>TOTAL CHARGES</span>
                      <span className="text-red-500">{fmt(plData.charges?.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Results summary */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span>Résultat d'exploitation</span><span className="font-mono font-medium">{fmt(plData.resultat_exploitation)}</span></div>
                  <div className="flex justify-between text-sm"><span>Résultat financier</span><span className="font-mono font-medium">{fmt(plData.resultat_financier)}</span></div>
                  <div className="flex justify-between text-sm"><span>Résultat exceptionnel</span><span className="font-mono font-medium">{fmt(plData.resultat_exceptionnel)}</span></div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>RÉSULTAT NET</span>
                    <span className={plData.resultat_net >= 0 ? 'text-emerald-500' : 'text-red-500'}>{fmt(plData.resultat_net)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : <div className="text-center py-12 text-sm text-muted-foreground">Cliquez sur Charger pour générer le rapport</div>}
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="mt-4 space-y-4">
          {loading ? <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div> :
          bsData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Au {bsData.date}</span>
                <Badge className={bsData.is_balanced ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}>
                  {bsData.is_balanced ? '✅ Bilan équilibré' : '⚠️ Déséquilibre'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-500">ACTIF</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <SectionTable title="Immobilisations" items={bsData.actif?.immobilisations} color="text-blue-600" />
                    <SectionTable title="Stocks" items={bsData.actif?.stocks} color="text-blue-600" />
                    <SectionTable title="Créances" items={bsData.actif?.creances} color="text-blue-600" />
                    <SectionTable title="Trésorerie" items={bsData.actif?.tresorerie} color="text-blue-600" />
                    <div className="flex justify-between text-sm font-bold pt-2 border-t">
                      <span>TOTAL ACTIF</span><span className="text-blue-500">{fmt(bsData.total_actif)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-500">PASSIF</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <SectionTable title="Capitaux propres" items={bsData.passif?.capitaux} color="text-purple-600" />
                    <SectionTable title="Dettes" items={bsData.passif?.dettes} color="text-purple-600" />
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span>Résultat</span><span className="font-mono">{fmt(bsData.resultat)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t">
                      <span>TOTAL PASSIF</span><span className="text-purple-500">{fmt(bsData.total_passif)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : <div className="text-center py-12 text-sm text-muted-foreground">Chargement...</div>}
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cash-flow" className="mt-4 space-y-4">
          {loading ? <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div> :
          cfData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Entrées</div>
                  <div className="text-lg font-bold text-emerald-500">{fmt(cfData.total_inflows)}</div>
                </CardContent></Card>
                <Card className="bg-red-500/5 border-red-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Sorties</div>
                  <div className="text-lg font-bold text-red-500">{fmt(cfData.total_outflows)}</div>
                </CardContent></Card>
                <Card className={`${cfData.net_cash_flow >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground">Flux net</div>
                    <div className="text-lg font-bold">{fmt(cfData.net_cash_flow)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/20"><CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Solde bancaire</div>
                  <div className="text-lg font-bold">{fmt(cfData.current_bank_balance)}</div>
                </CardContent></Card>
              </div>

              {cfData.monthly?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Flux de trésorerie mensuel</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={cfData.monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={v => fmt(v)} />
                        <Legend />
                        <Bar dataKey="inflows" name="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="outflows" name="Sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : <div className="text-center py-12 text-sm text-muted-foreground">Chargement...</div>}
        </TabsContent>

        {/* Grand Livre */}
        <TabsContent value="grand-livre" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{glData?.total_accounts || 0} compte(s) avec mouvements</span>
            <Button size="sm" variant="outline" onClick={loadGL}><RefreshCw className="w-3 h-3 mr-1" />Actualiser</Button>
          </div>

          {loading ? <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div> :
          glData ? (
            <div className="space-y-3">
              {(glData.accounts || []).map(acc => (
                <Card key={acc.code}>
                  <CardHeader className="py-2 px-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{acc.code} — {acc.label}</span>
                      <span className="text-xs font-mono font-medium">Solde: {fmt(acc.balance)}</span>
                    </div>
                  </CardHeader>
                  {acc.entries?.length > 0 && (
                    <CardContent className="p-0">
                      <table className="w-full text-[11px]">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="text-left p-1.5 pl-4">Date</th>
                            <th className="text-left p-1.5">Journal</th>
                            <th className="text-left p-1.5">Description</th>
                            <th className="text-right p-1.5">Débit</th>
                            <th className="text-right p-1.5 pr-4">Crédit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {acc.entries.slice(0, 10).map((e, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-1.5 pl-4">{e.date}</td>
                              <td className="p-1.5">{e.journal}</td>
                              <td className="p-1.5 max-w-[200px] truncate">{e.description}</td>
                              <td className="p-1.5 text-right font-mono">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                              <td className="p-1.5 text-right font-mono pr-4">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                            </tr>
                          ))}
                          {acc.entries.length > 10 && (
                            <tr className="border-t"><td colSpan={5} className="p-2 text-center text-muted-foreground">...et {acc.entries.length - 10} de plus</td></tr>
                          )}
                        </tbody>
                        <tfoot className="bg-muted/20 font-medium">
                          <tr>
                            <td colSpan={3} className="p-1.5 text-right pl-4">Totaux</td>
                            <td className="p-1.5 text-right font-mono">{fmt(acc.total_debit)}</td>
                            <td className="p-1.5 text-right font-mono pr-4">{fmt(acc.total_credit)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : <div className="text-center py-12 text-sm text-muted-foreground">Chargement...</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
