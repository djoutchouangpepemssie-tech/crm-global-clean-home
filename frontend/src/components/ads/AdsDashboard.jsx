import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  TrendingUp, DollarSign, Users, Target, Zap, Plus,
  RefreshCw, ArrowUp, ArrowDown, Search, Globe,
  BarChart2, Eye, MousePointer, CheckCircle,
  AlertTriangle, ExternalLink, X, Edit2, Trash2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie
} from 'recharts';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api';

const COLORS = ['#4285f4','#1877f2','#e1306c','#10b981','#f59e0b','#8b5cf6'];

const PLATFORMS = [
  {id:'google_ads',    label:'Google Ads',     color:'#4285f4', icon:'🔍', url:'https://ads.google.com'},
  {id:'facebook_ads',  label:'Facebook Ads',   color:'#1877f2', icon:'📘', url:'https://business.facebook.com'},
  {id:'instagram',     label:'Instagram Ads',  color:'#e1306c', icon:'📸', url:'https://business.instagram.com'},
  {id:'tiktok',        label:'TikTok Ads',     color:'#010101', icon:'🎵', url:'https://ads.tiktok.com'},
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl p-3 border text-xs" style={{background:'hsl(224,71%,8%)',borderColor:'rgba(255,255,255,0.1)'}}>
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color}} className="font-bold">
          {p.name}: {typeof p.value==='number'&&p.value>100?p.value.toLocaleString('fr-FR'):p.value}
          {p.name?.includes('€')||p.name?.includes('Budget')||p.name?.includes('CA')?' €':''}
        </p>
      ))}
    </div>
  );
};

