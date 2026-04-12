import React, { useState, useEffect } from "react";
import { PageHeader } from '../shared';
import axios from "axios";
import api from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Target, Zap, MapPin, RefreshCw, Sparkles, ArrowUpRight, ArrowDownRight, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import BACKEND_URL from "../../config.js";

const API = BACKEND_URL + "/api";
const COLORS = ["#8b5cf6","#60a5fa","#34d399","#f59e0b","#f43f5e","#06b6d4"];

const TABS = [
  { id: "overview", label: "Vue globale", icon: DollarSign },
  { id: "services", label: "Par service", icon: Zap },
  { id: "zones", label: "Par zone", icon: MapPin },
  { id: "canaux", label: "Par canal", icon: TrendingUp },
  { id: "previsions", label: "Previsions IA", icon: Sparkles },
];

// Donnees simulees enrichies
const SERVICES_DATA = [
  { service: "Menage domicile", ca: 4200, interventions: 28, duree_moy: 3.5, cout_horaire: 25, cout_produits: 8, prix_moy: 150, marge_brute: 62, marge_nette: 45, satisfaction: 4.7 },
  { service: "Nettoyage canape", ca: 3800, interventions: 42, duree_moy: 1.5, cout_horaire: 25, cout_produits: 12, prix_moy: 90, marge_brute: 71, marge_nette: 58, satisfaction: 4.9 },
  { service: "Nettoyage matelas", ca: 2100, interventions: 21, duree_moy: 1.2, cout_horaire: 25, cout_produits: 10, prix_moy: 100, marge_brute: 68, marge_nette: 55, satisfaction: 4.8 },
  { service: "Nettoyage bureaux", ca: 5600, interventions: 14, duree_moy: 4.0, cout_horaire: 25, cout_produits: 15, prix_moy: 400, marge_brute: 74, marge_nette: 62, satisfaction: 4.6 },
  { service: "Nettoyage tapis", ca: 1200, interventions: 16, duree_moy: 1.0, cout_horaire: 25, cout_produits: 8, prix_moy: 75, marge_brute: 65, marge_nette: 48, satisfaction: 4.7 },
];

const ZONES_DATA = [
  { zone: "Paris 8e", leads: 18, ca: 2800, cout_deplacement: 12, marge_nette: 58, top_service: "Bureaux" },
  { zone: "Paris 16e", leads: 24, ca: 3200, cout_deplacement: 18, marge_nette: 54, top_service: "Menage" },
  { zone: "Paris 15e", leads: 21, ca: 2600, cout_deplacement: 10, marge_nette: 61, top_service: "Canape" },
  { zone: "Paris 7e", leads: 16, ca: 2400, cout_deplacement: 14, marge_nette: 56, top_service: "Menage" },
  { zone: "Neuilly-sur-Seine", leads: 12, ca: 2200, cout_deplacement: 25, marge_nette: 49, top_service: "Bureaux" },
  { zone: "Paris 17e", leads: 19, ca: 2100, cout_deplacement: 8, marge_nette: 63, top_service: "Canape" },
  { zone: "Boulogne", leads: 10, ca: 1800, cout_deplacement: 22, marge_nette: 47, top_service: "Menage" },
  { zone: "Paris 6e", leads: 14, ca: 1900, cout_deplacement: 15, marge_nette: 55, top_service: "Matelas" },
];

const CANAUX_DATA = [
  { canal: "Google Ads", leads: 45, ca: 6800, cout_acquisition: 1200, cpa: 26.7, roas: 5.7, marge_nette: 52 },
  { canal: "SEO Organique", leads: 38, ca: 5400, cout_acquisition: 300, cpa: 7.9, roas: 18.0, marge_nette: 68 },
  { canal: "Bouche a oreille", leads: 22, ca: 3800, cout_acquisition: 0, cpa: 0, roas: null, marge_nette: 75 },
  { canal: "Facebook Ads", leads: 18, ca: 2200, cout_acquisition: 800, cpa: 44.4, roas: 2.75, marge_nette: 38 },
  { canal: "Direct / Site", leads: 15, ca: 2100, cout_acquisition: 150, cpa: 10.0, roas: 14.0, marge_nette: 65 },
  { canal: "Partenaires", leads: 8, ca: 1400, cout_acquisition: 200, cpa: 25.0, roas: 7.0, marge_nette: 58 },
];

