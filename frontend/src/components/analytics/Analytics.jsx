import React, { useState } from 'react';
import { useCrmAnalytics, useSeoAnalytics, useGa4Analytics } from '../../hooks/api';
import {
  TrendingUp, TrendingDown, Users, Eye, Clock, MousePointer,
  Globe, RefreshCw, AlertCircle, BarChart2, Activity,
  Target, Zap, FileText, CreditCard, CheckCircle,
  ArrowUp, ArrowDown, DollarSign, Percent
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, FunnelChart, Funnel, LabelList
} from 'recharts';
import { PageHeader } from '../shared';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api/analytics-data';

const COLORS = ['#047857','#d97706','#c2410c','#44403c','#a8a29e','#14532d','#92400e','#6b7280'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl p-3 border text-xs" style={{background:'var(--bg-card, #fff)',borderColor:'var(--border-default)'}}>
      <p className="text-neutral-500 mb-2 font-semibold">{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{color:p.color}} className="font-bold">
          {p.name}: {typeof p.value==='number'&&p.value>1000?p.value.toLocaleString('fr-FR'):p.value}
          {p.name==='CA'?' €':''}
        </p>
      ))}
    </div>
  );
};

const KPI = ({ label, value, change, icon: Icon, color, suffix='', sub }) => (
  <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-card transition-all">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{background:`${color}15`,border:`1px solid ${color}25`}}>
        <Icon className="w-5 h-5" style={{color}}/>
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
          change >= 0 ? 'text-brand-600 bg-brand-50' : 'text-terracotta-600 bg-terracotta-50'
        }`}>
          {change >= 0 ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-neutral-900 mb-1 tabular-nums">
      {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}{suffix}
    </p>
    <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500">{label}</p>
    {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
  </div>
);

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('crm');

  // Vague 4 : React Query — 3 sources chargées en parallèle avec cache indépendant.
  // CRM stats se rafraîchissent à 60s, SEO/GA4 à 5min (données moins volatiles).
  const { data: crmData, isLoading: crmLoading, refetch: refetchCrm } = useCrmAnalytics();
  const { data: seoData, isLoading: seoLoading } = useSeoAnalytics(30);
  const { data: ga4Data, isLoading: ga4Loading } = useGa4Analytics(30);

  const loading = crmLoading || seoLoading || ga4Loading;
  const fetchData = refetchCrm;

  const TABS = [
    {id:'crm', label:'📊 CRM & Business'},
    {id:'seo', label:'🔍 SEO & Trafic'},
    ...(ga4Data?[{id:'ga4', label:'📈 GA4 Analytics'}]:[]),
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">

      <PageHeader title="Analytics" subtitle="Analyse de vos données" />

      {/* ACTIONS */}
      <div className="flex justify-end -mt-4">
        <button onClick={fetchData} className="p-2 rounded-xl bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-700">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-neutral-100 border border-neutral-200 rounded-xl p-1 w-fit">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab===t.id?'bg-brand-600 text-white shadow-sm':'text-neutral-500 hover:text-neutral-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_,i)=><div key={i} className="skeleton h-28 rounded-2xl"/>)}
        </div>
      ) : (
        <>

        {/* ── CRM TAB ── */}
        {activeTab==='crm' && crmData && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KPI label="Leads (30j)" value={crmData.kpis.leads.value} change={crmData.kpis.leads.change} icon={Users} color="#047857" sub={`Total: ${crmData.kpis.leads.total}`}/>
              <KPI label="Devis (30j)" value={crmData.kpis.quotes.value} change={crmData.kpis.quotes.change} icon={FileText} color="#78716c" sub={`Total: ${crmData.kpis.quotes.total}`}/>
              <KPI label="Interventions" value={crmData.kpis.interventions.value} icon={CheckCircle} color="#047857" sub={`Total: ${crmData.kpis.interventions.total}`}/>
              <KPI label="CA 30 jours" value={`${crmData.kpis.ca_30.value.toLocaleString('fr-FR')} €`} icon={DollarSign} color="#c2410c" sub={`Total: ${crmData.kpis.ca_total?.toLocaleString('fr-FR')||0} €`}/>
              <KPI label="Taux conversion" value={crmData.kpis.conv_rate.value} suffix="%" icon={Percent} color="#d97706"/>
              <KPI label="Factures payées" value={crmData.kpis.invoices_paid.value} icon={CreditCard} color="#047857"/>
            </div>

            {/* Graphique évolution */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-5">Évolution hebdomadaire</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={crmData.weekly}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#047857" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#047857" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c2410c" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#c2410c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6"/>
                  <XAxis dataKey="week" tick={{fill:'#78716c',fontSize:10}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:'#78716c',fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="leads"   name="Leads"   stroke="#047857" strokeWidth={2} fill="url(#g1)"/>
                  <Area type="monotone" dataKey="quotes"  name="Devis"   stroke="#d97706" strokeWidth={2} fill="url(#g2)"/>
                  <Area type="monotone" dataKey="invoices"name="Factures"stroke="#c2410c" strokeWidth={2} fill="url(#g3)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* CA + Funnel + Services */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* CA hebdo */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">💰 CA Hebdomadaire</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={crmData.weekly.slice(-8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6"/>
                    <XAxis dataKey="week" tick={{fill:'#78716c',fontSize:9}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fill:'#78716c',fontSize:9}} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="ca" name="CA" fill="#c2410c" radius={[4,4,0,0]}>
                      {crmData.weekly.slice(-8).map((_,i)=>(
                        <Cell key={i} fill={`rgba(194,65,12,${0.4+i*0.075})`}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Funnel conversion */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">🎯 Entonnoir de conversion</h3>
                <div className="space-y-3 mt-2">
                  {[
                    {label:'Leads', value:crmData.funnel.leads, color:'#047857', pct:100},
                    {label:'Devis envoyés', value:crmData.funnel.quotes, color:'#d97706', pct:Math.round((crmData.funnel.quotes/Math.max(crmData.funnel.leads,1))*100)},
                    {label:'Factures créées', value:crmData.funnel.invoices, color:'#c2410c', pct:Math.round((crmData.funnel.invoices/Math.max(crmData.funnel.leads,1))*100)},
                    {label:'Paiements reçus', value:crmData.funnel.paid, color:'#14532d', pct:Math.round((crmData.funnel.paid/Math.max(crmData.funnel.leads,1))*100)},
                  ].map((step,i)=>(
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-neutral-500">{step.label}</span>
                        <span className="text-xs font-bold text-neutral-900 tabular-nums">{step.value} <span className="text-neutral-400">({step.pct}%)</span></span>
                      </div>
                      <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{width:`${step.pct}%`,background:step.color}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">🧹 Services demandés</h3>
                {crmData.services.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={crmData.services} cx="50%" cy="50%" outerRadius={50} innerRadius={25} dataKey="value" paddingAngle={3}>
                          {crmData.services.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Pie>
                        <Tooltip formatter={(v)=>[v,'Leads']}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {crmData.services.slice(0,5).map((s,i)=>(
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                          <span className="text-neutral-500 flex-1 truncate">{s.name||'Autre'}</span>
                          <span className="font-bold text-neutral-900 tabular-nums">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-neutral-400 text-sm text-center py-8">Aucune donnée</p>}
              </div>
            </div>

            {/* Sources */}
            {crmData.sources.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">📡 Sources des leads</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {crmData.sources.map((s,i)=>(
                    <div key={i} className="p-4 rounded-xl border border-neutral-200 text-center bg-neutral-50">
                      <p className="text-2xl font-bold tabular-nums" style={{color:COLORS[i%COLORS.length]}}>{s.value}</p>
                      <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-[0.08em] mt-1 truncate">{s.name||'Direct'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SEO TAB ── */}
        {activeTab==='seo' && seoData && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {label:'Clics organiques', value:seoData.overview.clicks, color:'#047857', icon:MousePointer},
                {label:'Impressions',       value:seoData.overview.impressions, color:'#78716c', icon:Eye},
                {label:'CTR moyen',         value:`${seoData.overview.ctr}%`, color:'#c2410c', icon:Target},
                {label:'Position moyenne',  value:seoData.overview.position, color:'#d97706', icon:TrendingUp},
              ].map(k=>(
                <KPI key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color}/>
              ))}
            </div>
            {/* Graphique clics */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-5">Évolution clics organiques</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={seoData.daily?.map(d=>({
                  date: new Date(d.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}),
                  Clics: d.clicks, Impressions: d.impressions,
                }))}>
                  <defs>
                    <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#047857" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#047857" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6"/>
                  <XAxis dataKey="date" tick={{fill:'#78716c',fontSize:10}} tickLine={false} axisLine={false} interval={6}/>
                  <YAxis tick={{fill:'#78716c',fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="Clics" stroke="#047857" strokeWidth={2.5} fill="url(#sg1)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Top mots-clés */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">Top mots-clés</h3>
              <div className="space-y-2">
                {seoData.keywords?.slice(0,10).map((kw,i)=>(
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50">
                    <span className="text-[10px] text-neutral-400 font-mono w-4">{i+1}</span>
                    <span className="text-sm text-neutral-700 font-medium flex-1 truncate">{kw.query}</span>
                    <span className="text-xs font-bold text-brand-600 tabular-nums">{kw.clicks} clics</span>
                    <span className="text-xs text-neutral-400 tabular-nums">{kw.impressions} impr.</span>
                    <span className="text-xs font-bold" style={{color:kw.position<=10?'#047857':kw.position<=20?'#d97706':'#c2410c'}}>
                      pos. {kw.position}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GA4 TAB ── */}
        {activeTab==='ga4' && ga4Data && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI label="Sessions" value={ga4Data.kpis.sessions.value} change={ga4Data.kpis.sessions.change} icon={Activity} color="#047857"/>
              <KPI label="Utilisateurs" value={ga4Data.kpis.users.value} change={ga4Data.kpis.users.change} icon={Users} color="#14532d"/>
              <KPI label="Pages vues" value={ga4Data.kpis.pageviews.value} icon={Eye} color="#78716c"/>
              <KPI label="Conversions" value={ga4Data.kpis.conversions.value} change={ga4Data.kpis.conversions.change} icon={Target} color="#c2410c"/>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-neutral-900 mb-5">Trafic GA4</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={ga4Data.daily?.map(d=>({
                  date: new Date(d.date.replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3')).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}),
                  Sessions: d.sessions, Utilisateurs: d.users,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6"/>
                  <XAxis dataKey="date" tick={{fill:'#78716c',fontSize:10}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:'#78716c',fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="Sessions" stroke="#047857" strokeWidth={2.5} fill="rgba(4,120,87,0.12)"/>
                  <Area type="monotone" dataKey="Utilisateurs" stroke="#d97706" strokeWidth={2} fill="rgba(217,119,6,0.08)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Message si GA4 non dispo */}
        {activeTab==='ga4' && !ga4Data && (
          <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600"/>
            </div>
            <p className="text-lg font-semibold text-neutral-900 mb-2">GA4 en cours de configuration</p>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Les permissions Google Analytics Data API se propagent sous 24h. 
              En attendant, les onglets CRM & Business et SEO contiennent toutes vos données réelles.
            </p>
          </div>
        )}

        </>
      )}
    </div>
  );
};

export default Analytics;
