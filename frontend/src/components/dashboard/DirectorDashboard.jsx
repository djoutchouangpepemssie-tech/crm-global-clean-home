import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Zap, Star, CheckCircle, RefreshCw, Sparkles, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BACKEND_URL from "../../config.js";

const API = BACKEND_URL + "/api";
const COLORS = ["#8b5cf6","#60a5fa","#34d399","#f59e0b","#f43f5e","#06b6d4"];

function KPICard({ title, value, subtitle, icon: Icon, color, trend, change, onClick }) {
  return (
    <div onClick={onClick} className={"metric-card " + (onClick ? "cursor-pointer hover:border-violet-500/30" : "")}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:color+"15",border:"1px solid "+color+"30"}}>
          <Icon className="w-5 h-5" style={{color}} />
        </div>
        {change && (
          <div className={"flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full " + (trend==="up" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
            {trend==="up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{title}</p>
      {subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function HealthScore({ score }) {
  const color = score >= 75 ? "#34d399" : score >= 50 ? "#f59e0b" : "#f43f5e";
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Bon" : "A ameliorer";
  const c = 2 * Math.PI * 45;
  const offset = c - (score / 100) * c;
  return (
    <div className="section-card p-5 flex flex-col items-center">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 self-start">Sante business</h3>
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{color}}>{score}</span>
          <span className="text-[10px] text-slate-500">/100</span>
        </div>
      </div>
      <p className="text-sm font-bold mt-3" style={{color}}>{label}</p>
    </div>
  );
}

function Recommandations({ stats }) {
  const recs = [];
  if ((stats?.conversion_lead_to_quote||0) < 30 && (stats?.new_leads||0) > 0) {
    recs.push({ icon:"🎯", color:"#f43f5e", priority:"URGENT", text:"Taux de conversion faible. Envoyez vos devis dans l heure." });
  }
  if ((stats?.avg_lead_score||0) > 70) {
    recs.push({ icon:"🔥", color:"#f59e0b", priority:"PRIORITE", text:"Score moyen eleve ("+stats.avg_lead_score+"/100). Convertissez maintenant !" });
  }
  if ((stats?.pending_tasks||0) > 3) {
    recs.push({ icon:"⚠️", color:"#f59e0b", priority:"ACTION", text:stats.pending_tasks+" taches en attente. Traitez-les rapidement." });
  }
  if (recs.length === 0) {
    recs.push({ icon:"✅", color:"#34d399", priority:"INFO", text:"Tout est en ordre ! Pensez a demander des avis clients." });
  }
  return (
    <div className="section-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-slate-200">Recommandations IA</h3>
      </div>
      <div className="space-y-3">
        {recs.map((r,i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{background:r.color+"08",border:"1px solid "+r.color+"20"}}>
            <span className="text-xl">{r.icon}</span>
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{background:r.color+"20",color:r.color}}>{r.priority}</span>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{r.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Objectifs({ stats, financial }) {
  const items = [
    {label:"Leads", current:stats?.new_leads||0, target:50, color:"#a78bfa"},
    {label:"CA (EUR)", current:financial?.total_revenue||0, target:5000, color:"#34d399"},
  ];
  return (
    <div className="section-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-slate-200">Objectifs du mois</h3>
      </div>
      <div className="space-y-4">
        {items.map((obj,i) => (
          <div key={i}>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400">{obj.label}</span>
              <span className="text-xs font-black text-slate-200">{obj.current} / {obj.target}</span>
            </div>
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{width:Math.min(100,Math.round(obj.current/obj.target*100))+"%",background:obj.color}} />
            </div>
            <p className="text-[10px] text-slate-600 mt-1">{Math.min(100,Math.round(obj.current/obj.target*100))}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DirectorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, f, l] = await Promise.all([
        axios.get(API+"/stats/dashboard?period="+period, {withCredentials:true}),
        axios.get(API+"/stats/financial?period="+period, {withCredentials:true}),
        axios.get(API+"/leads?limit=20", {withCredentials:true}),
      ]);
      setStats(s.data); setFinancial(f.data);
      setLeads(Array.isArray(l.data) ? l.data : []);
    } catch(e) { toast.error("Erreur chargement"); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const health = () => {
    if (!stats) return 0;
    let s = 50;
    if ((stats.conversion_lead_to_quote||0) > 30) s += 15;
    if ((stats.avg_lead_score||0) > 60) s += 10;
    if ((stats.new_leads||0) > 10) s += 10;
    if ((stats.pending_tasks||0) < 5) s += 10;
    if ((stats.won_leads||0) > 0) s += 5;
    return Math.min(100, s);
  };

  const revenue = financial?.monthly_revenue || 0;
  const prevRevenue = financial?.previous_revenue || 0;
  const revTrend = revenue >= prevRevenue ? "up" : "down";
  const revChange = prevRevenue > 0 ? Math.abs(Math.round((revenue-prevRevenue)/prevRevenue*100))+"%" : null;
  const conv = stats?.conversion_lead_to_quote || 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:"Manrope,sans-serif"}}>Vue Directeur</h1>
          </div>
          <p className="text-slate-500 text-sm">Pilotage Global Clean Home en temps reel</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex gap-1 bg-white/5 rounded-lg border border-white/5 p-1">
            {[["7d","7j"],["30d","30j"],["90d","3m"]].map(([v,l]) => (
              <button key={v} onClick={() => setPeriod(v)}
                className={"px-3 py-1.5 rounded-md text-xs font-semibold transition-all " + (period===v?"bg-violet-600 text-white":"text-slate-500 hover:text-slate-300")}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard title="CA du mois" value={revenue+"EUR"} subtitle="Devis acceptes" icon={DollarSign} color="#34d399" trend={revTrend} change={revChange} onClick={() => navigate("/finance")} />
            <KPICard title="Nouveaux leads" value={stats?.new_leads||0} subtitle="Ce mois" icon={Users} color="#60a5fa" onClick={() => navigate("/leads")} />
            <KPICard title="Taux conversion" value={conv+"%"} subtitle="Lead vers devis" icon={Target} color={conv>=30?"#34d399":"#f43f5e"} trend={conv>=30?"up":"down"} />
            <KPICard title="Score moyen" value={(stats?.avg_lead_score||0)+"/100"} subtitle="Qualite leads" icon={Star} color="#f59e0b" />
            <KPICard title="Leads gagnes" value={stats?.won_leads||0} subtitle="Clients" icon={Trophy} color="#34d399" onClick={() => navigate("/leads")} />
            <KPICard title="Devis envoyes" value={stats?.sent_quotes||0} subtitle="En attente" icon={CheckCircle} color="#a78bfa" onClick={() => navigate("/quotes")} />
            <KPICard title="Taches" value={stats?.pending_tasks||0} subtitle="A traiter" icon={Zap} color={stats?.pending_tasks>5?"#f43f5e":"#60a5fa"} onClick={() => navigate("/tasks")} />
            <KPICard title="Pipeline" value={(stats?.total_leads||0)+" leads"} subtitle="Total CRM" icon={TrendingUp} color="#a78bfa" onClick={() => navigate("/kanban")} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 section-card p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Evolution des leads</h3>
              {(stats?.leads_by_day||[]).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.leads_by_day}>
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="#475569" style={{fontSize:"10px"}} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="#475569" style={{fontSize:"10px"}} tickLine={false} axisLine={false} width={25} allowDecimals={false} />
                    <Tooltip contentStyle={{background:"hsl(224,71%,8%)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",fontSize:"12px"}} />
                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#dg)" dot={false} name="Leads" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Aucune donnee</div>
              )}
            </div>
            <HealthScore score={health()} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Recommandations stats={stats} />
            <div className="section-card p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Leads par service</h3>
              {Object.keys(stats?.leads_by_service||{}).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.leads_by_service).sort((a,b)=>b[1]-a[1]).map(([name,value],i) => {
                    const total = Object.values(stats.leads_by_service).reduce((s,v)=>s+v,0);
                    return (
                      <div key={name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-300 truncate">{name}</span>
                          <span className="text-xs font-black text-slate-200 ml-2">{value}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:total>0?(value/total*100)+"%":"0%",background:COLORS[i%COLORS.length]}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-slate-600 text-sm text-center py-4">Aucune donnee</p>}
            </div>
            <Objectifs stats={stats} financial={financial} />
          </div>

          <div className="section-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-200">Top leads a convertir</h3>
              </div>
              <button onClick={() => navigate("/leads")} className="text-xs text-violet-400 hover:text-violet-300">Voir tout</button>
            </div>
            <div className="space-y-2">
              {leads.filter(l=>(l.score||0)>=60).slice(0,5).map(lead => (
                <div key={lead.lead_id} onClick={() => navigate("/leads/"+lead.lead_id)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-300 font-black text-sm">
                    {(lead.name||"?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500">{lead.service_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:(lead.score||0)+"%",background:lead.score>=75?"#f43f5e":lead.score>=55?"#f59e0b":"#60a5fa"}} />
                    </div>
                    <span className="text-xs font-black text-slate-300">{lead.score||0}</span>
                  </div>
                </div>
              ))}
              {leads.filter(l=>(l.score||0)>=60).length===0 && (
                <p className="text-slate-600 text-sm text-center py-4">Aucun lead chaud</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