const PREVISIONS_DATA = [
  { mois: "Jan", reel: 14200, prevision: null },
  { mois: "Fev", reel: 15800, prevision: null },
  { mois: "Mar", reel: 13900, prevision: null },
  { mois: "Avr", reel: 16400, prevision: null },
  { mois: "Mai", reel: 18200, prevision: null },
  { mois: "Jun", reel: 17600, prevision: null },
  { mois: "Jul", reel: 15900, prevision: null },
  { mois: "Aou", reel: 14200, prevision: null },
  { mois: "Sep", reel: 19400, prevision: null },
  { mois: "Oct", reel: 21200, prevision: null },
  { mois: "Nov", reel: null, prevision: 22800 },
  { mois: "Dec", reel: null, prevision: 25400 },
];

function MetricCard({ title, value, subtitle, icon: Icon, color, trend, change }) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:color+"15",border:"1px solid "+color+"30"}}>
          <Icon className="w-4 h-4" style={{color}} />
        </div>
        {change && (
          <span className={"flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full " + (trend==="up"?"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20":"bg-rose-500/10 text-rose-400 border border-rose-500/20")}>
            {trend==="up"?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}{change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{title}</p>
      {subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function OverviewTab({ financial }) {
  const totalCA = SERVICES_DATA.reduce((s,d)=>s+d.ca,0);
  const totalInterventions = SERVICES_DATA.reduce((s,d)=>s+d.interventions,0);
  const avgMarge = Math.round(SERVICES_DATA.reduce((s,d)=>s+d.marge_nette,0)/SERVICES_DATA.length);
  const bestService = SERVICES_DATA.sort((a,b)=>b.marge_nette-a.marge_nette)[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="CA total" value={totalCA.toLocaleString()+"EUR"} subtitle="Ce mois" icon={DollarSign} color="#34d399" trend="up" change="+12%" />
        <MetricCard title="Interventions" value={totalInterventions} subtitle="Realisees" icon={Zap} color="#60a5fa" trend="up" change="+8%" />
        <MetricCard title="Marge nette moy." value={avgMarge+"%"} subtitle="Tous services" icon={Target} color="#a78bfa" trend="up" change="+3%" />
        <MetricCard title="Meilleure marge" value={bestService.service.split(" ")[0]} subtitle={bestService.marge_nette+"% de marge"} icon={TrendingUp} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">CA par service</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SERVICES_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="service" stroke="#475569" style={{fontSize:"9px"}} tickLine={false} axisLine={false}
                tickFormatter={v => v.split(" ")[0]} />
              <YAxis stroke="#475569" style={{fontSize:"10px"}} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={{background:"hsl(224,71%,8%)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",fontSize:"12px"}}
                formatter={v => [v+"EUR","CA"]} />
              <Bar dataKey="ca" radius={[4,4,0,0]} barSize={30}>
                {SERVICES_DATA.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Marge nette par service</h3>
          <div className="space-y-3">
            {SERVICES_DATA.sort((a,b)=>b.marge_nette-a.marge_nette).map((s,i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300">{s.service}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{s.interventions} missions</span>
                    <span className="text-sm font-black" style={{color: s.marge_nette>=60?"#34d399":s.marge_nette>=50?"#f59e0b":"#f43f5e"}}>
                      {s.marge_nette}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{width:s.marge_nette+"%", background: s.marge_nette>=60?"#34d399":s.marge_nette>=50?"#f59e0b":"#f43f5e"}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-200">Alertes rentabilite IA</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            { emoji:"🏆", color:"#34d399", title:"Bureaux = service le plus rentable", detail:"74% de marge brute. Augmentez votre capacite sur ce segment." },
            { emoji:"⚠️", color:"#f59e0b", title:"Facebook Ads peu rentable", detail:"ROAS de 2.75x. Reduisez le budget et redirigez vers Google Ads (5.7x)." },
            { emoji:"📍", color:"#60a5fa", title:"Paris 17e sous-exploite", detail:"63% de marge nette + faible cout deplacement. Zone a developper en priorite." },
          ].map((a,i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{background:a.color+"08",border:"1px solid "+a.color+"20"}}>
              <span className="text-2xl flex-shrink-0">{a.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-1">{a.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServicesTab() {
  return (
    <div className="space-y-4">
      {SERVICES_DATA.map((s,i) => (
        <div key={i} className="section-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-100">{s.service}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{s.interventions} interventions · Prix moy. {s.prix_moy}EUR</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black" style={{color:s.marge_nette>=60?"#34d399":s.marge_nette>=50?"#f59e0b":"#f43f5e"}}>
                {s.marge_nette}%
              </p>
              <p className="text-[10px] text-slate-500">marge nette</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              {l:"CA total",v:s.ca.toLocaleString()+"EUR",c:"#34d399"},
              {l:"Duree moy.",v:s.duree_moy+"h",c:"#60a5fa"},
              {l:"Cout horaire",v:s.cout_horaire+"EUR",c:"#f59e0b"},
              {l:"Cout produits",v:s.cout_produits+"EUR",c:"#a78bfa"},
              {l:"Satisfaction",v:"⭐ "+s.satisfaction,c:"#f59e0b"},
            ].map((m,j) => (
              <div key={j} className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
                <p className="text-sm font-black" style={{color:m.c}}>{m.v}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{m.l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-600">Marge brute: {s.marge_brute}%</span>
              <span className="text-[10px] text-slate-600">Marge nette: {s.marge_nette}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{width:s.marge_brute+"%",background:"rgba(52,211,153,0.3)"}} />
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-1">
              <div className="h-full rounded-full" style={{width:s.marge_nette+"%",background:"#34d399"}} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ZonesTab() {
  return (
    <div className="space-y-4">
      <div className="section-card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Rentabilite par zone geographique</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["Zone","Leads","CA","Cout deplac.","Marge nette","Top service"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 py-3 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ZONES_DATA.sort((a,b)=>b.marge_nette-a.marge_nette).map((z,i) => (
                <tr key={i} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-200">{z.zone}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm text-slate-400">{z.leads}</td>
                  <td className="py-3 px-3 text-sm font-bold text-slate-200">{z.ca.toLocaleString()}EUR</td>
                  <td className="py-3 px-3">
                    <span className={"text-xs font-semibold px-2 py-0.5 rounded-full " + (z.cout_deplacement>20?"bg-rose-500/10 text-rose-400":"bg-emerald-500/10 text-emerald-400")}>
                      {z.cout_deplacement}EUR
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:z.marge_nette+"%",background:z.marge_nette>=60?"#34d399":z.marge_nette>=50?"#f59e0b":"#f43f5e"}} />
                      </div>
                      <span className="text-xs font-black" style={{color:z.marge_nette>=60?"#34d399":z.marge_nette>=50?"#f59e0b":"#f43f5e"}}>
                        {z.marge_nette}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">{z.top_service}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CanauxTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">CA par canal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CANAUX_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" stroke="#475569" style={{fontSize:"10px"}} tickLine={false} axisLine={false} />
              <YAxis dataKey="canal" type="category" stroke="#475569" style={{fontSize:"10px"}} tickLine={false} axisLine={false} width={100} />
              <Tooltip contentStyle={{background:"hsl(224,71%,8%)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",fontSize:"12px"}}
                formatter={v => [v+"EUR","CA"]} />
              <Bar dataKey="ca" radius={[0,4,4,0]} barSize={18}>
                {CANAUX_DATA.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">ROAS et CPA par canal</h3>
          <div className="space-y-3">
            {CANAUX_DATA.map((c,i) => (
              <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200">{c.canal}</span>
                  <div className="flex gap-3">
                    <span className="text-[10px] text-slate-500">CPA: <span className="font-bold text-slate-300">{c.cpa > 0 ? c.cpa+"EUR" : "Gratuit"}</span></span>
                    <span className="text-[10px] text-slate-500">ROAS: <span className="font-bold" style={{color:c.roas>=5?"#34d399":c.roas>=3?"#f59e0b":c.roas?"#f43f5e":"#34d399"}}>{c.roas ? c.roas+"x" : "∞"}</span></span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-200">{c.leads}</p>
                    <p className="text-[9px] text-slate-600">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-200">{c.ca.toLocaleString()}EUR</p>
                    <p className="text-[9px] text-slate-600">CA</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black" style={{color:c.marge_nette>=60?"#34d399":c.marge_nette>=50?"#f59e0b":"#f43f5e"}}>{c.marge_nette}%</p>
                    <p className="text-[9px] text-slate-600">Marge</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrevisionsTab() {
  const prevMois = 22800;
  const prevTrimestre = 71400;
  const croissance = 12;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="section-card p-5 text-center">
          <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-2" />
          <p className="text-3xl font-black text-slate-100">{prevMois.toLocaleString()}EUR</p>
          <p className="text-xs text-slate-500 mt-1">Prevision Novembre</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-2">
            <ArrowUpRight className="w-3 h-3" />+{croissance}% vs Oct
          </span>
        </div>
        <div className="section-card p-5 text-center">
          <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-3xl font-black text-slate-100">{prevTrimestre.toLocaleString()}EUR</p>
          <p className="text-xs text-slate-500 mt-1">Prevision Q4 2025</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-2">
            Confiance: 87%
          </span>
        </div>
        <div className="section-card p-5 text-center">
          <Target className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-3xl font-black text-slate-100">245k EUR</p>
          <p className="text-xs text-slate-500 mt-1">Prevision annuelle 2025</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-2">
            Objectif: 300k EUR
          </span>
        </div>
      </div>

      <div className="section-card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Evolution CA reel vs previsions IA</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={PREVISIONS_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="mois" stroke="#475569" style={{fontSize:"10px"}} tickLine={false} axisLine={false} />
            <YAxis stroke="#475569" style={{fontSize:"10px"}} tickLine={false} axisLine={false} width={50} />
            <Tooltip contentStyle={{background:"hsl(224,71%,8%)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",fontSize:"12px"}}
              formatter={(v,n) => [v ? v.toLocaleString()+"EUR" : "-", n==="reel"?"CA reel":"Prevision IA"]} />
            <Line type="monotone" dataKey="reel" stroke="#34d399" strokeWidth={2} dot={{fill:"#34d399",r:4}} connectNulls={false} name="reel" />
            <Line type="monotone" dataKey="prevision" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{fill:"#8b5cf6",r:4}} connectNulls={false} name="prevision" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 justify-center">
          <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-emerald-400" /><span className="text-xs text-slate-500">CA reel</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-violet-400 border-dashed border-t border-violet-400" /><span className="text-xs text-slate-500">Prevision IA</span></div>
        </div>
      </div>

      <div className="section-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-200">Recommandations IA pour maximiser la rentabilite</h3>
        </div>
        <div className="space-y-3">
          {[
            { emoji:"🎯", color:"#34d399", title:"Doubler les interventions bureaux", detail:"Marge de 74% vs 48% pour les tapis. 1 client bureau = 3x la valeur d un client particulier. Creez une offre B2B dediee." },
            { emoji:"📍", color:"#60a5fa", title:"Concentrer la prospection sur Paris 15e-17e", detail:"Ces zones combinent forte demande + faible cout de deplacement + bonne marge nette (61-63%). ROI maximal." },
            { emoji:"💡", color:"#f59e0b", title:"Reduire budget Facebook Ads de 40%", detail:"ROAS de 2.75x trop faible. Redirigez vers Google Ads (5.7x) et SEO (18x). Economie de 320EUR/mois, +15% de rentabilite." },
            { emoji:"🔄", color:"#a78bfa", title:"Lancer des contrats d abonnement menage", detail:"Un client menage hebdomadaire = 600EUR/mois garanti vs 150EUR ponctuel. Objectif: 20 abonnes = +12k EUR CA recurrent." },
          ].map((r,i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{background:r.color+"08",border:"1px solid "+r.color+"20"}}>
              <span className="text-2xl flex-shrink-0">{r.emoji}</span>
              <div>
                <p className="text-sm font-bold text-slate-200 mb-1">{r.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{r.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RentabiliteModule() {
  const [activeTab, setActiveTab] = useState("overview");
  const [financial, setFinancial] = useState(null);

  useEffect(() => {
    axios.get(API+"/stats/financial?period=30d", {withCredentials:true})
      .then(r => setFinancial(r.data))
      .catch(() => {});
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:"Manrope,sans-serif"}}>Rentabilite</h1>
          </div>
          <p className="text-slate-500 text-sm">Marges, zones, canaux et previsions IA pour maximiser votre profit</p>
        </div>
      </div>

      <div className="flex gap-1 bg-white/3 rounded-2xl border border-white/5 p-1.5 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap " +
              (activeTab===tab.id?"bg-emerald-600 text-white":"text-slate-500 hover:text-slate-300 hover:bg-white/5")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab financial={financial} />}
      {activeTab === "services" && <ServicesTab />}
      {activeTab === "zones" && <ZonesTab />}
      {activeTab === "canaux" && <CanauxTab />}
      {activeTab === "previsions" && <PrevisionsTab />}
    </div>
  );
}
