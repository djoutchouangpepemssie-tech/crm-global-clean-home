import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  CheckSquare, Plus, Clock, CheckCircle, Circle, AlertCircle,
  Calendar, Trash2, Search, Filter, RefreshCw, ChevronDown,
  Flag, User, Tag, X, LayoutGrid, List, Zap, Star,
  Phone, Mail, FileText, Home, Edit2, ChevronRight
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const PRIORITY = {
  urgente: { label:'Urgente', color:'#f43f5e', bg:'rgba(244,63,94,0.12)', border:'rgba(244,63,94,0.25)', dot:'bg-red-500 animate-pulse', icon:'🔴' },
  haute:   { label:'Haute',   color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'rgba(249,115,22,0.25)', dot:'bg-orange-500',            icon:'🟠' },
  normale: { label:'Normale', color:'#60a5fa', bg:'rgba(96,165,250,0.12)', border:'rgba(96,165,250,0.25)', dot:'bg-blue-400',              icon:'🔵' },
  basse:   { label:'Basse',   color:'#94a3b8', bg:'rgba(148,163,184,0.08)', border:'rgba(148,163,184,0.15)', dot:'bg-slate-500',           icon:'⚪' },
  high:    { label:'Haute',   color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'rgba(249,115,22,0.25)', dot:'bg-orange-500',            icon:'🟠' },
  medium:  { label:'Normale', color:'#60a5fa', bg:'rgba(96,165,250,0.12)', border:'rgba(96,165,250,0.25)', dot:'bg-blue-400',              icon:'🔵' },
  low:     { label:'Basse',   color:'#94a3b8', bg:'rgba(148,163,184,0.08)', border:'rgba(148,163,184,0.15)', dot:'bg-slate-500',           icon:'⚪' },
};

const TYPES = [
  { v:'rappel',     l:'📞 Rappel téléphone' },
  { v:'email',      l:'📧 Email à envoyer' },
  { v:'visite',     l:'🏠 Visite / Intervention' },
  { v:'devis',      l:'📄 Envoyer devis' },
  { v:'relance',    l:'🔔 Relance client' },
  { v:'facturation',l:'💰 Facturation' },
  { v:'suivi',      l:'👁️ Suivi client' },
  { v:'autre',      l:'✨ Autre' },
];

const typeIcon = (type='') => {
  const map = {rappel:'📞',email:'📧',visite:'🏠',devis:'📄',relance:'🔔',facturation:'💰',suivi:'👁️',autre:'✨'};
  return map[type] || '✨';
};

const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all";
const Field = ({label, children}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
    {children}
  </div>
);

// ── KANBAN COLONNE ──
const KanbanCol = ({title, color, tasks, onComplete, onDelete, onSelect, count}) => (
  <div className="flex-1 min-w-[220px]">
    <div className="flex items-center gap-2 mb-3 px-1">
      <span className={`w-2.5 h-2.5 rounded-full`} style={{background:color}} />
      <span className="text-sm font-bold text-slate-300">{title}</span>
      <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-slate-400 bg-white/5">{count}</span>
    </div>
    <div className="space-y-2">
      {tasks.map(task=>(
        <TaskCard key={task.task_id} task={task} onComplete={onComplete} onDelete={onDelete} onSelect={onSelect} />
      ))}
      {tasks.length===0 && (
        <div className="h-20 rounded-xl border border-dashed border-white/10 flex items-center justify-center">
          <p className="text-xs text-slate-700">Aucune tâche</p>
        </div>
      )}
    </div>
  </div>
);