const AdsDashboard = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [attribution, setAttribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showForm, setShowForm] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [form, setForm] = useState({
    platform:'google_ads', name:'', budget_monthly:0,
    clicks:0, impressions:0, conversions:0, cost:0, period:'30d'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, attrRes] = await Promise.allSettled([
        axios.get(`${API}/ads/campaigns`, {withCredentials:true}),
        axios.get(`${API}/ads/attribution?period=30d`, {withCredentials:true}),
      ]);
      setCampaigns(campRes.status==='fulfilled' ? (campRes.value.data?.campaigns||campRes.value.data||[]) : []);
      setAttribution(attrRes.status==='fulfilled' ? attrRes.value.data : null);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editCampaign) {
        await axios.put(`${API}/ads/campaigns/${editCampaign.campaign_id}`, form, {withCredentials:true});
        toast.success('Campagne mise à jour');
      } else {
        await axios.post(`${API}/ads/campaigns`, form, {withCredentials:true});
        toast.success('Campagne ajoutée');
      }
      setShowForm(false); setEditCampaign(null);
      setForm({platform:'google_ads',name:'',budget_monthly:0,clicks:0,impressions:0,conversions:0,cost:0,period:'30d'});
      fetchData();
    } catch(err) { toast.error(err.response?.data?.detail||'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette campagne ?')) return;
    try {
      await axios.delete(`${API}/ads/campaigns/${id}`, {withCredentials:true});
      toast.success('Supprimée');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  // Calculs globaux
  const totalBudget = campaigns.reduce((s,c)=>s+parseFloat(c.budget_monthly||c.cost||0),0);
  const totalClicks = campaigns.reduce((s,c)=>s+parseInt(c.clicks||0),0);
  const totalImpressions = campaigns.reduce((s,c)=>s+parseInt(c.impressions||0),0);
  const totalConversions = campaigns.reduce((s,c)=>s+parseInt(c.conversions||0),0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks/totalImpressions)*100).toFixed(2) : 0;
  const avgCPC = totalClicks > 0 ? (totalBudget/totalClicks).toFixed(2) : 0;
  const avgCPA = totalConversions > 0 ? (totalBudget/totalConversions).toFixed(2) : 0;

  // CA attribué depuis attribution
  const caAttrib = attribution?.total_attributed_revenue || attribution?.revenue || 0;
  const roas = totalBudget > 0 ? (caAttrib/totalBudget).toFixed(2) : 0;

  // Par plateforme
  const byPlatform = PLATFORMS.map(p=>({
    ...p,
    budget: campaigns.filter(c=>c.platform===p.id).reduce((s,c)=>s+parseFloat(c.cost||c.budget_monthly||0),0),
    clicks: campaigns.filter(c=>c.platform===p.id).reduce((s,c)=>s+parseInt(c.clicks||0),0),
    conversions: campaigns.filter(c=>c.platform===p.id).reduce((s,c)=>s+parseInt(c.conversions||0),0),
    count: campaigns.filter(c=>c.platform===p.id).length,
  })).filter(p=>p.count>0);

  const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500";

  const TABS = [
    {id:'overview',    label:'Vue globale'},
    {id:'campaigns',   label:'Campagnes'},
    {id:'attribution', label:'Attribution'},
    {id:'links',       label:'Accès plateformes'},
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-400"/>
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Publicités</h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">Suivi budgets, performances & attribution · Global Clean Home</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
          </button>
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{background:'linear-gradient(135deg,#4285f4,#3b82f6)',boxShadow:'0 4px 16px rgba(66,133,244,0.3)'}}>
            <Plus className="w-4 h-4"/> Ajouter campagne
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1.5 bg-white/5 rounded-2xl p-1.5 w-fit overflow-x-auto">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab===t.id?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {label:'Budget total', value:`${Math.round(totalBudget).toLocaleString('fr-FR')} €`, icon:DollarSign, color:'#4285f4'},
              {label:'Clics totaux', value:totalClicks.toLocaleString('fr-FR'), icon:MousePointer, color:'#10b981'},
              {label:'Conversions', value:totalConversions, icon:CheckCircle, color:'#f97316'},
              {label:'ROAS', value:`×${roas}`, icon:TrendingUp, color:'#8b5cf6'},
              {label:'CTR moyen', value:`${avgCTR}%`, icon:Eye, color:'#f59e0b'},
              {label:'CPC moyen', value:`${avgCPC} €`, icon:Target, color:'#f43f5e'},
              {label:'CPA moyen', value:`${avgCPA} €`, icon:Zap, color:'#34d399'},
              {label:'Impressions', value:totalImpressions.toLocaleString('fr-FR'), icon:Globe, color:'#60a5fa'},
            ].map(k=>(
              <div key={k.label} className="section-card p-5">
                <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center"
                  style={{background:`${k.color}20`,border:`1px solid ${k.color}30`}}>
                  <k.icon className="w-4 h-4" style={{color:k.color}}/>
                </div>
                <p className="text-xl font-black text-slate-100 mb-1" style={{fontFamily:'Manrope,sans-serif'}}>{k.value}</p>
                <p className="text-xs text-slate-500 font-semibold">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Par plateforme */}
          {byPlatform.length > 0 ? (
            <div className="section-card p-5">
              <h3 className="text-sm font-black text-slate-200 mb-4">Performance par plateforme</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {byPlatform.map((p,i)=>(
                  <div key={p.id} className="p-4 rounded-2xl border transition-all hover:border-white/10"
                    style={{borderColor:`${p.color}20`,background:`${p.color}08`}}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{p.icon}</span>
                      <p className="text-sm font-black text-slate-200">{p.label}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Budget</span>
                        <span className="font-bold" style={{color:p.color}}>{Math.round(p.budget).toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Clics</span>
                        <span className="font-bold text-slate-300">{p.clicks.toLocaleString('fr-FR')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Conversions</span>
                        <span className="font-bold text-emerald-400">{p.conversions}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">CPA</span>
                        <span className="font-bold text-slate-300">{p.conversions>0?(p.budget/p.conversions).toFixed(2):'-'} €</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="section-card p-10 text-center">
              <Target className="w-14 h-14 text-slate-700 mx-auto mb-4"/>
              <p className="text-slate-400 font-bold mb-2">Aucune campagne enregistrée</p>
              <p className="text-sm text-slate-600 mb-4">Ajoutez vos campagnes Google Ads, Facebook Ads pour suivre vos performances.</p>
              <button onClick={()=>setShowForm(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{background:'linear-gradient(135deg,#4285f4,#3b82f6)'}}>
                + Ajouter ma première campagne
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CAMPAGNES ── */}
      {activeTab==='campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="section-card p-10 text-center">
              <BarChart2 className="w-12 h-12 text-slate-700 mx-auto mb-3"/>
              <p className="text-slate-500 mb-4">Aucune campagne</p>
              <button onClick={()=>setShowForm(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{background:'linear-gradient(135deg,#4285f4,#3b82f6)'}}>
                + Ajouter une campagne
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {campaigns.map(c=>{
                const p = PLATFORMS.find(pl=>pl.id===c.platform)||PLATFORMS[0];
                const cpa = parseInt(c.conversions||0) > 0 ? (parseFloat(c.cost||0)/parseInt(c.conversions)).toFixed(2) : '—';
                const ctr = parseInt(c.impressions||0) > 0 ? ((parseInt(c.clicks||0)/parseInt(c.impressions))*100).toFixed(2) : '—';
                return (
                  <div key={c.campaign_id||c.id} className="section-card p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{p.icon}</span>
                        <div>
                          <p className="font-black text-slate-100">{c.name||'Campagne'}</p>
                          <p className="text-xs font-semibold" style={{color:p.color}}>{p.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={()=>{setEditCampaign(c);setForm({...c});setShowForm(true);}}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5">
                          <Edit2 className="w-3.5 h-3.5"/>
                        </button>
                        <button onClick={()=>handleDelete(c.campaign_id||c.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        {label:'Budget', value:`${parseFloat(c.cost||c.budget_monthly||0).toFixed(0)} €`, color:p.color},
                        {label:'Clics', value:parseInt(c.clicks||0).toLocaleString(), color:'#10b981'},
                        {label:'Conv.', value:c.conversions||0, color:'#f97316'},
                        {label:'CPA', value:`${cpa} €`, color:'#a78bfa'},
                      ].map(m=>(
                        <div key={m.label} className="text-center p-2 rounded-xl" style={{background:`${m.color}10`}}>
                          <p className="text-sm font-black" style={{color:m.color,fontFamily:'Manrope,sans-serif'}}>{m.value}</p>
                          <p className="text-[9px] text-slate-600 font-semibold">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>CTR : <strong className="text-slate-300">{ctr}%</strong></span>
                      <span>Impressions : <strong className="text-slate-300">{parseInt(c.impressions||0).toLocaleString()}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ATTRIBUTION ── */}
      {activeTab==='attribution' && (
        <div className="space-y-5">
          {attribution ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {label:'CA Attribué', value:`${Math.round(caAttrib).toLocaleString('fr-FR')} €`, icon:DollarSign, color:'#10b981'},
                  {label:'Budget total', value:`${Math.round(totalBudget).toLocaleString('fr-FR')} €`, icon:CreditCard, color:'#4285f4'},
                  {label:'ROAS global', value:`×${roas}`, icon:TrendingUp, color:'#8b5cf6'},
                  {label:'Leads attribués', value:attribution.total_leads||totalConversions, icon:Users, color:'#f97316'},
                ].map(k=>(
                  <div key={k.label} className="section-card p-5">
                    <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style={{background:`${k.color}20`,border:`1px solid ${k.color}30`}}>
                      <k.icon className="w-4 h-4" style={{color:k.color}}/>
                    </div>
                    <p className="text-xl font-black text-slate-100 mb-1" style={{fontFamily:'Manrope,sans-serif'}}>{k.value}</p>
                    <p className="text-xs text-slate-500 font-semibold">{k.label}</p>
                  </div>
                ))}
              </div>
              {/* Sources attribution */}
              {attribution.by_source?.length > 0 && (
                <div className="section-card p-5">
                  <h3 className="text-sm font-black text-slate-200 mb-4">Attribution par source</h3>
                  <div className="space-y-3">
                    {attribution.by_source.map((s,i)=>(
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:`${COLORS[i%COLORS.length]}20`}}>
                          {s.source?.includes('google')?'🔍':s.source?.includes('facebook')||s.source?.includes('meta')?'📘':s.source?.includes('organic')?'🌿':'📊'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-200 capitalize">{s.source||'Autre'}</p>
                          <p className="text-xs text-slate-500">{s.leads||0} leads · {s.conversions||0} conversions</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black" style={{color:COLORS[i%COLORS.length]}}>{Math.round(s.revenue||s.ca||0).toLocaleString('fr-FR')} €</p>
                          <p className="text-[10px] text-slate-600">CA attribué</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="section-card p-10 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-3"/>
              <p className="text-slate-400 font-bold mb-2">Données d'attribution non disponibles</p>
              <p className="text-sm text-slate-600">Ajoutez des campagnes et renseignez les sources dans les fiches leads.</p>
            </div>
          )}
        </div>
      )}

      {/* ── LIENS PLATEFORMES ── */}
      {activeTab==='links' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Accès directs à vos plateformes publicitaires.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLATFORMS.map(p=>(
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-105"
                style={{borderColor:`${p.color}25`,background:`${p.color}08`}}>
                <span className="text-3xl">{p.icon}</span>
                <div className="flex-1">
                  <p className="font-black text-slate-100">{p.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.url}</p>
                </div>
                <ExternalLink className="w-4 h-4" style={{color:p.color}}/>
              </a>
            ))}
          </div>
          {/* Conseils */}
          <div className="section-card p-5">
            <h3 className="text-sm font-black text-slate-200 mb-4">💡 Conseils pour globalcleanhome.com</h3>
            <div className="space-y-3">
              {[
                {icon:'🎯', title:'Google Ads', tip:'Ciblez les mots-clés "nettoyage canapé Paris", "ménage domicile Paris 16". Budget recommandé : 500-1000 €/mois.'},
                {icon:'📘', title:'Facebook/Meta Ads', tip:'Retargeting sur les visiteurs du site vitrine. Audiences lookalike depuis vos clients existants. Budget : 200-400 €/mois.'},
                {icon:'🔎', title:'SEO Local', tip:'Optimisez votre fiche Google My Business. Publiez des avis clients régulièrement. Créez du contenu sur Paris et IDF.'},
                {icon:'📸', title:'Instagram', tip:'Avant/après de vos nettoyages canapé et matelas. Stories avec témoignages clients. Très efficace visuellement.'},
              ].map(c=>(
                <div key={c.title} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/2">
                  <span className="text-xl flex-shrink-0">{c.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{c.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{c.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT/EDIT CAMPAGNE */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.8)'}} onClick={()=>{setShowForm(false);setEditCampaign(null);}}>
          <div className="rounded-2xl p-6 max-w-md w-full animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)'}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-100">{editCampaign?'Modifier':'Nouvelle campagne'}</h3>
              <button onClick={()=>{setShowForm(false);setEditCampaign(null);}} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Plateforme</label>
                <select value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))} className={inputCls}>
                  {PLATFORMS.map(p=><option key={p.id} value={p.id} className="bg-slate-800">{p.icon} {p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom de la campagne</label>
                <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required placeholder="Ex: Google Ads - Ménage Paris" className={inputCls}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {k:'cost',label:'Budget dépensé (€)',placeholder:'500'},
                  {k:'clicks',label:'Clics',placeholder:'1200'},
                  {k:'impressions',label:'Impressions',placeholder:'50000'},
                  {k:'conversions',label:'Conversions',placeholder:'15'},
                ].map(f=>(
                  <div key={f.k}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">{f.label}</label>
                    <input type="number" min="0" value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.placeholder} className={inputCls}/>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>{setShowForm(false);setEditCampaign(null);}} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-sm font-bold">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold" style={{background:'linear-gradient(135deg,#4285f4,#3b82f6)'}}>
                  {editCampaign?'Mettre à jour':'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsDashboard;
