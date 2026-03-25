import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Users, Plus, Trash2, Edit2, Phone, Mail, MapPin,
  Calendar, CheckCircle, Clock, X, RefreshCw, Search,
  Shield, Award, Zap, ChevronRight, ExternalLink, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api';

const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all";

const SKILLS = ['Ménage','Bureaux','Canapé','Matelas','Tapis','Vitres','Fin de chantier'];
const ZONES  = ['Paris 1-4','Paris 5-8','Paris 9-12','Paris 13-16','Paris 17-20','Banlieue Nord','Banlieue Sud','Banlieue Est','Banlieue Ouest'];

const IntervenantsManager = () => {
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(null); // intervention à assigner
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name:'', email:'', phone:'', role:'technicien',
    skills:[], zones:[], notes:''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, intvRes] = await Promise.allSettled([
        axios.get(`${API}/teams`, { withCredentials: true }),
        axios.get(`${API}/interventions?status=planifiée&limit=50`, { withCredentials: true }),
      ]);
      const t = teamsRes.status==='fulfilled' ? (teamsRes.value.data.teams || teamsRes.value.data || []) : [];
      const i = intvRes.status==='fulfilled' ? (intvRes.value.data.interventions || intvRes.value.data || []) : [];
      setTeams(Array.isArray(t)?t:[]);
      setInterventions(Array.isArray(i)?i:[]);

      // Extraire tous les membres de toutes les équipes
      const allMembers = [];
      for (const team of (Array.isArray(t)?t:[])) {
        for (const m of (team.members||[])) {
          allMembers.push({...m, team_id: team.team_id, team_name: team.name});
        }
      }

      // Aussi chercher dans team_members DB
      try {
        const membersRes = await axios.get(`${API}/team-members`, { withCredentials: true });
        const dbMembers = membersRes.data || [];
        if (dbMembers.length > 0) {
          setMembers(dbMembers);
        } else {
          setMembers(allMembers);
        }
      } catch {
        setMembers(allMembers);
      }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Créer l'équipe ou ajouter à une équipe existante
      let teamId = teams[0]?.team_id;
      if (!teamId) {
        const res = await axios.post(`${API}/teams`, { name: 'Équipe principale', description: 'Équipe de nettoyage' }, { withCredentials: true });
        teamId = res.data.team_id;
      }
      await axios.post(`${API}/teams/${teamId}/members`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        skills: form.skills,
        zones: form.zones,
        notes: form.notes,
      }, { withCredentials: true });
      toast.success('✅ Intervenant créé !');
      setShowForm(false);
      setForm({name:'',email:'',phone:'',role:'technicien',skills:[],zones:[],notes:''});
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleAssign = async (interventionId, memberId, memberName) => {
    try {
      await axios.patch(`${API}/interventions/${interventionId}`, {
        assigned_agent_id: memberId,
        assigned_agent_name: memberName,
      }, { withCredentials: true });
      toast.success(`✅ Intervention assignée à ${memberName}`);
      setShowAssign(null);
      fetchData();
    } catch { toast.error('Erreur assignation'); }
  };

  const copyPortalLink = () => {
    const link = `${window.location.origin}/intervenant`;
    navigator.clipboard.writeText(link);
    toast.success('🔗 Lien copié !');
  };

  const filtered = members.filter(m =>
    !search || (m.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (m.email||'').toLowerCase().includes(search.toLowerCase())
  );

  const unassignedIntvs = interventions.filter(i => !i.assigned_agent_id && !i.assigned_agent_name);

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-400"/>
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Intervenants</h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">{members.length} agent(s) · {unassignedIntvs.length} intervention(s) non assignée(s)</p>
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
          <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5">
            <RefreshCw className="w-4 h-4"/>
          </button>
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{background:'linear-gradient(135deg,#10b981,#059669)',boxShadow:'0 4px 16px rgba(16,185,129,0.3)'}}>
            <Plus className="w-4 h-4"/> Ajouter intervenant
          </button>
        </div>
      </div>

      {/* LIEN PORTAIL INFO */}
      <div className="rounded-2xl p-4 border flex items-center gap-4"
        style={{background:'rgba(16,185,129,0.05)',borderColor:'rgba(16,185,129,0.2)'}}>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-emerald-400"/>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-emerald-300">Portail intervenant disponible</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Partagez ce lien avec vos agents : <span className="text-emerald-400 font-mono">{window.location.origin}/intervenant</span>
          </p>
        </div>
        <button onClick={copyPortalLink}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all">
          <Copy className="w-3.5 h-3.5"/> Copier
        </button>
      </div>

      {/* INTERVENTIONS NON ASSIGNÉES */}
      {unassignedIntvs.length > 0 && (
        <div className="section-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-400"/>
            <h3 className="text-sm font-bold text-amber-300">{unassignedIntvs.length} intervention(s) sans intervenant assigné</h3>
          </div>
          <div className="space-y-2">
            {unassignedIntvs.slice(0,5).map(intv=>(
              <div key={intv.intervention_id||intv.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{intv.title||intv.service_type}</p>
                  <p className="text-xs text-slate-500">{intv.scheduled_date} · {intv.scheduled_time||'—'} · {intv.address||'—'}</p>
                </div>
                <button onClick={()=>setShowAssign(intv)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
                  style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                  <Users className="w-3 h-3"/> Assigner
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECHERCHE */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Rechercher un intervenant..."
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"/>
      </div>

      {/* LISTE INTERVENANTS */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_,i)=><div key={i} className="skeleton h-40 rounded-2xl"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="section-card flex flex-col items-center justify-center py-16 gap-4">
          <Users className="w-14 h-14 text-slate-700"/>
          <p className="text-slate-500 font-semibold">Aucun intervenant trouvé</p>
          <button onClick={()=>setShowForm(true)}
            className="px-5 py-2.5 text-white rounded-xl text-sm font-bold"
            style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
            + Ajouter le premier intervenant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member, i) => {
            const memberIntvs = interventions.filter(intv =>
              intv.assigned_agent_id === member.member_id || intv.assigned_agent_name === member.name
            );
            return (
              <div key={member.member_id||i} className="section-card p-5 hover:border-emerald-500/20 transition-all">
                {/* Header carte */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black flex-shrink-0"
                    style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                    {(member.name||'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-100 truncate">{member.name||'Agent'}</p>
                    <p className="text-xs text-emerald-400 font-semibold">{member.role||'Technicien'}</p>
                    {member.team_name && <p className="text-[10px] text-slate-600">{member.team_name}</p>}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                    style={{background:'rgba(16,185,129,0.1)',color:'#10b981',border:'1px solid rgba(16,185,129,0.2)'}}>
                    {memberIntvs.length} mission{memberIntvs.length>1?'s':''}
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-1.5 mb-4">
                  {member.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail className="w-3 h-3 text-slate-600 flex-shrink-0"/>
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone className="w-3 h-3 text-slate-600 flex-shrink-0"/>
                      <a href={`tel:${member.phone}`} className="hover:text-emerald-400 transition-colors">{member.phone}</a>
                    </div>
                  )}
                </div>

                {/* Compétences */}
                {member.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {member.skills.slice(0,4).map(s=>(
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{background:'rgba(139,92,246,0.1)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.2)'}}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Interventions assignées */}
                {memberIntvs.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Missions assignées</p>
                    {memberIntvs.slice(0,3).map(intv=>(
                      <div key={intv.intervention_id||intv.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/3 border border-white/5">
                        <Calendar className="w-3 h-3 text-emerald-400 flex-shrink-0"/>
                        <p className="text-[11px] text-slate-400 truncate flex-1">{intv.title||intv.service_type}</p>
                        <p className="text-[10px] text-slate-600 flex-shrink-0">{intv.scheduled_date}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={()=>setShowAssign({...showAssign, _defaultAgent: member})}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all">
                    <Calendar className="w-3.5 h-3.5"/> Assigner mission
                  </button>
                  {member.email && (
                    <button onClick={()=>{
                      const msg = `Bonjour ${member.name}, voici votre lien portail intervenant : ${window.location.origin}/intervenant`;
                      window.open(`mailto:${member.email}?subject=Votre accès portail Global Clean Home&body=${encodeURIComponent(msg)}`);
                    }}
                      className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
                      title="Envoyer lien portail">
                      <Mail className="w-3.5 h-3.5"/>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ASSIGNATION */}
      {showAssign && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.75)'}}
          onClick={()=>setShowAssign(null)}>
          <div className="rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-100">Assigner une intervention</h3>
                {showAssign.title && <p className="text-xs text-slate-500 mt-0.5">{showAssign.title}</p>}
              </div>
              <button onClick={()=>setShowAssign(null)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {/* Si intervention connue, choisir l'agent */}
            {showAssign.intervention_id && (
              <div className="mb-4 p-3 rounded-xl bg-white/3 border border-white/5">
                <p className="text-xs text-slate-400 font-semibold">{showAssign.title||showAssign.service_type}</p>
                <p className="text-xs text-slate-600">{showAssign.scheduled_date} · {showAssign.address}</p>
              </div>
            )}

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Choisir l'intervenant</p>
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Aucun intervenant disponible.<br/>Ajoutez d'abord un intervenant.</p>
              ) : members.map(m=>(
                <button key={m.member_id}
                  onClick={()=>{
                    if (showAssign.intervention_id) {
                      handleAssign(showAssign.intervention_id||showAssign.id, m.member_id, m.name);
                    } else {
                      // Ouvrir sélection intervention pour cet agent
                      setShowAssign({_defaultAgent: m, _step: 'choose_intv'});
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-emerald-500/20 transition-all text-left">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0"
                    style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                    {(m.name||'A').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.role||'Technicien'} {m.skills?.length>0?`· ${m.skills.slice(0,2).join(', ')}`:''}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600"/>
                </button>
              ))}
            </div>

            {/* Si étape choix intervention */}
            {showAssign._step === 'choose_intv' && (
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Choisir l'intervention pour {showAssign._defaultAgent?.name}
                </p>
                <div className="space-y-2">
                  {unassignedIntvs.map(intv=>(
                    <button key={intv.intervention_id||intv.id}
                      onClick={()=>handleAssign(intv.intervention_id||intv.id, showAssign._defaultAgent.member_id, showAssign._defaultAgent.name)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all text-left">
                      <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">{intv.title||intv.service_type}</p>
                        <p className="text-xs text-slate-500">{intv.scheduled_date} · {intv.address||'—'}</p>
                      </div>
                    </button>
                  ))}
                  {unassignedIntvs.length===0 && <p className="text-sm text-slate-500 text-center py-4">Toutes les interventions sont assignées ✅</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CRÉATION */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.75)'}}
          onClick={()=>setShowForm(false)}>
          <div className="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-100">Nouvel intervenant</h3>
              <button onClick={()=>setShowForm(false)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom complet *</label>
                <input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                  placeholder="Marie Dupont" className={inputCls}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email *</label>
                  <input type="email" required value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                    placeholder="marie@globalcleanhome.com" className={inputCls}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Téléphone</label>
                  <input type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
                    placeholder="06 12 34 56 78" className={inputCls}/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Rôle</label>
                <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} className={inputCls}>
                  {['technicien','senior','chef_equipe','responsable'].map(r=>(
                    <option key={r} value={r} className="bg-slate-800">{r.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Compétences</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s=>(
                    <button key={s} type="button"
                      onClick={()=>setForm(p=>({...p,skills:p.skills.includes(s)?p.skills.filter(x=>x!==s):[...p.skills,s]}))}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                        form.skills.includes(s) ? 'border-violet-500/40 bg-violet-500/20 text-violet-300' : 'border-white/10 text-slate-500 hover:text-slate-300'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Zones d'intervention</label>
                <div className="flex flex-wrap gap-2">
                  {ZONES.map(z=>(
                    <button key={z} type="button"
                      onClick={()=>setForm(p=>({...p,zones:p.zones.includes(z)?p.zones.filter(x=>x!==z):[...p.zones,z]}))}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                        form.zones.includes(z) ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300' : 'border-white/10 text-slate-500 hover:text-slate-300'
                      }`}>{z}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
                <textarea value={form.notes} rows={2} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                  placeholder="Informations supplémentaires..." className={`${inputCls} resize-none`}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-sm font-bold transition-all">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold transition-all"
                  style={{background:'linear-gradient(135deg,#10b981,#059669)',boxShadow:'0 4px 16px rgba(16,185,129,0.3)'}}>
                  ✅ Créer l'intervenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Import manquant
const AlertCircle = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default IntervenantsManager;
