import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users,
  CheckCircle, XCircle, Play, CalendarDays, X, List,
  Calendar, Filter, Search, Phone, Euro, AlertCircle,
  RefreshCw, Eye, Edit2, Trash2, CheckSquare, LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const HOURS = Array.from({length:14},(_,i)=>i+7); // 7h → 20h

const STATUS = {
  planifiée:  { label:'Planifiée',  color:'#60a5fa', bg:'rgba(96,165,250,0.15)',  border:'rgba(96,165,250,0.3)',  dot:'bg-blue-400' },
  en_cours:   { label:'En cours',   color:'#f59e0b', bg:'rgba(245,158,11,0.15)',  border:'rgba(245,158,11,0.3)',  dot:'bg-amber-400 animate-pulse' },
  terminée:   { label:'Terminée',   color:'#34d399', bg:'rgba(52,211,153,0.15)',  border:'rgba(52,211,153,0.3)',  dot:'bg-emerald-400' },
  annulée:    { label:'Annulée',    color:'#f43f5e', bg:'rgba(244,63,94,0.15)',   border:'rgba(244,63,94,0.3)',   dot:'bg-red-400' },
};

const SERVICE_ICONS = {
  'Ménage':'🏠','ménage':'🏠','menage':'🏠',
  'Canapé':'🛋️','canape':'🛋️','canapé':'🛋️',
  'Matelas':'🛏️','matelas':'🛏️',
  'Tapis':'🪣','tapis':'🪣',
  'Bureaux':'🏢','bureaux':'🏢',
};
const getServiceIcon = (type='') => {
  const k = Object.keys(SERVICE_ICONS).find(k => (type||'').toLowerCase().includes(k.toLowerCase()));
  return SERVICE_ICONS[k] || '🧹';
};

const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all";
const Field = ({label, required, children}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}{required&&<span className="text-red-400 ml-1">*</span>}</label>
    {children}
  </div>
);

