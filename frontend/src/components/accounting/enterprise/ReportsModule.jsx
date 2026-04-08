import React, { useState, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Download, FileText, TrendingUp, DollarSign, RefreshCw, Wallet,
  BarChart3, ArrowDown, ArrowUp, FileSpreadsheet, PieChart as PieChartIcon
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, PieChart, Pie, ComposedChart, Line, ReferenceLine
} from 'recharts';

const CustomTooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  padding: '12px 16px',
};

export default function ReportsModule() {
  const [tab, setTab] = useState('pl');
  const [year, setYear] = useState(new Date().getFullYear());
  const [plData, setPlData] = useState(null);
  const [bsData, setBsData] = useState(null);
  const [cfData, setCfData] = useState(null);
  const [glData, setGlData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const fmtK = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

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

  const exportReport = (format) => {
    window.open(`${BACKEND_URL}/api/enterprise/export/${tab}?format=${format}&year=${year}`);
  };

  const Loader = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
      <p className="text-sm text-muted-foreground">Génération du rapport...</p>
    </div>
  );

  const SectionTable = ({ title, items, color, icon: Icon }) => (
    items && items.length > 0 && (
      <div className="space-y-2">
        <h4 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${color || 'text-muted-foreground'}`}>
          {Icon && <Icon className="w-3 h-3" />}
          {title}
        </h4>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm pl-4 py-1.5 rounded-lg hover:bg-muted/20 transition-colors group">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                <span className="font-mono text-xs mr-2">{item.code}</span>
                {item.label}
              </span>
              <span className="font-mono tabular-nums font-medium">{fmt(item.amount || item.balance)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  );

  const SummaryCard = ({ label, value, color, icon: Icon }) => (
    <Card className={`bg-${color}-500/5 border-${color}-500/20`}>
      <CardContent className="p-4 text-center">
        {Icon && <Icon className={`w-5 h-5 text-${color}-500 mx-auto mb-2`} />}
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
        <div className={`text-xl font-bold text-${color}-500`}>{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Download className="w-5 h-5 text-blue-500" />
            </div>
            Rapports Financiers
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Bilan, P&L, Trésorerie, Grand Livre</p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => handleTabChange('pl')} title="Voir le Compte de Résultat (P&L)">
            <TrendingUp className="w-3 h-3 text-emerald-500" />P&L
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => handleTabChange('balance-sheet')} title="Voir le Bilan Comptable">
            <BarChart3 className="w-3 h-3 text-blue-500" />Bilan
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => handleTabChange('cash-flow')} title="Voir les Flux de Trésorerie">
            <Wallet className="w-3 h-3 text-violet-500" />Cash Flow
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => exportReport('pdf')} title="Exporter au format PDF avec mise en page professionnelle">
            <FileText className="w-3 h-3" />Exporter PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => exportReport('excel')} title="Exporter au format Excel avec formules">
            <FileSpreadsheet className="w-3 h-3" />Exporter Excel
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => exportReport('csv')} title="Exporter au format CSV pour import">
            <Download className="w-3 h-3" />CSV
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="h-auto p-1.5 bg-muted/50 rounded-xl">
          <TabsTrigger value="pl" className="text-xs gap-1.5 rounded-lg px-4 py-2"><TrendingUp className="w-3.5 h-3.5" />Compte de résultat</TabsTrigger>
          <TabsTrigger value="balance-sheet" className="text-xs gap-1.5 rounded-lg px-4 py-2"><FileText className="w-3.5 h-3.5" />Bilan</TabsTrigger>
          <TabsTrigger value="cash-flow" className="text-xs gap-1.5 rounded-lg px-4 py-2"><Wallet className="w-3.5 h-3.5" />Flux trésorerie</TabsTrigger>
          <TabsTrigger value="grand-livre" className="text-xs gap-1.5 rounded-lg px-4 py-2"><FileText className="w-3.5 h-3.5" />Grand livre</TabsTrigger>
        </TabsList>

        {/* ═══ P&L ═══ */}
        <TabsContent value="pl" className="mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <Input className="w-28 h-10 font-mono" type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} />
            <Button size="sm" onClick={loadPL} className="gap-1.5 h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700" title="Générer le compte de résultat pour cette année">
              <TrendingUp className="w-3.5 h-3.5" />Voir P&L
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-10" title="Exporter le P&L au format PDF professionnel" onClick={() => exportReport('pdf')}>
              <FileText className="w-3.5 h-3.5" />Exporter PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-10" title="Exporter le P&L au format Excel avec formules" onClick={() => exportReport('excel')}>
              <FileSpreadsheet className="w-3.5 h-3.5" />Exporter Excel
            </Button>
          </div>

          {loading ? <Loader /> :
          plData ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-4 text-center">
                  <ArrowUp className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total produits</div>
                  <div className="text-xl font-bold text-emerald-500">{fmtK(plData.produits?.total)}</div>
                </CardContent></Card>
                <Card className="bg-red-500/5 border-red-500/20"><CardContent className="p-4 text-center">
                  <ArrowDown className="w-5 h-5 text-red-500 mx-auto mb-2" />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total charges</div>
                  <div className="text-xl font-bold text-red-500">{fmtK(plData.charges?.total)}</div>
                </CardContent></Card>
                <Card className={`${plData.resultat_net >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <CardContent className="p-4 text-center">
                    <DollarSign className={`w-5 h-5 ${plData.resultat_net >= 0 ? 'text-emerald-500' : 'text-red-500'} mx-auto mb-2`} />
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Résultat net</div>
                    <div className={`text-xl font-bold ${plData.resultat_net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmtK(plData.resultat_net)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-violet-500/5 border-violet-500/20"><CardContent className="p-4 text-center">
                  <BarChart3 className="w-5 h-5 text-violet-500 mx-auto mb-2" />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Marge nette</div>
                  <div className="text-xl font-bold text-violet-500">{plData.marge_nette?.toFixed(1) || 0}%</div>
                </CardContent></Card>
              </div>

              {/* Detailed P&L */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
                      <ArrowUp className="w-4 h-4" />Produits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SectionTable title="Exploitation" items={plData.produits?.exploitation} color="text-emerald-600" icon={TrendingUp} />
                    <SectionTable title="Financiers" items={plData.produits?.financiers} color="text-emerald-600" />
                    <SectionTable title="Exceptionnels" items={plData.produits?.exceptionnels} color="text-emerald-600" />
                    <div className="flex justify-between text-sm font-bold pt-3 border-t-2 border-emerald-500/20">
                      <span>TOTAL PRODUITS</span>
                      <span className="text-emerald-500 font-mono tabular-nums">{fmt(plData.produits?.total)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
                      <ArrowDown className="w-4 h-4" />Charges
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SectionTable title="Exploitation" items={plData.charges?.exploitation} color="text-red-600" icon={TrendingUp} />
                    <SectionTable title="Financières" items={plData.charges?.financieres} color="text-red-600" />
                    <SectionTable title="Exceptionnelles" items={plData.charges?.exceptionnelles} color="text-red-600" />
                    <SectionTable title="Dotations" items={plData.charges?.dotations} color="text-red-600" />
                    <div className="flex justify-between text-sm font-bold pt-3 border-t-2 border-red-500/20">
                      <span>TOTAL CHARGES</span>
                      <span className="text-red-500 font-mono tabular-nums">{fmt(plData.charges?.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Results waterfall */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Synthèse du résultat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Résultat d'exploitation", value: plData.resultat_exploitation },
                    { label: 'Résultat financier', value: plData.resultat_financier },
                    { label: 'Résultat exceptionnel', value: plData.resultat_exceptionnel },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between text-sm py-2 px-4 rounded-lg bg-muted/20">
                      <span>{r.label}</span>
                      <span className={`font-mono font-medium tabular-nums ${(r.value || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {fmt(r.value)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-bold pt-3 px-4 border-t-2 border-foreground/10">
                    <span>RÉSULTAT NET</span>
                    <span className={`font-mono tabular-nums ${plData.resultat_net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {fmt(plData.resultat_net)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <TrendingUp className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Cliquez sur "Générer" pour créer le rapport</p>
            </div>
          )}
        </TabsContent>

        {/* ═══ Balance Sheet ═══ */}
        <TabsContent value="balance-sheet" className="mt-6 space-y-6">
          {loading ? <Loader /> :
          bsData ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Au {bsData.date}</span>
                <Badge className={`${bsData.is_balanced ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  {bsData.is_balanced ? '✅ Bilan équilibré' : '⚠️ Déséquilibre détecté'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />ACTIF
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SectionTable title="Immobilisations" items={bsData.actif?.immobilisations} color="text-blue-600" />
                    <SectionTable title="Stocks" items={bsData.actif?.stocks} color="text-blue-600" />
                    <SectionTable title="Créances" items={bsData.actif?.creances} color="text-blue-600" />
                    <SectionTable title="Trésorerie" items={bsData.actif?.tresorerie} color="text-blue-600" />
                    <div className="flex justify-between text-sm font-bold pt-3 border-t-2 border-blue-500/20">
                      <span>TOTAL ACTIF</span><span className="text-blue-500 font-mono tabular-nums">{fmt(bsData.total_actif)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-purple-600 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />PASSIF
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SectionTable title="Capitaux propres" items={bsData.passif?.capitaux} color="text-purple-600" />
                    <SectionTable title="Dettes" items={bsData.passif?.dettes} color="text-purple-600" />
                    <div className="flex justify-between text-sm pt-3 border-t">
                      <span>Résultat de l'exercice</span><span className="font-mono tabular-nums">{fmt(bsData.resultat)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-3 border-t-2 border-purple-500/20">
                      <span>TOTAL PASSIF</span><span className="text-purple-500 font-mono tabular-nums">{fmt(bsData.total_passif)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pie chart Actif/Passif */}
              {(bsData.total_actif > 0 || bsData.total_passif > 0) && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-violet-500" />
                      Répartition Actif / Passif
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Actif', value: bsData.total_actif || 0 },
                            { name: 'Passif', value: bsData.total_passif || 0 },
                          ]}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none"
                        >
                          <Cell fill="#2563eb" />
                          <Cell fill="#7c3aed" />
                        </Pie>
                        <Tooltip contentStyle={CustomTooltipStyle} formatter={v => fmt(v)} />
                        <Legend verticalAlign="bottom" iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FileText className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Cliquez pour générer le bilan comptable</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={loadBS} className="gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600" title="Générer le bilan comptable Actif/Passif">
                  <BarChart3 className="w-3.5 h-3.5" />Voir Bilan
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportReport('pdf')} title="Exporter le bilan au format PDF">
                  <FileText className="w-3 h-3 mr-1" />PDF
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ Cash Flow ═══ */}
        <TabsContent value="cash-flow" className="mt-6 space-y-6">
          {loading ? <Loader /> :
          cfData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-4 text-center">
                  <ArrowUp className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Entrées</div>
                  <div className="text-xl font-bold text-emerald-500">{fmtK(cfData.total_inflows)}</div>
                </CardContent></Card>
                <Card className="bg-red-500/5 border-red-500/20"><CardContent className="p-4 text-center">
                  <ArrowDown className="w-5 h-5 text-red-500 mx-auto mb-2" />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sorties</div>
                  <div className="text-xl font-bold text-red-500">{fmtK(cfData.total_outflows)}</div>
                </CardContent></Card>
                <Card className={`${cfData.net_cash_flow >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <CardContent className="p-4 text-center">
                    <DollarSign className={`w-5 h-5 ${cfData.net_cash_flow >= 0 ? 'text-emerald-500' : 'text-red-500'} mx-auto mb-2`} />
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Flux net</div>
                    <div className="text-xl font-bold">{fmtK(cfData.net_cash_flow)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/20"><CardContent className="p-4 text-center">
                  <Wallet className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Solde bancaire</div>
                  <div className="text-xl font-bold text-blue-500">{fmtK(cfData.current_bank_balance)}</div>
                </CardContent></Card>
              </div>

              {cfData.monthly?.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      Flux de trésorerie mensuel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={cfData.monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={CustomTooltipStyle} formatter={v => fmt(v)} />
                        <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                        <Bar dataKey="inflows" name="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                        <Bar dataKey="outflows" name="Sorties" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} />
                        <Line type="monotone" dataKey="net" name="Net cumulé" stroke="#7c3aed" strokeWidth={2} dot={false} />
                        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Wallet className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Cliquez pour générer le flux de trésorerie</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={loadCF} className="gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600" title="Générer le rapport de flux de trésorerie">
                  <Wallet className="w-3.5 h-3.5" />Voir Cash Flow
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportReport('pdf')} title="Exporter le cash flow au format PDF">
                  <FileText className="w-3 h-3 mr-1" />PDF
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ Grand Livre ═══ */}
        <TabsContent value="grand-livre" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{glData?.total_accounts || 0} compte(s) avec mouvements</span>
            <Button size="sm" variant="outline" onClick={loadGL} className="gap-1.5 h-9">
              <RefreshCw className="w-3.5 h-3.5" />Actualiser
            </Button>
          </div>

          {loading ? <Loader /> :
          glData ? (
            <div className="space-y-4">
              {(glData.accounts || []).map(acc => (
                <Card key={acc.code} className="border-0 shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-5 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        <span className="font-mono text-blue-600 mr-2">{acc.code}</span>
                        {acc.label}
                      </span>
                      <span className={`text-sm font-mono font-bold tabular-nums ${
                        (acc.balance || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        Solde: {fmt(acc.balance)}
                      </span>
                    </div>
                  </CardHeader>
                  {acc.entries?.length > 0 && (
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/10">
                          <tr>
                            <th className="text-left p-2.5 pl-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                            <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Journal</th>
                            <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                            <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Débit</th>
                            <th className="text-right p-2.5 pr-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Crédit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {acc.entries.slice(0, 10).map((e, i) => (
                            <tr key={i} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                              <td className="p-2.5 pl-5 text-muted-foreground">{e.date}</td>
                              <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{e.journal}</Badge></td>
                              <td className="p-2.5 max-w-[250px] truncate">{e.description}</td>
                              <td className="p-2.5 text-right font-mono tabular-nums">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                              <td className="p-2.5 text-right font-mono tabular-nums pr-5">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                            </tr>
                          ))}
                          {acc.entries.length > 10 && (
                            <tr className="border-t"><td colSpan={5} className="p-3 text-center text-xs text-muted-foreground">...et {acc.entries.length - 10} de plus</td></tr>
                          )}
                        </tbody>
                        <tfoot className="bg-muted/20 font-semibold">
                          <tr>
                            <td colSpan={3} className="p-2.5 text-right text-xs text-muted-foreground pl-5">Totaux</td>
                            <td className="p-2.5 text-right font-mono tabular-nums">{fmt(acc.total_debit)}</td>
                            <td className="p-2.5 text-right font-mono tabular-nums pr-5">{fmt(acc.total_credit)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FileText className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
              <Button size="sm" variant="outline" onClick={loadGL}><RefreshCw className="w-3 h-3 mr-1" />Charger</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
