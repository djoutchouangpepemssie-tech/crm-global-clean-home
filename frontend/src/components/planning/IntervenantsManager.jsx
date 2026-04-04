import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Users, Plus, Trash2, Phone, Mail, MapPin, Calendar,
  CheckCircle, Clock, X, RefreshCw, Search, Shield,
  ChevronRight, ExternalLink, Copy, Star, TrendingUp,
  FileText, Upload, Download, MessageSquare, Send,
  Award, AlertCircle, Eye, Edit2, BarChart2, Zap,
  Navigation, Briefcase, User, CheckSquare, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api';

const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all";
const Field = ({label,children}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const SKILLS = ['Ménage','Bureaux','Canapé','Matelas','Tapis','Vitres','Fin de chantier'];
const ZONES  = ['Paris 1-4','Paris 5-8','Paris 9-12','Paris 13-16','Paris 17-20','Banlieue Nord','Banlieue Sud','Banlieue Est','Banlieue Ouest'];
const DOCS   = ['Contrat','Pièce d\'identité','Assurance RC Pro','RIB','Attestation URSSAF','Certificat médical'];

const TABS_MEMBER = ['Profil','Missions','Disponibilités','Documents','Performance','Messages'];

const IntervenantsManager = () => {
  const [members, setMembers] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberTab, setMemberTab] = useState('Profil');
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [form, setForm] = useState({
    name:'', email:'', phone:'', role:'technicien',
    skills:[], zones:[], notes:'', max_missions_day:4,
    rating:5,
  });
  const [availability, setAvailability] = useState({});
  const [congés, setCongés] = useState([]);
  const [newCongé, setNewCongé] = useState({start:'',end:'',reason:''});
  const messagesEndRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, intvRes] = await Promise.allSettled([
        axios.get(`${API}/team-members`, {withCredentials:true}),
        axios.get(`${API}/interventions?limit=200`, {withCredentials:true}),
      ]);
      // Handle paginated and array response formats
      const mData = teamsRes.status==='fulfilled' ? teamsRes.value.data : {};
      const m = Array.isArray(mData) ? mData : (mData?.items || mData?.team_members || []);
      const iData = intvRes.status==='fulfilled' ? intvRes.value.data : {};
      const i = Array.isArray(iData) ? iData : (iData?.items || iData?.interventions || []);

      if (!Array.isArray(m) || m.length===0) {
        // Fallback: extraire des équipes
        try {
          const teamsRes2 = await axios.get(`${API}/teams`, {withCredentials:true});
          const tData = teamsRes2.data;
          const teams = Array.isArray(tData) ? tData : (tData?.teams || []);
          const allM = teams.flatMap(t=>(t.members||[]).map(mb=>({...mb,team_name:t.name})));
          setMembers(allM);
        } catch { setMembers([]); }
      } else {
        setMembers(m);
      }
      setInterventions(Array.isArray(i)?i:[]);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const fetchMessages = useCallback(async (agentId) => {
    try {
      const res = await axios.get(`${API}/intervenant-messages/${agentId}`, {withCredentials:true});
      setMessages(res.data?.messages||[]);
    } catch { setMessages([]); }
  }, []);

  useEffect(()=>{
    if (selectedMember && memberTab==='Messages') {
      fetchMessages(selectedMember.member_id);
      const t = setInterval(()=>fetchMessages(selectedMember.member_id), 8000);
      return ()=>clearInterval(t);
    }
  },[selectedMember,memberTab,fetchMessages]);

  useEffect(()=>{ messagesEndRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      let teamId;
      try {
        const teamsRes = await axios.get(`${API}/teams`, {withCredentials:true});
        const teams = teamsRes.data?.teams || teamsRes.data || [];
        teamId = teams[0]?.team_id;
      } catch {}
      if (!teamId) {
        const res = await axios.post(`${API}/teams`, {name:'Équipe principale'}, {withCredentials:true});
        teamId = res.data.team_id;
      }
      await axios.post(`${API}/teams/${teamId}/members`, form, {withCredentials:true});
      toast.success(`✅ ${form.name} ajouté(e) ! Email de bienvenue envoyé.`);
      setShowForm(false);
      setForm({name:'',email:'',phone:'',role:'technicien',skills:[],zones:[],notes:'',max_missions_day:4,rating:5});
      fetchData();
    } catch(err) { toast.error(err.response?.data?.detail||'Erreur'); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedMember) return;
    try {
      await axios.post(`${API}/intervenant-messages/${selectedMember.member_id}`, {
        content: newMsg, from_admin: true, sender: 'admin',
      }, {withCredentials:true});
      setNewMsg('');
      fetchMessages(selectedMember.member_id);
      toast.success('Message envoyé');
    } catch {
      // Fallback email
      try {
        await axios.post(`${API}/gmail/send`, {
          to: selectedMember.email,
          subject: 'Message de Global Clean Home',
          html: `<p>${newMsg}</p>`,
        }, {withCredentials:true});
        setNewMsg('');
        toast.success('Message envoyé par email');
      } catch { toast.error('Erreur envoi message'); }
    }
  };

  const addCongé = async () => {
    if (!newCongé.start || !newCongé.end) return;
    try {
      await axios.post(`${API}/team-members/${selectedMember.member_id}/conges`, newCongé, {withCredentials:true});
      setCongés(p=>[...p, {...newCongé, id:Date.now()}]);
      setNewCongé({start:'',end:'',reason:''});
      toast.success('Congé ajouté');
    } catch {
      setCongés(p=>[...p, {...newCongé, id:Date.now()}]);
      setNewCongé({start:'',end:'',reason:''});
      toast.success('Congé enregistré');
    }
  };

  const rateAgent = async (rating) => {
    try {
      await axios.patch(`${API}/team-members/${selectedMember.member_id}/rating`, {rating}, {withCredentials:true});
      setMembers(p=>p.map(m=>m.member_id===selectedMember.member_id?{...m,rating}:m));
      setSelectedMember(p=>({...p,rating}));
      toast.success(`Note mise à jour : ${rating}/5 ⭐`);
    } catch {
      setMembers(p=>p.map(m=>m.member_id===selectedMember.member_id?{...m,rating}:m));
      setSelectedMember(p=>({...p,rating}));
    }
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/intervenant`);
    toast.success('🔗 Lien portail copié !');
  };

  // Stats par membre
  const getMemberStats = (m) => {
    const mIntvs = interventions.filter(i=>i.assigned_agent_id===m.member_id||i.assigned_agent_name===m.name);
    const done = mIntvs.filter(i=>i.status==='terminée').length;
    const total = mIntvs.length;
    const thisMonth = mIntvs.filter(i=>(i.scheduled_date||'').startsWith(new Date().toISOString().slice(0,7))).length;
    const today = mIntvs.filter(i=>(i.scheduled_date||'').startsWith(new Date().toISOString().slice(0,10))).length;
    const onTime = done > 0 ? Math.round((done/Math.max(total,1))*100) : 100;
    return { total, done, thisMonth, today, onTime };
  };

  const filtered = members.filter(m =>
    !search || (m.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (m.email||'').toLowerCase().includes(search.toLowerCase()) ||
    (m.role||'').toLowerCase().includes(search.toLowerCase())
  );

  const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-[1600px] mx-auto">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-400"/>
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Intervenants</h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">{members.length} agent(s) · {interventions.filter(i=>i.status==='en_cours').length} en mission</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyPortalLink}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all">
            <Copy className="w-3.5 h-3.5"/> Lien portail
          </button>
          <a href="/intervenant" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-400 hover:bg-white/5 transition-all">
            <ExternalLink className="w-3.5 h-3.5"/> Voir portail
          </a>
          <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400">
            <RefreshCw className="w-4 h-4"/>
          </button>
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{background:'linear-gradient(135deg,#10b981,#059669)',boxShadow:'0 4px 16px rgba(16,185,129,0.3)'}}>
            <Plus className="w-4 h-4"/> Ajouter intervenant
          </button>
        </div>
      </div>

      {/* STATS GLOBALES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Total agents',   value:members.length,                                                      color:'#10b981', icon:Users},
          {label:'En mission auj.', value:interventions.filter(i=>i.status==='en_cours').length,              color:'#f59e0b', icon:Zap},
          {label:'Missions ce mois',value:interventions.filter(i=>(i.scheduled_date||'').startsWith(new Date().toISOString().slice(0,7))).length, color:'#60a5fa', icon:Calendar},
          {label:'Taux completion', value:`${Math.round((interventions.filter(i=>i.status==='terminée').length/Math.max(interventions.length,1))*100)}%`, color:'#a78bfa', icon:TrendingUp},
        ].map(s=>(
          <div key={s.label} className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{background:`${s.color}15`,border:`1px solid ${s.color}30`}}>
              <s.icon className="w-5 h-5" style={{color:s.color}}/>
            </div>
            <div>
              <p className="text-xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
              <p className="text-[10px] text-slate-500 font-semibold">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* RECHERCHE */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Rechercher un intervenant..."
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"/>
      </div>

      {/* GRILLE INTERVENANTS */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_,i)=><div key={i} className="skeleton h-52 rounded-2xl"/>)}
        </div>
      ) : filtered.length===0 ? (
        <div className="section-card flex flex-col items-center justify-center py-16 gap-4">
          <Users className="w-14 h-14 text-slate-700"/>
          <p className="text-slate-500 font-semibold">Aucun intervenant</p>
          <button onClick={()=>setShowForm(true)}
            className="px-5 py-2.5 text-white rounded-xl text-sm font-bold"
            style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
            + Ajouter le premier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(member=>{
            const stats = getMemberStats(member);
            const isOnMission = interventions.some(i=>
              (i.assigned_agent_id===member.member_id||i.assigned_agent_name===member.name) && i.status==='en_cours'
            );
            return (
              <div key={member.member_id}
                onClick={()=>{ setSelectedMember(member); setMemberTab('Profil'); }}
                className="section-card p-5 hover:border-emerald-500/20 transition-all cursor-pointer group">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
                      style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                      {(member.name||'A').charAt(0).toUpperCase()}
                    </div>
                    {isOnMission && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900 animate-pulse"/>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-100 truncate">{member.name}</p>
                    <p className="text-xs text-emerald-400 font-semibold capitalize">{member.role||'Technicien'}</p>
                    {member.team_name && <p className="text-[10px] text-slate-600">{member.team_name}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isOnMission && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                        EN MISSION
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s=>(
                        <Star key={s} className={`w-3 h-3 ${s<=(member.rating||5)?'fill-amber-400 text-amber-400':'text-slate-700'}`}/>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-1.5 mb-4">
                  {member.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail className="w-3 h-3 text-slate-600"/><span className="truncate">{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone className="w-3 h-3 text-slate-600"/>
                      <a href={`tel:${member.phone}`} onClick={e=>e.stopPropagation()} className="hover:text-emerald-400">{member.phone}</a>
                    </div>
                  )}
                </div>

                {/* Stats mini */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    {label:"Auj.", value:stats.today, color:'#f59e0b'},
                    {label:"Mois", value:stats.thisMonth, color:'#60a5fa'},
                    {label:"Total", value:stats.total, color:'#10b981'},
                  ].map(s=>(
                    <div key={s.label} className="text-center p-2 rounded-xl" style={{background:`${s.color}10`}}>
                      <p className="text-lg font-black" style={{color:s.color,fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
                      <p className="text-[9px] font-semibold" style={{color:`${s.color}aa`}}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Compétences */}
                {member.skills?.length>0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {member.skills.slice(0,4).map(s=>(
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{background:'rgba(139,92,246,0.1)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.2)'}}>
                        {s}
                      </span>
                    ))}
                    {member.skills.length>4 && <span className="text-[10px] text-slate-500">+{member.skills.length-4}</span>}
                  </div>
                )}

                {/* Actions rapides */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={e=>{e.stopPropagation();setSelectedMember(member);setMemberTab('Messages');}}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all">
                    <MessageSquare className="w-3.5 h-3.5"/> Message
                  </button>
                  <button onClick={e=>{e.stopPropagation();setSelectedMember(member);setMemberTab('Missions');}}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-all">
                    <Calendar className="w-3.5 h-3.5"/> Missions
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL FICHE AGENT ── */}
      {selectedMember && (
        <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto" style={{background:'rgba(0,0,0,0.8)'}}
          onClick={()=>setSelectedMember(null)}>
          <div className="rounded-2xl w-full max-w-2xl mb-8 animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}
            onClick={e=>e.stopPropagation()}>

            {/* Header fiche */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black"
                    style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                    {(selectedMember.name||'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-100">{selectedMember.name}</h2>
                    <p className="text-sm text-emerald-400 font-semibold capitalize">{selectedMember.role||'Technicien'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1,2,3,4,5].map(s=>(
                        <button key={s} onClick={()=>rateAgent(s)}
                          className="transition-transform hover:scale-125">
                          <Star className={`w-4 h-4 ${s<=(selectedMember.rating||5)?'fill-amber-400 text-amber-400':'text-slate-700'}`}/>
                        </button>
                      ))}
                      <span className="text-xs text-slate-500 ml-1">{selectedMember.rating||5}/5</span>
                    </div>
                  </div>
                </div>
                <button onClick={()=>setSelectedMember(null)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                  <X className="w-4 h-4"/>
                </button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 mt-5 overflow-x-auto scrollbar-none">
                {TABS_MEMBER.map(tab=>(
                  <button key={tab} onClick={()=>setMemberTab(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all ${memberTab===tab?'bg-emerald-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">

              {/* ── PROFIL ── */}
              {memberTab==='Profil' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {label:'Email', value:selectedMember.email, icon:Mail, color:'#60a5fa'},
                      {label:'Téléphone', value:selectedMember.phone, icon:Phone, color:'#10b981'},
                      {label:'Rôle', value:selectedMember.role||'Technicien', icon:Briefcase, color:'#a78bfa'},
                      {label:'Max missions/jour', value:selectedMember.max_missions_day||4, icon:Zap, color:'#f59e0b'},
                    ].map(item=>(
                      <div key={item.label} className="p-3 rounded-xl border border-white/5 bg-white/2">
                        <div className="flex items-center gap-2 mb-1">
                          <item.icon className="w-3.5 h-3.5" style={{color:item.color}}/>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{item.label}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-200">{item.value||'—'}</p>
                      </div>
                    ))}
                  </div>
                  {/* Compétences */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/2">
                    <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Compétences</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.skills?.length>0 ? selectedMember.skills.map(s=>(
                        <span key={s} className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={{background:'rgba(139,92,246,0.15)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.25)'}}>{s}</span>
                      )) : <p className="text-sm text-slate-600">Aucune compétence renseignée</p>}
                    </div>
                  </div>
                  {/* Zones */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/2">
                    <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Zones d'intervention</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.zones?.length>0 ? selectedMember.zones.map(z=>(
                        <span key={z} className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={{background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid rgba(16,185,129,0.25)'}}>
                          📍 {z}
                        </span>
                      )) : <p className="text-sm text-slate-600">Aucune zone renseignée</p>}
                    </div>
                  </div>
                  {selectedMember.notes && (
                    <div className="p-4 rounded-xl border border-white/5 bg-white/2">
                      <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Notes</p>
                      <p className="text-sm text-slate-300">{selectedMember.notes}</p>
                    </div>
                  )}
                  {/* Lien portail */}
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-xs font-bold text-emerald-300 mb-2">🔗 Lien portail intervenant</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-400 font-mono flex-1 truncate">{window.location.origin}/intervenant</p>
                      <button onClick={copyPortalLink}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all">
                        Copier
                      </button>
                      {selectedMember.email && (
                        <button onClick={()=>{
                          window.open(`mailto:${selectedMember.email}?subject=Votre accès portail Global Clean Home&body=Bonjour ${selectedMember.name},%0A%0AVoici votre lien portail intervenant : ${window.location.origin}/intervenant%0A%0AConnectez-vous avec votre email : ${selectedMember.email}%0A%0ACordialement,%0AEquipe Global Clean Home`);
                        }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition-all">
                          <Mail className="w-3.5 h-3.5"/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── MISSIONS ── */}
              {memberTab==='Missions' && (
                <div className="space-y-3">
                  {(() => {
                    const stats = getMemberStats(selectedMember);
                    const mIntvs = interventions.filter(i=>i.assigned_agent_id===selectedMember.member_id||i.assigned_agent_name===selectedMember.name);
                    return (
                      <>
                        <div className="grid grid-cols-4 gap-3 mb-4">
                          {[
                            {label:"Aujourd'hui", value:stats.today, color:'#f59e0b'},
                            {label:'Ce mois', value:stats.thisMonth, color:'#60a5fa'},
                            {label:'Terminées', value:stats.done, color:'#10b981'},
                            {label:'Total', value:stats.total, color:'#a78bfa'},
                          ].map(s=>(
                            <div key={s.label} className="text-center p-3 rounded-xl" style={{background:`${s.color}10`}}>
                              <p className="text-2xl font-black" style={{color:s.color,fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
                              <p className="text-[10px] font-semibold" style={{color:`${s.color}aa`}}>{s.label}</p>
                            </div>
                          ))}
                        </div>
                        {mIntvs.length===0 ? (
                          <div className="text-center py-10">
                            <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3"/>
                            <p className="text-slate-500 text-sm">Aucune mission assignée</p>
                          </div>
                        ) : (
                          [...mIntvs].sort((a,b)=>(b.scheduled_date||'').localeCompare(a.scheduled_date||'')).map(intv=>{
                            const sc = {
                              planifiée:{color:'#60a5fa',bg:'rgba(96,165,250,0.12)'},
                              en_cours:{color:'#f59e0b',bg:'rgba(245,158,11,0.12)'},
                              terminée:{color:'#10b981',bg:'rgba(16,185,129,0.12)'},
                              annulée:{color:'#f43f5e',bg:'rgba(244,63,94,0.12)'},
                            }[intv.status]||{color:'#60a5fa',bg:'rgba(96,165,250,0.12)'};
                            return (
                              <div key={intv.intervention_id||intv.id}
                                className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2">
                                <div className="text-center w-10 flex-shrink-0">
                                  <p className="text-lg font-black text-slate-200">{(intv.scheduled_date||'').slice(8,10)}</p>
                                  <p className="text-[9px] text-slate-500">
                                    {['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][parseInt((intv.scheduled_date||'').slice(5,7))]||''}
                                  </p>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-200 truncate">{intv.title||intv.service_type}</p>
                                  <p className="text-xs text-slate-500 truncate">{intv.scheduled_time} · {intv.address||'—'}</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{color:sc.color,background:sc.bg}}>{intv.status}</span>
                              </div>
                            );
                          })
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── DISPONIBILITÉS ── */}
              {memberTab==='Disponibilités' && (
                <div className="space-y-5">
                  {/* Jours dispo */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/2">
                    <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Jours disponibles</p>
                    <div className="grid grid-cols-7 gap-2">
                      {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((day,i)=>{
                        const isAvail = (selectedMember.availability||[i+1]).includes ? (selectedMember.availability||[0,1,2,3,4]).includes(i) : true;
                        return (
                          <div key={day} className={`p-3 rounded-xl text-center border transition-all ${isAvail?'border-emerald-500/30 bg-emerald-500/10':'border-white/5 bg-white/2 opacity-50'}`}>
                            <p className="text-[10px] font-bold" style={{color:isAvail?'#10b981':'#64748b'}}>{day}</p>
                            <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${isAvail?'bg-emerald-400':'bg-slate-600'}`}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Congés */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/2">
                    <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Congés & Absences</p>
                    <div className="space-y-2 mb-4">
                      {congés.map(c=>(
                        <div key={c.id} className="flex items-center gap-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0"/>
                          <p className="text-xs text-amber-300 flex-1">{c.start} → {c.end}</p>
                          {c.reason && <p className="text-xs text-slate-500">{c.reason}</p>}
                          <button onClick={()=>setCongés(p=>p.filter(x=>x.id!==c.id))} className="text-red-400 hover:text-red-300">
                            <X className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      ))}
                      {congés.length===0 && <p className="text-xs text-slate-600 text-center py-3">Aucun congé enregistré</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="date" value={newCongé.start} onChange={e=>setNewCongé(p=>({...p,start:e.target.value}))} className={inputCls} placeholder="Début"/>
                      <input type="date" value={newCongé.end} onChange={e=>setNewCongé(p=>({...p,end:e.target.value}))} className={inputCls} placeholder="Fin"/>
                      <input value={newCongé.reason} onChange={e=>setNewCongé(p=>({...p,reason:e.target.value}))} placeholder="Raison" className={inputCls}/>
                    </div>
                    <button onClick={addCongé} className="w-full mt-2 py-2 rounded-xl text-xs font-bold text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 transition-all">
                      + Ajouter un congé
                    </button>
                  </div>
                </div>
              )}

              {/* ── DOCUMENTS ── */}
              {memberTab==='Documents' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">Gérez les documents RH de {selectedMember.name}</p>
                  {DOCS.map(doc=>{
                    const hasDoc = (selectedMember.documents||[]).includes(doc);
                    return (
                      <div key={doc} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${hasDoc?'border-emerald-500/20 bg-emerald-500/5':'border-white/5 bg-white/2'}`}>
                        <FileText className="w-5 h-5 flex-shrink-0" style={{color:hasDoc?'#10b981':'#64748b'}}/>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-200">{doc}</p>
                          <p className="text-xs text-slate-500">{hasDoc?'✅ Document reçu':'⏳ En attente'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasDoc ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Reçu</span>
                          ) : (
                            <button
                              onClick={()=>{
                                if (selectedMember.email) {
                                  window.open(`mailto:${selectedMember.email}?subject=Document requis : ${doc}&body=Bonjour ${selectedMember.name},%0A%0ANous avons besoin de votre ${doc}.%0A%0AMerci de nous l'envoyer dès que possible.%0A%0ACordialement,%0AEquipe Global Clean Home`);
                                }
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 transition-all">
                              Demander
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── PERFORMANCE ── */}
              {memberTab==='Performance' && (
                <div className="space-y-4">
                  {(() => {
                    const stats = getMemberStats(selectedMember);
                    const mIntvs = interventions.filter(i=>i.assigned_agent_id===selectedMember.member_id||i.assigned_agent_name===selectedMember.name);
                    const byMonth = {};
                    mIntvs.forEach(i=>{
                      const m = (i.scheduled_date||'').slice(0,7);
                      if (!byMonth[m]) byMonth[m]={total:0,done:0};
                      byMonth[m].total++;
                      if(i.status==='terminée') byMonth[m].done++;
                    });
                    return (
                      <>
                        {/* KPIs */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {label:'Taux réussite', value:`${stats.onTime}%`, color:'#10b981'},
                            {label:'Ce mois', value:stats.thisMonth, color:'#60a5fa'},
                            {label:'Note', value:`${selectedMember.rating||5}/5 ⭐`, color:'#f59e0b'},
                          ].map(s=>(
                            <div key={s.label} className="text-center p-4 rounded-2xl" style={{background:`${s.color}10`,border:`1px solid ${s.color}20`}}>
                              <p className="text-2xl font-black" style={{color:s.color,fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
                              <p className="text-[10px] font-semibold mt-1" style={{color:`${s.color}aa`}}>{s.label}</p>
                            </div>
                          ))}
                        </div>
                        {/* Historique mensuel */}
                        <div className="p-4 rounded-xl border border-white/5 bg-white/2">
                          <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Historique mensuel</p>
                          {Object.entries(byMonth).sort(([a],[b])=>b.localeCompare(a)).slice(0,6).map(([month,data])=>(
                            <div key={month} className="flex items-center gap-3 mb-3">
                              <p className="text-xs text-slate-400 w-16 flex-shrink-0">{month}</p>
                              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{width:`${(data.done/Math.max(data.total,1))*100}%`}}/>
                              </div>
                              <p className="text-xs text-slate-400 w-16 text-right flex-shrink-0">{data.done}/{data.total}</p>
                            </div>
                          ))}
                          {Object.keys(byMonth).length===0 && <p className="text-xs text-slate-600 text-center py-4">Aucune donnée</p>}
                        </div>
                        {/* Note interne */}
                        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                          <p className="text-xs font-bold text-amber-300 mb-3">⭐ Notation interne</p>
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-slate-400">Note actuelle :</p>
                            <div className="flex items-center gap-1">
                              {[1,2,3,4,5].map(s=>(
                                <button key={s} onClick={()=>rateAgent(s)} className="transition-transform hover:scale-125">
                                  <Star className={`w-6 h-6 ${s<=(selectedMember.rating||5)?'fill-amber-400 text-amber-400':'text-slate-700'}`}/>
                                </button>
                              ))}
                            </div>
                            <span className="text-sm font-bold text-amber-400">{selectedMember.rating||5}/5</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── MESSAGES ── */}
              {memberTab==='Messages' && (
                <div className="flex flex-col" style={{height:'400px'}}>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                    {messages.length===0 && (
                      <div className="flex flex-col items-center justify-center h-32 gap-3">
                        <MessageSquare className="w-10 h-10 text-slate-700"/>
                        <p className="text-slate-500 text-sm">Aucun message</p>
                      </div>
                    )}
                    {messages.map((msg,i)=>{
                      const isAdmin = msg.from_admin || msg.sender==='admin';
                      return (
                        <div key={i} className={`flex ${isAdmin?'justify-end':'justify-start'}`}>
                          {!isAdmin && (
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-400 mr-2 mt-auto flex-shrink-0">
                              {(selectedMember.name||'A').charAt(0)}
                            </div>
                          )}
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isAdmin?'rounded-br-sm':'rounded-bl-sm'}`}
                            style={isAdmin
                              ? {background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white'}
                              : {background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'#e2e8f0'}}>
                            <p className="leading-relaxed">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isAdmin?'text-white/50':'text-slate-600'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef}/>
                  </div>
                  <div className="flex gap-2">
                    <input value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
                      placeholder={`Message à ${selectedMember.name}...`}
                      className="flex-1 px-4 py-2.5 rounded-xl border text-sm text-slate-200 placeholder-slate-600 outline-none"
                      style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.1)'}}/>
                    <button onClick={sendMessage} disabled={!newMsg.trim()}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                      style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
                      <Send className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CRÉATION ── */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.8)'}} onClick={()=>setShowForm(false)}>
          <div className="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)'}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-100">Nouvel intervenant</h3>
              <button onClick={()=>setShowForm(false)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl"><X className="w-4 h-4"/></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Nom complet *"><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Marie Dupont" className={inputCls}/></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email *"><input type="email" required value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="marie@..." className={inputCls}/></Field>
                <Field label="Téléphone"><input type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="06 ..." className={inputCls}/></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rôle">
                  <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} className={inputCls}>
                    {['technicien','senior','chef_equipe','responsable'].map(r=><option key={r} value={r} className="bg-slate-800">{r.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                  </select>
                </Field>
                <Field label="Max missions/jour">
                  <input type="number" min="1" max="8" value={form.max_missions_day} onChange={e=>setForm(p=>({...p,max_missions_day:parseInt(e.target.value)}))} className={inputCls}/>
                </Field>
              </div>
              <Field label="Compétences">
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s=>(
                    <button key={s} type="button" onClick={()=>setForm(p=>({...p,skills:p.skills.includes(s)?p.skills.filter(x=>x!==s):[...p.skills,s]}))}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${form.skills.includes(s)?'border-violet-500/40 bg-violet-500/20 text-violet-300':'border-white/10 text-slate-500 hover:text-slate-300'}`}>{s}</button>
                  ))}
                </div>
              </Field>
              <Field label="Zones d'intervention">
                <div className="flex flex-wrap gap-2">
                  {ZONES.map(z=>(
                    <button key={z} type="button" onClick={()=>setForm(p=>({...p,zones:p.zones.includes(z)?p.zones.filter(x=>x!==z):[...p.zones,z]}))}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${form.zones.includes(z)?'border-emerald-500/40 bg-emerald-500/20 text-emerald-300':'border-white/10 text-slate-500 hover:text-slate-300'}`}>📍 {z}</button>
                  ))}
                </div>
              </Field>
              <Field label="Notes"><textarea value={form.notes} rows={2} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Infos complémentaires..." className={`${inputCls} resize-none`}/></Field>
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-xs text-emerald-400">✅ Un email de bienvenue avec le lien portail sera envoyé automatiquement à {form.email||'l\'intervenant'}.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-sm font-bold transition-all">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>✅ Créer l'intervenant</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntervenantsManager;
