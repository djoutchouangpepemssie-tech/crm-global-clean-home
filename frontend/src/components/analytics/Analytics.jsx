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
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api/analytics-data';

const COLORS = ['#8b5cf6','#10b981','#f97316','#60a5fa','#f43f5e','#f59e0b','#34d399','#a78bfa'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl p-3 border text-xs" style={{background:'hsl(224,71%,8%)',borderColor:'rgba(255,255,255,0.1)'}}>
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
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
  <div className="section-card p-5 hover:border-white/10 transition-all">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{background:`${color}20`,border:`1px solid ${color}30`}}>
        <Icon className="w-5 h-5" style={{color}}/>
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
          change >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
        }`}>
          {change >= 0 ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-black text-slate-100 mb-1" style={{fontFamily:'Manrope,sans-serif'}}>
      {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}{suffix}
    </p>
    <p className="text-xs text-slate-500 font-semibold">{label}</p>
    {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
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

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-violet-400"/>
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Analytics</h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">Données réelles · CRM + Search Console · globalcleanhome.com</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-white/5 rounded-2xl p-1.5 w-fit">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab===t.id?'bg-violet-600 text-white shadow-lg':'text-slate-500 hover:text-slate-300'}`}>
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
              <KPI label="Leads (30j)" value={crmData.kpis.leads.value} change={crmData.kpis.leads.change} icon={Users} color="#8b5cf6" sub={`Total: ${crmData.kpis.leads.total}`}/>
              <KPI label="Devis (30j)" value={crmData.kpis.quotes.value} change={crmData.kpis.quotes.change} icon={FileText} color="#60a5fa" sub={`Total: ${crmData.kpis.quotes.total}`}/>
              <KPI label="Interventions" value={crmData.kpis.interventions.value} icon={CheckCircle} color="#10b981" sub={`Total: ${crmData.kpis.interventions.total}`}/>
              <KPI label="CA 30 jours" value={`${crmData.kpis.ca_30.value.toLocaleString('fr-FR')} €`} icon={DollarSign} color="#f97316" sub={`Total: ${crmData.kpis.ca_total?.toLocaleString('fr-FR')||0} €`}/>
              <KPI label="Taux conversion" value={crmData.kpis.conv_rate.value} suffix="%" icon={Percent} color="#f59e0b"/>
              <KPI label="Factures payées" value={crmData.kpis.invoices_paid.value} icon={CreditCard} color="#34d399"/>
            </div>

            {/* Graphique évolution */}
            <div className="section-card p-5">
              <h3 className="text-sm font-black text-slate-200 mb-5">Évolution hebdomadaire</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={crmData.weekly}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="week" tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="leads"   name="Leads"   stroke="#8b5cf6" strokeWidth={2} fill="url(#g1)"/>
                  <Area type="monotone" dataKey="quotes"  name="Devis"   stroke="#10b981" strokeWidth={2} fill="url(#g2)"/>
                  <Area type="monotone" dataKey="invoices"name="Factures"stroke="#f97316" strokeWidth={2} fill="url(#g3)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* CA + Funnel + Services */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* CA hebdo */}
              <div className="section-card p-5">
                <h3 className="text-sm font-black text-slate-200 mb-4">💰 CA Hebdomadaire</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={crmData.weekly.slice(-8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="week" tick={{fill:'#475569',fontSize:9}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fill:'#475569',fontSize:9}} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="ca" name="CA" fill="#f97316" radius={[4,4,0,0]}>
                      {crmData.weekly.slice(-8).map((_,i)=>(
                        <Cell key={i} fill={`rgba(249,115,22,${0.4+i*0.075})`}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Funnel conversion */}
              <div className="section-card p-5">
                <h3 className="text-sm font-black text-slate-200 mb-4">🎯 Entonnoir de conversion</h3>
                <div className="space-y-3 mt-2">
                  {[
                    {label:'Leads', value:crmData.funnel.leads, color:'#8b5cf6', pct:100},
                    {label:'Devis envoyés', value:crmData.funnel.quotes, color:'#60a5fa', pct:Math.round((crmData.funnel.quotes/Math.max(crmData.funnel.leads,1))*100)},
                    {label:'Factures créées', value:crmData.funnel.invoices, color:'#f97316', pct:Math.round((crmData.funnel.invoices/Math.max(crmData.funnel.leads,1))*100)},
                    {label:'Paiements reçus', value:crmData.funnel.paid, color:'#10b981', pct:Math.round((crmData.funnel.paid/Math.max(crmData.funnel.leads,1))*100)},
                  ].map((step,i)=>(
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-400">{step.label}</span>
                        <span className="text-xs font-black text-slate-200">{step.value} <span className="text-slate-600">({step.pct}%)</span></span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{width:`${step.pct}%`,background:step.color}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div className="section-card p-5">
                <h3 className="text-sm font-black text-slate-200 mb-4">🧹 Services demandés</h3>
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
                          <span className="text-slate-400 flex-1 truncate">{s.name||'Autre'}</span>
                          <span className="font-black text-slate-200">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-slate-600 text-sm text-center py-8">Aucune donnée</p>}
              </div>
            </div>

            {/* Sources */}
            {crmData.sources.length > 0 && (
              <div className="section-card p-5">
                <h3 className="text-sm font-black text-slate-200 mb-4">📡 Sources des leads</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {crmData.sources.map((s,i)=>(
                    <div key={i} className="p-4 rounded-2xl border border-white/5 text-center"
                      style={{background:`${COLORS[i%COLORS.length]}10`}}>
                      <p className="text-2xl font-black" style={{color:COLORS[i%COLORS.length],fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1 truncate">{s.name||'Direct'}</p>
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
                {label:'Clics organiques', value:seoData.overview.clicks, color:'#10b981', icon:MousePointer},
                {label:'Impressions',       value:seoData.overview.impressions, color:'#8b5cf6', icon:Eye},
                {label:'CTR moyen',         value:`${seoData.overview.ctr}%`, color:'#f97316', icon:Target},
                {label:'Position moyenne',  value:seoData.overview.position, color:'#f59e0b', icon:TrendingUp},
              ].map(k=>(
                <KPI key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color}/>
              ))}
            </div>
            {/* Graphique clics */}
            <div className="section-card p-5">
              <h3 className="text-sm font-black text-slate-200 mb-5">Évolution clics organiques</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={seoData.daily?.map(d=>({
                  date: new Date(d.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}),
                  Clics: d.clicks, Impressions: d.impressions,
                }))}>
                  <defs>
                    <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="date" tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false} interval={6}/>
                  <YAxis tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="Clics" stroke="#10b981" strokeWidth={2.5} fill="url(#sg1)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Top mots-clés */}
            <div className="section-card p-5">
              <h3 className="text-sm font-black text-slate-200 mb-4">Top mots-clés</h3>
              <div className="space-y-2">
                {seoData.keywords?.slice(0,10).map((kw,i)=>(
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2">
                    <span className="text-[10px] text-slate-600 font-mono w-4">{i+1}</span>
                    <span className="text-sm text-slate-300 font-medium flex-1 truncate">{kw.query}</span>
                    <span className="text-xs font-black text-emerald-400">{kw.clicks} clics</span>
                    <span className="text-xs text-slate-500">{kw.impressions} impr.</span>
                    <span className="text-xs font-bold" style={{color:kw.position<=10?'#10b981':kw.position<=20?'#f59e0b':'#f43f5e'}}>
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
              <KPI label="Sessions" value={ga4Data.kpis.sessions.value} change={ga4Data.kpis.sessions.change} icon={Activity} color="#8b5cf6"/>
              <KPI label="Utilisateurs" value={ga4Data.kpis.users.value} change={ga4Data.kpis.users.change} icon={Users} color="#10b981"/>
              <KPI label="Pages vues" value={ga4Data.kpis.pageviews.value} icon={Eye} color="#60a5fa"/>
              <KPI label="Conversions" value={ga4Data.kpis.conversions.value} change={ga4Data.kpis.conversions.change} icon={Target} color="#f97316"/>
            </div>
            <div className="section-card p-5">
              <h3 className="text-sm font-black text-slate-200 mb-5">Trafic GA4</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={ga4Data.daily?.map(d=>({
                  date: new Date(d.date.replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3')).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}),
                  Sessions: d.sessions, Utilisateurs: d.users,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="date" tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="Sessions" stroke="#8b5cf6" strokeWidth={2.5} fill="rgba(139,92,246,0.15)"/>
                  <Area type="monotone" dataKey="Utilisateurs" stroke="#10b981" strokeWidth={2} fill="rgba(16,185,129,0.1)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Message si GA4 non dispo */}
        {activeTab==='ga4' && !ga4Data && (
          <div className="section-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-400"/>
            </div>
            <p className="text-lg font-black text-slate-200 mb-2">GA4 en cours de configuration</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
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
