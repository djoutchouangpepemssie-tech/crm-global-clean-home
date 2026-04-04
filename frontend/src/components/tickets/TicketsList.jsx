import React, { useState, useEffect } from "react";
import axios from "axios";
import { Ticket, Plus, RefreshCw, AlertTriangle, Clock, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";
import BACKEND_URL from "../../config.js";

const API = BACKEND_URL + "/api";

const PRIO = {
  urgent:{label:"Urgent",color:"#f43f5e",bg:"rgba(244,63,94,0.1)",emoji:"🔴"},
  high:{label:"Haute",color:"#f59e0b",bg:"rgba(245,158,11,0.1)",emoji:"🟠"},
  normal:{label:"Normale",color:"#60a5fa",bg:"rgba(96,165,250,0.1)",emoji:"🔵"},
  low:{label:"Basse",color:"#94a3b8",bg:"rgba(148,163,184,0.1)",emoji:"⚪"},
};
const STAT = {
  open:{label:"Ouvert",color:"#60a5fa",bg:"rgba(96,165,250,0.1)"},
  in_progress:{label:"En cours",color:"#f59e0b",bg:"rgba(245,158,11,0.1)"},
  waiting_client:{label:"Attente client",color:"#a78bfa",bg:"rgba(167,139,250,0.1)"},
  resolved:{label:"Resolu",color:"#34d399",bg:"rgba(52,211,153,0.1)"},
  closed:{label:"Ferme",color:"#94a3b8",bg:"rgba(148,163,184,0.1)"},
};

export default function TicketsList() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({open:0,in_progress:0,resolved:0,sla_breaches:0});
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({subject:"",description:"",priority:"normal",category:"general",lead_id:"",client_name:"",client_email:""});
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = filterStatus ? "?status=" + filterStatus : "";
      const [t, s, l] = await Promise.all([
        axios.get(API + "/tickets/" + p, {withCredentials:true}),
        axios.get(API + "/tickets/stats", {withCredentials:true}),
        axios.get(API + "/leads?limit=50", {withCredentials:true}),
      ]);
      // Handle paginated response formats
      const tData = t.data;
      setTickets(Array.isArray(tData) ? tData : (tData?.items || tData?.tickets || []));
      setStats(s.data || {});
      const lData = l.data;
      setLeads(Array.isArray(lData) ? lData : (lData?.items || lData?.leads || []));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const createTicket = async () => {
    if (!form.subject || !form.description) { toast.error("Remplissez objet et description"); return; }
    setSaving(true);
    try {
      await axios.post(API + "/tickets/", form, {withCredentials:true});
      toast.success("Ticket cree !");
      setShowNew(false);
      setForm({subject:"",description:"",priority:"normal",category:"general",lead_id:"",client_name:"",client_email:""});
      load();
    } catch(e) { toast.error("Erreur creation"); } finally { setSaving(false); }
  };

  const openTicket = async (t) => {
    try {
      const res = await axios.get(API + "/tickets/" + t.ticket_id, {withCredentials:true});
      setSelected(res.data);
    } catch(e) { setSelected(t); }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await axios.post(API + "/tickets/" + selected.ticket_id + "/reply", {message:reply,is_internal:isInternal}, {withCredentials:true});
      toast.success("Reponse envoyee !"); setReply("");
      const res = await axios.get(API + "/tickets/" + selected.ticket_id, {withCredentials:true});
      setSelected(res.data); load();
    } catch(e) { toast.error("Erreur"); } finally { setSending(false); }
  };

  const changeStatus = async (status) => {
    if (!selected) return;
    try {
      await axios.patch(API + "/tickets/" + selected.ticket_id, {status}, {withCredentials:true});
      toast.success("Statut mis a jour !");
      const res = await axios.get(API + "/tickets/" + selected.ticket_id, {withCredentials:true});
      setSelected(res.data); load();
    } catch(e) { toast.error("Erreur"); }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100">Service Client</h1>
          </div>
          <p className="text-slate-500 text-sm">Gestion des tickets et demandes clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Nouveau ticket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {label:"Ouverts",value:stats.open||0,icon:Ticket,color:"#60a5fa"},
          {label:"En cours",value:stats.in_progress||0,icon:Clock,color:"#f59e0b"},
          {label:"Resolus",value:stats.resolved||0,icon:CheckCircle,color:"#34d399"},
          {label:"SLA depasses",value:stats.sla_breaches||0,icon:AlertTriangle,color:stats.sla_breaches>0?"#f43f5e":"#94a3b8"},
        ].map((m,i) => (
          <div key={i} className="metric-card">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{background:m.color+"15",border:"1px solid "+m.color+"30"}}>
              <m.icon className="w-4 h-4" style={{color:m.color}} />
            </div>
            <p className="text-2xl font-bold text-slate-100">{m.value}</p>
            <p className="text-xs text-slate-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[["","Tous"],["open","Ouvert"],["in_progress","En cours"],["resolved","Resolu"],["closed","Ferme"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={"px-3 py-2 rounded-xl text-xs font-semibold transition-all " + (filterStatus===v?"bg-violet-600 text-white":"bg-white/5 text-slate-400 hover:bg-white/10")}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : tickets.length > 0 ? (
        <div className="space-y-2">
          {tickets.map(t => {
            const p = PRIO[t.priority]||PRIO.normal;
            const s = STAT[t.status]||STAT.open;
            return (
              <div key={t.ticket_id} onClick={() => openTicket(t)}
                className="flex items-center gap-4 p-4 section-card hover:border-violet-500/30 cursor-pointer transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:p.bg,border:"1px solid "+p.color+"30"}}>📋</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 font-mono mb-0.5">#{t.ticket_number}</p>
                  <p className="text-sm font-semibold text-slate-200 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-500">{t.client_name||"Client inconnu"}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:s.bg,color:s.color}}>{s.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:p.bg,color:p.color}}>{p.emoji} {p.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="section-card p-12 text-center">
          <Ticket className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">Aucun ticket pour le moment</p>
          <button onClick={() => setShowNew(true)} className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm">
            + Creer mon premier ticket
          </button>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="section-card w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-5">Nouveau ticket</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Client (optionnel)</label>
                <select value={form.lead_id} onChange={e => { const ld=leads.find(x=>x.lead_id===e.target.value); setForm(p=>({...p,lead_id:e.target.value,client_name:ld?ld.name:"",client_email:ld?ld.email:""})); }}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                  <option value="" className="bg-slate-800">Sans fiche lead</option>
                  {leads.map(ld => <option key={ld.lead_id} value={ld.lead_id} className="bg-slate-800">{ld.name}</option>)}
                </select>
              </div>
              {!form.lead_id && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Nom</label>
                    <input value={form.client_name} onChange={e=>setForm(p=>({...p,client_name:e.target.value}))} placeholder="Jean Dupont" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Email</label>
                    <input value={form.client_email} onChange={e=>setForm(p=>({...p,client_email:e.target.value}))} placeholder="email@ex.com" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Objet *</label>
                <input value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} placeholder="Ex: Probleme apres intervention" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Description *</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={4} placeholder="Decrivez le probleme..." className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Priorite</label>
                  <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                    <option value="urgent" className="bg-slate-800">🔴 Urgent</option>
                    <option value="high" className="bg-slate-800">🟠 Haute</option>
                    <option value="normal" className="bg-slate-800">🔵 Normale</option>
                    <option value="low" className="bg-slate-800">⚪ Basse</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Categorie</label>
                  <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                    <option value="general" className="bg-slate-800">📋 General</option>
                    <option value="reclamation" className="bg-slate-800">⚠️ Reclamation</option>
                    <option value="question" className="bg-slate-800">❓ Question</option>
                    <option value="intervention" className="bg-slate-800">🧹 Intervention</option>
                    <option value="facturation" className="bg-slate-800">💰 Facturation</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowNew(false)} className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm">Annuler</button>
              <button onClick={createTicket} disabled={saving} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm disabled:opacity-60">
                {saving?"Creation...":"Creer le ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="section-card w-full max-w-2xl flex flex-col" style={{maxHeight:"90vh"}}>
            <div className="flex items-start justify-between p-5 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] text-slate-500">#{selected.ticket_number}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:(STAT[selected.status]||STAT.open).bg,color:(STAT[selected.status]||STAT.open).color}}>{(STAT[selected.status]||STAT.open).label}</span>
                </div>
                <h3 className="font-bold text-slate-100">{selected.subject}</h3>
                <p className="text-xs text-slate-500">{selected.client_name}</p>
              </div>
              <button onClick={()=>setSelected(null)} className="text-slate-500 hover:text-slate-200 text-2xl font-bold px-2">x</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="p-4 rounded-xl bg-white/3 border border-white/5">
                <p className="text-xs font-semibold text-slate-500 mb-2">DESCRIPTION</p>
                <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
              </div>
              {(selected.replies||[]).map((r,i) => (
                <div key={i} className={"p-3 rounded-xl "+(r.is_internal?"bg-amber-500/5 border border-amber-500/15":"bg-blue-500/5 border border-blue-500/15")}>
                  <p className="text-[10px] font-bold mb-1" style={{color:r.is_internal?"#f59e0b":"#60a5fa"}}>{r.is_internal?"Note interne":"Reponse client"}</p>
                  <p className="text-sm text-slate-300">{r.message}</p>
                </div>
              ))}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={()=>setIsInternal(false)} className={"px-3 py-1.5 rounded-lg text-xs font-semibold "+(!isInternal?"bg-blue-500/20 text-blue-300 border border-blue-500/30":"bg-white/5 text-slate-500")}>Email client</button>
                  <button onClick={()=>setIsInternal(true)} className={"px-3 py-1.5 rounded-lg text-xs font-semibold "+(isInternal?"bg-amber-500/20 text-amber-300 border border-amber-500/30":"bg-white/5 text-slate-500")}>Note interne</button>
                </div>
                <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3} placeholder="Votre reponse..." className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-violet-500" />
                <button onClick={sendReply} disabled={sending||!reply.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs disabled:opacity-60 flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" /> Envoyer
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-white/5 flex gap-2 flex-wrap">
              {Object.entries(STAT).filter(([k])=>k!==selected.status).map(([k,v]) => (
                <button key={k} onClick={()=>changeStatus(k)} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:v.bg,color:v.color}}>{v.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
