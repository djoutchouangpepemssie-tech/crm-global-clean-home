import React, { useState, useEffect } from "react";
import axios from "axios";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { TrendingUp, TrendingDown, Search, Eye, MousePointer, Target, RefreshCw, ExternalLink, Sparkles, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import BACKEND_URL from "../../config.js";

const API = BACKEND_URL + "/api";

const TABS = [
  { id: "overview", label: "Vue globale", icon: TrendingUp },
  { id: "keywords", label: "Mots-cles", icon: Search },
  { id: "pages", label: "Pages", icon: Eye },
  { id: "opportunities", label: "Opportunites", icon: Target },
  { id: "ai", label: "IA SEO", icon: Sparkles },
];

const KEYWORDS_DATA = [
  { keyword: "nettoyage canape paris", position: 7, prev: 9, volume: 880, clicks: 142, impressions: 2840, ctr: 5.0, difficulty: 42, url: "/nettoyage-canape" },
  { keyword: "menage a domicile paris", position: 14, prev: 16, volume: 2400, clicks: 89, impressions: 1920, ctr: 4.6, difficulty: 65, url: "/menage-domicile" },
  { keyword: "nettoyage matelas idf", position: 5, prev: 6, volume: 590, clicks: 203, impressions: 3100, ctr: 6.5, difficulty: 38, url: "/nettoyage-matelas" },
  { keyword: "nettoyage tapis paris", position: 9, prev: 8, volume: 320, clicks: 67, impressions: 1450, ctr: 4.6, difficulty: 35, url: "/nettoyage-tapis" },
  { keyword: "devis nettoyage paris", position: 4, prev: 4, volume: 480, clicks: 312, impressions: 4200, ctr: 7.4, difficulty: 40, url: "/devis" },
  { keyword: "pressing canape domicile", position: 3, prev: 5, volume: 260, clicks: 198, impressions: 2100, ctr: 9.4, difficulty: 28, url: "/nettoyage-canape" },
  { keyword: "nettoyage apres demenagement", position: 18, prev: 22, volume: 1100, clicks: 34, impressions: 890, ctr: 3.8, difficulty: 55, url: "/menage-domicile" },
  { keyword: "entreprise nettoyage bureaux paris", position: 11, prev: 13, volume: 720, clicks: 56, impressions: 1340, ctr: 4.2, difficulty: 58, url: "/nettoyage-bureaux" },
  { keyword: "nettoyage canape cuir paris", position: 6, prev: 7, volume: 390, clicks: 87, impressions: 1680, ctr: 5.2, difficulty: 32, url: "/nettoyage-canape" },
  { keyword: "ménage printemps paris", position: 23, prev: 28, volume: 890, clicks: 21, impressions: 640, ctr: 3.3, difficulty: 48, url: "/menage-domicile" },
];

const PAGES_DATA = [
  { url: "/nettoyage-canape", title: "Nettoyage Canape Paris", clicks: 342, impressions: 5820, ctr: 5.9, position: 6.2, leads: 12 },
  { url: "/menage-domicile", title: "Menage a Domicile Paris", clicks: 198, impressions: 4210, ctr: 4.7, position: 13.4, leads: 7 },
  { url: "/devis", title: "Devis Gratuit Nettoyage", clicks: 412, impressions: 6300, ctr: 6.5, position: 4.1, leads: 28 },
  { url: "/nettoyage-matelas", title: "Nettoyage Matelas IDF", clicks: 267, impressions: 3900, ctr: 6.8, position: 5.3, leads: 9 },
  { url: "/nettoyage-bureaux", title: "Nettoyage Bureaux Paris", clicks: 134, impressions: 2840, ctr: 4.7, position: 10.8, leads: 4 },
  { url: "/nettoyage-tapis", title: "Nettoyage Tapis Paris", clicks: 89, impressions: 2100, ctr: 4.2, position: 8.9, leads: 3 },
];

const OPPORTUNITIES = [
  { type: "quick_win", title: "Optimiser le titre H1 de /nettoyage-canape", impact: "haute", effort: "faible", detail: "Le mot-cle 'nettoyage canape paris' est en position 7. Ajouter 'Professionnel' dans le H1 et le titre meta pourrait faire passer en top 5 (+40% de clics estimes).", kw: "nettoyage canape paris", current_pos: 7 },
  { type: "content", title: "Creer une FAQ sur la page /menage-domicile", impact: "haute", effort: "moyenne", detail: "10 questions populaires sur le menage a domicile Paris n ont pas de reponse sur votre site. Une section FAQ avec schema markup pourrait capturer les featured snippets.", kw: "menage a domicile paris", current_pos: 14 },
  { type: "new_page", title: "Creer une page 'Nettoyage apres demenagement Paris'", impact: "haute", effort: "moyenne", detail: "Le mot-cle 'nettoyage apres demenagement' a 1100 recherches/mois et vous etes en position 18. Une page dediee pourrait capturer 80-150 clics supplementaires par mois.", kw: "nettoyage apres demenagement", current_pos: 18 },
  { type: "technical", title: "Ameliorer la vitesse mobile de /devis", impact: "moyenne", effort: "faible", detail: "Le Core Web Vitals LCP de /devis est a 3.8s sur mobile. L optimiser sous 2.5s pourrait ameliorer le classement de 2-3 positions.", kw: "toutes pages", current_pos: null },
  { type: "content", title: "Ajouter des temoignages clients avec schema Review", impact: "haute", effort: "faible", detail: "Les rich snippets avec etoiles augmentent le CTR de 15-30%. Ajouter le schema markup Review sur vos pages de service genererait des etoiles dans les resultats Google.", kw: "toutes pages", current_pos: null },
  { type: "quick_win", title: "Optimiser les meta descriptions manquantes", impact: "moyenne", effort: "faible", detail: "3 pages n ont pas de meta description personnalisee. Google genere des descriptions automatiques moins attractives. Rediger des meta descriptions avec CTA augmentera le CTR.", kw: "pages manquantes", current_pos: null },
];

const TREND_DATA = [
  { date: "Jan", clicks: 680, impressions: 12400 },
  { date: "Fev", clicks: 720, impressions: 13100 },
  { date: "Mar", clicks: 810, impressions: 14200 },
  { date: "Avr", clicks: 760, impressions: 13800 },
  { date: "Mai", clicks: 920, impressions: 15600 },
  { date: "Jun", clicks: 1050, impressions: 17200 },
  { date: "Jul", clicks: 980, impressions: 16400 },
  { date: "Aou", clicks: 1120, impressions: 18900 },
  { date: "Sep", clicks: 1280, impressions: 21400 },
  { date: "Oct", clicks: 1190, impressions: 19800 },
  { date: "Nov", clicks: 1340, impressions: 22600 },
  { date: "Dec", clicks: 1420, impressions: 24100 },
];

function MetricCard({ title, value, change, trend, icon: Icon, color, subtitle }) {
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

function OverviewTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Clics organiques" value="1.4k" change="+12%" trend="up" icon={MousePointer} color="#34d399" subtitle="Ce mois" />
        <MetricCard title="Impressions" value="24.1k" change="+8%" trend="up" icon={Eye} color="#60a5fa" subtitle="Ce mois" />
        <MetricCard title="CTR moyen" value="5.9%" change="+0.4%" trend="up" icon={Target} color="#a78bfa" subtitle="Taux de clic" />
        <MetricCard title="Position moy." value="8.3" change="-1.2" trend="up" icon={TrendingUp} color="#f59e0b" subtitle="Amelioration" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Evolution clics et impressions (12 mois)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={TREND_DATA}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="#475569" style={{fontSize:"10px"}} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" style={{fontSize:"10px"}} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={{background:"hsl(224,71%,8%)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",fontSize:"12px"}} />
              <Area type="monotone" dataKey="clicks" stroke="#34d399" strokeWidth={2} fill="url(#gc)" name="Clics" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="section-card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Top pages par leads</h3>
          <div className="space-y-3">
            {PAGES_DATA.sort((a,b)=>b.leads-a.leads).slice(0,5).map((p,i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-violet-500/15 flex items-center justify-center text-[10px] font-black text-violet-300 flex-shrink-0">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{p.title}</p>
                  <p className="text-[10px] text-slate-500">{p.clicks} clics · pos {p.position}</p>
                </div>
                <span className="text-xs font-black text-emerald-400">{p.leads} leads</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">Alertes SEO prioritaires</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            { emoji:"🚀", color:"#34d399", title:"3 mots-cles en top 10", detail:"Potentiel de +200 clics si optimises" },
            { emoji:"⚠️", color:"#f59e0b", title:"5 opportunites detectees", detail:"Pages sans meta description" },
            { emoji:"📈", color:"#60a5fa", title:"CTR ameliore +8%", detail:"vs mois precedent" },
          ].map((a,i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{background:a.color+"08",border:"1px solid "+a.color+"20"}}>
              <span className="text-2xl">{a.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">{a.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KeywordsTab() {
  const [sort, setSort] = useState("clicks");
  const sorted = [...KEYWORDS_DATA].sort((a,b) => b[sort]-a[sort]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[["clicks","Clics"],["impressions","Impressions"],["position","Position"],["volume","Volume"]].map(([v,l]) => (
          <button key={v} onClick={()=>setSort(v)}
            className={"px-3 py-1.5 rounded-xl text-xs font-semibold transition-all "+(sort===v?"bg-violet-600 text-white":"bg-white/5 text-slate-400 hover:bg-white/10")}>
            {l}
          </button>
        ))}
      </div>

      <div className="section-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["Mot-cle","Position","Evolution","Clics","Impressions","CTR","Volume","Difficulte"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 py-3 px-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((kw,i) => {
                const posChange = kw.prev - kw.position;
                return (
                  <tr key={i} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-semibold text-slate-200">{kw.keyword}</p>
                      <p className="text-[10px] text-slate-600">{kw.url}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className={"w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black "+
                        (kw.position<=3?"bg-emerald-500/20 text-emerald-400":kw.position<=10?"bg-amber-500/20 text-amber-400":"bg-slate-500/20 text-slate-400")}>
                        {kw.position}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={"flex items-center gap-0.5 text-xs font-bold "+(posChange>0?"text-emerald-400":posChange<0?"text-rose-400":"text-slate-500")}>
                        {posChange>0?<ArrowUpRight className="w-3 h-3"/>:posChange<0?<ArrowDownRight className="w-3 h-3"/>:null}
                        {posChange===0?"=":Math.abs(posChange)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-slate-200">{kw.clicks}</td>
                    <td className="py-3 px-4 text-sm text-slate-400">{kw.impressions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-slate-400">{kw.ctr}%</td>
                    <td className="py-3 px-4 text-sm text-slate-400">{kw.volume}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:kw.difficulty+"%",background:kw.difficulty>50?"#f43f5e":kw.difficulty>30?"#f59e0b":"#34d399"}} />
                        </div>
                        <span className="text-[10px] text-slate-500">{kw.difficulty}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PagesTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {PAGES_DATA.map((p,i) => (
          <div key={i} className="section-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-slate-200">{p.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.url}</p>
              </div>
              <a href={"https://www.globalcleanhome.com"+p.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                {l:"Clics",v:p.clicks,c:"#34d399"},
                {l:"Impressions",v:p.impressions.toLocaleString(),c:"#60a5fa"},
                {l:"CTR",v:p.ctr+"%",c:"#a78bfa"},
                {l:"Position moy.",v:p.position,c:"#f59e0b"},
              ].map((m,j) => (
                <div key={j} className="text-center p-2 rounded-lg bg-white/3">
                  <p className="text-sm font-black" style={{color:m.c}}>{m.v}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{m.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden mr-3">
                <div className="h-full rounded-full bg-emerald-500" style={{width:Math.min(100,p.ctr*10)+"%"}} />
              </div>
              <span className="text-xs font-bold text-emerald-400">{p.leads} leads</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunitiesTab() {
  const TYPE_CONFIG = {
    quick_win:{label:"Quick Win",color:"#34d399",emoji:"🚀"},
    content:{label:"Contenu",color:"#60a5fa",emoji:"📝"},
    new_page:{label:"Nouvelle page",color:"#a78bfa",emoji:"➕"},
    technical:{label:"Technique",color:"#f59e0b",emoji:"⚙️"},
  };
  const IMPACT_CONFIG = {
    haute:{color:"#f43f5e",bg:"rgba(244,63,94,0.1)"},
    moyenne:{color:"#f59e0b",bg:"rgba(245,158,11,0.1)"},
    faible:{color:"#60a5fa",bg:"rgba(96,165,250,0.1)"},
  };

  return (
    <div className="space-y-4">
      <div className="section-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-violet-400" />
          <p className="text-sm font-semibold text-slate-200">6 opportunites SEO detectees</p>
        </div>
        <p className="text-xs text-slate-500">Classees par impact potentiel sur votre trafic organique</p>
      </div>

      <div className="space-y-3">
        {OPPORTUNITIES.map((opp,i) => {
          const tc = TYPE_CONFIG[opp.type] || TYPE_CONFIG.content;
          const ic = IMPACT_CONFIG[opp.impact] || IMPACT_CONFIG.moyenne;
          return (
            <div key={i} className="section-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{tc.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{opp.title}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:tc.color+"15",color:tc.color}}>{tc.label}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{background:ic.bg,color:ic.color}}>
                    Impact {opp.impact}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{opp.detail}</p>
              {opp.kw && opp.kw !== "toutes pages" && opp.kw !== "pages manquantes" && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-slate-600">Mot-cle cible:</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">{opp.kw}</span>
                  {opp.current_pos && <span className="text-[10px] text-slate-600">Position actuelle: {opp.current_pos}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AISEOTab() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [activePrompt, setActivePrompt] = useState(null);

  const QUICK_PROMPTS = [
    { id: 1, label: "Generer titre SEO", emoji: "🎯", prompt: "Genere 5 titres SEO optimises pour la page de nettoyage de canape a Paris. Objectif: position top 3 sur 'nettoyage canape paris'. Format: H1 + Title meta + meta description." },
    { id: 2, label: "Plan de contenu SEO", emoji: "📝", prompt: "Cree un plan de contenu SEO complet pour globalcleanhome.com. Inclus: 10 articles de blog, 5 pages de service, 3 pages locales. Avec mots-cles cibles, volume, et objectif de chaque page." },
    { id: 3, label: "FAQ schema markup", emoji: "❓", prompt: "Genere une FAQ SEO de 8 questions-reponses pour la page nettoyage canape paris. Format JSON-LD schema FAQ inclus. Questions basees sur les recherches Google reelles." },
    { id: 4, label: "Diagnostic campagne", emoji: "🔍", prompt: "Analyse le profil SEO de Global Clean Home (nettoyage Paris). Points forts, points faibles, 5 actions prioritaires pour doubler le trafic organique en 6 mois." },
    { id: 5, label: "Texte page service", emoji: "✍️", prompt: "Redige le texte SEO complet pour une page 'Nettoyage de Canape Paris' (800 mots). Inclure: H1, H2, corps, CTA, balises optimisees. Ton professionnel et rassurant." },
    { id: 6, label: "Strategie mots-cles locaux", emoji: "📍", prompt: "Propose une strategie de mots-cles locaux pour couvrir Paris et IDF (75, 92, 93, 94). Liste des arrondissements prioritaires avec mots-cles et volumes de recherche." },
  ];

  const handleGenerate = async (p) => {
    setActivePrompt(p.id);
    setGenerating(true);
    setResult("");
    try {
      const res = await axios.post(`${API}/ai/generate-email`, {
        lead_id: "seo_analysis",
        context: "suivi",
        tone: "professionnel",
        custom_instructions: p.prompt
      }, { withCredentials: true });
      setResult(res.data.body || res.data.subject || "Analyse generee avec succes.");
    } catch(e) {
      setResult("Voici une analyse SEO pour Global Clean Home:\n\n" + p.prompt.substring(0, 100) + "...\n\nConnectez le Centre IA pour des analyses personnalisees.");
    } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-5">
      <div className="section-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-200">Generateur de contenu SEO</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {QUICK_PROMPTS.map(p => (
            <button key={p.id} onClick={() => handleGenerate(p)} disabled={generating}
              className={"p-3 rounded-xl border-2 text-left transition-all disabled:opacity-60 " +
                (activePrompt===p.id?"border-violet-500 bg-violet-500/10":"border-white/5 bg-white/3 hover:border-white/15 hover:bg-white/5")}>
              <span className="text-xl block mb-1">{p.emoji}</span>
              <p className="text-xs font-semibold text-slate-200">{p.label}</p>
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Ou posez votre question SEO</label>
          <div className="flex gap-2">
            <input value={prompt} onChange={e=>setPrompt(e.target.value)}
              placeholder="Ex: Quels mots-cles cibler pour les bureaux a La Defense ?"
              className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-500" />
            <button onClick={() => handleGenerate({id:99,prompt})} disabled={generating||!prompt.trim()}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm disabled:opacity-60">
              {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Analyser"}
            </button>
          </div>
        </div>
      </div>

      {(generating || result) && (
        <div className="section-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-slate-200">Resultat IA</h3>
          </div>
          {generating ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Generation en cours...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-white/3 p-4 rounded-xl border border-white/5 font-sans">{result}</pre>
              <button onClick={() => { navigator.clipboard.writeText(result); toast.success("Copie !"); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-xs font-semibold">
                Copier
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SEODashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:"Manrope,sans-serif"}}>SEO & Referencement</h1>
          </div>
          <p className="text-slate-500 text-sm">Positions, opportunites et generation de contenu IA</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/20 rounded-xl text-sm font-semibold transition-all">
            <ExternalLink className="w-4 h-4" /> Search Console
          </a>
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

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "keywords" && <KeywordsTab />}
      {activeTab === "pages" && <PagesTab />}
      {activeTab === "opportunities" && <OpportunitiesTab />}
      {activeTab === "ai" && <AISEOTab />}
    </div>
  );
}
