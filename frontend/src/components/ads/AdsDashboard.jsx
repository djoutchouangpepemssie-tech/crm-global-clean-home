import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, Target, Zap, Plus, RefreshCw, ArrowUpRight, ArrowDownRight, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const PLATFORM_CONFIG = {
  google_ads: { label: 'Google Ads', color: '#4285f4', bg: 'rgba(66,133,244,0.1)', icon: '🔍' },
  facebook_ads: { label: 'Facebook Ads', color: '#1877f2', bg: 'rgba(24,119,242,0.1)', icon: '📘' },
  instagram: { label: 'Instagram', color: '#e1306c', bg: 'rgba(225,48,108,0.1)', icon: '📸' },
  meta_ads: { label: 'Meta Ads', color: '#0081fb', bg: 'rgba(0,129,251,0.1)', icon: '🌐' },
  seo: { label: 'SEO', color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: '🔎' },
  site_web: { label: 'Site Web', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', icon: '🌍' },
};

const getPlatformConfig = (p) => PLATFORM_CONFIG[p] || { label: p, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '📊' };

const MetricCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
  <div className="metric-card">
    <div className="flex items-center justify-between mb-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${color}15`,border:`1px solid ${color}30`}}>
        <Icon className="w-4 h-4" style={{color}} />
      </div>
      {trendValue !== undefined && (
        <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          trend === 'up' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        }`}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-100">{value}</p>
    <p className="text-xs text-slate-500 mt-1">{title}</p>
  </div>
);

const AddSpendModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    platform: 'google_ads',
    campaign_name: '',
    date: new Date().toISOString().split('T')[0],
    spend: '',
    impressions: '',
    clicks: ''
  });

  const handleSave = async () => {
    if (!form.campaign_name || !form.spend) { toast.error('Remplissez les champs requis'); return; }
    try {
      await axios.post(`${API_URL}/ads/spend`, {
        ...form,
        spend: parseFloat(form.spend),
        impressions: parseInt(form.impressions) || 0,
        clicks: parseInt(form.clicks) || 0,
      }, { withCredentials: true });
      toast.success('Depense enregistree');
      onSave();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="section-card w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Enregistrer des depenses</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Plateforme</label>
            <select value={form.platform} onChange={e => setForm(p => ({...p, platform: e.target.value}))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
              {Object.entries(PLATFORM_CONFIG).map(([k,v]) => <option key={k} value={k} className="bg-slate-800">{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Nom campagne *</label>
            <input value={form.campaign_name} onChange={e => setForm(p => ({...p, campaign_name: e.target.value}))}
              placeholder="ex: Nettoyage Canape Paris"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Depense (EUR) *</label>
              <input type="number" value={form.spend} onChange={e => setForm(p => ({...p, spend: e.target.value}))}
                placeholder="0.00" className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Impressions</label>
              <input type="number" value={form.impressions} onChange={e => setForm(p => ({...p, impressions: e.target.value}))}
                placeholder="0" className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Clics</label>
              <input type="number" value={form.clicks} onChange={e => setForm(p => ({...p, clicks: e.target.value}))}
                placeholder="0" className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm">Annuler</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm">Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

const AdsDashboard = () => {
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

  const g = data?.global || {};

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Publicites et ROI</h1>
          </div>
          <p className="text-slate-500 text-sm">Suivi Google Ads, Facebook Ads et attribution UTM</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex gap-1 bg-white/5 rounded-lg border border-white/5 p-1">
            {['7d','30d','90d'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddSpend(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Saisir depense
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard title="Depenses totales" value={`${g.total_spend || 0}EUR`} icon={DollarSign} color="#f59e0b" />
            <MetricCard title="Leads generes" value={g.total_leads || 0} icon={Users} color="#60a5fa" />
            <MetricCard title="Cout par lead" value={`${g.cpl || 0}EUR`} icon={Target} color="#a78bfa" />
            <MetricCard title="ROI publicitaire" value={`${g.roi || 0}%`} icon={TrendingUp} color={g.roi > 0 ? '#34d399' : '#f43f5e'} trend={g.roi > 0 ? 'up' : 'down'} trendValue={`${g.roi}%`} />
            <MetricCard title="Conversions" value={g.total_conversions || 0} icon={ShoppingCart} color="#34d399" />
            <MetricCard title="Revenue genere" value={`${g.total_revenue || 0}EUR`} icon={DollarSign} color="#34d399" />
            <MetricCard title="Cout par acquisition" value={`${g.cpa || 0}EUR`} icon={Zap} color="#06b6d4" />
            <MetricCard title="ROAS" value={`${g.roas || 0}x`} icon={ArrowUpRight} color="#a78bfa" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 section-card p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Evolution des depenses</h3>
              {(data?.spend_timeline || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.spend_timeline}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="#475569" style={{fontSize:'10px'}} tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={{background:'hsl(224,71%,8%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',fontSize:'12px'}} formatter={(v) => [`${v}EUR`, 'Depenses']} />
                    <Area type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2} fill="url(#colorSpend)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-slate-600">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Aucune depense enregistree</p>
                  <button onClick={() => setShowAddSpend(true)} className="mt-3 text-xs text-violet-400">
                    + Saisir mes premieres depenses
                  </button>
                </div>
              )}
            </div>

            <div className="section-card p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Par plateforme</h3>
              <div className="space-y-3">
                {(data?.platforms || []).length > 0 ? data.platforms.map((p, i) => {
                  const cfg = getPlatformConfig(p.platform);
                  return (
                    <div key={i} className="p-3 rounded-xl" style={{background: cfg.bg, border:`1px solid ${cfg.color}20`}}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cfg.icon}</span>
                          <span className="text-sm font-semibold text-slate-200">{cfg.label}</span>
                        </div>
                        <span className="text-sm font-bold" style={{color: cfg.color}}>{p.spend}EUR</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[{l:'Leads',v:p.leads},{l:'CPL',v:`${p.cpl}EUR`},{l:'ROI',v:`${p.roi}%`}].map((m,j) => (
                          <div key={j} className="text-center">
                            <p className="text-xs font-bold text-slate-200">{m.v}</p>
                            <p className="text-[9px] text-slate-500">{m.l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-slate-600 text-sm">Aucune donnee</div>
                )}
              </div>
            </div>
          </div>

          <div className="section-card p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Attribution par campagne UTM</h3>
            {attribution.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Campagne','Source','Medium','Leads','Score moyen'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attribution.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="py-3 pr-4 font-medium text-slate-200">{row.campaign || 'Direct'}</td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                            {row.source || '-'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">{row.medium || '-'}</td>
                        <td className="py-3 pr-4 font-bold text-slate-100">{row.leads}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.avg_score >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            row.avg_score >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>{row.avg_score}/100</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                <p className="text-sm">Aucune donnee UTM</p>
                <p className="text-xs mt-1">Les UTM de vos campagnes apparaitront ici automatiquement</p>
              </div>
            )}
          </div>
        </>
      )}

      {showAddSpend && (
        <AddSpendModal onClose={() => setShowAddSpend(false)} onSave={() => { setShowAddSpend(false); fetchData(); }} />
      )}
    </div>
  );
};

export default AdsDashboard;
