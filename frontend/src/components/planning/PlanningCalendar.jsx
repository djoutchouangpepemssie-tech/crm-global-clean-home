import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users,
  CheckCircle, XCircle, Play, CalendarDays, X, List,
  Calendar, Search, RefreshCw, LayoutGrid, AlertTriangle,
  Repeat, Download, Bell, Navigation, User, Mail, Phone,
  ZapOff, Zap, Copy, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const HOURS = Array.from({length:13},(_,i)=>i+8);

const STATUS = {
  planifiée: { label:'Planifiée', color:'#60a5fa', bg:'rgba(96,165,250,0.15)', border:'rgba(96,165,250,0.3)', dot:'bg-blue-400' },
  en_cours:  { label:'En cours',  color:'#f59e0b', bg:'rgba(245,158,11,0.15)', border:'rgba(245,158,11,0.3)', dot:'bg-amber-400 animate-pulse' },
  terminée:  { label:'Terminée',  color:'#10b981', bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.3)', dot:'bg-emerald-400' },
  annulée:   { label:'Annulée',   color:'#f43f5e', bg:'rgba(244,63,94,0.15)',  border:'rgba(244,63,94,0.3)',  dot:'bg-red-400' },
};

const SVC_ICONS = {'Ménage':'🏠','menage':'🏠','Canapé':'🛋️','canape':'🛋️','Matelas':'🛏️','matelas':'🛏️','Tapis':'🪣','tapis':'🪣','Bureaux':'🏢','bureaux':'🏢'};
const getSvcIcon = (t='') => { const k=Object.keys(SVC_ICONS).find(k=>(t||'').toLowerCase().includes(k.toLowerCase())); return SVC_ICONS[k]||'🧹'; };

const ZONES_PARIS = ['Paris 1-4','Paris 5-8','Paris 9-12','Paris 13-16','Paris 17-20','Banlieue Nord','Banlieue Sud','Banlieue Est','Banlieue Ouest'];
const getZoneFromAddress = (addr='') => {
  const a = addr.toLowerCase();
  if (a.includes('75001')||a.includes('75002')||a.includes('75003')||a.includes('75004')) return 'Paris 1-4';
  if (a.includes('75005')||a.includes('75006')||a.includes('75007')||a.includes('75008')) return 'Paris 5-8';
  if (a.includes('75009')||a.includes('75010')||a.includes('75011')||a.includes('75012')) return 'Paris 9-12';
  if (a.includes('75013')||a.includes('75014')||a.includes('75015')||a.includes('75016')) return 'Paris 13-16';
  if (a.includes('75017')||a.includes('75018')||a.includes('75019')||a.includes('75020')) return 'Paris 17-20';
  return 'Autre';
};

const ZONE_COLORS = {
  'Paris 1-4':'#f97316','Paris 5-8':'#8b5cf6','Paris 9-12':'#06b6d4',
  'Paris 13-16':'#10b981','Paris 17-20':'#f43f5e','Banlieue Nord':'#f59e0b',
  'Banlieue Sud':'#84cc16','Banlieue Est':'#ec4899','Banlieue Ouest':'#6366f1','Autre':'#64748b'
};

const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all";
const Field = ({label,required,children}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}{required&&<span className="text-red-400 ml-1">*</span>}</label>
    {children}
  </div>
);

// ── DÉTECTE CONFLITS ──
const detectConflicts = (interventions) => {
  const conflicts = new Set();
  for (let i=0;i<interventions.length;i++) {
    for (let j=i+1;j<interventions.length;j++) {
      const a=interventions[i], b=interventions[j];
      if (a.scheduled_date !== b.scheduled_date) continue;
      if (!a.assigned_agent_id || a.assigned_agent_id !== b.assigned_agent_id) continue;
      const aStart = parseInt((a.scheduled_time||'09:00').split(':')[0]);
      const bStart = parseInt((b.scheduled_time||'09:00').split(':')[0]);
      const aEnd = aStart + (a.duration_hours||2);
      const bEnd = bStart + (b.duration_hours||2);
      if (aStart < bEnd && aEnd > bStart) {
        conflicts.add(a.intervention_id||a.id);
        conflicts.add(b.intervention_id||b.id);
      }
    }
  }
  return conflicts;
};

// ── CHECK DISPONIBILITÉ AGENT ──
const checkAgentAvailability = (agentId, date, time, duration, interventions) => {
  if (!agentId) return { available: true };
  const dayIntvs = interventions.filter(i =>
    (i.assigned_agent_id === agentId) &&
    (i.scheduled_date || '').startsWith(date) &&
    i.status !== 'annulée'
  );
  const newStart = parseInt((time||'09:00').split(':')[0]);
  const newEnd = newStart + (duration||2);
  for (const intv of dayIntvs) {
    const iStart = parseInt((intv.scheduled_time||'09:00').split(':')[0]);
    const iEnd = iStart + (intv.duration_hours||2);
    if (newStart < iEnd && newEnd > iStart) {
      return { available: false, conflict: intv };
    }
  }
  if (dayIntvs.length >= 4) return { available: false, reason: 'Capacité max atteinte (4 missions/jour)' };
  return { available: true };
};