// ── TASK CARD ──
const TaskCard = ({task, onComplete, onDelete, onSelect}) => {
  const p = PRIORITY[task.priority||'normale'] || PRIORITY.normale;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status!=='completed';
  const isDone = task.status==='completed';
  return (
    <div onClick={()=>onSelect(task)}
      className={`group p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] hover:shadow-lg ${isDone?'opacity-40':''}`}
      style={{background:p.bg, borderColor:p.border}}>
      <div className="flex items-start gap-2">
        <button onClick={e=>{e.stopPropagation();if(!isDone)onComplete(task.task_id);}}
          className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform">
          {isDone
            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
            : <Circle className="w-4 h-4 text-slate-600 hover:text-violet-400" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${isDone?'line-through text-slate-500':'text-slate-200'}`}>
            {task.title}
          </p>
          {task.description && <p className="text-xs text-slate-500 mt-1 truncate">{task.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] bg-black/20 text-slate-400 px-1.5 py-0.5 rounded-md">{typeIcon(task.type)} {task.type||'autre'}</span>
            {task.due_date && (
              <span className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-md ${isOverdue?'bg-red-500/20 text-red-400':'bg-black/20 text-slate-500'}`}>
                <Clock className="w-2.5 h-2.5"/>
                {new Date(task.due_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
                {isOverdue && ' ⚠️'}
              </span>
            )}
            {task.lead_name && <span className="text-[10px] text-slate-500 truncate max-w-[80px]">👤 {task.lead_name}</span>}
          </div>
        </div>
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={e=>{e.stopPropagation();onDelete(task.task_id);}}
            className="p-1 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── LISTE ROW ──
const TaskRow = ({task, onComplete, onDelete, onSelect}) => {
  const p = PRIORITY[task.priority||'normale'] || PRIORITY.normale;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status!=='completed';
  const isDone = task.status==='completed';
  return (
    <div onClick={()=>onSelect(task)}
      className={`flex items-center gap-4 p-3.5 hover:bg-white/3 transition-all cursor-pointer group border-b border-white/5 last:border-0 ${isDone?'opacity-40':''}`}>
      <button onClick={e=>{e.stopPropagation();if(!isDone)onComplete(task.task_id);}}
        className="flex-shrink-0 hover:scale-110 transition-transform">
        {isDone
          ? <CheckCircle className="w-5 h-5 text-emerald-400" />
          : <Circle className="w-5 h-5 text-slate-600 hover:text-violet-400" />}
      </button>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isDone?'line-through text-slate-500':'text-slate-200'}`}>{task.title}</p>
        {task.description && <p className="text-xs text-slate-500 truncate">{task.description}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-slate-500 hidden sm:block">{typeIcon(task.type)} {task.type||'—'}</span>
        {task.lead_name && <span className="text-xs text-slate-500 hidden md:block truncate max-w-[100px]">👤 {task.lead_name}</span>}
        {task.due_date && (
          <span className={`text-xs flex items-center gap-1 ${isOverdue?'text-red-400 font-bold':'text-slate-500'}`}>
            <Clock className="w-3 h-3"/>{new Date(task.due_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
            {isOverdue&&' ⚠️'}
          </span>
        )}
        <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{color:p.color,background:p.bg,borderColor:p.border}}>{p.label}</span>
        <button onClick={e=>{e.stopPropagation();onDelete(task.task_id);}}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/15 text-slate-600 hover:text-red-400 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const TasksList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('liste'); // liste | kanban
  const [filter, setFilter] = useState('pending');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    title:'', description:'', type:'rappel', priority:'normale',
    due_date:'', lead_id:'', lead_name:''
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter!=='all' ? `?status=${filter}` : '';
      const res = await axios.get(`${API_URL}/tasks${params}`, {withCredentials:true});
      setTasks(Array.isArray(res.data) ? res.data : res.data.tasks || []);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(()=>{ fetchTasks(); },[fetchTasks]);

  const handleComplete = async (id) => {
    try {
      await axios.patch(`${API_URL}/tasks/${id}/complete`, {}, {withCredentials:true});
      toast.success('✅ Tâche complétée !');
      fetchTasks();
    } catch { toast.error('Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    try {
      await axios.delete(`${API_URL}/tasks/${id}`, {withCredentials:true});
      toast.success('Tâche supprimée');
      fetchTasks();
    } catch { toast.error('Erreur'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await axios.post(`${API_URL}/tasks`, form, {withCredentials:true});
      toast.success('✅ Tâche créée');
      setForm({title:'',description:'',type:'rappel',priority:'normale',due_date:'',lead_id:'',lead_name:''});
      setShowForm(false);
      fetchTasks();
    } catch { toast.error('Erreur lors de la création'); }
  };

  // Filtres
  const filtered = tasks.filter(t => {
    if (filterPriority && (t.priority||'normale')!==filterPriority) return false;
    if (filterType && t.type!==filterType) return false;
    if (search && !((t.title||'')+(t.description||'')+(t.lead_name||'')).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t=>t.status==='pending').length,
    completed: tasks.filter(t=>t.status==='completed').length,
    overdue: tasks.filter(t=>t.due_date && new Date(t.due_date)<new Date() && t.status!=='completed').length,
    urgente: tasks.filter(t=>t.priority==='urgente'||t.priority==='haute'||t.priority==='high').length,
  };

  // Kanban colonnes
  const kanbanCols = [
    { key:'pending',  title:'À faire',    color:'#60a5fa', tasks: filtered.filter(t=>t.status==='pending' && !['urgente','haute','high'].includes(t.priority||'')) },
    { key:'urgent',   title:'🔥 Urgent',  color:'#f43f5e', tasks: filtered.filter(t=>t.status==='pending' && ['urgente','haute','high'].includes(t.priority||'')) },
    { key:'completed',title:'✅ Terminé', color:'#34d399', tasks: filtered.filter(t=>t.status==='completed').slice(0,10) },
  ];

  // Grouper par date pour vue liste
  const groupByDate = (tasks) => {
    const today = new Date().toLocaleDateString('fr-FR');
    const tomorrow = new Date(Date.now()+86400000).toLocaleDateString('fr-FR');
    const groups = {};
    tasks.forEach(t => {
      const d = t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR') : 'Sans date';
      const label = d===today?'Aujourd\'hui':d===tomorrow?'Demain':d;
      if (!groups[label]) groups[label] = [];
      groups[label].push(t);
    });
    return groups;
  };

  const noDateTasks = filtered.filter(t=>!t.due_date);
  const withDateTasks = filtered.filter(t=>t.due_date);
  const grouped = groupByDate(withDateTasks);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in max-w-[1400px] mx-auto">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-violet-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Tâches</h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">
            <span className="text-amber-400 font-bold">{stats.pending}</span> en attente ·
            <span className="text-emerald-400 font-bold ml-1">{stats.completed}</span> complétées
            {stats.overdue > 0 && <span className="text-red-400 font-bold ml-1">· {stats.overdue} en retard ⚠️</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTasks} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex gap-1 bg-white/5 rounded-xl border border-white/5 p-1">
            {[{v:'liste',i:List},{v:'kanban',i:LayoutGrid}].map(({v,i:Icon})=>(
              <button key={v} onClick={()=>setView(v)}
                className={`p-2 rounded-lg transition-all ${view===v?'bg-violet-600 text-white':'text-slate-500 hover:text-slate-300'}`}>
                <Icon className="w-3.5 h-3.5"/>
              </button>
            ))}
          </div>
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}>
            <Plus className="w-4 h-4"/> Nouvelle tâche
          </button>
        </div>
      </div>

      {/* ── STATS RAPIDES ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'En attente', value:stats.pending,   color:'#60a5fa', icon:Circle},
          {label:'En retard',  value:stats.overdue,   color:'#f43f5e', icon:AlertCircle},
          {label:'Urgentes',   value:stats.urgente,   color:'#f97316', icon:Zap},
          {label:'Complétées', value:stats.completed, color:'#34d399', icon:CheckCircle},
        ].map(s=>(
          <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{background:`${s.color}15`,border:`1px solid ${s.color}30`}}>
              <s.icon className="w-4 h-4" style={{color:s.color}}/>
            </div>
            <div>
              <p className="text-xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
              <p className="text-[10px] text-slate-500 font-semibold">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTRES ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"/>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{v:'pending',l:'⏳ En cours'},{v:'completed',l:'✅ Complétées'},{v:'all',l:'Toutes'}].map(f=>(
            <button key={f.v} onClick={()=>setFilter(f.v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${filter===f.v?'bg-violet-600 text-white':'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'}`}>
              {f.l}
            </button>
          ))}
          <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
            <option value="" className="bg-slate-800">Toutes priorités</option>
            {['urgente','haute','normale','basse'].map(p=><option key={p} value={p} className="bg-slate-800">{PRIORITY[p]?.icon} {PRIORITY[p]?.label}</option>)}
          </select>
          <select value={filterType} onChange={e=>setFilterType(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
            <option value="" className="bg-slate-800">Tous types</option>
            {TYPES.map(t=><option key={t.v} value={t.v} className="bg-slate-800">{t.l}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_,i)=><div key={i} className="skeleton h-16 rounded-xl"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="section-card flex flex-col items-center justify-center py-20 gap-4">
          <CheckSquare className="w-14 h-14 text-slate-700"/>
          <p className="text-slate-500 font-semibold text-lg">Aucune tâche trouvée</p>
          <button onClick={()=>setShowForm(true)}
            className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all"
            style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
            + Créer une tâche
          </button>
        </div>
      ) : (
        <>
          {/* ── VUE KANBAN ── */}
          {view==='kanban' && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {kanbanCols.map(col=>(
                <KanbanCol key={col.key} {...col} count={col.tasks.length}
                  onComplete={handleComplete} onDelete={handleDelete} onSelect={setSelected}/>
              ))}
            </div>
          )}

          {/* ── VUE LISTE ── */}
          {view==='liste' && (
            <div className="space-y-4">
              {/* Groupes par date */}
              {Object.entries(grouped).sort(([a],[b])=>{
                if(a==="Aujourd'hui") return -1;
                if(b==="Aujourd'hui") return 1;
                if(a==='Demain') return -1;
                if(b==='Demain') return 1;
                return a.localeCompare(b);
              }).map(([date, dateTasks])=>(
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Calendar className="w-3.5 h-3.5 text-violet-400"/>
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">{date}</span>
                    <span className="text-xs text-slate-600">({dateTasks.length})</span>
                  </div>
                  <div className="section-card overflow-hidden">
                    {dateTasks.map(task=>(
                      <TaskRow key={task.task_id} task={task}
                        onComplete={handleComplete} onDelete={handleDelete} onSelect={setSelected}/>
                    ))}
                  </div>
                </div>
              ))}
              {/* Sans date */}
              {noDateTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-600"/>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sans date</span>
                    <span className="text-xs text-slate-600">({noDateTasks.length})</span>
                  </div>
                  <div className="section-card overflow-hidden">
                    {noDateTasks.map(task=>(
                      <TaskRow key={task.task_id} task={task}
                        onComplete={handleComplete} onDelete={handleDelete} onSelect={setSelected}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL DÉTAIL ── */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.75)'}}
          onClick={()=>setSelected(null)}>
          <div className="rounded-2xl p-6 max-w-md w-full animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{background:PRIORITY[selected.priority||'normale']?.bg, border:`1px solid ${PRIORITY[selected.priority||'normale']?.border}`}}>
                  {typeIcon(selected.type)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">{selected.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
                      style={{color:PRIORITY[selected.priority||'normale']?.color, background:PRIORITY[selected.priority||'normale']?.bg, borderColor:PRIORITY[selected.priority||'normale']?.border}}>
                      {PRIORITY[selected.priority||'normale']?.label}
                    </span>
                    <span className="text-xs text-slate-500">{typeIcon(selected.type)} {selected.type}</span>
                  </div>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <div className="space-y-2 mb-5">
              {selected.description && <p className="text-sm text-slate-400 p-3 rounded-xl bg-white/3 border border-white/5">{selected.description}</p>}
              {selected.due_date && (
                <div className="flex items-center gap-3 text-sm text-slate-400 p-3 rounded-xl bg-white/3 border border-white/5">
                  <Clock className="w-4 h-4 text-violet-400"/>
                  <span>{new Date(selected.due_date).toLocaleString('fr-FR')}</span>
                </div>
              )}
              {selected.lead_name && (
                <div className="flex items-center gap-3 text-sm text-slate-400 p-3 rounded-xl bg-white/3 border border-white/5">
                  <User className="w-4 h-4 text-blue-400"/>
                  <span>{selected.lead_name}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {selected.status!=='completed' && (
                <button onClick={()=>{handleComplete(selected.task_id);setSelected(null);}}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 transition-all">
                  <CheckCircle className="w-4 h-4"/> Marquer complétée
                </button>
              )}
              <button onClick={()=>{handleDelete(selected.task_id);setSelected(null);}}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CRÉATION ── */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.75)'}}
          onClick={()=>setShowForm(false)}>
          <div className="rounded-2xl p-6 max-w-md w-full animate-fade-in"
            style={{background:'hsl(224,71%,6%)',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-violet-400"/>
                </div>
                <h3 className="text-lg font-black text-slate-100">Nouvelle tâche</h3>
              </div>
              <button onClick={()=>setShowForm(false)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Titre *">
                <input required value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                  placeholder="Ex: Rappeler M. Dupont pour devis canapé"
                  className={inputCls}/>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className={inputCls}>
                    {TYPES.map(t=><option key={t.v} value={t.v} className="bg-slate-800">{t.l}</option>)}
                  </select>
                </Field>
                <Field label="Priorité">
                  <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} className={inputCls}>
                    {['urgente','haute','normale','basse'].map(p=>(
                      <option key={p} value={p} className="bg-slate-800">{PRIORITY[p]?.icon} {PRIORITY[p]?.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Description">
                <textarea value={form.description} rows={2}
                  onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  placeholder="Détails supplémentaires..."
                  className={`${inputCls} resize-none`}/>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date / heure limite">
                  <input type="datetime-local" value={form.due_date}
                    onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} className={inputCls}/>
                </Field>
                <Field label="Nom du lead">
                  <input value={form.lead_name} onChange={e=>setForm(p=>({...p,lead_name:e.target.value}))}
                    placeholder="Ex: Jean Dupont" className={inputCls}/>
                </Field>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-sm font-bold transition-all">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold transition-all"
                  style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}>
                  ✅ Créer la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksList;
