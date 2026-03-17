import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Users, Target, Zap, Plus, RefreshCw, ArrowUpRight, ArrowDownRight, ShoppingCart, Globe, Search, BarChart3, Settings, Link, Eye, MousePointer, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const TABS = [
  { id: 'overview', label: 'Vue globale', icon: BarChart3 },
  { id: 'google', label: 'Google Ads', icon: Search },
  { id: 'facebook', label: 'Meta Ads', icon: Globe },
  { id: 'seo', label: 'SEO', icon: TrendingUp },
  { id: 'attribution', label: 'Attribution', icon: Target },
  { id: 'connect', label: 'Connexions', icon: Link },
];

const PLATFORM_CONFIG = {
  google_ads: { label: 'Google Ads', color: '#4285f4', icon: '🔍' },
  facebook_ads: { label: 'Facebook Ads', color: '#1877f2', icon: '📘' },
  instagram: { label: 'Instagram', color: '#e1306c', icon: '📸' },
  seo: { label: 'SEO Organique', color: '#34d399', icon: '🔎' },
  site_web: { label: 'Site Web', color: '#a78bfa', icon: '🌍' },
};

// ============ METRIC CARD ============
const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend, change }) => (
  <div className="metric-card">
    <div className="flex items-center justify-between mb-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${color}15`,border:`1px solid ${color}30`}}>
        <Icon className="w-4 h-4" style={{color}} />
      </div>
      {change !== undefined && (
        <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          trend === 'up' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
          trend === 'down' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
          'text-slate-400 bg-white/5 border-white/10'
        }`}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-100">{value}</p>
    <p className="text-xs text-slate-500 mt-1">{title}</p>
    {subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
  </div>
);

// ============ ADD SPEND MODAL ============
const AddSpendModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    platform: 'google_ads', campaign_name: '',
    date: new Date().toISOString().split('T')[0],
    spend: '', impressions: '', clicks: '', conversions: ''
  });

  const handleSave = async () => {
    if (!form.campaign_name || !form.spend) { toast.error('Champs requis manquants'); return; }
    try {
      await axios.post(`${API_URL}/ads/spend`, {
        ...form, spend: parseFloat(form.spend),
        impressions: parseInt(form.impressions) || 0,
        clicks: parseInt(form.clicks) || 0,
        conversions: parseInt(form.conversions) || 0,
      }, { withCredentials: true });
      toast.success('Depense enregistree');
      onSave();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="section-card w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-5">Saisir des depenses publicitaires</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Plateforme</label>
              <select value={form.platform} onChange={e => setForm(p=>({...p, platform: e.target.value}))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                <option value="google_ads" className="bg-slate-800">Google Ads</option>
                <option value="facebook_ads" className="bg-slate-800">Facebook Ads</option>
                <option value="instagram" className="bg-slate-800">Instagram</option>
                <option value="meta_ads" className="bg-slate-800">Meta Ads</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p=>({...p, date: e.target.value}))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Nom de la campagne *</label>
            <input value={form.campaign_name} onChange={e => setForm(p=>({...p, campaign_name: e.target.value}))}
              placeholder="ex: Nettoyage Canape Paris - Ete 2025"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Depenses (EUR) *</label>
              <input type="number" step="0.01" value={form.spend} onChange={e => setForm(p=>({...p, spend: e.target.value}))}
                placeholder="0.00" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Conversions</label>
              <input type="number" value={form.conversions} onChange={e => setForm(p=>({...p, conversions: e.target.value}))}
                placeholder="0" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Impressions</label>
              <input type="number" value={form.impressions} onChange={e => setForm(p=>({...p, impressions: e.target.value}))}
                placeholder="0" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Clics</label>
              <input type="number" value={form.clicks} onChange={e => setForm(p=>({...p, clicks: e.target.value}))}
                placeholder="0" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm font-medium">Annuler</button>
          <button onClick={handleSave} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all">Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// ============ OVERVIEW TAB ============
const OverviewTab = ({ data, onAddSpend }) => {
  const g = data?.global || {};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Depenses totales" value={`${g.total_spend || 0}EUR`} icon={DollarSign} color="#f59e0b" subtitle="Toutes plateformes" />
        <MetricCard title="Leads generes" value={g.total_leads || 0} icon={Users} color="#60a5fa" subtitle="Via publicites" />
        <MetricCard title="Cout par lead" value={`${g.cpl || 0}EUR`} icon={Target} color="#a78bfa" subtitle="CPL moyen" />
        <MetricCard title="ROI" value={`${g.roi || 0}%`} icon={TrendingUp} color={g.roi > 0 ? '#34d399' : '#f43f5e'} trend={g.roi > 0 ? 'up' : 'down'} change={`${Math.abs(g.roi || 0)}%`} />
        <MetricCard title="Conversions" value={g.total_conversions || 0} icon={ShoppingCart} color="#34d399" subtitle="Devis acceptes" />
        <MetricCard title="Revenue" value={`${g.total_revenue || 0}EUR`} icon={DollarSign} color="#34d399" subtitle="Genere via ads" />
        <MetricCard title="CPA" value={`${g.cpa || 0}EUR`} icon={Zap} color="#06b6d4" subtitle="Cout par acquisition" />
        <MetricCard title="ROAS" value={`${g.roas || 0}x`} icon={ArrowUpRight} color="#a78bfa" subtitle="Retour sur invest." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Evolution des depenses et leads</h3>
          {(data?.spend_timeline || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.spend_timeline}>
                <defs>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{background:'hsl(224,71%,8%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',fontSize:'12px'}} />
                <Area type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2} fill="url(#gs)" dot={false} name="Depenses (EUR)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px]">
              <TrendingUp className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm mb-2">Aucune depense enregistree</p>
              <button onClick={onAddSpend} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                + Saisir mes premieres depenses
              </button>
            </div>
          )}
        </div>

        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Performance par canal</h3>
          <div className="space-y-3">
            {(data?.platforms || []).length > 0 ? data.platforms.slice(0,5).map((p, i) => {
              const cfg = PLATFORM_CONFIG[p.platform] || { label: p.platform, color: '#94a3b8', icon: '📊' };
              const maxSpend = Math.max(...data.platforms.map(x => x.spend));
              const pct = maxSpend > 0 ? (p.spend / maxSpend) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{cfg.icon}</span>
                      <span className="text-xs font-semibold text-slate-300">{cfg.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold" style={{color: cfg.color}}>{p.spend}EUR</span>
                      <span className="text-[10px] text-slate-500 ml-2">{p.leads} leads</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background: cfg.color}} />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>CPL: {p.cpl}EUR</span>
                    <span>ROI: {p.roi}%</span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8 text-slate-600 text-sm">Aucune donnee</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ GOOGLE ADS TAB ============
const GoogleAdsTab = ({ data }) => {
  const gLeads = (data?.platforms || []).find(p => p.platform === 'google_ads') || {};
  return (
    <div className="space-y-5">
      <div className="section-card p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-xl">🔍</div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Google Ads</h3>
            <p className="text-xs text-slate-500">Campagnes Search, Display et Performance Max</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { l:'Depenses', v:`${gLeads.spend || 0}EUR`, c:'#4285f4' },
            { l:'Leads', v: gLeads.leads || 0, c:'#60a5fa' },
            { l:'CPL', v:`${gLeads.cpl || 0}EUR`, c:'#a78bfa' },
            { l:'CTR', v:`${gLeads.ctr || 0}%`, c:'#34d399' },
          ].map((m,i) => (
            <div key={i} className="p-4 rounded-2xl text-center" style={{background:'rgba(66,133,244,0.08)',border:'1px solid rgba(66,133,244,0.2)'}}>
              <p className="text-2xl font-bold text-slate-100">{m.v}</p>
              <p className="text-xs text-slate-500 mt-1">{m.l}</p>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15">
          <p className="text-sm font-semibold text-blue-300 mb-2">Comment connecter Google Ads</p>
          <ol className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>Activez le suivi des conversions dans Google Ads</li>
            <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>Ajoutez les UTM a vos URLs : ?utm_source=google&utm_medium=cpc&utm_campaign=NOM</li>
            <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>Les leads avec ces UTM seront automatiquement trackes dans le CRM</li>
            <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">4</span>Saisissez vos depenses manuellement pour calculer le ROI</li>
          </ol>
          <div className="mt-3 p-3 rounded-xl bg-black/20">
            <p className="text-[10px] text-slate-500 mb-1 font-semibold">URL EXEMPLE AVEC UTM :</p>
            <code className="text-[10px] text-green-400 break-all">https://www.globalcleanhome.com/devis?utm_source=google&utm_medium=cpc&utm_campaign=canape-paris&utm_content=annonce1</code>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ FACEBOOK ADS TAB ============
const FacebookAdsTab = ({ data }) => {
  const fbLeads = (data?.platforms || []).find(p => p.platform === 'facebook_ads' || p.platform === 'meta_ads') || {};
  return (
    <div className="space-y-5">
      <div className="section-card p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-700/15 border border-blue-700/20 flex items-center justify-center text-xl">📘</div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Meta Ads (Facebook & Instagram)</h3>
            <p className="text-xs text-slate-500">Campagnes Lead Generation, Traffic et Conversions</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { l:'Depenses', v:`${fbLeads.spend || 0}EUR`, c:'#1877f2' },
            { l:'Leads', v: fbLeads.leads || 0, c:'#60a5fa' },
            { l:'CPL', v:`${fbLeads.cpl || 0}EUR`, c:'#a78bfa' },
            { l:'ROAS', v:`${fbLeads.roas || 0}x`, c:'#34d399' },
          ].map((m,i) => (
            <div key={i} className="p-4 rounded-2xl text-center" style={{background:'rgba(24,119,242,0.08)',border:'1px solid rgba(24,119,242,0.2)'}}>
              <p className="text-2xl font-bold text-slate-100">{m.v}</p>
              <p className="text-xs text-slate-500 mt-1">{m.l}</p>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-2xl bg-blue-700/5 border border-blue-700/15">
          <p className="text-sm font-semibold text-blue-300 mb-2">Comment connecter Meta Ads</p>
          <ol className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-700/20 text-blue-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>Installez le Pixel Meta sur votre site (deja actif sur globalcleanhome.com)</li>
            <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-700/20 text-blue-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>Utilisez les formulaires Lead Gen natifs Meta ou redirigez vers votre site avec UTM</li>
            <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-700/20 text-blue-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>Ajoutez ?utm_source=facebook&utm_medium=paid&utm_campaign=NOM a vos URLs</li>
            <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-700/20 text-blue-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">4</span>Les leads arrivent automatiquement dans votre CRM</li>
          </ol>
          <div className="mt-3 p-3 rounded-xl bg-black/20">
            <p className="text-[10px] text-slate-500 mb-1 font-semibold">URL EXEMPLE :</p>
            <code className="text-[10px] text-green-400 break-all">https://www.globalcleanhome.com/devis?utm_source=facebook&utm_medium=paid&utm_campaign=menage-paris&utm_content=video</code>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ SEO TAB ============
const SEOTab = () => {
  const [seoData, setSeoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setSeoData({
        pages: [
          { url: '/nettoyage-canape', title: 'Nettoyage Canape Paris', position: 8, clicks: 142, impressions: 2840, ctr: 5.0 },
          { url: '/menage-domicile', title: 'Menage a Domicile Paris', position: 12, clicks: 89, impressions: 1920, ctr: 4.6 },
          { url: '/nettoyage-matelas', title: 'Nettoyage Matelas IDF', position: 6, clicks: 203, impressions: 3100, ctr: 6.5 },
          { url: '/nettoyage-tapis', title: 'Nettoyage Tapis Paris', position: 15, clicks: 67, impressions: 1450, ctr: 4.6 },
          { url: '/devis', title: 'Devis Gratuit Nettoyage', position: 4, clicks: 312, impressions: 4200, ctr: 7.4 },
        ],
        keywords: [
          { keyword: 'nettoyage canape paris', position: 7, volume: 880, difficulty: 42 },
          { keyword: 'menage a domicile paris', position: 14, volume: 2400, difficulty: 65 },
          { keyword: 'nettoyage matelas idf', position: 5, volume: 590, difficulty: 38 },
          { keyword: 'pressing tapis paris', position: 9, volume: 320, difficulty: 35 },
          { keyword: 'entreprise nettoyage paris', position: 18, volume: 1300, difficulty: 58 },
        ]
      });
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l:'Position moy.', v:'9.8', c:'#34d399', icon: TrendingUp },
          { l:'Clics organiques', v:'813', c:'#60a5fa', icon: MousePointer },
          { l:'Impressions', v:'13.5k', c:'#a78bfa', icon: Eye },
          { l:'CTR moyen', v:'5.6%', c:'#f59e0b', icon: Target },
        ].map((m,i) => (
          <div key={i} className="metric-card">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{background:`${m.c}15`,border:`1px solid ${m.c}30`}}>
              <m.icon className="w-4 h-4" style={{color:m.c}} />
            </div>
            <p className="text-2xl font-bold text-slate-100">{m.v}</p>
            <p className="text-xs text-slate-500 mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Meilleures pages SEO</h3>
          {loading ? <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div> : (
            <div className="space-y-2">
              {seoData?.pages.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-all">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    p.position <= 5 ? 'bg-emerald-500/20 text-emerald-400' :
                    p.position <= 10 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>{p.position}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{p.title}</p>
                    <p className="text-[10px] text-slate-500">{p.url}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-slate-200">{p.clicks} clics</p>
                    <p className="text-[10px] text-slate-500">{p.ctr}% CTR</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Mots-cles principaux</h3>
          {loading ? <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div> : (
            <div className="space-y-2">
              {seoData?.keywords.map((k, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-all">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    k.position <= 5 ? 'bg-emerald-500/20 text-emerald-400' :
                    k.position <= 10 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>{k.position}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{k.keyword}</p>
                    <p className="text-[10px] text-slate-500">Vol: {k.volume}/mois</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${k.difficulty}%`, background: k.difficulty > 50 ? '#f43f5e' : k.difficulty > 30 ? '#f59e0b' : '#34d399'}} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Diff: {k.difficulty}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 mt-4 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            <ExternalLink className="w-3 h-3" /> Connecter Google Search Console
          </a>
        </div>
      </div>
    </div>
  );
};