// ── CARTE INTERVENTION ──
const IntervCard = ({intv, onClick, compact=false}) => {
  const sc = STATUS[intv.status] || STATUS.planifiée;
  const icon = getServiceIcon(intv.service_type || intv.title);
  if (compact) return (
    <button onClick={()=>onClick(intv)} className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium truncate hover:opacity-80 transition-all"
      style={{background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`}}>
      {icon} {intv.title || intv.service_type}
    </button>
  );
  return (
    <button onClick={()=>onClick(intv)}
      className="w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-lg group"
      style={{background:sc.bg, borderColor:sc.border}}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate">{intv.title || intv.service_type}</p>
            {intv.lead_name && <p className="text-xs text-slate-400 truncate">{intv.lead_name}</p>}
          </div>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{color:sc.color, background:'rgba(0,0,0,0.3)'}}>{sc.label}</span>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{intv.scheduled_time||'—'} {intv.duration_hours?`(${intv.duration_hours}h)`:''}</span>
        {intv.address && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 flex-shrink-0"/>{intv.address}</span>}
      </div>
    </button>
  );
};

const PlanningCalendar = () => {
  const [view, setView] = useState('mois'); // mois | semaine | liste
  const [currentMonth, setCurrentMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  });
  const [currentWeek, setCurrentWeek] = useState(() => new Date());
  const [interventions, setInterventions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    lead_id:'', title:'', description:'', address:'',
    scheduled_date:'', scheduled_time:'09:00', duration_hours:2,
    team_id:'', service_type:'', client_phone:''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, teamsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/calendar?month=${currentMonth}`, {withCredentials:true}),
        axios.get(`${API_URL}/teams`, {withCredentials:true}),
      ]);
      const cal = calRes.status==='fulfilled' ? calRes.value.data : {};
      const t = teamsRes.status==='fulfilled' ? teamsRes.value.data : [];
      setInterventions(cal.interventions || []);
      setTeams(Array.isArray(t) ? t : (t.teams || cal.teams || []));
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, [currentMonth]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  // Filtres
  const filtered = interventions.filter(i => {
    if (filterTeam && i.team_id !== filterTeam) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (search && !((i.title||'')+(i.lead_name||'')+(i.address||'')).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats rapides
  const stats = {
    total: filtered.length,
    planifiée: filtered.filter(i=>i.status==='planifiée').length,
    en_cours: filtered.filter(i=>i.status==='en_cours').length,
    terminée: filtered.filter(i=>i.status==='terminée').length,
    annulée: filtered.filter(i=>i.status==='annulée').length,
  };

  // Calendrier mensuel
  const [year, month] = currentMonth.split('-').map(Number);
  const firstDay = new Date(year, month-1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  let startDow = firstDay.getDay();
  if (startDow===0) startDow=7;
  const cells = [];
  for (let i=1; i<startDow; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  const getIntvForDay = (d) => {
    if (!d) return [];
    const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return filtered.filter(i=>(i.scheduled_date||'').startsWith(ds));
  };

  // Vue semaine
  const getWeekDays = () => {
    const d = new Date(currentWeek);
    const dow = d.getDay()===0?6:d.getDay()-1;
    const monday = new Date(d); monday.setDate(d.getDate()-dow);
    return Array.from({length:7},(_,i)=>{ const dd=new Date(monday); dd.setDate(monday.getDate()+i); return dd; });
  };
  const weekDays = getWeekDays();
  const getIntvForWeekDay = (date) => {
    const ds = date.toISOString().slice(0,10);
    return filtered.filter(i=>(i.scheduled_date||'').startsWith(ds));
  };

  const handleCheckInOut = async (id, action) => {
    try {
      await axios.post(`${API_URL}/interventions/${id}/${action}`, {}, {withCredentials:true});
      toast.success(action==='check_in'?'✅ Check-in enregistré':'✅ Check-out enregistré');
      fetchData();
      setSelected(null);
    } catch { toast.error('Erreur'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.patch(`${API_URL}/interventions/${id}`, {status}, {withCredentials:true});
      toast.success('Statut mis à jour');
      fetchData();
      setSelected(null);
    } catch { toast.error('Erreur'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/interventions`, form, {withCredentials:true});
      toast.success('✅ Intervention planifiée');
      setShowForm(false);
      setForm({lead_id:'',title:'',description:'',address:'',scheduled_date:'',scheduled_time:'09:00',duration_hours:2,team_id:'',service_type:'',client_phone:''});
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  const today = new Date().toISOString().slice(0,10);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in max-w-[1600px] mx-auto">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Planning</h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">{stats.total} intervention(s) · {stats.en_cours} en cours · {stats.planifiée} planifiée(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>fetchData()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* Vue toggle */}
          <div className="flex gap-1 bg-white/5 rounded-xl border border-white/5 p-1">
            {[{v:'mois',i:LayoutGrid},{v:'semaine',i:Calendar},{v:'liste',i:List}].map(({v,i:Icon})=>(
              <button key={v} onClick={()=>setView(v)}
                className={`p-2 rounded-lg transition-all ${view===v?'bg-violet-600 text-white':'text-slate-500 hover:text-slate-300'}`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}>
            <Plus className="w-4 h-4" /> Nouvelle intervention
          </button>
        </div>
      </div>

      {/* ── STATS RAPIDES ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS).map(([k,sc])=>(
          <button key={k} onClick={()=>setFilterStatus(filterStatus===k?'':k)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${filterStatus===k?'ring-1 ring-white/20':''}`}
            style={{background:sc.bg, borderColor:sc.border}}>
            <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
            <div className="text-left">
              <p className="text-lg font-black" style={{color:sc.color,fontFamily:'Manrope,sans-serif'}}>{stats[k]||0}</p>
              <p className="text-xs font-medium" style={{color:sc.color,opacity:0.8}}>{sc.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── FILTRES ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher client, adresse..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all" />
        </div>
        {teams.length > 0 && (
          <select value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
            <option value="" className="bg-slate-800">Toutes les équipes</option>
            {teams.map(t=><option key={t.team_id} value={t.team_id} className="bg-slate-800">{t.name}</option>)}
          </select>
        )}
        {/* Navigation mois/semaine */}
        <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
          <button onClick={()=>{
            if(view==='semaine'){const d=new Date(currentWeek);d.setDate(d.getDate()-7);setCurrentWeek(d);}
            else{const[y,m]=currentMonth.split('-').map(Number);const d=new Date(y,m-2,1);setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
          }} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-300 min-w-[140px] text-center">
            {view==='semaine'
              ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS_FR[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
              : `${MONTHS_FR[month-1]} ${year}`}
          </span>
          <button onClick={()=>{
            if(view==='semaine'){const d=new Date(currentWeek);d.setDate(d.getDate()+7);setCurrentWeek(d);}
            else{const[y,m]=currentMonth.split('-').map(Number);const d=new Date(y,m,1);setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
          }} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={()=>{
            const n=new Date();
            setCurrentMonth(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`);
            setCurrentWeek(n);
          }} className="ml-1 text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors">Auj.</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {[...Array(28)].map((_,i)=><div key={i} className="skeleton h-20 rounded-xl"/>)}
        </div>
      ) : (
        <>
          {/* ── VUE MOIS ── */}
          {view==='mois' && (
            <div className="section-card p-4">
              {/* Jours header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {DAYS_FR.map(d=>(
                  <div key={d} className="text-center text-xs font-bold text-slate-500 py-2">{d}</div>
                ))}
              </div>
              {/* Cellules */}
              <div className="grid grid-cols-7 gap-2">
                {cells.map((d,idx)=>{
                  const intvs = getIntvForDay(d);
                  const ds = d ? `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '';
                  const isToday = ds === today;
                  const hasUrgent = intvs.some(i=>i.status==='en_cours');
                  return (
                    <div key={idx} className={`min-h-[90px] rounded-xl p-2 border transition-all ${
                      !d ? 'opacity-0 pointer-events-none' :
                      isToday ? 'border-violet-500/50 bg-violet-500/5' :
                      'border-white/5 bg-white/2 hover:bg-white/5'
                    }`}>
                      {d && (
                        <>
                          <div className={`flex items-center justify-between mb-1`}>
                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                              isToday ? 'bg-violet-600 text-white' : 'text-slate-400'
                            }`}>{d}</span>
                            {hasUrgent && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                          </div>
                          <div className="space-y-1">
                            {intvs.slice(0,2).map(i=>(
                              <IntervCard key={i.intervention_id||i.id} intv={i} onClick={setSelected} compact />
                            ))}
                            {intvs.length>2 && (
                              <p className="text-[10px] text-slate-500 font-medium pl-1">+{intvs.length-2} autre(s)</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── VUE SEMAINE ── */}
          {view==='semaine' && (
            <div className="section-card p-4 overflow-x-auto">
              <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                {weekDays.map((date,idx)=>{
                  const intvs = getIntvForWeekDay(date);
                  const ds = date.toISOString().slice(0,10);
                  const isToday = ds===today;
                  return (
                    <div key={idx} className={`rounded-xl p-2 border transition-all ${
                      isToday ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/5 bg-white/2'
                    }`}>
                      <div className="text-center mb-2">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">{DAYS_FR[idx]}</p>
                        <p className={`text-lg font-black ${isToday?'text-violet-400':'text-slate-300'}`}
                          style={{fontFamily:'Manrope,sans-serif'}}>{date.getDate()}</p>
                        {intvs.length>0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">{intvs.length}</span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {intvs.map(i=>(
                          <IntervCard key={i.intervention_id||i.id} intv={i} onClick={setSelected} />
                        ))}
                        {intvs.length===0 && (
                          <p className="text-[10px] text-slate-700 text-center py-4">—</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── VUE LISTE ── */}
          {view==='liste' && (
            <div className="section-card divide-y divide-white/5">
              {filtered.length===0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <CalendarDays className="w-12 h-12 text-slate-700" />
                  <p className="text-slate-500 font-medium">Aucune intervention trouvée</p>
                </div>
              )}
              {[...filtered].sort((a,b)=>(a.scheduled_date||'').localeCompare(b.scheduled_date||'')).map(intv=>{
                const sc = STATUS[intv.status]||STATUS.planifiée;
                const icon = getServiceIcon(intv.service_type||intv.title);
                return (
                  <div key={intv.intervention_id||intv.id}
                    className="flex items-center gap-4 p-4 hover:bg-white/3 transition-all cursor-pointer group"
                    onClick={()=>setSelected(intv)}>
                    {/* Date */}
                    <div className="flex-shrink-0 text-center w-14">
                      <p className="text-xl font-black text-slate-200" style={{fontFamily:'Manrope,sans-serif'}}>
                        {(intv.scheduled_date||'').slice(8,10)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">
                        {MONTHS_FR[parseInt((intv.scheduled_date||'').slice(5,7))-1]?.slice(0,3)||'—'}
                      </p>
                    </div>
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{background:sc.bg,border:`1px solid ${sc.border}`}}>
                      {icon}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-200 group-hover:text-slate-100 truncate">{intv.title||intv.service_type}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                          style={{color:sc.color,background:sc.bg}}>{sc.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {intv.lead_name && <span className="text-xs text-slate-500 flex items-center gap-1"><Users className="w-3 h-3"/>{intv.lead_name}</span>}
                        {intv.scheduled_time && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/>{intv.scheduled_time}{intv.duration_hours?` (${intv.duration_hours}h)`:''}</span>}
                        {intv.address && <span className="text-xs text-slate-500 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 flex-shrink-0"/>{intv.address}</span>}
                      </div>
                    </div>
                    {/* Actions rapides */}
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                      {intv.status==='planifiée' && (
                        <button onClick={e=>{e.stopPropagation();handleCheckInOut(intv.intervention_id||intv.id,'check_in');}}
                          className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all"
                          title="Check-in">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {intv.status==='en_cours' && (
                        <button onClick={e=>{e.stopPropagation();handleCheckInOut(intv.intervention_id||intv.id,'check_out');}}
                          className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 transition-all"
                          title="Check-out">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-600" />
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.75)'}}
          onClick={()=>setSelected(null)}>
          <div className="rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}
            onClick={e=>e.stopPropagation()}>

            {/* Header modal */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{background:STATUS[selected.status]?.bg||'rgba(96,165,250,0.15)', border:`1px solid ${STATUS[selected.status]?.border||'rgba(96,165,250,0.3)'}`}}>
                  {getServiceIcon(selected.service_type||selected.title)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">{selected.title||selected.service_type}</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                    style={{color:STATUS[selected.status]?.color||'#60a5fa',background:STATUS[selected.status]?.bg||'rgba(96,165,250,0.15)',border:`1px solid ${STATUS[selected.status]?.border}`}}>
                    {STATUS[selected.status]?.label||'Planifiée'}
                  </span>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Infos */}
            <div className="space-y-2 mb-5">
              {[
                {icon:Clock, color:'#a78bfa', label:`${selected.scheduled_date||'—'} à ${selected.scheduled_time||'—'}${selected.duration_hours?` · ${selected.duration_hours}h`:''}` },
                ...(selected.address?[{icon:MapPin, color:'#60a5fa', label:selected.address}]:[]),
                ...(selected.lead_name?[{icon:Users, color:'#34d399', label:`${selected.lead_name}${selected.lead_phone?' · '+selected.lead_phone:''}`}]:[]),
                ...(selected.service_type?[{icon:CheckSquare, color:'#f59e0b', label:selected.service_type}]:[]),
              ].map((item,i)=>(
                <div key={i} className="flex items-center gap-3 text-sm text-slate-400 p-3 rounded-xl bg-white/3 border border-white/5">
                  <item.icon className="w-4 h-4 flex-shrink-0" style={{color:item.color}} />
                  <span>{item.label}</span>
                </div>
              ))}
              {selected.description && (
                <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-sm text-slate-400">{selected.description}</div>
              )}
              {selected.check_in && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5"/> Check-in: {new Date(selected.check_in.time).toLocaleString('fr-FR')}
                  {selected.check_in.location && <span className="text-slate-500">· {selected.check_in.location}</span>}
                </div>
              )}
              {selected.check_out && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5"/> Check-out: {new Date(selected.check_out.time).toLocaleString('fr-FR')}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {selected.status==='planifiée' && (
                <button onClick={()=>handleCheckInOut(selected.intervention_id||selected.id,'check_in')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400">
                  <Play className="w-4 h-4"/> Démarrer (Check-in)
                </button>
              )}
              {selected.status==='en_cours' && (
                <button onClick={()=>handleCheckInOut(selected.intervention_id||selected.id,'check_out')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400">
                  <CheckCircle className="w-4 h-4"/> Terminer (Check-out)
                </button>
              )}
              {selected.status==='en_cours' && (
                <button onClick={()=>handleStatusChange(selected.intervention_id||selected.id,'terminée')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/20 text-violet-400">
                  <CheckSquare className="w-4 h-4"/> Marquer terminée
                </button>
              )}
              {!['annulée','terminée'].includes(selected.status) && (
                <button onClick={()=>handleStatusChange(selected.intervention_id||selected.id,'annulée')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400">
                  <XCircle className="w-4 h-4"/> Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CRÉATION ── */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.75)'}}
          onClick={()=>setShowForm(false)}>
          <div className="rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}
            onClick={e=>e.stopPropagation()}>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-violet-400" />
                </div>
                <h3 className="text-lg font-black text-slate-100">Nouvelle intervention</h3>
              </div>
              <button onClick={()=>setShowForm(false)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="ID Lead">
                  <input value={form.lead_id} onChange={e=>setForm(p=>({...p,lead_id:e.target.value}))}
                    placeholder="lead_xxxxx" className={inputCls} />
                </Field>
                <Field label="Type de service">
                  <select value={form.service_type} onChange={e=>setForm(p=>({...p,service_type:e.target.value}))} className={inputCls}>
                    <option value="" className="bg-slate-800">Sélectionner...</option>
                    {['Ménage','Bureaux','Canapé','Matelas','Tapis'].map(s=>(
                      <option key={s} value={s} className="bg-slate-800">{getServiceIcon(s)} {s}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Titre" required>
                <input value={form.title} required onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                  placeholder="Ex: Nettoyage complet appartement" className={inputCls} />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Date" required>
                  <input type="date" required value={form.scheduled_date}
                    onChange={e=>setForm(p=>({...p,scheduled_date:e.target.value}))} className={inputCls} />
                </Field>
                <Field label="Heure">
                  <input type="time" value={form.scheduled_time}
                    onChange={e=>setForm(p=>({...p,scheduled_time:e.target.value}))} className={inputCls} />
                </Field>
                <Field label="Durée (h)">
                  <input type="number" step="0.5" min="0.5" value={form.duration_hours}
                    onChange={e=>setForm(p=>({...p,duration_hours:parseFloat(e.target.value)}))} className={inputCls} />
                </Field>
              </div>

              <Field label="Adresse">
                <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}
                  placeholder="10 Rue de la Paix, Paris 75001" className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                {teams.length>0 && (
                  <Field label="Équipe">
                    <select value={form.team_id} onChange={e=>setForm(p=>({...p,team_id:e.target.value}))} className={inputCls}>
                      <option value="" className="bg-slate-800">Sans équipe</option>
                      {teams.map(t=><option key={t.team_id} value={t.team_id} className="bg-slate-800">{t.name}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Tél. client">
                  <input type="tel" value={form.client_phone} onChange={e=>setForm(p=>({...p,client_phone:e.target.value}))}
                    placeholder="06 12 34 56 78" className={inputCls} />
                </Field>
              </div>

              <Field label="Description / Notes">
                <textarea value={form.description} rows={3}
                  onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  placeholder="Détails de l'intervention, accès, matériel nécessaire..."
                  className={`${inputCls} resize-none`} />
              </Field>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-sm font-bold transition-all">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold transition-all"
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