const PlanningCalendar = () => {
  const [view, setView] = useState('semaine');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  });
  const [currentWeek, setCurrentWeek] = useState(() => new Date());
  const [interventions, setInterventions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterMember, setFilterMember] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const [form, setForm] = useState({
    lead_id:'', title:'', description:'', address:'',
    scheduled_date:'', scheduled_time:'09:00', duration_hours:2,
    team_id:'', service_type:'', client_phone:'', client_email:'',
    assigned_agent_id:'', assigned_agent_name:'',
    recurrence:'none', recurrence_end:'',
  });
  const [agentAvail, setAgentAvail] = useState(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadSuggestions, setLeadSuggestions] = useState([]);
  const [loadingLead, setLoadingLead] = useState(false);

  // Auto-fetch lead quand ID renseigné
  const fetchLead = useCallback(async (leadId) => {
    if (!leadId || leadId.length < 5) return;
    setLoadingLead(true);
    try {
      const res = await axios.get(`${API_URL}/leads/${leadId}`, {withCredentials:true});
      const lead = res.data;
      if (lead) {
        setForm(p=>({
          ...p,
          lead_id: lead.lead_id,
          title: p.title || `${lead.service_type||'Nettoyage'} — ${lead.name||''}`,
          service_type: p.service_type || lead.service_type || '',
          address: p.address || lead.address || '',
          client_phone: p.client_phone || lead.phone || '',
          client_email: p.client_email || lead.email || '',
          description: p.description || (lead.message ? lead.message.slice(0,200) : ''),
        }));
        toast.success(`✅ Lead trouvé : ${lead.name}`);
        setLeadSuggestions([]);
        setLeadSearch('');
      }
    } catch {
      // Chercher par nom
    }
    setLoadingLead(false);
  }, []);

  // Recherche lead par nom/email
  const searchLeads = useCallback(async (query) => {
    if (!query || query.length < 2) { setLeadSuggestions([]); return; }
    try {
      const res = await axios.get(`${API_URL}/leads?search=${encodeURIComponent(query)}&limit=5`, {withCredentials:true});
      const leads = res.data.leads || res.data || [];
      setLeadSuggestions(Array.isArray(leads) ? leads.slice(0,5) : []);
    } catch { setLeadSuggestions([]); }
  }, []);

  const applyLead = (lead) => {
    setForm(p=>({
      ...p,
      lead_id: lead.lead_id,
      title: p.title || `${lead.service_type||'Nettoyage'} — ${lead.name||''}`,
      service_type: p.service_type || lead.service_type || '',
      address: p.address || lead.address || '',
      client_phone: p.client_phone || lead.phone || '',
      client_email: p.client_email || lead.email || '',
      description: p.description || (lead.message ? lead.message.slice(0,200) : ''),
    }));
    setLeadSuggestions([]);
    setLeadSearch('');
    toast.success(`✅ ${lead.name} — champs remplis automatiquement`);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, membersRes] = await Promise.allSettled([
        axios.get(`${API_URL}/calendar?month=${currentMonth}`, {withCredentials:true}),
        axios.get(`${API_URL}/team-members`, {withCredentials:true}),
      ]);
      const cal = calRes.status==='fulfilled' ? calRes.value.data : {};
      const m = membersRes.status==='fulfilled' ? (membersRes.value.data||[]) : [];
      setInterventions(cal.interventions||[]);
      setTeams(cal.teams||[]);
      if (Array.isArray(m) && m.length>0) setMembers(m);
      else {
        const allTeams = cal.teams||[];
        setMembers(allTeams.flatMap(t=>(t.members||[]).map(mb=>({...mb,team_name:t.name}))));
      }
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, [currentMonth]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  // Vérif dispo agent en temps réel
  useEffect(()=>{
    if (form.assigned_agent_id && form.scheduled_date && form.scheduled_time) {
      const avail = checkAgentAvailability(
        form.assigned_agent_id, form.scheduled_date,
        form.scheduled_time, form.duration_hours, interventions
      );
      setAgentAvail(avail);
    } else {
      setAgentAvail(null);
    }
  }, [form.assigned_agent_id, form.scheduled_date, form.scheduled_time, form.duration_hours, interventions]);

  const conflicts = detectConflicts(interventions);

  const filtered = interventions.filter(i => {
    if (filterMember && i.assigned_agent_id !== filterMember) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterZone && getZoneFromAddress(i.address) !== filterZone) return false;
    if (search && !((i.title||'')+(i.lead_name||'')+(i.address||'')).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: filtered.length,
    planifiée: filtered.filter(i=>i.status==='planifiée').length,
    en_cours: filtered.filter(i=>i.status==='en_cours').length,
    terminée: filtered.filter(i=>i.status==='terminée').length,
    conflits: conflicts.size/2,
  };

  // Navigation mois/semaine
  const [year, month] = currentMonth.split('-').map(Number);
  const firstDay = new Date(year, month-1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  let startDow = firstDay.getDay(); if(startDow===0) startDow=7;
  const cells = [];
  for(let i=1;i<startDow;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);

  const getWeekDays = () => {
    const d = new Date(currentWeek);
    const dow = d.getDay()===0?6:d.getDay()-1;
    const mon = new Date(d); mon.setDate(d.getDate()-dow);
    return Array.from({length:7},(_,i)=>{ const dd=new Date(mon); dd.setDate(mon.getDate()+i); return dd; });
  };
  const weekDays = getWeekDays();
  const today = new Date().toISOString().slice(0,10);

  const getIntvForDay = (date) => {
    const ds = typeof date==='number'
      ? `${year}-${String(month).padStart(2,'0')}-${String(date).padStart(2,'0')}`
      : date.toISOString().slice(0,10);
    return filtered.filter(i=>(i.scheduled_date||'').startsWith(ds));
  };

  const handleCheckInOut = async (id, action) => {
    try {
      await axios.post(`${API_URL}/interventions/${id}/${action}`, {}, {withCredentials:true});
      toast.success(action==='check_in'?'✅ Check-in':'✅ Check-out');
      fetchData(); setSelected(null);
    } catch { toast.error('Erreur'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.patch(`${API_URL}/interventions/${id}`, {status}, {withCredentials:true});
      toast.success('Statut mis à jour'); fetchData(); setSelected(null);
    } catch { toast.error('Erreur'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (agentAvail && !agentAvail.available) {
      toast.error('Cet intervenant n\'est pas disponible sur ce créneau !');
      return;
    }
    try {
      await axios.post(`${API_URL}/interventions`, form, {withCredentials:true});
      // Récurrence
      if (form.recurrence !== 'none' && form.recurrence_end) {
        const intervals = { hebdo:7, 'bi-hebdo':14, mensuel:30 };
        const step = intervals[form.recurrence];
        let d = new Date(form.scheduled_date);
        const end = new Date(form.recurrence_end);
        while (true) {
          d.setDate(d.getDate()+step);
          if (d > end) break;
          const newForm = {...form, scheduled_date: d.toISOString().slice(0,10)};
          await axios.post(`${API_URL}/interventions`, newForm, {withCredentials:true});
        }
        toast.success(`✅ ${form.recurrence} créé jusqu'au ${form.recurrence_end}`);
      } else {
        toast.success('✅ Intervention planifiée');
      }
      // Rappel email client veille
      if (form.client_email && form.scheduled_date) {
        try {
          await axios.post(`${API_URL}/interventions/schedule-reminder`, {
            email: form.client_email,
            date: form.scheduled_date,
            time: form.scheduled_time,
            service: form.service_type||form.title,
            address: form.address,
          }, {withCredentials:true});
        } catch {}
      }
      setShowForm(false);
      setForm({lead_id:'',title:'',description:'',address:'',scheduled_date:'',scheduled_time:'09:00',duration_hours:2,team_id:'',service_type:'',client_phone:'',client_email:'',assigned_agent_id:'',assigned_agent_name:'',recurrence:'none',recurrence_end:''});
      fetchData();
    } catch(err) { toast.error(err.response?.data?.detail||'Erreur'); }
  };

  // Drag & drop
  const handleDragStart = (e, intv) => {
    e.dataTransfer.setData('intervention_id', intv.intervention_id||intv.id);
  };
  const handleDrop = async (e, newDate) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('intervention_id');
    const ds = typeof newDate==='number'
      ? `${year}-${String(month).padStart(2,'0')}-${String(newDate).padStart(2,'0')}`
      : newDate.toISOString().slice(0,10);
    try {
      await axios.patch(`${API_URL}/interventions/${id}`, {scheduled_date: ds}, {withCredentials:true});
      toast.success(`📅 Déplacé au ${ds}`);
      fetchData();
    } catch { toast.error('Erreur déplacement'); }
    setDragOver(null);
  };

  // Export PDF planning semaine
  const exportWeekPDF = () => {
    const lines = [`PLANNING SEMAINE — Global Clean Home`, `Du ${weekDays[0].toLocaleDateString('fr-FR')} au ${weekDays[6].toLocaleDateString('fr-FR')}`, ''];
    weekDays.forEach(day => {
      const intvs = getIntvForDay(day);
      lines.push(`\n${day.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}`);
      if (intvs.length===0) { lines.push('  — Aucune intervention'); return; }
      intvs.forEach(i => {
        lines.push(`  ${i.scheduled_time||'—'}  ${i.title||i.service_type}  |  ${i.lead_name||''}  |  ${i.address||''}  |  ${i.assigned_agent_name||'Non assigné'}`);
      });
    });
    const blob = new Blob([lines.join('\n')], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url;
    a.download=`planning_${weekDays[0].toISOString().slice(0,10)}.txt`;
    a.click();
    toast.success('📥 Planning exporté');
  };

  // Grouper par zone géographique
  const groupByZone = (intvs) => {
    const groups = {};
    intvs.forEach(i => {
      const z = getZoneFromAddress(i.address);
      if (!groups[z]) groups[z] = [];
      groups[z].push(i);
    });
    return Object.entries(groups).sort(([a],[b])=>groups[b].length-groups[a].length);
  };

  // Statistiques par intervenant
  const memberStats = members.map(m => ({
    ...m,
    missions: interventions.filter(i=>i.assigned_agent_id===m.member_id).length,
    today: interventions.filter(i=>i.assigned_agent_id===m.member_id && (i.scheduled_date||'').startsWith(today)).length,
    conflits: interventions.filter(i=>i.assigned_agent_id===m.member_id && conflicts.has(i.intervention_id||i.id)).length,
  }));

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in max-w-[1600px] mx-auto">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-blue-400"/>
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Planning</h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">
            {stats.total} intervention(s) · {stats.en_cours} en cours
            {stats.conflits>0 && <span className="text-red-400 font-bold ml-2">· ⚠️ {stats.conflits} conflit(s)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportWeekPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 text-xs font-bold transition-all">
            <Download className="w-3.5 h-3.5"/> Export
          </button>
          <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5">
            <RefreshCw className="w-4 h-4"/>
          </button>
          <div className="flex gap-1 bg-white/5 rounded-xl border border-white/5 p-1">
            {[{v:'timeline',i:Clock},{v:'semaine',i:Calendar},{v:'mois',i:LayoutGrid},{v:'liste',i:List},{v:'zones',i:Navigation}].map(({v,i:Icon})=>(
              <button key={v} onClick={()=>setView(v)}
                className={`p-2 rounded-lg transition-all ${view===v?'bg-violet-600 text-white':'text-slate-500 hover:text-slate-300'}`}
                title={v.charAt(0).toUpperCase()+v.slice(1)}>
                <Icon className="w-3.5 h-3.5"/>
              </button>
            ))}
          </div>
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}>
            <Plus className="w-4 h-4"/> Planifier
          </button>
        </div>
      </div>

      {/* ── STATS RAPIDES ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {k:'planifiée', label:'Planifiées', color:'#60a5fa'},
          {k:'en_cours',  label:'En cours',   color:'#f59e0b'},
          {k:'terminée',  label:'Terminées',  color:'#10b981'},
          {k:'conflits',  label:'Conflits',   color:'#f43f5e'},
        ].map(s=>(
          <button key={s.k}
            onClick={()=>setFilterStatus(filterStatus===s.k&&s.k!=='conflits'?'':s.k!=='conflits'?s.k:'')}
            className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-105"
            style={{background:`${s.color}10`,borderColor:`${s.color}25`}}>
            <p className="text-xl font-black" style={{color:s.color,fontFamily:'Manrope,sans-serif'}}>{stats[s.k]||0}</p>
            <p className="text-xs font-semibold" style={{color:`${s.color}cc`}}>{s.label}</p>
          </button>
        ))}
        {/* Capacité intervenants */}
        <div className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/2">
          <User className="w-4 h-4 text-violet-400 flex-shrink-0"/>
          <div>
            <p className="text-sm font-black text-slate-200">{members.length}</p>
            <p className="text-[10px] text-slate-500">Intervenants</p>
          </div>
        </div>
      </div>

      {/* ── FILTRES ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"/>
        </div>
        <select value={filterMember} onChange={e=>setFilterMember(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
          <option value="" className="bg-slate-800">Tous les agents</option>
          {memberStats.map(m=>(
            <option key={m.member_id} value={m.member_id} className="bg-slate-800">
              {m.name} ({m.today} auj. · {m.missions} total)
            </option>
          ))}
        </select>
        <select value={filterZone} onChange={e=>setFilterZone(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
          <option value="" className="bg-slate-800">Toutes les zones</option>
          {ZONES_PARIS.map(z=><option key={z} value={z} className="bg-slate-800">📍 {z}</option>)}
        </select>
        {/* Navigation */}
        <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
          <button onClick={()=>{
            if(['semaine','timeline'].includes(view)){const d=new Date(currentWeek);d.setDate(d.getDate()-7);setCurrentWeek(d);}
            else{const[y,m]=currentMonth.split('-').map(Number);const d=new Date(y,m-2,1);setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
          }} className="p-1 text-slate-500 hover:text-slate-300">
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <span className="text-xs font-bold text-slate-300 min-w-[130px] text-center">
            {['semaine','timeline'].includes(view)
              ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS_FR[weekDays[6].getMonth()]}`
              : `${MONTHS_FR[month-1]} ${year}`}
          </span>
          <button onClick={()=>{
            if(['semaine','timeline'].includes(view)){const d=new Date(currentWeek);d.setDate(d.getDate()+7);setCurrentWeek(d);}
            else{const[y,m]=currentMonth.split('-').map(Number);const d=new Date(y,m,1);setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
          }} className="p-1 text-slate-500 hover:text-slate-300">
            <ChevronRight className="w-4 h-4"/>
          </button>
          <button onClick={()=>{const n=new Date();setCurrentWeek(n);setCurrentMonth(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`);}}
            className="text-xs text-violet-400 hover:text-violet-300 font-bold ml-1">Auj.</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-2">{[...Array(14)].map((_,i)=><div key={i} className="skeleton h-24 rounded-xl"/>)}</div>
      ) : (
        <>
        {/* ── VUE TIMELINE ── */}
        {view==='timeline' && (
          <div className="section-card overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header jours */}
              <div className="grid gap-px" style={{gridTemplateColumns:`60px repeat(7, 1fr)`}}>
                <div className="p-2"/>
                {weekDays.map((day,i)=>{
                  const isToday = day.toISOString().slice(0,10)===today;
                  return (
                    <div key={i} className={`p-2 text-center border-b border-white/5 ${isToday?'bg-violet-500/10':''}`}>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{DAYS_FR[i]}</p>
                      <p className={`text-lg font-black ${isToday?'text-violet-400':'text-slate-300'}`}>{day.getDate()}</p>
                    </div>
                  );
                })}
              </div>
              {/* Lignes heures */}
              {HOURS.map(h=>(
                <div key={h} className="grid gap-px border-b border-white/5" style={{gridTemplateColumns:`60px repeat(7, 1fr)`}}>
                  <div className="p-2 text-right">
                    <span className="text-[10px] text-slate-600 font-mono">{h}h</span>
                  </div>
                  {weekDays.map((day,di)=>{
                    const ds = day.toISOString().slice(0,10);
                    const intvs = filtered.filter(i=>{
                      if (!(i.scheduled_date||'').startsWith(ds)) return false;
                      const ih = parseInt((i.scheduled_time||'09:00').split(':')[0]);
                      return ih===h;
                    });
                    const isToday = ds===today;
                    return (
                      <div key={di}
                        className={`min-h-[48px] p-1 border-l border-white/5 relative ${isToday?'bg-violet-500/3':''} ${dragOver===`${ds}-${h}`?'bg-emerald-500/10':''}`}
                        onDragOver={e=>{e.preventDefault();setDragOver(`${ds}-${h}`);}}
                        onDragLeave={()=>setDragOver(null)}
                        onDrop={e=>handleDrop(e,day)}>
                        {intvs.map(i=>{
                          const sc=STATUS[i.status]||STATUS.planifiée;
                          const hasConflict=conflicts.has(i.intervention_id||i.id);
                          return (
                            <div key={i.intervention_id||i.id}
                              draggable
                              onDragStart={e=>handleDragStart(e,i)}
                              onClick={()=>setSelected(i)}
                              className={`text-[10px] px-1.5 py-1 rounded-lg cursor-pointer mb-1 font-semibold truncate border ${hasConflict?'ring-1 ring-red-500':''}`}
                              style={{background:sc.bg,color:sc.color,borderColor:sc.border}}>
                              {hasConflict && '⚠️ '}
                              {getSvcIcon(i.service_type)} {i.title||i.service_type}
                              {i.assigned_agent_name && <span className="opacity-70"> · {i.assigned_agent_name.split(' ')[0]}</span>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VUE SEMAINE ── */}
        {view==='semaine' && (
          <div className="section-card p-4 overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {weekDays.map((date,idx)=>{
                const intvs = getIntvForDay(date);
                const ds = date.toISOString().slice(0,10);
                const isToday = ds===today;
                return (
                  <div key={idx}
                    className={`rounded-xl p-2 border transition-all min-h-[120px] ${isToday?'border-violet-500/40 bg-violet-500/5':'border-white/5 bg-white/2'} ${dragOver===ds?'bg-emerald-500/10 border-emerald-500/30':''}`}
                    onDragOver={e=>{e.preventDefault();setDragOver(ds);}}
                    onDragLeave={()=>setDragOver(null)}
                    onDrop={e=>handleDrop(e,date)}>
                    <div className="text-center mb-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{DAYS_FR[idx]}</p>
                      <p className={`text-xl font-black ${isToday?'text-violet-400':'text-slate-300'}`}>{date.getDate()}</p>
                      {intvs.length>0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">{intvs.length}</span>}
                    </div>
                    <div className="space-y-1.5">
                      {intvs.map(i=>{
                        const sc=STATUS[i.status]||STATUS.planifiée;
                        const hasConflict=conflicts.has(i.intervention_id||i.id);
                        return (
                          <div key={i.intervention_id||i.id}
                            draggable
                            onDragStart={e=>handleDragStart(e,i)}
                            onClick={()=>setSelected(i)}
                            className={`p-2 rounded-xl border cursor-grab transition-all hover:scale-105 ${hasConflict?'ring-1 ring-red-500/50':''}`}
                            style={{background:sc.bg,borderColor:sc.border}}>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs">{getSvcIcon(i.service_type)}</span>
                              <span className="text-[10px] font-bold truncate" style={{color:sc.color}}>{i.scheduled_time}</span>
                              {hasConflict && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0"/>}
                            </div>
                            <p className="text-[11px] font-semibold text-slate-200 truncate">{i.title||i.service_type}</p>
                            {i.assigned_agent_name && <p className="text-[10px] text-slate-500 truncate">👷 {i.assigned_agent_name}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VUE MOIS ── */}
        {view==='mois' && (
          <div className="section-card p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_FR.map(d=><div key={d} className="text-center text-xs font-bold text-slate-500 py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d,idx)=>{
                const intvs = d ? getIntvForDay(d) : [];
                const ds = d ? `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '';
                const isToday = ds===today;
                const hasConflict = intvs.some(i=>conflicts.has(i.intervention_id||i.id));
                return (
                  <div key={idx}
                    className={`min-h-[80px] rounded-xl p-1.5 border transition-all ${!d?'opacity-0 pointer-events-none':isToday?'border-violet-500/50 bg-violet-500/5':'border-white/5 bg-white/2'} ${dragOver===ds?'bg-emerald-500/10':''}`}
                    onDragOver={e=>{e.preventDefault();if(d)setDragOver(ds);}}
                    onDragLeave={()=>setDragOver(null)}
                    onDrop={e=>{if(d)handleDrop(e,d);}}>
                    {d && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday?'bg-violet-600 text-white':'text-slate-400'}`}>{d}</span>
                          {hasConflict && <AlertTriangle className="w-3 h-3 text-red-400"/>}
                        </div>
                        <div className="space-y-0.5">
                          {intvs.slice(0,2).map(i=>{
                            const sc=STATUS[i.status]||STATUS.planifiée;
                            return (
                              <div key={i.intervention_id||i.id}
                                draggable onDragStart={e=>handleDragStart(e,i)}
                                onClick={()=>setSelected(i)}
                                className="text-[9px] px-1.5 py-0.5 rounded-md cursor-pointer truncate font-semibold"
                                style={{background:sc.bg,color:sc.color}}>
                                {getSvcIcon(i.service_type)} {i.title||i.service_type}
                              </div>
                            );
                          })}
                          {intvs.length>2 && <p className="text-[9px] text-slate-500 pl-1">+{intvs.length-2}</p>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VUE ZONES ── */}
        {view==='zones' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-blue-400"/>
              <p className="text-sm font-bold text-slate-300">Interventions groupées par zone géographique</p>
            </div>
            {groupByZone(filtered).map(([zone, zoneIntvs])=>(
              <div key={zone} className="section-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background:ZONE_COLORS[zone]||'#64748b'}}/>
                  <h3 className="text-sm font-bold text-slate-200">{zone}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-slate-400 bg-white/5">{zoneIntvs.length}</span>
                  {/* Optimisation trajet */}
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    🗺️ Regroupé — économie trajet
                  </span>
                </div>
                <div className="space-y-2">
                  {[...zoneIntvs].sort((a,b)=>(a.scheduled_time||'').localeCompare(b.scheduled_time||'')).map(i=>{
                    const sc=STATUS[i.status]||STATUS.planifiée;
                    return (
                      <div key={i.intervention_id||i.id} onClick={()=>setSelected(i)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 cursor-pointer transition-all">
                        <span className="text-lg">{getSvcIcon(i.service_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-200 truncate">{i.title||i.service_type}</p>
                          <p className="text-xs text-slate-500">{i.scheduled_date} · {i.scheduled_time||'—'} · {i.lead_name||''}</p>
                          {i.address && <p className="text-xs text-slate-600 truncate">📍 {i.address}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {i.assigned_agent_name && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              👷 {i.assigned_agent_name.split(' ')[0]}
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{color:sc.color,background:sc.bg}}>{sc.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── VUE LISTE ── */}
        {view==='liste' && (
          <div className="section-card divide-y divide-white/5">
            {filtered.length===0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CalendarDays className="w-12 h-12 text-slate-700"/>
                <p className="text-slate-500">Aucune intervention</p>
              </div>
            )}
            {[...filtered].sort((a,b)=>(a.scheduled_date||'').localeCompare(b.scheduled_date||'')).map(i=>{
              const sc=STATUS[i.status]||STATUS.planifiée;
              const hasConflict=conflicts.has(i.intervention_id||i.id);
              const zone=getZoneFromAddress(i.address);
              return (
                <div key={i.intervention_id||i.id}
                  className="flex items-center gap-4 p-4 hover:bg-white/3 cursor-pointer group transition-all"
                  onClick={()=>setSelected(i)}>
                  <div className="flex-shrink-0 text-center w-12">
                    <p className="text-xl font-black text-slate-200">{(i.scheduled_date||'').slice(8,10)}</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">{MONTHS_FR[parseInt((i.scheduled_date||'').slice(5,7))-1]?.slice(0,3)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{background:sc.bg,border:`1px solid ${sc.border}`}}>{getSvcIcon(i.service_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-200 truncate">{i.title||i.service_type}</p>
                      {hasConflict && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0"/>}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{color:sc.color,background:sc.bg}}>{sc.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:ZONE_COLORS[zone]+'20',color:ZONE_COLORS[zone]||'#64748b'}}>📍 {zone}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {i.lead_name && <span className="text-xs text-slate-500">{i.lead_name}</span>}
                      {i.scheduled_time && <span className="text-xs text-slate-500"><Clock className="w-3 h-3 inline mr-0.5"/>{i.scheduled_time}{i.duration_hours?` (${i.duration_hours}h)`:''}</span>}
                      {i.address && <span className="text-xs text-slate-500 truncate"><MapPin className="w-3 h-3 inline mr-0.5"/>{i.address}</span>}
                      {i.assigned_agent_name && <span className="text-xs text-emerald-400">👷 {i.assigned_agent_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    {i.status==='planifiée' && <button onClick={e=>{e.stopPropagation();handleCheckInOut(i.intervention_id||i.id,'check_in');}} className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"><Play className="w-3.5 h-3.5"/></button>}
                    {i.status==='en_cours' && <button onClick={e=>{e.stopPropagation();handleCheckInOut(i.intervention_id||i.id,'check_out');}} className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20"><CheckCircle className="w-3.5 h-3.5"/></button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
      )}

      {/* ── MODAL DÉTAIL ── */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.75)'}} onClick={()=>setSelected(null)}>
          <div className="rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{background:STATUS[selected.status]?.bg,border:`1px solid ${STATUS[selected.status]?.border}`}}>
                  {getSvcIcon(selected.service_type||selected.title)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">{selected.title||selected.service_type}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{color:STATUS[selected.status]?.color,background:STATUS[selected.status]?.bg}}>{STATUS[selected.status]?.label}</span>
                    {conflicts.has(selected.intervention_id||selected.id) && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-red-400 bg-red-500/10 border border-red-500/20">⚠️ Conflit</span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:ZONE_COLORS[getZoneFromAddress(selected.address)]+'20',color:ZONE_COLORS[getZoneFromAddress(selected.address)]||'#64748b'}}>
                      📍 {getZoneFromAddress(selected.address)}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl"><X className="w-4 h-4"/></button>
            </div>
            <div className="space-y-2 mb-5">
              {[
                {icon:Clock, color:'#a78bfa', label:`${selected.scheduled_date||'—'} à ${selected.scheduled_time||'—'}${selected.duration_hours?` · ${selected.duration_hours}h`:''}`},
                ...(selected.address?[{icon:MapPin, color:'#60a5fa', label:selected.address}]:[]),
                ...(selected.lead_name?[{icon:Users, color:'#34d399', label:`${selected.lead_name}${selected.lead_phone?' · '+selected.lead_phone:''}`}]:[]),
                ...(selected.assigned_agent_name?[{icon:User, color:'#10b981', label:`Intervenant : ${selected.assigned_agent_name}`}]:[]),
              ].map((item,i)=>(
                <div key={i} className="flex items-center gap-3 text-sm text-slate-400 p-3 rounded-xl bg-white/3 border border-white/5">
                  <item.icon className="w-4 h-4 flex-shrink-0" style={{color:item.color}}/>
                  <span>{item.label}</span>
                </div>
              ))}
              {selected.description && <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-sm text-slate-400">{selected.description}</div>}
              {selected.check_in && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">▶️ Check-in : {new Date(selected.check_in.time).toLocaleString('fr-FR')}</div>}
              {selected.check_out && <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">✅ Check-out : {new Date(selected.check_out.time).toLocaleString('fr-FR')}</div>}
              {/* Lien Maps */}
              {selected.address && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(selected.address)}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <Navigation className="w-3.5 h-3.5"/> Ouvrir dans Google Maps
                </a>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {selected.status==='planifiée' && <button onClick={()=>handleCheckInOut(selected.intervention_id||selected.id,'check_in')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400"><Play className="w-4 h-4"/> Démarrer</button>}
              {selected.status==='en_cours' && <button onClick={()=>handleCheckInOut(selected.intervention_id||selected.id,'check_out')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400"><CheckCircle className="w-4 h-4"/> Terminer</button>}
              {!['annulée','terminée'].includes(selected.status) && <button onClick={()=>handleStatusChange(selected.intervention_id||selected.id,'annulée')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400"><XCircle className="w-4 h-4"/> Annuler</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CRÉATION ── */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.75)'}} onClick={()=>setShowForm(false)}>
          <div className="rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-violet-400"/>
                </div>
                <h3 className="text-lg font-black text-slate-100">Nouvelle intervention</h3>
              </div>
              <button onClick={()=>setShowForm(false)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl"><X className="w-4 h-4"/></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Recherche Lead */}
              <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
                <p className="text-xs font-bold text-violet-300 mb-3">🔍 Rechercher le client / lead</p>
                <div className="relative">
                  <input
                    value={leadSearch}
                    onChange={e=>{ setLeadSearch(e.target.value); searchLeads(e.target.value); }}
                    onKeyDown={e=>{ if(e.key==='Enter'&&form.lead_id){ e.preventDefault(); fetchLead(form.lead_id); }}}
                    placeholder="Nom du client, email ou ID lead..."
                    className={inputCls}/>
                  {loadingLead && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"/>}
                  {/* Suggestions */}
                  {leadSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-white/10 overflow-hidden z-20"
                      style={{background:'hsl(224,71%,8%)'}}>
                      {leadSuggestions.map(lead=>(
                        <button key={lead.lead_id} type="button" onClick={()=>applyLead(lead)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-all text-left border-b border-white/5 last:border-0">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm flex-shrink-0">
                            {lead.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-200 truncate">{lead.name}</p>
                            <p className="text-xs text-slate-500 truncate">{lead.service_type} · {lead.address||lead.email||''}</p>
                          </div>
                          <span className="text-xs text-violet-400">Utiliser →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {form.lead_id && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-mono">{form.lead_id}</span>
                    <button type="button" onClick={()=>fetchLead(form.lead_id)}
                      className="text-xs text-violet-400 hover:text-violet-300 underline">
                      Recharger les données
                    </button>
                    <button type="button" onClick={()=>setForm(p=>({...p,lead_id:''}))}
                      className="text-xs text-red-400 hover:text-red-300">✕</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="ID Lead (optionnel)"><input value={form.lead_id} onChange={e=>{setForm(p=>({...p,lead_id:e.target.value}));if(e.target.value.startsWith('lead_')&&e.target.value.length>10)fetchLead(e.target.value);}} placeholder="lead_xxxxx" className={inputCls}/></Field>
                <Field label="Type de service">
                  <select value={form.service_type} onChange={e=>setForm(p=>({...p,service_type:e.target.value}))} className={inputCls}>
                    <option value="" className="bg-slate-800">Sélectionner...</option>
                    {['Ménage','Bureaux','Canapé','Matelas','Tapis'].map(s=><option key={s} value={s} className="bg-slate-800">{getSvcIcon(s)} {s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Titre" required><input required value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Nettoyage complet appartement" className={inputCls}/></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Date" required><input type="date" required value={form.scheduled_date} onChange={e=>setForm(p=>({...p,scheduled_date:e.target.value}))} className={inputCls}/></Field>
                <Field label="Heure"><input type="time" value={form.scheduled_time} onChange={e=>setForm(p=>({...p,scheduled_time:e.target.value}))} className={inputCls}/></Field>
                <Field label="Durée (h)"><input type="number" step="0.5" min="0.5" max="12" value={form.duration_hours} onChange={e=>setForm(p=>({...p,duration_hours:parseFloat(e.target.value)}))} className={inputCls}/></Field>
              </div>
              <Field label="Adresse"><input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="10 Rue de la Paix, Paris 75001" className={inputCls}/></Field>
              {form.address && (
                <div className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  style={{background:ZONE_COLORS[getZoneFromAddress(form.address)]+'15',color:ZONE_COLORS[getZoneFromAddress(form.address)]||'#64748b'}}>
                  📍 Zone détectée : {getZoneFromAddress(form.address)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tél. client"><input type="tel" value={form.client_phone} onChange={e=>setForm(p=>({...p,client_phone:e.target.value}))} placeholder="06 12 34 56 78" className={inputCls}/></Field>
                <Field label="Email client (rappel veille)"><input type="email" value={form.client_email} onChange={e=>setForm(p=>({...p,client_email:e.target.value}))} placeholder="client@email.com" className={inputCls}/></Field>
              </div>

              {/* Assignation intervenant avec contrôle dispo */}
              <Field label="👷 Assigner à un intervenant">
                <select value={form.assigned_agent_id}
                  onChange={e=>{
                    const m=members.find(x=>x.member_id===e.target.value);
                    setForm(p=>({...p,assigned_agent_id:e.target.value,assigned_agent_name:m?.name||''}));
                  }} className={inputCls}>
                  <option value="" className="bg-slate-800">— Non assigné —</option>
                  {memberStats.map(m=>{
                    const avail = form.scheduled_date && form.scheduled_time
                      ? checkAgentAvailability(m.member_id, form.scheduled_date, form.scheduled_time, form.duration_hours, interventions)
                      : {available: true};
                    return (
                      <option key={m.member_id} value={m.member_id} className="bg-slate-800"
                        disabled={!avail.available}>
                        {!avail.available ? '🚫 ' : '✅ '}{m.name} ({m.today} auj.)
                        {!avail.available ? ' — INDISPONIBLE' : ''}
                      </option>
                    );
                  })}
                </select>
                {agentAvail && !agentAvail.available && (
                  <div className="mt-2 p-2 rounded-xl text-xs text-red-400 flex items-center gap-2"
                    style={{background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.2)'}}>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0"/>
                    {agentAvail.reason || `Conflit avec "${agentAvail.conflict?.title||'une autre mission'}" à ${agentAvail.conflict?.scheduled_time}`}
                  </div>
                )}
                {agentAvail?.available && form.assigned_agent_id && (
                  <p className="mt-1 text-xs text-emerald-400">✅ {form.assigned_agent_name} est disponible sur ce créneau</p>
                )}
              </Field>

              {/* Récurrence */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/3">
                <div className="flex items-center gap-2 mb-3">
                  <Repeat className="w-4 h-4 text-violet-400"/>
                  <p className="text-xs font-bold text-slate-300">Récurrence automatique</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fréquence">
                    <select value={form.recurrence} onChange={e=>setForm(p=>({...p,recurrence:e.target.value}))} className={inputCls}>
                      <option value="none" className="bg-slate-800">Aucune</option>
                      <option value="hebdo" className="bg-slate-800">Hebdomadaire</option>
                      <option value="bi-hebdo" className="bg-slate-800">Bi-hebdomadaire</option>
                      <option value="mensuel" className="bg-slate-800">Mensuel</option>
                    </select>
                  </Field>
                  {form.recurrence !== 'none' && (
                    <Field label="Jusqu'au"><input type="date" value={form.recurrence_end} onChange={e=>setForm(p=>({...p,recurrence_end:e.target.value}))} className={inputCls}/></Field>
                  )}
                </div>
              </div>

              <Field label="Description / Notes">
                <textarea value={form.description} rows={2} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  placeholder="Accès, matériel nécessaire, instructions spéciales..." className={`${inputCls} resize-none`}/>
              </Field>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-sm font-bold transition-all">Annuler</button>
                <button type="submit" disabled={agentAvail && !agentAvail.available}
                  className="flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}>
                  ✅ Planifier l'intervention
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningCalendar;
