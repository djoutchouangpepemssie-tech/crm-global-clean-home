import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  TrendingUp, DollarSign, Users, Target, Zap, Plus,
  RefreshCw, ArrowUp, ArrowDown, Search, Globe,
  BarChart2, Eye, MousePointer, CheckCircle, Link,
  AlertTriangle, ExternalLink, X, Edit2, Trash2,
  Wifi, WifiOff, Settings, Play, Pause, BarChart3
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api';

const COLORS = ['#4285f4','#1877f2','#e1306c','#10b981','#f59e0b','#8b5cf6'];
const META_AD_ACCOUNT_ID = 'act_1456980709277771';

const PLATFORMS = [
  {id:'google_ads',   label:'Google Ads',   color:'#4285f4', icon:'🔍', bg:'rgba(66,133,244,0.1)'},
  {id:'facebook_ads', label:'Facebook Ads', color:'#1877f2', icon:'📘', bg:'rgba(24,119,242,0.1)'},
  {id:'instagram',    label:'Instagram',    color:'#e1306c', icon:'📸', bg:'rgba(225,48,108,0.1)'},
  {id:'linkedin',     label:'LinkedIn Ads', color:'#0077b5', icon:'💼', bg:'rgba(0,119,181,0.1)'},
];

const OBJECTIVES = [
  {id:'LEAD_GENERATION',  label:'Génération de leads'},
  {id:'TRAFFIC',          label:'Trafic vers site'},
  {id:'AWARENESS',        label:'Notoriété'},
  {id:'CONVERSIONS',      label:'Conversions'},
  {id:'REACH',            label:'Portée'},
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl p-3 border text-xs" style={{background:'hsl(224,71%,8%)',borderColor:'rgba(255,255,255,0.1)'}}>
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color}} className="font-bold">
          {p.name}: {typeof p.value==='number'&&p.value>100?p.value.toLocaleString('fr-FR'):p.value}
        </p>
      ))}
    </div>
  );
};

const StatusBadge = ({status}) => {
  const config = {
    active:   {label:'Active',  color:'#10b981', bg:'rgba(16,185,129,0.1)'},
    paused:   {label:'Pausée',  color:'#f59e0b', bg:'rgba(245,158,11,0.1)'},
    removed:  {label:'Archivée',color:'#f43f5e', bg:'rgba(244,63,94,0.1)'},
    enabled:  {label:'Active',  color:'#10b981', bg:'rgba(16,185,129,0.1)'},
    disabled: {label:'Pausée',  color:'#f59e0b', bg:'rgba(245,158,11,0.1)'},
  }[status?.toLowerCase()] || {label:status, color:'#64748b', bg:'rgba(100,116,139,0.1)'};
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1"
      style={{color:config.color, background:config.bg}}>
      <div className="w-1.5 h-1.5 rounded-full" style={{background:config.color}}/>
      {config.label}
    </span>
  );
};

const AdsDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [googleCampaigns, setGoogleCampaigns] = useState([]);
  const [metaCampaigns, setMetaCampaigns] = useState([]);
  const [manualCampaigns, setManualCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('connexions');
  const [showForm, setShowForm] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [connectingMeta, setConnectingMeta] = useState(false);
  const [form, setForm] = useState({
    platform:'google_ads', name:'', objective:'LEAD_GENERATION',
    budget_daily:0, cost:0, clicks:0, impressions:0, conversions:0, status:'active'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, gadsRes, metaRes, manualRes] = await Promise.allSettled([
        axios.get(`${API}/ads-connect/summary`, {withCredentials:true}),
        axios.get(`${API}/ads-connect/google/campaigns`, {withCredentials:true}),
        axios.get(`${API}/ads-connect/meta/campaigns`, {withCredentials:true}),
        axios.get(`${API}/ads/campaigns`, {withCredentials:true}),
      ]);
      if (summaryRes.status==='fulfilled') setSummary(summaryRes.value.data);
      if (gadsRes.status==='fulfilled') setGoogleCampaigns(gadsRes.value.data?.campaigns||[]);
      if (metaRes.status==='fulfilled') setMetaCampaigns(metaRes.value.data?.campaigns||[]);
      if (manualRes.status==='fulfilled') setManualCampaigns(manualRes.value.data?.campaigns||manualRes.value.data||[]);

      // Vérifier si Meta vient d'être connecté
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('meta_connected')) {
        toast.success('✅ Meta Ads connecté !');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const connectMeta = async () => {
    setConnectingMeta(true);
    try {
      const res = await axios.get(`${API}/ads-connect/meta/auth`, {withCredentials:true});
      window.location.href = res.data.authorization_url;
    } catch(err) {
      toast.error(err.response?.data?.detail || 'META_APP_ID non configuré sur Railway');
    }
    setConnectingMeta(false);
  };

  const disconnectMeta = async () => {
    await axios.get(`${API}/ads-connect/meta/disconnect`, {withCredentials:true});
    toast.success('Meta Ads déconnecté');
    fetchData();
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    try {
      if (editCampaign) {
        await axios.put(`${API}/ads/campaigns/${editCampaign.campaign_id||editCampaign.id}`, form, {withCredentials:true});
        toast.success('Campagne mise à jour');
      } else {
        await axios.post(`${API}/ads/campaigns`, form, {withCredentials:true});
        toast.success('Campagne ajoutée');
      }
      setShowForm(false); setEditCampaign(null);
      setForm({platform:'google_ads',name:'',objective:'LEAD_GENERATION',budget_daily:0,cost:0,clicks:0,impressions:0,conversions:0,status:'active'});
      fetchData();
    } catch(err) { toast.error(err.response?.data?.detail||'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ?')) return;
    try {
      await axios.delete(`${API}/ads/campaigns/${id}`, {withCredentials:true});
      toast.success('Supprimée'); fetchData();
    } catch { toast.error('Erreur'); }
  };

  // Toutes les campagnes combinées
  const allCampaigns = [
    ...googleCampaigns.map(c=>({...c,_source:'api'})),
    ...metaCampaigns.map(c=>({...c,_source:'api'})),
    ...manualCampaigns.map(c=>({...c,_source:'manual'})),
  ];

  const totalBudget = allCampaigns.reduce((s,c)=>s+parseFloat(c.cost||c.budget_daily||0),0);
  const totalClicks = allCampaigns.reduce((s,c)=>s+parseInt(c.clicks||0),0);
  const totalConversions = allCampaigns.reduce((s,c)=>s+parseInt(c.conversions||0),0);
  const totalImpressions = allCampaigns.reduce((s,c)=>s+parseInt(c.impressions||0),0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks/totalImpressions)*100).toFixed(2) : '0';
  const avgCPA = totalConversions > 0 ? (totalBudget/totalConversions).toFixed(2) : '0';

  const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all";

  const TABS = [
    {id:'connexions',  label:'🔌 Connexions'},
    {id:'overview',    label:'📊 Vue globale'},
    {id:'google',      label:'🔍 Google Ads'},
    {id:'meta',        label:'📘 Meta Ads'},
    {id:'manual',      label:'✏️ Manuel'},
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
          <p className="text-slate-500 text-sm ml-10">Google Ads · Facebook Ads · Suivi & création campagnes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
          </button>
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{background:'linear-gradient(135deg,#4285f4,#3b82f6)'}}>
            <Plus className="w-4 h-4"/> Nouvelle campagne
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1.5 bg-white/5 rounded-2xl p-1.5 overflow-x-auto w-fit">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab===t.id?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONNEXIONS ── */}
      {activeTab==='connexions' && (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">Connectez vos comptes publicitaires pour importer automatiquement vos campagnes et performances.</p>

          {/* Google Ads */}
          <div className="section-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{background:'rgba(66,133,244,0.15)',border:'1px solid rgba(66,133,244,0.3)'}}>🔍</div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Google Ads</h3>
                  <p className="text-sm text-slate-500">Customer ID : 282-589-9307</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {summary?.google_ads?.connected ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                    <Wifi className="w-4 h-4 text-emerald-400"/>
                    <span className="text-xs font-bold text-emerald-400">Connecté</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/10">
                    <WifiOff className="w-4 h-4 text-red-400"/>
                    <span className="text-xs font-bold text-red-400">Non connecté</span>
                  </div>
                )}
              </div>
            </div>

            {summary?.google_ads?.needs_developer_token ? (
              <div className="rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-sm font-bold text-amber-300">Developer Token requis</p>
                    <p className="text-xs text-slate-500 mt-1">Pour accéder à l'API Google Ads, un Developer Token est nécessaire. Voici comment l'obtenir :</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-slate-400 ml-8">
                  <p>1. Va sur <a href="https://ads.google.com/nav/selectaccount" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Ads</a> → Outils → Centre API</p>
                  <p>2. Demande un Developer Token (accès test disponible immédiatement)</p>
                  <p>3. Ajoute la variable <code className="bg-white/10 px-1 rounded">GOOGLE_ADS_DEVELOPER_TOKEN</code> sur Railway</p>
                </div>
                <a href="https://developers.google.com/google-ads/api/docs/get-started/dev-token" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 ml-8">
                  <ExternalLink className="w-3.5 h-3.5"/> Guide officiel Google
                </a>
              </div>
            ) : (
              <div className="rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-xs text-emerald-400 font-semibold">✅ Google Ads utilise votre connexion Gmail existante. Les campagnes sont importées automatiquement.</p>
              </div>
            )}

            {googleCampaigns.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{googleCampaigns.length} campagne(s) importée(s)</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {googleCampaigns.slice(0,3).map(c=>(
                    <div key={c.campaign_id} className="p-2 rounded-xl bg-white/3 border border-white/5">
                      <p className="font-bold text-slate-300 truncate">{c.name}</p>
                      <p className="text-slate-500">{c.clicks} clics · {c.cost} €</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Meta Ads */}
          <div className="section-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{background:'rgba(24,119,242,0.15)',border:'1px solid rgba(24,119,242,0.3)'}}>📘</div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Facebook / Meta Ads</h3>
                  <p className="text-sm text-slate-500">Ad Account ID : 1456980709277771</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {summary?.meta_ads?.connected ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                      <Wifi className="w-4 h-4 text-emerald-400"/>
                      <span className="text-xs font-bold text-emerald-400">Connecté</span>
                    </div>
                    <button onClick={disconnectMeta}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all">
                      Déconnecter
                    </button>
                  </>
                ) : (
                  <button onClick={connectMeta} disabled={connectingMeta}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{background:'linear-gradient(135deg,#1877f2,#0d65d9)'}}>
                    {connectingMeta ? '⏳ Connexion...' : '🔗 Connecter Meta Ads'}
                  </button>
                )}
              </div>
            </div>

            {!summary?.meta_ads?.connected ? (
              <div className="rounded-2xl p-4 border border-blue-500/20 bg-blue-500/5 space-y-3">
                <p className="text-sm font-bold text-blue-300">Configuration requise sur Railway :</p>
                <div className="space-y-2 text-xs text-slate-400">
                  <p>1. Va sur <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Meta for Developers</a> → Crée une app</p>
                  <p>2. Ajoute le produit <strong className="text-slate-300">Marketing API</strong></p>
                  <p>3. Copie l'<strong className="text-slate-300">App ID</strong> et l'<strong className="text-slate-300">App Secret</strong></p>
                  <p>4. Ajoute sur Railway : <code className="bg-white/10 px-1 rounded">META_APP_ID</code> et <code className="bg-white/10 px-1 rounded">META_APP_SECRET</code></p>
                  <p>5. Dans Meta App → Paramètres → URIs de redirection OAuth valides, ajoute :</p>
                  <code className="block bg-white/5 px-3 py-2 rounded-xl text-emerald-400 mt-1 text-[11px]">
                    https://crm-global-clean-home-production.up.railway.app/api/ads-connect/meta/callback
                  </code>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl p-3 border border-emerald-500/20 bg-emerald-500/5 mb-4">
                  <p className="text-xs text-emerald-400 font-semibold">✅ Meta Ads connecté · {metaCampaigns.length} campagne(s) importée(s)</p>
                </div>
                {metaCampaigns.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {metaCampaigns.slice(0,3).map(c=>(
                      <div key={c.campaign_id} className="p-2 rounded-xl bg-white/3 border border-white/5">
                        <p className="font-bold text-slate-300 truncate">{c.name}</p>
                        <p className="text-slate-500">{c.clicks} clics · {c.cost} €</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* LinkedIn - coming soon */}
          <div className="section-card p-6 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{background:'rgba(0,119,181,0.15)',border:'1px solid rgba(0,119,181,0.3)'}}>💼</div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">LinkedIn Ads</h3>
                  <p className="text-sm text-slate-500">Connexion bientôt disponible</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 text-slate-500 border border-white/10">Bientôt</span>
            </div>
          </div>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {label:'Budget total', value:`${Math.round(totalBudget).toLocaleString('fr-FR')} €`, icon:DollarSign, color:'#4285f4'},
              {label:'Clics totaux', value:totalClicks.toLocaleString('fr-FR'), icon:MousePointer, color:'#10b981'},
              {label:'Conversions', value:totalConversions, icon:CheckCircle, color:'#f97316'},
              {label:'CTR moyen', value:`${avgCTR}%`, icon:Eye, color:'#8b5cf6'},
              {label:'CPA moyen', value:`${avgCPA} €`, icon:Target, color:'#f43f5e'},
              {label:'Impressions', value:totalImpressions.toLocaleString('fr-FR'), icon:Globe, color:'#60a5fa'},
              {label:'Campagnes actives', value:allCampaigns.filter(c=>c.status==='active'||c.status==='enabled').length, icon:Zap, color:'#34d399'},
              {label:'Plateformes', value:new Set(allCampaigns.map(c=>c.platform)).size, icon:Link, color:'#a78bfa'},
            ].map(k=>(
              <div key={k.label} className="section-card p-4">
                <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center"
                  style={{background:`${k.color}20`,border:`1px solid ${k.color}30`}}>
                  <k.icon className="w-4 h-4" style={{color:k.color}}/>
                </div>
                <p className="text-xl font-black text-slate-100 mb-1" style={{fontFamily:'Manrope,sans-serif'}}>{k.value}</p>
                <p className="text-xs text-slate-500 font-semibold">{k.label}</p>
              </div>
            ))}
          </div>

          {allCampaigns.length === 0 ? (
            <div className="section-card p-10 text-center">
              <BarChart2 className="w-14 h-14 text-slate-700 mx-auto mb-4"/>
              <p className="text-slate-400 font-bold mb-2">Aucune campagne</p>
              <p className="text-sm text-slate-600 mb-4">Connectez vos comptes ou ajoutez vos campagnes manuellement.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={()=>setActiveTab('connexions')}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5">
                  🔌 Connecter un compte
                </button>
                <button onClick={()=>setShowForm(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{background:'linear-gradient(135deg,#4285f4,#3b82f6)'}}>
                  ✏️ Saisie manuelle
                </button>
              </div>
            </div>
          ) : (
            <div className="section-card p-5">
              <h3 className="text-sm font-black text-slate-200 mb-4">Budget par plateforme</h3>
              <div className="space-y-3">
                {PLATFORMS.filter(p=>allCampaigns.some(c=>c.platform===p.id)).map((p,i)=>{
                  const pCamps = allCampaigns.filter(c=>c.platform===p.id);
                  const budget = pCamps.reduce((s,c)=>s+parseFloat(c.cost||0),0);
                  const clicks = pCamps.reduce((s,c)=>s+parseInt(c.clicks||0),0);
                  const convs = pCamps.reduce((s,c)=>s+parseInt(c.conversions||0),0);
                  const pct = totalBudget > 0 ? (budget/totalBudget)*100 : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-4">
                      <span className="text-xl w-8 flex-shrink-0">{p.icon}</span>
                      <div className="w-24 flex-shrink-0">
                        <p className="text-xs font-bold text-slate-300 truncate">{p.label}</p>
                        <p className="text-[10px] text-slate-600">{pCamps.length} camp.</p>
                      </div>
                      <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`,background:p.color}}/>
                      </div>
                      <div className="text-right w-20 flex-shrink-0">
                        <p className="text-xs font-black" style={{color:p.color}}>{Math.round(budget).toLocaleString('fr-FR')} €</p>
                        <p className="text-[10px] text-slate-600">{clicks} clics</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GOOGLE ADS ── */}
      {activeTab==='google' && (
        <div className="space-y-4">
          {!summary?.google_ads?.connected || summary?.google_ads?.needs_developer_token ? (
            <div className="section-card p-8 text-center">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg font-black text-slate-200 mb-2">Google Ads non configuré</p>
              <p className="text-sm text-slate-500 mb-4">Configurez le Developer Token pour voir vos campagnes.</p>
              <button onClick={()=>setActiveTab('connexions')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5">
                Voir la configuration →
              </button>
            </div>
          ) : googleCampaigns.length === 0 ? (
            <div className="section-card p-8 text-center">
              <p className="text-slate-500">Aucune campagne Google Ads trouvée</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {googleCampaigns.map(c=>(
                  <div key={c.campaign_id} className="section-card p-5"
                    style={{borderLeft:'3px solid #4285f4'}}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🔍</span>
                        <div>
                          <p className="font-black text-slate-100 text-sm">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={c.status}/>
                            {c.type && <span className="text-[10px] text-slate-600">{c.type}</span>}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">API</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        {l:'Budget',v:`${c.cost} €`,c:'#4285f4'},
                        {l:'Clics',v:parseInt(c.clicks).toLocaleString(),c:'#10b981'},
                        {l:'Conv.',v:c.conversions,c:'#f97316'},
                        {l:'CTR',v:`${c.ctr}%`,c:'#a78bfa'},
                      ].map(m=>(
                        <div key={m.l} className="text-center p-2 rounded-xl" style={{background:`${m.c}10`}}>
                          <p className="text-sm font-black" style={{color:m.c,fontFamily:'Manrope,sans-serif'}}>{m.v}</p>
                          <p className="text-[9px] text-slate-600">{m.l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                      <span>Impressions : {parseInt(c.impressions).toLocaleString()}</span>
                      <span>CPC moy : {c.avg_cpc} €</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── META ADS ── */}
      {activeTab==='meta' && (
        <div className="space-y-5">
          {!summary?.meta_ads?.connected ? (
            <div className="section-card p-8 text-center">
              <p className="text-4xl mb-4">📘</p>
              <p className="text-lg font-black text-slate-200 mb-2">Meta Ads non connecté</p>
              <button onClick={()=>setActiveTab('connexions')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#1877f2,#0d65d9)'}}>Connecter →</button>
            </div>
          ) : (
            <>
              {/* KPIs Meta */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {l:'Budget dépensé', v:`${metaCampaigns.reduce((s,c)=>s+c.cost,0).toFixed(2)} €`, color:'#1877f2', icon:DollarSign},
                  {l:'Clics totaux',   v:metaCampaigns.reduce((s,c)=>s+c.clicks,0).toLocaleString(), color:'#10b981', icon:MousePointer},
                  {l:'Impressions',    v:metaCampaigns.reduce((s,c)=>s+c.impressions,0).toLocaleString(), color:'#a78bfa', icon:Eye},
                  {l:'Conversions',   v:metaCampaigns.reduce((s,c)=>s+c.conversions,0), color:'#f97316', icon:Target},
                  {l:'CTR moyen',     v:`${metaCampaigns.length>0?(metaCampaigns.reduce((s,c)=>s+c.ctr,0)/metaCampaigns.length).toFixed(2):0}%`, color:'#f59e0b', icon:TrendingUp},
                  {l:'CPC moyen',     v:`${metaCampaigns.length>0?(metaCampaigns.reduce((s,c)=>s+c.avg_cpc,0)/metaCampaigns.length).toFixed(2):0} €`, color:'#34d399', icon:Zap},
                  {l:'CPA moyen',     v:metaCampaigns.reduce((s,c)=>s+c.conversions,0)>0?`${(metaCampaigns.reduce((s,c)=>s+c.cost,0)/metaCampaigns.reduce((s,c)=>s+c.conversions,0)).toFixed(2)} €`:'—', color:'#f43f5e', icon:Target},
                  {l:'Campagnes',     v:metaCampaigns.length, color:'#60a5fa', icon:BarChart2},
                ].map(k=>(
                  <div key={k.l} className="section-card p-4">
                    <div className="w-8 h-8 rounded-xl mb-2 flex items-center justify-center" style={{background:`${k.color}20`,border:`1px solid ${k.color}30`}}>
                      <k.icon className="w-4 h-4" style={{color:k.color}}/>
                    </div>
                    <p className="text-lg font-black text-slate-100 mb-0.5" style={{fontFamily:'Manrope,sans-serif'}}>{k.v}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{k.l}</p>
                  </div>
                ))}
              </div>

              {/* Campagnes */}
              <div className="section-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-200">Campagnes Meta ({metaCampaigns.length})</h3>
                  <button onClick={()=>{setForm(p=>({...p,platform:'facebook_ads'}));setShowForm(true);}}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                    style={{background:'linear-gradient(135deg,#1877f2,#0d65d9)'}}>
                    <Plus className="w-3.5 h-3.5"/> Nouvelle campagne
                  </button>
                </div>
                {metaCampaigns.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">Aucune campagne trouvée</p>
                ) : (
                  <div className="space-y-3">
                    {metaCampaigns.map(c=>{
                      const cpa = c.conversions > 0 ? (c.cost/c.conversions).toFixed(2) : '—';
                      const roas = c.cost > 0 ? (c.conversions * 50 / c.cost).toFixed(1) : '—';
                      return (
                        <div key={c.campaign_id} className="p-4 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/3 transition-all"
                          style={{borderLeft:'3px solid #1877f2'}}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">📘</span>
                              <div>
                                <p className="font-black text-slate-100 text-sm">{c.name}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <StatusBadge status={c.status}/>
                                  {c.objective && <span className="text-[10px] text-slate-600">{c.objective.replace('OUTCOME_','').toLowerCase()}</span>}
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">API Live</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
                            {[
                              {l:'Dépensé',    v:`${c.cost} €`,                      color:'#1877f2'},
                              {l:'Impressions',v:c.impressions.toLocaleString(),      color:'#a78bfa'},
                              {l:'Clics',      v:c.clicks.toLocaleString(),           color:'#10b981'},
                              {l:'CTR',        v:`${c.ctr}%`,                         color:'#f59e0b'},
                              {l:'CPC',        v:`${c.avg_cpc} €`,                    color:'#60a5fa'},
                              {l:'Conv.',      v:c.conversions,                       color:'#f97316'},
                              {l:'CPA',        v:`${cpa}${cpa!=='—'?' €':''}`, color:'#f43f5e'},
                            ].map(m=>(
                              <div key={m.l} className="text-center p-2 rounded-xl" style={{background:`${m.color}10`}}>
                                <p className="text-xs font-black" style={{color:m.color,fontFamily:'Manrope,sans-serif'}}>{m.v}</p>
                                <p className="text-[9px] text-slate-600">{m.l}</p>
                              </div>
                            ))}
                          </div>
                          {/* Barre performance */}
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-16">Performance</span>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width:`${Math.min(c.ctr*10,100)}%`,
                                background:'linear-gradient(90deg,#1877f2,#10b981)'
                              }}/>
                            </div>
                            <span className="text-[10px] text-slate-500">CTR {c.ctr}%</span>
                          </div>
                          {/* Lien Meta */}
                          <a href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${META_AD_ACCOUNT_ID?.replace('act_','')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-2 transition-colors">
                            <ExternalLink className="w-3 h-3"/> Voir dans Meta Ads Manager
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MANUEL ── */}
      {activeTab==='manual' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Campagnes saisies manuellement</p>
            <button onClick={()=>setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{background:'linear-gradient(135deg,#4285f4,#3b82f6)'}}>
              <Plus className="w-4 h-4"/> Ajouter
            </button>
          </div>
          {manualCampaigns.length === 0 ? (
            <div className="section-card p-10 text-center">
              <BarChart2 className="w-12 h-12 text-slate-700 mx-auto mb-3"/>
              <p className="text-slate-500 mb-4">Aucune campagne manuelle</p>
              <button onClick={()=>setShowForm(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{background:'linear-gradient(135deg,#4285f4,#3b82f6)'}}>
                + Ajouter une campagne
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {manualCampaigns.map(c=>{
                const p = PLATFORMS.find(pl=>pl.id===c.platform)||PLATFORMS[0];
                return (
                  <div key={c.campaign_id||c.id} className="section-card p-5" style={{borderLeft:`3px solid ${p.color}`}}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.icon}</span>
                        <div>
                          <p className="font-black text-slate-100 text-sm">{c.name}</p>
                          <p className="text-xs text-slate-500">{p.label}</p>
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
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        {l:'Coût',v:`${parseFloat(c.cost||0).toFixed(0)} €`,cc:p.color},
                        {l:'Clics',v:parseInt(c.clicks||0).toLocaleString(),cc:'#10b981'},
                        {l:'Conv.',v:c.conversions||0,cc:'#f97316'},
                        {l:'CPA',v:parseInt(c.conversions||0)>0?`${(parseFloat(c.cost||0)/parseInt(c.conversions)).toFixed(0)} €`:'—',cc:'#a78bfa'},
                      ].map(m=>(
                        <div key={m.l} className="text-center p-2 rounded-xl" style={{background:`${m.cc}10`}}>
                          <p className="text-sm font-black" style={{color:m.cc,fontFamily:'Manrope,sans-serif'}}>{m.v}</p>
                          <p className="text-[9px] text-slate-600">{m.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL CAMPAGNE */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.8)'}}
          onClick={()=>{setShowForm(false);setEditCampaign(null);}}>
          <div className="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-100">{editCampaign?'Modifier':'Nouvelle campagne'}</h3>
              <button onClick={()=>{setShowForm(false);setEditCampaign(null);}} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <form onSubmit={handleSaveCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Plateforme *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p=>(
                    <button key={p.id} type="button" onClick={()=>setForm(f=>({...f,platform:p.id}))}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${form.platform===p.id?'text-white':'text-slate-500 border-white/5 hover:border-white/10'}`}
                      style={form.platform===p.id?{borderColor:`${p.color}40`,background:`${p.color}15`}:{}}>
                      <span className="text-lg">{p.icon}</span>
                      <div>
                        <p className="text-xs font-bold">{p.label}</p>
                        {p.id==='facebook_ads'&&summary?.meta_ads?.connected&&<p className="text-[9px] text-emerald-400">✅ Connecté</p>}
                        {p.id==='google_ads'&&!summary?.google_ads?.needs_developer_token&&<p className="text-[9px] text-emerald-400">✅ Connecté</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Info campagne Meta */}
              {form.platform==='facebook_ads'&&summary?.meta_ads?.connected&&(
                <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <p className="text-xs text-blue-300 font-semibold">📘 Campagne Meta Ads</p>
                  <p className="text-[10px] text-slate-500 mt-1">Compte : {META_AD_ACCOUNT_ID} · La campagne sera créée en mode PAUSED</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom de la campagne *</label>
                <input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                  placeholder="Ex: Nettoyage canapé Paris - Google Ads" className={inputCls}/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Objectif</label>
                <select value={form.objective} onChange={e=>setForm(p=>({...p,objective:e.target.value}))} className={inputCls}>
                  {OBJECTIVES.map(o=><option key={o.id} value={o.id} className="bg-slate-800">{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {k:'cost',l:'Coût dépensé (€)',ph:'500'},
                  {k:'budget_daily',l:'Budget quotidien (€)',ph:'20'},
                  {k:'impressions',l:'Impressions',ph:'50000'},
                  {k:'clicks',l:'Clics',ph:'1200'},
                  {k:'conversions',l:'Conversions / Leads',ph:'15'},
                ].map(f=>(
                  <div key={f.k}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">{f.l}</label>
                    <input type="number" min="0" value={form[f.k]||0}
                      onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}
                      placeholder={f.ph} className={inputCls}/>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Statut</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className={inputCls}>
                    <option value="active" className="bg-slate-800">✅ Active</option>
                    <option value="paused" className="bg-slate-800">⏸️ Pausée</option>
                    <option value="ended" className="bg-slate-800">🏁 Terminée</option>
                  </select>
                </div>
              </div>
              {/* Résumé calculs */}
              {(form.cost > 0 && form.conversions > 0) && (
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-xs font-bold text-emerald-300 mb-2">Calculs automatiques</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="font-black text-emerald-400">{(parseFloat(form.cost)/parseInt(form.conversions)).toFixed(2)} €</p>
                      <p className="text-slate-600">CPA</p>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-blue-400">{parseInt(form.impressions)>0?((parseInt(form.clicks)/parseInt(form.impressions))*100).toFixed(2):'—'}%</p>
                      <p className="text-slate-600">CTR</p>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-violet-400">{parseInt(form.clicks)>0?(parseFloat(form.cost)/parseInt(form.clicks)).toFixed(2):'—'} €</p>
                      <p className="text-slate-600">CPC</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>{setShowForm(false);setEditCampaign(null);}}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-sm font-bold">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold"
                  style={{background:'linear-gradient(135deg,#4285f4,#3b82f6)'}}>
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
