import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../../lib/api';
import {
  Search, TrendingUp, TrendingDown, Eye, MousePointer,
  RefreshCw, AlertCircle, ArrowUp, ArrowDown, Globe,
  Smartphone, Monitor, ChevronUp, ChevronDown, Award,
  BarChart2, Target, Zap
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api/analytics-data';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl p-3 border text-xs" style={{background:'hsl(224,71%,8%)',borderColor:'rgba(255,255,255,0.1)'}}>
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color}} className="font-bold">{p.name}: {typeof p.value==='number'&&p.value<100?p.value.toFixed(2)+'%':p.value}</p>
      ))}
    </div>
  );
};

const SEODashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(28);
  const [sortKey, setSortKey] = useState('clicks');
  const [sortDir, setSortDir] = useState('desc');
  const [kwSearch, setKwSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${API}/seo?days=${days}`, {withCredentials:true});
      setData(res.data);
    } catch(e) { setError(e.response?.data?.detail||'Erreur Search Console'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const handleSort = (key) => {
    if (sortKey===key) setSortDir(p=>p==='desc'?'asc':'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedKws = [...(data?.keywords||[])].filter(k=>
    !kwSearch || k.query.toLowerCase().includes(kwSearch.toLowerCase())
  ).sort((a,b)=> sortDir==='desc' ? b[sortKey]-a[sortKey] : a[sortKey]-b[sortKey]);

  const dailyData = data?.daily?.map(d=>({
    date: new Date(d.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}),
    Clics: d.clicks,
    Impressions: d.impressions,
    CTR: parseFloat(d.ctr.toFixed(2)),
    Position: parseFloat(d.position.toFixed(1)),
  })) || [];

  const positionColor = (p) => p<=3?'#10b981':p<=10?'#f59e0b':p<=20?'#f97316':'#f43f5e';
  const positionLabel = (p) => p<=3?'Top 3 🏆':p<=10?'Page 1 ✅':p<=20?'Page 2 ⚠️':'Page +2 ❌';

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Search className="w-4 h-4 text-emerald-400"/>
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>SEO</h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">Données réelles · Google Search Console · globalcleanhome.com</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e=>setDays(Number(e.target.value))}
            className="px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs focus:outline-none">
            {[7,14,28,90].map(d=><option key={d} value={d} className="bg-slate-800">{d} jours</option>)}
          </select>
          <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200">
            <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
          </button>
        </div>
      </div>

      {/* ERREUR */}
      {error && (
        <div className="rounded-2xl p-5 border border-red-500/20 bg-red-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-bold text-red-300 mb-1">Erreur Search Console</p>
            <p className="text-xs text-red-400/80">{error}</p>
            <p className="text-xs text-slate-500 mt-2">
              Ajoutez votre compte Google dans Search Console avec les permissions Full.
              Il faut aussi se reconnecter pour autoriser les nouveaux scopes.
            </p>
            <a href={`${BACKEND_URL}/api/auth/google`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
              🔐 Reconnecter Google
            </a>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i)=><div key={i} className="skeleton h-28 rounded-2xl"/>)}
        </div>
      ) : data && (
        <>
        {/* KPIs SEO */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {label:'Clics totaux',     value:data.overview.clicks,      color:'#10b981', icon:MousePointer, suffix:''},
            {label:'Impressions',      value:data.overview.impressions,  color:'#8b5cf6', icon:Eye,         suffix:''},
            {label:'CTR moyen',        value:data.overview.ctr,          color:'#f97316', icon:Target,      suffix:'%'},
            {label:'Position moyenne', value:data.overview.position,     color:'#f59e0b', icon:Award,       suffix:''},
          ].map(k=>(
            <div key={k.label} className="section-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{background:`${k.color}20`,border:`1px solid ${k.color}30`}}>
                  <k.icon className="w-5 h-5" style={{color:k.color}}/>
                </div>
                {k.label==='Position moyenne' && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-full"
                    style={{background:positionColor(k.value)+'20',color:positionColor(k.value)}}>
                    {positionLabel(k.value)}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-slate-100 mb-1" style={{fontFamily:'Manrope,sans-serif'}}>
                {typeof k.value==='number' && k.value > 100 ? k.value.toLocaleString('fr-FR') : k.value}{k.suffix}
              </p>
              <p className="text-xs text-slate-500 font-semibold">{k.label}</p>
            </div>
          ))}
        </div>

        {/* GRAPHIQUE ÉVOLUTION */}
        <div className="section-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-slate-200">Évolution SEO</h3>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-emerald-400 rounded"/><span>Clics</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-violet-400 rounded"/><span>Impressions</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="date" tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false} interval={Math.floor(dailyData.length/6)}/>
              <YAxis yAxisId="left" tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/>
              <YAxis yAxisId="right" orientation="right" tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area yAxisId="left" type="monotone" dataKey="Clics" stroke="#10b981" strokeWidth={2.5} fill="url(#g1)"/>
              <Area yAxisId="right" type="monotone" dataKey="Impressions" stroke="#8b5cf6" strokeWidth={2} fill="url(#g2)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* MOTS-CLÉS */}
        <div className="section-card p-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="text-sm font-black text-slate-200">Mots-clés ({sortedKws.length})</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
              <input value={kwSearch} onChange={e=>setKwSearch(e.target.value)}
                placeholder="Filtrer les mots-clés..."
                className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-52"/>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {[
                    {k:'query',label:'Mot-clé'},
                    {k:'clicks',label:'Clics'},
                    {k:'impressions',label:'Impressions'},
                    {k:'ctr',label:'CTR'},
                    {k:'position',label:'Position'},
                  ].map(h=>(
                    <th key={h.k}
                      onClick={()=>handleSort(h.k)}
                      className="text-left text-slate-500 font-bold uppercase tracking-wider pb-3 pr-4 cursor-pointer hover:text-slate-300 select-none transition-colors">
                      <div className="flex items-center gap-1">
                        {h.label}
                        {sortKey===h.k && (sortDir==='desc'?<ChevronDown className="w-3 h-3"/>:<ChevronUp className="w-3 h-3"/>)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedKws.slice(0,20).map((kw,i)=>(
                  <tr key={i} className="hover:bg-white/2 transition-colors group">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 w-5 font-mono text-[10px]">{i+1}</span>
                        <span className="text-slate-200 font-semibold">{kw.query}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-black text-emerald-400">{kw.clicks}</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{kw.impressions.toLocaleString('fr-FR')}</td>
                    <td className="py-3 pr-4">
                      <span className={`font-bold ${kw.ctr>=5?'text-emerald-400':kw.ctr>=2?'text-amber-400':'text-slate-400'}`}>
                        {kw.ctr}%
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black" style={{color:positionColor(kw.position)}}>{kw.position}</span>
                        <span className="text-[10px]" style={{color:positionColor(kw.position)+'99'}}>{positionLabel(kw.position)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP PAGES SEO + DEVICES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="section-card p-5">
            <h3 className="text-sm font-black text-slate-200 mb-4">Top pages organiques</h3>
            <div className="space-y-3">
              {data.pages?.slice(0,8).map((p,i)=>(
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-600 font-mono w-4">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-300 truncate">{p.page||'/'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-emerald-400">{p.clicks} clics</span>
                      <span className="text-[10px] text-slate-600">{p.impressions} impr.</span>
                    </div>
                  </div>
                  <span className="text-xs font-black flex-shrink-0" style={{color:positionColor(p.position)}}>{p.position}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card p-5">
            <h3 className="text-sm font-black text-slate-200 mb-4">Appareils & Pays</h3>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Appareils</p>
                <div className="space-y-2">
                  {data.devices?.map((d,i)=>{
                    const total = data.devices.reduce((s,x)=>s+x.clicks,0);
                    const pct = total > 0 ? Math.round((d.clicks/total)*100) : 0;
                    const icons = {DESKTOP:'💻',MOBILE:'📱',TABLET:'📲'};
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm w-6">{icons[d.device]||'📱'}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${pct}%`,background:['#8b5cf6','#10b981','#f97316'][i]}}/>
                        </div>
                        <span className="text-xs font-bold text-slate-300 w-8">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Top pays</p>
                <div className="space-y-1.5">
                  {data.countries?.slice(0,6).map((c,i)=>(
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium uppercase">{c.country}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">{c.clicks} clics</span>
                        <span className="text-slate-600">{c.impressions} impr.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default SEODashboard;
