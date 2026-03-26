import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  TrendingUp, TrendingDown, Users, Eye, Clock, MousePointer,
  Globe, Smartphone, Monitor, Tablet, RefreshCw, AlertCircle,
  BarChart2, Activity, MapPin, Search, ArrowUp, ArrowDown,
  Zap, Target, ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api/analytics-data';

const COLORS = ['#8b5cf6','#10b981','#f97316','#60a5fa','#f43f5e','#f59e0b'];

const KPICard = ({ label, value, change, icon: Icon, color, suffix='' }) => {
  const isPositive = change >= 0;
  return (
    <div className="section-card p-5 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{background:`${color}20`,border:`1px solid ${color}30`}}>
          <Icon className="w-5 h-5" style={{color}}/>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
            isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {isPositive ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-slate-100 mb-1" style={{fontFamily:'Manrope,sans-serif'}}>
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}{suffix}
      </p>
      <p className="text-xs text-slate-500 font-semibold">{label}</p>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl p-3 border text-xs" style={{background:'hsl(224,71%,8%)',borderColor:'rgba(255,255,255,0.1)'}}>
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{color:p.color}} className="font-bold">{p.name}: {Number(p.value).toLocaleString('fr-FR')}</p>
      ))}
    </div>
  );
};

const Analytics = () => {
  const [data, setData] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [activeChart, setActiveChart] = useState('sessions');

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [overviewRes, rtRes] = await Promise.allSettled([
        axios.get(`${API}/overview?days=${days}`, {withCredentials:true}),
        axios.get(`${API}/realtime`, {withCredentials:true}),
      ]);
      if (overviewRes.status==='fulfilled') setData(overviewRes.value.data);
      else setError(overviewRes.reason?.response?.data?.detail || 'Erreur GA4');
      if (rtRes.status==='fulfilled') setRealtime(rtRes.value.data);
    } catch(e) { setError(e.response?.data?.detail || 'Erreur de connexion'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  // Realtime toutes les 30s
  useEffect(()=>{
    const t = setInterval(async()=>{
      try {
        const res = await axios.get(`${API}/realtime`,{withCredentials:true});
        setRealtime(res.data);
      } catch {}
    }, 30000);
    return ()=>clearInterval(t);
  },[]);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d.replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3')).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
  };

  const formatDuration = (s) => {
    const m = Math.floor(s/60);
    const sec = Math.round(s%60);
    return `${m}m${sec}s`;
  };

  const dailyData = data?.daily?.map(d=>({
    date: formatDate(d.date),
    Sessions: d.sessions,
    Utilisateurs: d.users,
    Conversions: d.conversions,
  })) || [];

  const sourceData = data?.sources?.map(s=>({
    name: s.channel,
    value: s.sessions,
    conversions: s.conversions,
  })) || [];

  const deviceData = data?.devices?.map(d=>({
    name: d.device === 'desktop' ? '💻 Desktop' : d.device === 'mobile' ? '📱 Mobile' : '📱 Tablette',
    value: d.sessions,
  })) || [];

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
          <p className="text-slate-500 text-sm ml-10">Données réelles · Google Analytics 4 · globalcleanhome.com</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Realtime badge */}
          {realtime && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-xs font-black text-emerald-400">{realtime.active_users} en ligne</span>
            </div>
          )}
          {/* Période */}
          <select value={days} onChange={e=>setDays(Number(e.target.value))}
            className="px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
            {[7,14,30,60,90].map(d=><option key={d} value={d} className="bg-slate-800">{d} jours</option>)}
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
            <p className="text-sm font-bold text-red-300 mb-1">Erreur de connexion GA4</p>
            <p className="text-xs text-red-400/80">{error}</p>
            <p className="text-xs text-slate-500 mt-2">
              Vérifiez que votre compte Google est ajouté au property GA4 (Property ID: {' '}
              <span className="font-mono text-slate-400">521330220</span>) avec le rôle Viewer.
              <br/>Il faut aussi se reconnecter pour autoriser les nouveaux scopes Analytics.
            </p>
            <a href={`${BACKEND_URL}/api/auth/google`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
              🔐 Reconnecter Google Analytics
            </a>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_,i)=><div key={i} className="skeleton h-28 rounded-2xl"/>)}
        </div>
      ) : data && (
        <>
        {/* REALTIME PANEL */}
        {realtime?.active_users > 0 && (
          <div className="rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <p className="text-sm font-black text-emerald-300">Temps réel — utilisateurs actifs maintenant</p>
              <span className="text-2xl font-black text-emerald-400 ml-auto">{realtime.active_users}</span>
            </div>
            {realtime.details?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {realtime.details.slice(0,4).map((d,i)=>(
                  <div key={i} className="p-2 rounded-xl border border-white/5 bg-white/3 text-xs">
                    <p className="font-bold text-slate-200">{d.city}</p>
                    <p className="text-slate-500">{d.device} · {d.users} user(s)</p>
                    <p className="text-emerald-400 truncate">{d.page}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Sessions" value={data.kpis.sessions.value} change={data.kpis.sessions.change} icon={Activity} color="#8b5cf6"/>
          <KPICard label="Utilisateurs" value={data.kpis.users.value} change={data.kpis.users.change} icon={Users} color="#10b981"/>
          <KPICard label="Pages vues" value={data.kpis.pageviews.value} icon={Eye} color="#60a5fa"/>
          <KPICard label="Conversions" value={data.kpis.conversions.value} change={data.kpis.conversions.change} icon={Target} color="#f97316"/>
          <KPICard label="Nouveaux users" value={data.kpis.new_users.value} icon={Zap} color="#f59e0b"/>
          <KPICard label="Taux de rebond" value={data.kpis.bounce_rate.value} suffix="%" icon={TrendingDown} color="#f43f5e"/>
          <KPICard label="Durée moy. session" value={formatDuration(data.kpis.avg_duration.value)} icon={Clock} color="#a78bfa"/>
          <KPICard label="Pages/session" value={data.kpis.sessions.value > 0 ? (data.kpis.pageviews.value/data.kpis.sessions.value).toFixed(1) : '0'} icon={MousePointer} color="#34d399"/>
        </div>

        {/* GRAPHIQUE PRINCIPAL */}
        <div className="section-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-slate-200">Évolution du trafic</h3>
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {['sessions','users','conversions'].map(k=>(
                <button key={k} onClick={()=>setActiveChart(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${activeChart===k?'bg-violet-600 text-white':'text-slate-500 hover:text-slate-300'}`}>
                  {k==='sessions'?'Sessions':k==='users'?'Utilisateurs':'Conversions'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="date" tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}
                interval={Math.floor(dailyData.length/6)}/>
              <YAxis tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone"
                dataKey={activeChart==='sessions'?'Sessions':activeChart==='users'?'Utilisateurs':'Conversions'}
                stroke="#8b5cf6" strokeWidth={2.5} fill="url(#colorGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* SOURCES + DEVICES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Sources */}
          <div className="section-card p-5">
            <h3 className="text-sm font-black text-slate-200 mb-4">Sources de trafic</h3>
            {sourceData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                      dataKey="value" paddingAngle={3}>
                      {sourceData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v)=>[v.toLocaleString('fr-FR'),'Sessions']}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {sourceData.map((s,i)=>(
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                      <p className="text-xs text-slate-300 flex-1 truncate font-medium">{s.name}</p>
                      <p className="text-xs font-black text-slate-200">{s.value.toLocaleString('fr-FR')}</p>
                      <p className="text-xs text-emerald-400">{s.conversions} conv.</p>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-slate-600 text-sm text-center py-8">Aucune donnée</p>}
          </div>

          {/* Devices */}
          <div className="section-card p-5">
            <h3 className="text-sm font-black text-slate-200 mb-4">Appareils</h3>
            {deviceData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                      dataKey="value" paddingAngle={3}>
                      {deviceData.map((_,i)=><Cell key={i} fill={['#8b5cf6','#10b981','#f97316'][i]}/>)}
                    </Pie>
                    <Tooltip formatter={(v)=>[v.toLocaleString('fr-FR'),'Sessions']}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 mt-3">
                  {deviceData.map((d,i)=>{
                    const pct = data.kpis.sessions.value > 0 ? Math.round((d.value/data.kpis.sessions.value)*100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <p className="text-xs text-slate-300 w-24 font-medium">{d.name}</p>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${pct}%`,background:['#8b5cf6','#10b981','#f97316'][i]}}/>
                        </div>
                        <p className="text-xs font-black text-slate-200 w-8">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : <p className="text-slate-600 text-sm text-center py-8">Aucune donnée</p>}
          </div>
        </div>

        {/* TOP PAGES */}
        <div className="section-card p-5">
          <h3 className="text-sm font-black text-slate-200 mb-4">Top pages</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {['Page','Vues','Durée moy.','Rebond'].map(h=>(
                    <th key={h} className="text-left text-slate-500 font-bold uppercase tracking-wider pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.pages?.map((p,i)=>(
                  <tr key={i} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-mono w-4">{i+1}</span>
                        <a href={`https://globalcleanhome.com${p.path}`} target="_blank" rel="noopener noreferrer"
                          className="text-slate-300 hover:text-violet-400 transition-colors truncate max-w-[200px] font-medium">
                          {p.path||'/'}
                        </a>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-black text-slate-200">{Number(p.views).toLocaleString('fr-FR')}</td>
                    <td className="py-3 pr-4 text-slate-400">{formatDuration(p.avg_duration)}</td>
                    <td className="py-3 pr-4">
                      <span className={`font-bold ${p.bounce_rate > 70 ? 'text-red-400' : p.bounce_rate > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {p.bounce_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* VILLES */}
        {data.cities?.length > 0 && (
          <div className="section-card p-5">
            <h3 className="text-sm font-black text-slate-200 mb-4">Top villes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {data.cities.slice(0,10).map((c,i)=>(
                <div key={i} className="p-3 rounded-2xl border border-white/5 bg-white/2 text-center">
                  <p className="text-lg font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>{c.sessions}</p>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">{c.city}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default Analytics;