// ============ ATTRIBUTION TAB ============
const AttributionTab = ({ attribution }) => (
  <div className="space-y-5">
    <div className="section-card p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-4">Attribution complete des leads par campagne UTM</h3>
      {attribution.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Campagne','Source','Medium','Leads','Score moy.','Statut'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 py-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attribution.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-3 pr-4 font-medium text-slate-200 text-sm">{row.campaign || 'Direct / Organique'}</td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      {row.source || 'direct'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">{row.medium || '-'}</td>
                  <td className="py-3 pr-4 font-bold text-slate-100">{row.leads}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      row.avg_score >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      row.avg_score >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>{row.avg_score}/100</span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      row.leads > 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                    }`}>{row.leads > 10 ? 'Actif' : 'Faible'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-1">Aucune donnee UTM</p>
          <p className="text-xs text-slate-600">Ajoutez des parametres UTM a vos URLs publicitaires pour tracker l attribution</p>
        </div>
      )}
    </div>

    <div className="section-card p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Generateur UTM</h3>
      <p className="text-xs text-slate-500 mb-4">Creez des URLs trackees pour vos campagnes</p>
      <UTMGenerator />
    </div>
  </div>
);

// ============ UTM GENERATOR ============
const UTMGenerator = () => {
  const [utm, setUtm] = useState({ source: 'google', medium: 'cpc', campaign: '', content: '' });
  const baseUrl = 'https://www.globalcleanhome.com/devis';
  const url = `${baseUrl}?utm_source=${utm.source}&utm_medium=${utm.medium}${utm.campaign ? `&utm_campaign=${utm.campaign}` : ''}${utm.content ? `&utm_content=${utm.content}` : ''}`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[
          { k: 'source', l: 'Source', ph: 'google, facebook...' },
          { k: 'medium', l: 'Medium', ph: 'cpc, paid, email...' },
          { k: 'campaign', l: 'Campagne', ph: 'canape-paris-2025' },
          { k: 'content', l: 'Contenu', ph: 'annonce1, video...' },
        ].map(f => (
          <div key={f.k}>
            <label className="text-[10px] font-semibold text-slate-500 mb-1 block uppercase tracking-wider">{f.l}</label>
            <input value={utm[f.k]} onChange={e => setUtm(p=>({...p, [f.k]: e.target.value}))}
              placeholder={f.ph} className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-xs" />
          </div>
        ))}
      </div>
      <div className="p-3 rounded-xl bg-black/30 border border-white/5">
        <p className="text-[10px] text-slate-500 mb-1 font-semibold">URL GENEREE :</p>
        <p className="text-xs text-green-400 break-all">{url}</p>
      </div>
      <button onClick={() => { navigator.clipboard.writeText(url); toast.success('URL copiee !'); }}
        className="w-full py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 rounded-xl text-xs font-semibold transition-all">
        Copier l URL
      </button>
    </div>
  );
};

// ============ CONNECT TAB ============
const ConnectTab = () => {
  const integrations = [
    { name: 'Google Ads', icon: '🔍', color: '#4285f4', status: 'manual', desc: 'Importez vos donnees via UTM et saisie manuelle', steps: ['Ajoutez ?utm_source=google aux URLs', 'Saisissez vos depenses quotidiennes', 'Suivez le ROI en temps reel'] },
    { name: 'Facebook Ads', icon: '📘', color: '#1877f2', status: 'manual', desc: 'Suivez vos campagnes Meta via UTM', steps: ['Pixel Meta deja installe', 'Ajoutez ?utm_source=facebook aux URLs', 'Saisissez vos depenses quotidiennes'] },
    { name: 'Google Analytics', icon: '📊', color: '#f4b400', status: 'active', desc: 'Analytics installe sur globalcleanhome.com', steps: ['GA4 actif sur le site', 'Evenements leads trackes', 'Connexion CRM via UTM'] },
    { name: 'Google Search Console', icon: '🔎', color: '#34a853', status: 'link', url: 'https://search.google.com/search-console', desc: 'Suivez vos positions et clics organiques', steps: ['Verificacion via DNS deja faite', 'Connectez pour importer les donnees SEO'] },
    { name: 'Meta Pixel', icon: '📱', color: '#0081fb', status: 'active', desc: 'Pixel actif sur globalcleanhome.com', steps: ['Evenements PageView actifs', 'Lead event configure', 'Audiences de retargeting disponibles'] },
    { name: 'Google Tag Manager', icon: '🏷️', color: '#4285f4', status: 'active', desc: 'GTM installe et configure', steps: ['Tags de conversion actifs', 'UTM captures automatiquement', 'Evenements CRM envoyes'] },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {integrations.map((intg, i) => (
          <div key={i} className="section-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:`${intg.color}15`,border:`1px solid ${intg.color}30`}}>
                  {intg.icon}
                </div>
                <div>
                  <p className="font-bold text-slate-100">{intg.name}</p>
                  <p className="text-xs text-slate-500">{intg.desc}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                intg.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                intg.status === 'manual' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                'bg-violet-500/15 text-violet-400 border border-violet-500/25'
              }`}>
                {intg.status === 'active' ? '✓ Actif' : intg.status === 'manual' ? '⚙ Manuel' : '↗ Lien'}
              </span>
            </div>
            <ul className="space-y-1.5">
              {intg.steps.map((s, j) => (
                <li key={j} className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
            {intg.url && (
              <a href={intg.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 mt-3 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                style={{background:`${intg.color}15`, color: intg.color}}>
                <ExternalLink className="w-3.5 h-3.5" /> Ouvrir {intg.name}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
const AdsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [attribution, setAttribution] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [showAddSpend, setShowAddSpend] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, attrRes] = await Promise.all([
        axios.get(`${API_URL}/ads/dashboard?period=${period}`, { withCredentials: true }),
        axios.get(`${API_URL}/ads/attribution?period=${period}`, { withCredentials: true }),
      ]);
      setData(dashRes.data);
      setAttribution(attrRes.data || []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [period]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Marketing & Publicites</h1>
          </div>
          <p className="text-slate-500 text-sm">Google Ads, Facebook Ads, SEO et attribution multi-canaux</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab !== 'connect' && activeTab !== 'seo' && (
            <div className="flex gap-1 bg-white/5 rounded-lg border border-white/5 p-1">
              {['7d','30d','90d'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowAddSpend(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all">
            <Plus className="w-4 h-4" /> Depense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 rounded-2xl border border-white/5 p-1.5 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading && activeTab !== 'seo' && activeTab !== 'connect' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          {activeTab === 'overview' && <OverviewTab data={data} onAddSpend={() => setShowAddSpend(true)} />}
          {activeTab === 'google' && <GoogleAdsTab data={data} />}
          {activeTab === 'facebook' && <FacebookAdsTab data={data} />}
          {activeTab === 'seo' && <SEOTab />}
          {activeTab === 'attribution' && <AttributionTab attribution={attribution} />}
          {activeTab === 'connect' && <ConnectTab />}
        </>
      )}

      {showAddSpend && (
        <AddSpendModal onClose={() => setShowAddSpend(false)} onSave={() => { setShowAddSpend(false); fetchData(); }} />
      )}
    </div>
  );
};

export default AdsDashboard;
