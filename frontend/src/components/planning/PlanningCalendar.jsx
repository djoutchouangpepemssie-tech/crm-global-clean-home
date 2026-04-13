import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  useCalendar,
  useAllTeamMembers,
  useCreateIntervention,
  useUpdateIntervention,
} from '../../hooks/api';
import api from '../../lib/api';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users,
  CheckCircle, XCircle, Play, CalendarDays, X, List,
  Calendar, Search, RefreshCw, LayoutGrid, AlertTriangle,
  Repeat, Download, Bell, Navigation, User, Mail, Phone,
  ZapOff, Zap, Copy, Printer, Sparkles, Timer, TrendingUp,
  ChevronDown, Eye, Edit3, Trash2, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../shared';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const DAYS_FULL_FR = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const HOURS = Array.from({length:13},(_,i)=>i+8);

const STATUS = {
  planifiée: { label:'Planifiée', color:'#818cf8', bg:'rgba(129,140,248,0.12)', border:'rgba(129,140,248,0.25)', dot:'bg-indigo-400', icon:'📋', gradient:'from-indigo-500/20 to-indigo-600/5' },
  en_cours:  { label:'En cours',  color:'#fbbf24', bg:'rgba(251,191,36,0.12)', border:'rgba(251,191,36,0.25)', dot:'bg-amber-400 animate-pulse', icon:'⚡', gradient:'from-amber-500/20 to-amber-600/5' },
  terminée:  { label:'Terminée',  color:'#34d399', bg:'rgba(52,211,153,0.12)', border:'rgba(52,211,153,0.25)', dot:'bg-emerald-400', icon:'✅', gradient:'from-emerald-500/20 to-emerald-600/5' },
  annulée:   { label:'Annulée',   color:'#fb7185', bg:'rgba(251,113,133,0.12)', border:'rgba(251,113,133,0.25)', dot:'bg-rose-400', icon:'❌', gradient:'from-rose-500/20 to-rose-600/5' },
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

const ZONE_ICONS = {
  'Paris 1-4':'🏛️','Paris 5-8':'🗼','Paris 9-12':'🎭','Paris 13-16':'🌳',
  'Paris 17-20':'🎨','Banlieue Nord':'🚇','Banlieue Sud':'🏘️',
  'Banlieue Est':'🌆','Banlieue Ouest':'🏡','Autre':'📍'
};

// ── AGENT COLORS (unique per agent, high contrast) ──
const AGENT_COLOR_PALETTE = [
  { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', name: 'Violet' },
  { color: '#22d3ee', bg: 'rgba(34,211,238,0.15)', name: 'Cyan' },
  { color: '#34d399', bg: 'rgba(52,211,153,0.15)', name: 'Emerald' },
  { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', name: 'Amber' },
  { color: '#fb7185', bg: 'rgba(251,113,133,0.15)', name: 'Rose' },
  { color: '#f472b6', bg: 'rgba(244,114,182,0.15)', name: 'Pink' },
  { color: '#818cf8', bg: 'rgba(129,140,248,0.15)', name: 'Indigo' },
  { color: '#a3e635', bg: 'rgba(163,230,53,0.15)', name: 'Lime' },
  { color: '#fb923c', bg: 'rgba(251,146,60,0.15)', name: 'Orange' },
  { color: '#c084fc', bg: 'rgba(192,132,252,0.15)', name: 'Purple' },
  { color: '#2dd4bf', bg: 'rgba(45,212,191,0.15)', name: 'Teal' },
  { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', name: 'Blue' },
];
const getAgentColorObj = (agentId, members) => {
  if (!agentId) return { color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
  const idx = members.findIndex(m => m.member_id === agentId);
  return idx >= 0 ? AGENT_COLOR_PALETTE[idx % AGENT_COLOR_PALETTE.length] : { color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
};
const getAgentColor = (agentId, members) => getAgentColorObj(agentId, members).color;

const ZONE_COLORS = {
  'Paris 1-4':'#fb923c','Paris 5-8':'#a78bfa','Paris 9-12':'#22d3ee',
  'Paris 13-16':'#34d399','Paris 17-20':'#fb7185','Banlieue Nord':'#fbbf24',
  'Banlieue Sud':'#a3e635','Banlieue Est':'#f472b6','Banlieue Ouest':'#818cf8','Autre':'#64748b'
};

const inputCls = "w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06]";
const Field = ({label,required,children}) => (
  <div className="group/field">
    <label className="block text-xs font-semibold text-slate-400 mb-2 group-focus-within/field:text-violet-400 transition-colors duration-200">
      {label}{required&&<span className="text-rose-400 ml-1">*</span>}
    </label>
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

// ── ANIMATED COUNTER ──
const AnimatedNumber = ({ value, className = '' }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 600;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    prevRef.current = end;
  }, [value]);
  return <span className={className}>{display}</span>;
};

// ── PREMIUM LOADING SKELETON ──
const PremiumSkeleton = () => (
  <div className="space-y-4 animate-fade-in">
    {/* Stats skeleton */}
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 rounded-2xl overflow-hidden relative" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="absolute inset-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
          <div className="absolute inset-0 shimmer-premium" style={{ animationDelay: `${i * 150}ms` }} />
          <div className="relative p-4 space-y-3">
            <div className="h-6 w-10 bg-white/[0.06] rounded-lg" />
            <div className="h-3 w-16 bg-white/[0.04] rounded-md" />
          </div>
        </div>
      ))}
    </div>
    {/* Calendar skeleton */}
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="grid grid-cols-7 gap-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="space-y-3" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="h-4 w-8 mx-auto bg-white/[0.06] rounded-md" />
            <div className="h-32 rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
              <div className="absolute inset-0 shimmer-premium" style={{ animationDelay: `${i * 100}ms` }} />
              <div className="relative p-3 space-y-2">
                <div className="h-7 w-7 mx-auto bg-white/[0.06] rounded-full" />
                <div className="h-12 bg-white/[0.04] rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── INTERVENTION CARD (premium) ──
const InterventionCard = ({ intv, sc, hasConflict, agentColor, members, onClick, onDragStart, compact = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (compact) {
    return (
      <div
        draggable
        onDragStart={e => onDragStart(e, intv)}
        onClick={() => onClick(intv)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group/card relative px-2.5 py-2 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-300 border overflow-hidden
          ${hasConflict ? 'ring-1 ring-rose-500/50 animate-border-pulse' : ''}
          ${isHovered ? 'scale-[1.03] shadow-lg z-10' : 'hover:scale-[1.02]'}`}
        style={{
          background: sc.bg,
          borderColor: isHovered ? sc.color + '60' : sc.border,
          boxShadow: isHovered ? `0 8px 24px ${sc.color}20, 0 0 0 1px ${sc.color}15` : 'none',
        }}
      >
        {/* Accent line */}
        <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl transition-all duration-300"
          style={{ background: sc.color, opacity: isHovered ? 1 : 0.5 }} />

        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-xs">{getSvcIcon(intv.service_type)}</span>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: sc.color }}>{intv.scheduled_time}</span>
          {hasConflict && <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0 animate-pulse" />}
        </div>
        <p className="text-[11px] font-semibold text-slate-200 truncate ml-1 mt-0.5">{intv.title || intv.service_type}</p>
        {intv.assigned_agent_name && (
          <div className="flex items-center gap-1.5 mt-1 ml-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/20" style={{ background: agentColor }} />
            <p className="text-[10px] text-slate-500 truncate">{intv.assigned_agent_name.split(' ')[0]}</p>
          </div>
        )}

        {/* Hover reveal actions */}
        <div className={`absolute top-1 right-1 transition-all duration-200 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-1'}`}>
          <div className="w-5 h-5 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Eye className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, intv)}
      onClick={() => onClick(intv)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group/card relative p-4 rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden
        ${hasConflict ? 'ring-1 ring-rose-500/40' : ''}
        ${isHovered ? 'scale-[1.02] shadow-xl' : ''}`}
      style={{
        background: sc.bg,
        borderColor: isHovered ? sc.color + '50' : sc.border,
        boxShadow: isHovered ? `0 12px 40px ${sc.color}15, 0 0 0 1px ${sc.color}10` : 'none',
      }}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-300"
        style={{ background: `linear-gradient(90deg, ${sc.color}, transparent)`, opacity: isHovered ? 1 : 0.5 }} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl transition-transform duration-300" style={{ transform: isHovered ? 'scale(1.15) rotate(-5deg)' : 'scale(1)' }}>
            {getSvcIcon(intv.service_type)}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300"
            style={{
              color: sc.color,
              background: isHovered ? sc.color + '25' : 'rgba(0,0,0,0.2)',
              boxShadow: isHovered ? `0 0 12px ${sc.color}15` : 'none'
            }}>
            {sc.label}
          </span>
        </div>
        {hasConflict && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
            <span className="text-[10px] font-bold text-rose-400">Conflit</span>
          </div>
        )}
      </div>

      <p className="font-bold text-slate-200 text-sm truncate mb-1.5">{intv.title || intv.service_type}</p>
      {intv.lead_name && <p className="text-xs text-slate-400 truncate mb-1">👤 {intv.lead_name}</p>}
      {intv.address && (
        <p className="text-xs text-slate-500 truncate mb-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />{intv.address}
        </p>
      )}

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
        <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: sc.color }}>
          <Clock className="w-3.5 h-3.5" />{intv.scheduled_time || '—'}
          {intv.duration_hours ? <span className="text-slate-500 font-normal">({intv.duration_hours}h)</span> : ''}
        </span>
        {intv.assigned_agent_name && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200"
            style={{ background: isHovered ? agentColor + '15' : 'transparent' }}>
            <div className="w-2.5 h-2.5 rounded-full ring-2 ring-black/20" style={{ background: agentColor }} />
            <span className="text-[11px] font-medium" style={{ color: agentColor }}>{intv.assigned_agent_name.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── MODAL WRAPPER with premium animations ──
const ModalWrapper = ({ show, onClose, children, size = 'md' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsAnimating(true);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!isAnimating && !show) return null;

  const sizeClass = size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-3xl' : 'max-w-lg';

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className={`${sizeClass} w-full max-h-[90vh] overflow-y-auto rounded-3xl relative transition-all duration-500 ease-out
          ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}
        style={{
          background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-app) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ── STATUS BADGE ──
const StatusBadge = ({ status, size = 'sm' }) => {
  const sc = STATUS[status] || STATUS.planifiée;
  const sizeClasses = size === 'lg'
    ? 'text-xs px-3 py-1.5 gap-2'
    : 'text-[10px] px-2 py-0.5 gap-1';

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-bold transition-all duration-200 hover:scale-105`}
      style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} style={{ background: sc.color }} />
      {sc.label}
    </span>
  );
};

// ── ZONE BADGE ──
const ZoneBadge = ({ address, size = 'sm' }) => {
  const zone = getZoneFromAddress(address);
  const color = ZONE_COLORS[zone] || '#64748b';
  const icon = ZONE_ICONS[zone] || '📍';

  return (
    <span className={`inline-flex items-center gap-1 ${size === 'lg' ? 'text-xs px-3 py-1' : 'text-[10px] px-2 py-0.5'} rounded-full font-bold transition-all duration-200 hover:scale-105`}
      style={{ background: color + '15', color, border: `1px solid ${color}25` }}>
      {icon} {zone}
    </span>
  );
};

const PlanningCalendar = () => {
  const [view, setView] = useState('semaine');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  });
  const [currentWeek, setCurrentWeek] = useState(() => new Date());
  // ── Vague 3b : React Query ────────────────────────────────
  // fetchCalendar + fetchMembers remplacés par deux hooks qui gèrent
  // cache, refetch et invalidation croisée avec le Dashboard + autres pages.
  const { data: calendarData, isLoading: calendarLoading, refetch: refetchCalendar } = useCalendar(currentMonth);
  const { data: fetchedMembers, isLoading: membersLoading, refetch: refetchMembers } = useAllTeamMembers();
  const createIntervention = useCreateIntervention();
  const updateIntervention = useUpdateIntervention();

  const interventions = useMemo(() => calendarData?.interventions || [], [calendarData]);
  const teams = useMemo(() => calendarData?.teams || [], [calendarData]);
  const members = useMemo(() => {
    if (Array.isArray(fetchedMembers) && fetchedMembers.length > 0) return fetchedMembers;
    // Fallback : dériver depuis les teams embarquées dans le calendrier
    return (calendarData?.teams || []).flatMap(t => (t.members || []).map(mb => ({ ...mb, team_name: t.name })));
  }, [fetchedMembers, calendarData]);

  const loading = calendarLoading || membersLoading;
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterMember, setFilterMember] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
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
  const [quickCreateDate, setQuickCreateDate] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Auto-fetch lead quand ID renseigné (reste en axios direct : utilisé par
  // l'autocomplete du formulaire, pas nécessaire de mettre en cache)
  const fetchLead = useCallback(async (leadId) => {
    if (!leadId || leadId.length < 5) return;
    setLoadingLead(true);
    try {
      const { data: lead } = await api.get(`/leads/${leadId}`);
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
    } catch {}
    setLoadingLead(false);
  }, []);

  // Recherche lead par nom/email (autocomplete temps réel)
  const searchLeads = useCallback(async (query) => {
    if (!query || query.length < 2) { setLeadSuggestions([]); return; }
    try {
      const { data } = await api.get(`/leads?search=${encodeURIComponent(query)}&limit=5`);
      const leads = data.leads || data || [];
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

  // fetchData n'existe plus : le chargement est géré par useCalendar + useAllTeamMembers
  // au-dessus. On garde fetchData comme alias pour ne pas casser les handlers existants
  // qui l'appellent après création/update/delete d'intervention.
  const fetchData = useCallback(async () => {
    await Promise.all([refetchCalendar(), refetchMembers()]);
  }, [refetchCalendar, refetchMembers]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 600);
  }, [fetchData]);

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

  const conflicts = useMemo(() => detectConflicts(interventions), [interventions]);

  const filtered = useMemo(() => interventions.filter(i => {
    if (filterMember && i.assigned_agent_id !== filterMember) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterZone && getZoneFromAddress(i.address) !== filterZone) return false;
    if (search && !((i.title||'')+(i.lead_name||'')+(i.address||'')).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [interventions, filterMember, filterStatus, filterZone, search]);

  const stats = useMemo(() => ({
    total: filtered.length,
    planifiée: filtered.filter(i=>i.status==='planifiée').length,
    en_cours: filtered.filter(i=>i.status==='en_cours').length,
    terminée: filtered.filter(i=>i.status==='terminée').length,
    conflits: Math.floor(conflicts.size/2),
  }), [filtered, conflicts]);

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

  const getDayLoad = (date) => {
    const n = getIntvForDay(date).length;
    if (n === 0) return 0;
    if (n === 1) return 1;
    if (n <= 3) return 2;
    return 3;
  };

  const handleCheckInOut = async (id, action) => {
    try {
      // Endpoint backend réel : POST /api/interventions/{id}/check-in-out
      // L'ancien code appelait /{action} qui n'existe pas côté backend.
      // On conserve la sémantique d'origine en envoyant le type dans le body.
      await api.post(`/interventions/${id}/check-in-out`, { type: action });
      toast.success(action==='check_in'?'⚡ Intervention démarrée':'✅ Intervention terminée');
      await fetchData();
      setSelected(null);
    } catch { toast.error('Erreur'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateIntervention.mutateAsync({ interventionId: id, payload: { status } });
      toast.success('Statut mis à jour');
      setSelected(null);
    } catch { /* erreur déjà affichée par le hook */ }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (agentAvail && !agentAvail.available) {
      toast.error('Cet intervenant n\'est pas disponible sur ce créneau !');
      return;
    }
    try {
      if (editMode && selected) {
        await updateIntervention.mutateAsync({
          interventionId: selected.intervention_id || selected.id,
          payload: form,
        });
        toast.success('✅ Intervention modifiée');
      } else {
        // Création principale via React Query (invalide dashboard + planning automatiquement)
        await createIntervention.mutateAsync(form);
        // Récurrence : on crée les occurrences suivantes via le même hook
        if (form.recurrence !== 'none' && form.recurrence_end) {
          const intervals = { hebdo:7, 'bi-hebdo':14, mensuel:30 };
          const step = intervals[form.recurrence];
          let d = new Date(form.scheduled_date);
          const end = new Date(form.recurrence_end);
          while (true) {
            d.setDate(d.getDate()+step);
            if (d > end) break;
            const newForm = {...form, scheduled_date: d.toISOString().slice(0,10)};
            await createIntervention.mutateAsync(newForm);
          }
          toast.success(`✅ Récurrence ${form.recurrence} créée`);
        } else {
          toast.success('✅ Intervention planifiée');
        }
        // Rappel client : endpoint best-effort, ne bloque pas la création principale
        if (form.client_email && form.scheduled_date) {
          try {
            await api.post('/interventions/schedule-reminder', {
              email: form.client_email, date: form.scheduled_date,
              time: form.scheduled_time, service: form.service_type||form.title,
              address: form.address,
            });
          } catch {}
        }
      }
      setShowForm(false); setEditMode(false);
      setForm({lead_id:'',title:'',description:'',address:'',scheduled_date:'',scheduled_time:'09:00',duration_hours:2,team_id:'',service_type:'',client_phone:'',client_email:'',assigned_agent_id:'',assigned_agent_name:'',recurrence:'none',recurrence_end:''});
      // Plus besoin de fetchData() : les mutations invalident automatiquement le cache
    } catch(err) { toast.error(err.response?.data?.detail||err.message||'Erreur'); }
  };

  const openEditForm = (intv) => {
    setForm({
      lead_id: intv.lead_id || '',
      title: intv.title || '',
      description: intv.description || '',
      address: intv.address || '',
      scheduled_date: (intv.scheduled_date || '').slice(0, 10),
      scheduled_time: intv.scheduled_time || '09:00',
      duration_hours: intv.duration_hours || 2,
      team_id: intv.team_id || '',
      service_type: intv.service_type || '',
      client_phone: intv.client_phone || intv.lead_phone || '',
      client_email: intv.client_email || intv.lead_email || '',
      assigned_agent_id: intv.assigned_agent_id || '',
      assigned_agent_name: intv.assigned_agent_name || '',
      recurrence: 'none', recurrence_end: '',
    });
    setEditMode(true);
    setSelected(null);
    setShowForm(true);
  };

  // Drag & drop
  const handleDragStart = (e, intv) => {
    e.dataTransfer.setData('intervention_id', intv.intervention_id||intv.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDrop = async (e, newDate) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('intervention_id');
    const ds = typeof newDate==='number'
      ? `${year}-${String(month).padStart(2,'0')}-${String(newDate).padStart(2,'0')}`
      : newDate.toISOString().slice(0,10);
    try {
      await updateIntervention.mutateAsync({ interventionId: id, payload: { scheduled_date: ds } });
      toast.success(`📅 Déplacé au ${ds}`);
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
    return Object.entries(groups).sort(([,a],[,b])=>b.length-a.length);
  };

  // Statistiques par intervenant
  const memberStats = useMemo(() => members.map(m => ({
    ...m,
    missions: interventions.filter(i=>i.assigned_agent_id===m.member_id).length,
    today: interventions.filter(i=>i.assigned_agent_id===m.member_id && (i.scheduled_date||'').startsWith(today)).length,
    conflits: interventions.filter(i=>i.assigned_agent_id===m.member_id && conflicts.has(i.intervention_id||i.id)).length,
  })), [members, interventions, conflicts, today]);

  // Active filters count
  const activeFilters = [filterMember, filterStatus, filterZone, search].filter(Boolean).length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">

      <PageHeader title="Planning" subtitle="Calendrier des interventions" />

      {/* ── HEADER ACTIONS ── */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 -mt-4"
        style={{ animation: 'fadeIn 0.5s ease forwards' }}>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportWeekPDF}
            className="group/btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] hover:border-white/15 text-xs font-bold transition-all duration-300">
            <Download className="w-3.5 h-3.5 group-hover/btn:translate-y-[1px] transition-transform duration-200"/> Export
          </button>
          <button onClick={handleRefresh}
            className="group/btn p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 border border-white/[0.06] hover:border-white/15 transition-all duration-300">
            <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${refreshing ? 'animate-spin' : 'group-hover/btn:rotate-90'}`}/>
          </button>

          {/* View switcher */}
          <div className="flex gap-1 bg-white/[0.04] rounded-2xl border border-white/[0.06] p-1">
            {[
              { v: 'timeline', i: Clock, label: 'Timeline' },
              { v: 'semaine', i: Calendar, label: 'Semaine' },
              { v: 'mois', i: LayoutGrid, label: 'Mois' },
              { v: 'liste', i: List, label: 'Liste' },
              { v: 'zones', i: Navigation, label: 'Zones' }
            ].map(({ v, i: Icon, label }) => (
              <button key={v} onClick={() => setView(v)}
                className={`relative p-2.5 rounded-xl transition-all duration-300 group/view ${
                  view === v ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                title={label}>
                {view === v && (
                  <div className="absolute inset-0 rounded-xl transition-all duration-300"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }} />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
              </button>
            ))}
          </div>

          <button onClick={() => { setEditMode(false); setShowForm(true); }}
            className="group/create flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
            }}>
            <Plus className="w-4 h-4 group-hover/create:rotate-90 transition-transform duration-300" /> Planifier
          </button>
        </div>
      </div>

      {/* ── STATS RAPIDES ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { k: 'planifiée', label: 'Planifiées', color: '#818cf8', icon: '📋' },
          { k: 'en_cours', label: 'En cours', color: '#fbbf24', icon: '⚡' },
          { k: 'terminée', label: 'Terminées', color: '#34d399', icon: '✅' },
          { k: 'conflits', label: 'Conflits', color: '#fb7185', icon: '⚠️' },
        ].map((s, idx) => (
          <button key={s.k}
            onClick={() => setFilterStatus(filterStatus === s.k && s.k !== 'conflits' ? '' : s.k !== 'conflits' ? s.k : '')}
            className={`group/stat relative flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 overflow-hidden
              ${filterStatus === s.k ? 'scale-[1.02] ring-1' : 'hover:scale-[1.02]'}`}
            style={{
              background: `linear-gradient(135deg, ${s.color}12, transparent)`,
              borderColor: filterStatus === s.k ? s.color + '50' : s.color + '20',
              ringColor: s.color + '40',
              animationDelay: `${idx * 100}ms`,
              animation: 'slideUpFade 0.4s ease forwards',
              opacity: 0,
            }}>
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover/stat:opacity-100 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle at 30% 50%, ${s.color}10, transparent 70%)` }} />

            <span className="text-xl relative z-10 group-hover/stat:scale-110 transition-transform duration-300">{s.icon}</span>
            <div className="relative z-10">
              <AnimatedNumber value={stats[s.k] || 0}
                className="text-xl font-black block tabular-nums"
                style={{ color: s.color, fontFamily: 'Manrope,Inter,sans-serif' }} />
              <p className="text-[10px] font-semibold tracking-wide" style={{ color: s.color + 'aa' }}>{s.label}</p>
            </div>
          </button>
        ))}
        {/* Intervenants */}
        <div className="group/stat relative flex items-center gap-3 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all duration-300 hover:scale-[1.02]"
          style={{ animation: 'slideUpFade 0.4s ease forwards', animationDelay: '400ms', opacity: 0 }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center relative"
            style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(167,139,250,0.05))', border: '1px solid rgba(167,139,250,0.2)' }}>
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <AnimatedNumber value={members.length} className="text-xl font-black text-slate-200 block" />
            <p className="text-[10px] text-slate-500 font-semibold tracking-wide">Intervenants</p>
          </div>
          {/* Mini agent dots */}
          <div className="absolute bottom-2 right-3 flex -space-x-1">
            {members.slice(0, 4).map((m, i) => (
              <div key={i} className="w-3 h-3 rounded-full ring-1 ring-black/30"
                style={{ background: getAgentColor(m.member_id, members) }} />
            ))}
            {members.length > 4 && (
              <div className="w-3 h-3 rounded-full bg-slate-700 ring-1 ring-black/30 flex items-center justify-center">
                <span className="text-[6px] text-slate-400">+{members.length - 4}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FILTRES ── */}
      <div className="flex flex-col sm:flex-row gap-3" style={{ animation: 'slideUpFade 0.4s ease forwards', animationDelay: '200ms', opacity: 0 }}>
        <div className="relative flex-1 group/search">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/search:text-violet-400 transition-colors duration-200"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher intervention, client, adresse..."
            className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30 hover:bg-white/[0.06] transition-all duration-300"/>
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 text-slate-500 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select value={filterMember} onChange={e=>setFilterMember(e.target.value)}
          className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-slate-400 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer">
          <option value="" className="bg-slate-900">👷 Tous les agents</option>
          {memberStats.map(m=>(
            <option key={m.member_id} value={m.member_id} className="bg-slate-900">
              {m.name} ({m.today} auj. · {m.missions} total)
            </option>
          ))}
        </select>
        <select value={filterZone} onChange={e=>setFilterZone(e.target.value)}
          className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-slate-400 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer">
          <option value="" className="bg-slate-900">📍 Toutes les zones</option>
          {ZONES_PARIS.map(z=><option key={z} value={z} className="bg-slate-900">{ZONE_ICONS[z]||'📍'} {z}</option>)}
        </select>

        {/* Clear filters */}
        {activeFilters > 0 && (
          <button onClick={() => { setFilterMember(''); setFilterStatus(''); setFilterZone(''); setSearch(''); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-all duration-300">
            <X className="w-3 h-3" /> {activeFilters} filtre{activeFilters > 1 ? 's' : ''}
          </button>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-2 bg-white/[0.04] rounded-2xl border border-white/[0.08] px-4 py-2">
          <button onClick={()=>{
            if(['semaine','timeline'].includes(view)){const d=new Date(currentWeek);d.setDate(d.getDate()-7);setCurrentWeek(d);}
            else{const[y,m]=currentMonth.split('-').map(Number);const d=new Date(y,m-2,1);setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
          }} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/10 rounded-xl transition-all duration-200">
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <span className="text-xs font-bold text-slate-300 min-w-[140px] text-center tracking-wide">
            {['semaine','timeline'].includes(view)
              ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS_FR[weekDays[6].getMonth()]}`
              : `${MONTHS_FR[month-1]} ${year}`}
          </span>
          <button onClick={()=>{
            if(['semaine','timeline'].includes(view)){const d=new Date(currentWeek);d.setDate(d.getDate()+7);setCurrentWeek(d);}
            else{const[y,m]=currentMonth.split('-').map(Number);const d=new Date(y,m,1);setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
          }} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/10 rounded-xl transition-all duration-200">
            <ChevronRight className="w-4 h-4"/>
          </button>
          <div className="w-px h-5 bg-white/[0.08] mx-1" />
          <button onClick={()=>{const n=new Date();setCurrentWeek(n);setCurrentMonth(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`);}}
            className="text-xs text-violet-400 hover:text-violet-300 font-bold px-2 py-1 rounded-lg hover:bg-violet-500/10 transition-all duration-200">
            Aujourd'hui
          </button>
        </div>
      </div>

      {loading ? <PremiumSkeleton /> : (
        <>
        {/* ── VUE TIMELINE ── */}
        {view==='timeline' && (
          <div className="section-card overflow-x-auto" style={{ animation: 'fadeIn 0.4s ease forwards' }}>
            <div className="min-w-[800px]">
              {/* Header jours */}
              <div className="grid gap-px sticky top-0 z-10" style={{gridTemplateColumns:`64px repeat(7, 1fr)`, background:'var(--bg-card)'}}>
                <div className="p-3 border-b border-white/[0.06]"/>
                {weekDays.map((day,i)=>{
                  const isToday = day.toISOString().slice(0,10)===today;
                  const dayIntvs = getIntvForDay(day);
                  return (
                    <div key={i} className={`p-3 text-center border-b border-white/[0.06] transition-all duration-300 ${isToday?'bg-violet-500/[0.08]':''}`}>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{DAYS_FR[i]}</p>
                      <p className={`text-xl font-black mt-0.5 ${isToday?'text-violet-400':'text-slate-300'}`}>{day.getDate()}</p>
                      {dayIntvs.length > 0 && (
                        <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
                          {dayIntvs.length}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Lignes heures */}
              {HOURS.map(h=>(
                <div key={h} className="grid gap-px border-b border-white/[0.04] group/row hover:bg-white/[0.01] transition-colors duration-200"
                  style={{gridTemplateColumns:`64px repeat(7, 1fr)`}}>
                  <div className="p-3 text-right border-r border-white/[0.06]">
                    <span className="text-[11px] text-slate-600 font-mono font-bold">{String(h).padStart(2,'0')}:00</span>
                  </div>
                  {weekDays.map((day,di)=>{
                    const ds = day.toISOString().slice(0,10);
                    const intvs = filtered.filter(i=>{
                      if (!(i.scheduled_date||'').startsWith(ds)) return false;
                      const ih = parseInt((i.scheduled_time||'09:00').split(':')[0]);
                      return ih===h;
                    });
                    const isToday = ds===today;
                    const isDragTarget = dragOver===`${ds}-${h}`;
                    return (
                      <div key={di}
                        className={`min-h-[56px] p-1.5 border-l border-white/[0.04] relative transition-all duration-300
                          ${isToday?'bg-violet-500/[0.03]':''}
                          ${isDragTarget?'bg-emerald-500/[0.08] border-emerald-500/30 scale-[1.01]':''}`}
                        onDragOver={e=>{e.preventDefault();setDragOver(`${ds}-${h}`);}}
                        onDragLeave={()=>setDragOver(null)}
                        onDrop={e=>handleDrop(e,day)}>
                        {intvs.map(i=>{
                          const sc=STATUS[i.status]||STATUS.planifiée;
                          const hasConflict=conflicts.has(i.intervention_id||i.id);
                          const agentColor = getAgentColor(i.assigned_agent_id, members);
                          return (
                            <InterventionCard
                              key={i.intervention_id||i.id}
                              intv={i} sc={sc} hasConflict={hasConflict}
                              agentColor={agentColor} members={members}
                              onClick={setSelected} onDragStart={handleDragStart}
                              compact
                            />
                          );
                        })}
                        {/* Drop zone indicator */}
                        {isDragTarget && intvs.length === 0 && (
                          <div className="absolute inset-2 rounded-xl border-2 border-dashed border-emerald-500/30 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-emerald-500/40" />
                          </div>
                        )}
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
          <div className="section-card p-4 md:p-5 overflow-x-auto" style={{ animation: 'fadeIn 0.4s ease forwards' }}>
            <div className="grid grid-cols-7 gap-3 min-w-[700px]">
              {weekDays.map((date,idx)=>{
                const intvs = getIntvForDay(date);
                const ds = date.toISOString().slice(0,10);
                const isToday = ds===today;
                const load = getDayLoad(date);
                const loadColors = ['transparent','rgba(129,140,248,0.15)','rgba(251,191,36,0.2)','rgba(251,113,133,0.25)'];
                const isDragTarget = dragOver===ds;
                return (
                  <div key={idx}
                    className={`rounded-2xl p-3 border transition-all duration-500 min-h-[140px] relative group/day
                      ${isToday
                        ? 'border-violet-500/40 shadow-lg'
                        : 'border-white/[0.06] hover:border-white/[0.12]'
                      }
                      ${isDragTarget ? 'bg-emerald-500/[0.06] border-emerald-500/30 scale-[1.02]' : ''}`}
                    style={{
                      background: isToday
                        ? 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.02) 100%)'
                        : isDragTarget ? undefined : 'rgba(255,255,255,0.015)',
                      boxShadow: isToday ? '0 8px 32px rgba(139,92,246,0.1), inset 0 1px 0 rgba(139,92,246,0.15)' : 'none',
                      animation: `slideUpFade 0.4s ease forwards`,
                      animationDelay: `${idx * 60}ms`,
                      opacity: 0,
                    }}
                    onDragOver={e=>{e.preventDefault();setDragOver(ds);}}
                    onDragLeave={()=>setDragOver(null)}
                    onDrop={e=>handleDrop(e,date)}>

                    {/* Load indicator bar */}
                    {load > 0 && (
                      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl transition-all duration-500"
                        style={{ background: `linear-gradient(90deg, ${loadColors[load]}, transparent)` }} />
                    )}

                    <div className="text-center mb-3">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{DAYS_FR[idx]}</p>
                      <div className={`text-xl font-black mx-auto w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${
                        isToday
                          ? 'text-white shadow-lg'
                          : 'text-slate-300 hover:bg-white/[0.06]'
                      }`}
                        style={isToday ? {
                          background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                          boxShadow: '0 4px 16px rgba(124,58,237,0.4)'
                        } : {}}>
                        {date.getDate()}
                      </div>
                      {intvs.length > 0 && (
                        <div className="mt-1.5 flex items-center justify-center gap-0.5">
                          {intvs.slice(0, 3).map((i, ci) => (
                            <div key={ci} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                              style={{ background: (STATUS[i.status] || STATUS.planifiée).color }} />
                          ))}
                          {intvs.length > 3 && <span className="text-[9px] text-slate-500 ml-0.5">+{intvs.length - 3}</span>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {intvs.map(i => {
                        const sc = STATUS[i.status] || STATUS.planifiée;
                        const hasConflict = conflicts.has(i.intervention_id || i.id);
                        const agentColor = getAgentColor(i.assigned_agent_id, members);
                        return (
                          <InterventionCard
                            key={i.intervention_id || i.id}
                            intv={i} sc={sc} hasConflict={hasConflict}
                            agentColor={agentColor} members={members}
                            onClick={setSelected} onDragStart={handleDragStart}
                            compact
                          />
                        );
                      })}
                    </div>

                    {/* Quick create button */}
                    <button
                      onClick={() => { setQuickCreateDate(ds); setForm(p=>({...p,scheduled_date:ds})); setEditMode(false); setShowForm(true); }}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-xl border flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-all duration-300 hover:scale-110"
                      style={{
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.1))',
                        borderColor: 'rgba(124,58,237,0.3)',
                        color: '#a78bfa'
                      }}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Drop indicator */}
                    {isDragTarget && intvs.length === 0 && (
                      <div className="absolute inset-3 top-16 rounded-xl border-2 border-dashed border-emerald-500/30 flex items-center justify-center transition-all duration-300">
                        <span className="text-xs text-emerald-500/50 font-bold">Déposer ici</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VUE MOIS ── */}
        {view==='mois' && (
          <div className="section-card p-4 md:p-5" style={{ animation: 'fadeIn 0.4s ease forwards' }}>
            <div className="grid grid-cols-7 gap-1 mb-3">
              {DAYS_FR.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-2.5 tracking-widest uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((d,idx)=>{
                const intvs = d ? getIntvForDay(d) : [];
                const ds = d ? `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '';
                const isToday = ds===today;
                const hasConflict = intvs.some(i=>conflicts.has(i.intervention_id||i.id));
                const isDragTarget = dragOver===ds;
                return (
                  <div key={idx}
                    className={`min-h-[90px] rounded-2xl p-2 border transition-all duration-300 relative group/cell
                      ${!d ? 'opacity-0 pointer-events-none' : ''}
                      ${isToday ? 'border-violet-500/40' : 'border-white/[0.05] hover:border-white/[0.12]'}
                      ${isDragTarget ? 'bg-emerald-500/[0.06] border-emerald-500/30' : ''}`}
                    style={d ? {
                      background: isToday
                        ? 'linear-gradient(180deg, rgba(139,92,246,0.06), transparent)'
                        : 'rgba(255,255,255,0.015)',
                      animation: `fadeIn 0.3s ease forwards`,
                      animationDelay: `${idx * 15}ms`,
                      opacity: 0,
                    } : {}}
                    onDragOver={e=>{e.preventDefault();if(d)setDragOver(ds);}}
                    onDragLeave={()=>setDragOver(null)}
                    onDrop={e=>{if(d)handleDrop(e,d);}}>
                    {d && (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-300 ${
                            isToday ? 'text-white' : 'text-slate-400 group-hover/cell:bg-white/[0.06]'
                          }`}
                            style={isToday ? {
                              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                              boxShadow: '0 2px 8px rgba(124,58,237,0.4)'
                            } : {}}>
                            {d}
                          </span>
                          <div className="flex items-center gap-1">
                            {hasConflict && <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse"/>}
                            {intvs.length > 0 && (
                              <span className="text-[9px] font-bold text-slate-500">{intvs.length}</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {intvs.slice(0,2).map(i=>{
                            const sc=STATUS[i.status]||STATUS.planifiée;
                            return (
                              <div key={i.intervention_id||i.id}
                                draggable onDragStart={e=>handleDragStart(e,i)}
                                onClick={()=>setSelected(i)}
                                className="group/item text-[9px] px-2 py-1 rounded-lg cursor-pointer truncate font-semibold border transition-all duration-200 hover:scale-[1.03]"
                                style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                                {getSvcIcon(i.service_type)} {i.title||i.service_type}
                              </div>
                            );
                          })}
                          {intvs.length > 2 && (
                            <button onClick={() => { setView('semaine'); /* could navigate to that day */ }}
                              className="text-[9px] text-violet-400 font-bold pl-1 hover:text-violet-300 transition-colors">
                              +{intvs.length-2} de plus
                            </button>
                          )}
                        </div>
                        {/* Quick add on hover */}
                        <button
                          onClick={() => { setForm(p=>({...p,scheduled_date:ds})); setEditMode(false); setShowForm(true); }}
                          className="absolute bottom-1 right-1 w-5 h-5 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 border border-violet-500/30 text-violet-400 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all duration-300">
                          <Plus className="w-2.5 h-2.5" />
                        </button>
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
          <div className="space-y-4" style={{ animation: 'fadeIn 0.4s ease forwards' }}>
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(96,165,250,0.05))', border: '1px solid rgba(96,165,250,0.2)' }}>
                <Navigation className="w-4 h-4 text-blue-400"/>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Interventions par zone</p>
                <p className="text-[11px] text-slate-500">{groupByZone(filtered).length} zones actives · Optimisation trajet automatique</p>
              </div>
            </div>

            {groupByZone(filtered).map(([zone, zoneIntvs], zoneIdx) => {
              const zoneColor = ZONE_COLORS[zone] || '#64748b';
              const zoneIcon = ZONE_ICONS[zone] || '📍';
              return (
                <div key={zone} className="section-card overflow-hidden transition-all duration-300 hover:border-white/[0.12]"
                  style={{ animation: `slideUpFade 0.4s ease forwards`, animationDelay: `${zoneIdx * 80}ms`, opacity: 0 }}>
                  {/* Zone header */}
                  <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-4"
                    style={{ background: `linear-gradient(135deg, ${zoneColor}08, transparent)` }}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: `${zoneColor}15`, border: `1px solid ${zoneColor}25` }}>
                      {zoneIcon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-200">{zone}</h3>
                      <p className="text-[11px] text-slate-500">{zoneIntvs.length} intervention{zoneIntvs.length > 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> Trajet optimisé
                    </span>
                  </div>
                  {/* Zone interventions */}
                  <div className="divide-y divide-white/[0.04]">
                    {[...zoneIntvs].sort((a,b)=>(a.scheduled_time||'').localeCompare(b.scheduled_time||'')).map((i, iIdx) => {
                      const sc = STATUS[i.status] || STATUS.planifiée;
                      const agentColor = getAgentColor(i.assigned_agent_id, members);
                      return (
                        <div key={i.intervention_id||i.id} onClick={()=>setSelected(i)}
                          className="group/zitem flex items-center gap-4 p-4 hover:bg-white/[0.03] cursor-pointer transition-all duration-300"
                          style={{ animation: `slideUpFade 0.3s ease forwards`, animationDelay: `${(zoneIdx * 80) + (iIdx * 40)}ms`, opacity: 0 }}>
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl relative"
                            style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                            {getSvcIcon(i.service_type)}
                            {i.assigned_agent_id && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900"
                                style={{ background: agentColor }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-200 truncate group-hover/zitem:text-white transition-colors">{i.title||i.service_type}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{i.scheduled_date} · {i.scheduled_time||'—'}
                              </span>
                              {i.lead_name && <span className="text-xs text-slate-500">· {i.lead_name}</span>}
                            </div>
                            {i.address && (
                              <p className="text-[11px] text-slate-600 truncate mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />{i.address}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {i.assigned_agent_name && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                                style={{ background: agentColor + '15', border: `1px solid ${agentColor}25` }}>
                                <div className="w-2 h-2 rounded-full" style={{ background: agentColor }} />
                                <span className="text-[10px] font-bold" style={{ color: agentColor }}>
                                  {i.assigned_agent_name.split(' ')[0]}
                                </span>
                              </div>
                            )}
                            <StatusBadge status={i.status} />
                          </div>
                          {/* Hover arrow */}
                          <ChevronRight className="w-4 h-4 text-slate-700 group-hover/zitem:text-slate-400 group-hover/zitem:translate-x-1 transition-all duration-200 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {groupByZone(filtered).length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 section-card">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center">
                  <Navigation className="w-8 h-8 text-slate-600"/>
                </div>
                <p className="text-slate-500 font-medium">Aucune intervention dans cette zone</p>
              </div>
            )}
          </div>
        )}

        {/* ── VUE LISTE ── */}
        {view==='liste' && (
          <div className="space-y-4" style={{ animation: 'fadeIn 0.4s ease forwards' }}>
            {/* Today's highlighted */}
            {(() => {
              const todayIntvs = filtered.filter(i=>(i.scheduled_date||'').startsWith(today));
              if (todayIntvs.length === 0) return null;
              return (
                <div className="section-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-white/[0.06]"
                    style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06), transparent)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-lg shadow-violet-500/30" />
                      <p className="text-sm font-bold text-violet-300">Aujourd'hui</p>
                      <span className="text-xs text-violet-400/60">·</span>
                      <span className="text-xs text-violet-400/80 font-medium">{todayIntvs.length} intervention{todayIntvs.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 md:p-5">
                    {todayIntvs.map((i, idx) => {
                      const sc = STATUS[i.status] || STATUS.planifiée;
                      const agentColor = getAgentColor(i.assigned_agent_id, members);
                      const hasConflict = conflicts.has(i.intervention_id || i.id);
                      return (
                        <div key={i.intervention_id||i.id}
                          style={{ animation: `slideUpFade 0.4s ease forwards`, animationDelay: `${idx * 80}ms`, opacity: 0 }}>
                          <InterventionCard
                            intv={i} sc={sc} hasConflict={hasConflict}
                            agentColor={agentColor} members={members}
                            onClick={setSelected} onDragStart={handleDragStart}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Full sorted list */}
            <div className="section-card divide-y divide-white/[0.04]">
              {filtered.length===0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center">
                    <CalendarDays className="w-8 h-8 text-slate-600"/>
                  </div>
                  <p className="text-slate-500 font-medium">Aucune intervention</p>
                  <button onClick={() => { setEditMode(false); setShowForm(true); }}
                    className="text-xs text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1.5 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Créer une intervention
                  </button>
                </div>
              )}
              {[...filtered].sort((a,b)=>(a.scheduled_date||'').localeCompare(b.scheduled_date||'')).map((i, idx) =>{
                const sc=STATUS[i.status]||STATUS.planifiée;
                const hasConflict=conflicts.has(i.intervention_id||i.id);
                const agentColor=getAgentColor(i.assigned_agent_id,members);
                const isInterventionToday = (i.scheduled_date||'').startsWith(today);
                return (
                  <div key={i.intervention_id||i.id}
                    className={`group/listitem flex items-center gap-4 p-4 md:p-5 cursor-pointer transition-all duration-300 hover:bg-white/[0.03]
                      ${isInterventionToday ? 'bg-violet-500/[0.03]' : ''}`}
                    style={{ animation: `fadeIn 0.3s ease forwards`, animationDelay: `${Math.min(idx * 30, 500)}ms`, opacity: 0 }}
                    onClick={()=>setSelected(i)}>
                    {/* Date column */}
                    <div className="flex-shrink-0 text-center w-14">
                      <p className={`text-2xl font-black tabular-nums ${isInterventionToday ? 'text-violet-400' : 'text-slate-200'}`}>
                        {(i.scheduled_date||'').slice(8,10)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {MONTHS_FR[parseInt((i.scheduled_date||'').slice(5,7))-1]?.slice(0,3)}
                      </p>
                    </div>

                    {/* Icon */}
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 relative transition-all duration-300 group-hover/listitem:scale-110"
                      style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                      {getSvcIcon(i.service_type)}
                      {i.assigned_agent_id && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 transition-all duration-200"
                          style={{ background: agentColor }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-200 truncate group-hover/listitem:text-white transition-colors">{i.title||i.service_type}</p>
                        {hasConflict && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 animate-pulse"/>}
                        <StatusBadge status={i.status} />
                        <ZoneBadge address={i.address} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {i.lead_name && <span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />{i.lead_name}</span>}
                        {i.scheduled_time && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3"/>{i.scheduled_time}{i.duration_hours?` (${i.duration_hours}h)`:''}
                          </span>
                        )}
                        {i.address && <span className="text-xs text-slate-600 truncate flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0"/>{i.address}</span>}
                        {i.assigned_agent_name && (
                          <span className="text-xs flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: agentColor }}/>
                            <span style={{ color: agentColor }}>{i.assigned_agent_name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex gap-2 opacity-0 group-hover/listitem:opacity-100 transition-all duration-300 flex-shrink-0">
                      {i.status==='planifiée' && (
                        <button onClick={e=>{e.stopPropagation();handleCheckInOut(i.intervention_id||i.id,'check_in');}}
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:scale-110 transition-all duration-200"
                          title="Démarrer">
                          <Play className="w-3.5 h-3.5"/>
                        </button>
                      )}
                      {i.status==='en_cours' && (
                        <button onClick={e=>{e.stopPropagation();handleCheckInOut(i.intervention_id||i.id,'check_out');}}
                          className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:scale-110 transition-all duration-200"
                          title="Terminer">
                          <CheckCircle className="w-3.5 h-3.5"/>
                        </button>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-700 group-hover/listitem:text-slate-400 group-hover/listitem:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </>
      )}

      {/* ── MODAL DÉTAIL (premium) ── */}
      <ModalWrapper show={!!selected} onClose={() => setSelected(null)} size="md">
        {selected && (() => {
          const sc = STATUS[selected.status] || STATUS.planifiée;
          const agentColor = getAgentColor(selected.assigned_agent_id, members);
          const hasConflict = conflicts.has(selected.intervention_id || selected.id);
          const zone = getZoneFromAddress(selected.address);
          return (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl relative transition-transform duration-300 hover:scale-110"
                    style={{ background: sc.bg, border: `1px solid ${sc.border}`, boxShadow: `0 8px 24px ${sc.color}15` }}>
                    {getSvcIcon(selected.service_type || selected.title)}
                    {selected.assigned_agent_id && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold"
                        style={{ background: agentColor, borderColor: 'var(--bg-card)', color: 'white' }}>
                        {(selected.assigned_agent_name || '?')[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-100 tracking-tight">{selected.title || selected.service_type}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <StatusBadge status={selected.status} size="lg" />
                      {hasConflict && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full text-rose-400 bg-rose-500/10 border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 animate-pulse" /> Conflit
                        </span>
                      )}
                      <ZoneBadge address={selected.address} size="lg" />
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                  className="p-2.5 text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] rounded-xl transition-all duration-200 hover:rotate-90">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              {/* Info cards */}
              <div className="space-y-2.5 mb-6">
                {[
                  { icon: Clock, color: '#a78bfa', label: `${selected.scheduled_date || '—'} à ${selected.scheduled_time || '—'}${selected.duration_hours ? ` · ${selected.duration_hours}h` : ''}` },
                  ...(selected.address ? [{ icon: MapPin, color: '#60a5fa', label: selected.address }] : []),
                  ...(selected.lead_name ? [{ icon: Users, color: '#34d399', label: `${selected.lead_name}${selected.lead_phone ? ' · ' + selected.lead_phone : ''}` }] : []),
                  ...(selected.assigned_agent_name ? [{ icon: User, color: agentColor, label: `Intervenant : ${selected.assigned_agent_name}` }] : []),
                ].map((item, i) => (
                  <div key={i}
                    className="group/info flex items-center gap-3.5 text-sm text-slate-400 p-3.5 rounded-2xl border transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1]"
                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)',
                      animation: `slideUpFade 0.3s ease forwards`, animationDelay: `${i * 60}ms`, opacity: 0 }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover/info:scale-110"
                      style={{ background: item.color + '15', border: `1px solid ${item.color}25` }}>
                      <item.icon className="w-4 h-4" style={{ color: item.color }}/>
                    </div>
                    <span className="flex-1">{item.label}</span>
                  </div>
                ))}
                {selected.description && (
                  <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-sm text-slate-400"
                    style={{ animation: 'slideUpFade 0.3s ease forwards', animationDelay: '240ms', opacity: 0 }}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</p>
                    {selected.description}
                  </div>
                )}
                {selected.check_in && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                    <Play className="w-3.5 h-3.5" /> Check-in : {new Date(selected.check_in.time).toLocaleString('fr-FR')}
                  </div>
                )}
                {selected.check_out && (
                  <div className="p-3.5 rounded-2xl bg-blue-500/[0.08] border border-blue-500/20 text-xs text-blue-400 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5" /> Check-out : {new Date(selected.check_out.time).toLocaleString('fr-FR')}
                  </div>
                )}
                {/* Google Maps link */}
                {selected.address && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(selected.address)}`} target="_blank" rel="noopener noreferrer"
                    className="group/maps flex items-center gap-2.5 p-3.5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/[0.1] transition-all duration-300">
                    <Navigation className="w-3.5 h-3.5 group-hover/maps:rotate-45 transition-transform duration-300" />
                    Ouvrir dans Google Maps
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50 group-hover/maps:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 flex-wrap pt-2 border-t border-white/[0.06]">
                {/* Edit button */}
                <button onClick={() => openEditForm(selected)}
                  className="group/action flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-slate-200 transition-all duration-300">
                  <Edit3 className="w-4 h-4 group-hover/action:rotate-12 transition-transform duration-200" /> Modifier
                </button>

                {selected.status === 'planifiée' && (
                  <button onClick={() => handleCheckInOut(selected.intervention_id || selected.id, 'check_in')}
                    className="group/action flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-[1.03]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))',
                      border: '1px solid rgba(52,211,153,0.25)', color: '#34d399'
                    }}>
                    <Play className="w-4 h-4 group-hover/action:translate-x-0.5 transition-transform" /> Démarrer
                  </button>
                )}

                {selected.status === 'en_cours' && (
                  <button onClick={() => handleCheckInOut(selected.intervention_id || selected.id, 'check_out')}
                    className="group/action flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-[1.03]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))',
                      border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa'
                    }}>
                    <CheckCircle className="w-4 h-4 group-hover/action:scale-110 transition-transform" /> Terminer
                  </button>
                )}

                {!['annulée','terminée'].includes(selected.status) && (
                  <button onClick={() => handleStatusChange(selected.intervention_id || selected.id, 'annulée')}
                    className="group/action flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-[1.03] ml-auto"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251,113,133,0.1), rgba(251,113,133,0.03))',
                      border: '1px solid rgba(251,113,133,0.2)', color: '#fb7185'
                    }}>
                    <XCircle className="w-4 h-4 group-hover/action:rotate-90 transition-transform duration-300" /> Annuler
                  </button>
                )}
              </div>
            </>
          );
        })()}
      </ModalWrapper>

      {/* ── MODAL CRÉATION/ÉDITION (premium) ── */}
      <ModalWrapper show={showForm} onClose={() => { setShowForm(false); setEditMode(false); }} size="lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: editMode
                  ? 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(96,165,250,0.1))'
                  : 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(124,58,237,0.1))',
                border: `1px solid ${editMode ? 'rgba(96,165,250,0.3)' : 'rgba(124,58,237,0.3)'}`
              }}>
              {editMode
                ? <Edit3 className="w-4.5 h-4.5 text-blue-400 relative z-10"/>
                : <Plus className="w-4.5 h-4.5 text-violet-400 relative z-10"/>}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100 tracking-tight">
                {editMode ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
              </h3>
              <p className="text-xs text-slate-500">
                {editMode ? 'Mettez à jour les détails' : 'Planifiez une nouvelle mission'}
              </p>
            </div>
          </div>
          <button onClick={() => { setShowForm(false); setEditMode(false); }}
            className="p-2.5 text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] rounded-xl transition-all duration-200 hover:rotate-90">
            <X className="w-4 h-4"/>
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Recherche Lead */}
          {!editMode && (
            <div className="p-5 rounded-2xl border transition-all duration-300 hover:border-violet-500/30"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-violet-400" />
                <p className="text-xs font-bold text-violet-300">Rechercher un client / lead</p>
              </div>
              <div className="relative">
                <input
                  value={leadSearch}
                  onChange={e => { setLeadSearch(e.target.value); searchLeads(e.target.value); }}
                  onKeyDown={e => { if (e.key === 'Enter' && form.lead_id) { e.preventDefault(); fetchLead(form.lead_id); }}}
                  placeholder="Nom du client, email ou ID lead..."
                  className={inputCls} />
                {loadingLead && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                )}
                {/* Suggestions dropdown */}
                {leadSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/[0.1] overflow-hidden z-20 shadow-2xl"
                    style={{ background: 'var(--bg-card)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
                    {leadSuggestions.map((lead, idx) => (
                      <button key={lead.lead_id} type="button" onClick={() => applyLead(lead)}
                        className="group/lead w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.05] transition-all duration-200 text-left border-b border-white/[0.05] last:border-0"
                        style={{ animation: `slideUpFade 0.2s ease forwards`, animationDelay: `${idx * 40}ms`, opacity: 0 }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.05))', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}>
                          {lead.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-200 truncate group-hover/lead:text-white transition-colors">{lead.name}</p>
                          <p className="text-xs text-slate-500 truncate">{lead.service_type} · {lead.address || lead.email || ''}</p>
                        </div>
                        <span className="text-xs text-violet-400 font-bold opacity-0 group-hover/lead:opacity-100 transition-opacity flex items-center gap-1">
                          Utiliser <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.lead_id && (
                <div className="mt-3 flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-400 font-mono flex-1">{form.lead_id}</span>
                  <button type="button" onClick={() => fetchLead(form.lead_id)}
                    className="text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors">Recharger</button>
                  <button type="button" onClick={() => setForm(p => ({...p, lead_id: ''}))}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editMode && (
              <Field label="ID Lead (optionnel)">
                <input value={form.lead_id}
                  onChange={e => { setForm(p => ({...p, lead_id: e.target.value})); if (e.target.value.startsWith('lead_') && e.target.value.length > 10) fetchLead(e.target.value); }}
                  placeholder="lead_xxxxx" className={inputCls} />
              </Field>
            )}
            <Field label="Type de service">
              <select value={form.service_type} onChange={e => setForm(p => ({...p, service_type: e.target.value}))} className={inputCls}>
                <option value="" className="bg-slate-900">Sélectionner...</option>
                {['Ménage', 'Bureaux', 'Canapé', 'Matelas', 'Tapis'].map(s => (
                  <option key={s} value={s} className="bg-slate-900">{getSvcIcon(s)} {s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Titre" required>
            <input required value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
              placeholder="Nettoyage complet appartement" className={inputCls} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Date" required>
              <input type="date" required value={form.scheduled_date}
                onChange={e => setForm(p => ({...p, scheduled_date: e.target.value}))} className={inputCls} />
            </Field>
            <Field label="Heure">
              <input type="time" value={form.scheduled_time}
                onChange={e => setForm(p => ({...p, scheduled_time: e.target.value}))} className={inputCls} />
            </Field>
            <Field label="Durée (h)">
              <input type="number" step="0.5" min="0.5" max="12" value={form.duration_hours}
                onChange={e => setForm(p => ({...p, duration_hours: parseFloat(e.target.value)}))} className={inputCls} />
            </Field>
          </div>

          <Field label="Adresse">
            <input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))}
              placeholder="10 Rue de la Paix, Paris 75001" className={inputCls} />
          </Field>
          {form.address && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300"
              style={{ background: (ZONE_COLORS[getZoneFromAddress(form.address)] || '#64748b') + '10', border: `1px solid ${(ZONE_COLORS[getZoneFromAddress(form.address)] || '#64748b')}20` }}>
              <span className="text-sm">{ZONE_ICONS[getZoneFromAddress(form.address)] || '📍'}</span>
              <span className="text-xs font-bold" style={{ color: ZONE_COLORS[getZoneFromAddress(form.address)] || '#64748b' }}>
                Zone détectée : {getZoneFromAddress(form.address)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tél. client">
              <input type="tel" value={form.client_phone} onChange={e => setForm(p => ({...p, client_phone: e.target.value}))}
                placeholder="06 12 34 56 78" className={inputCls} />
            </Field>
            <Field label="Email client (rappel veille)">
              <input type="email" value={form.client_email} onChange={e => setForm(p => ({...p, client_email: e.target.value}))}
                placeholder="client@email.com" className={inputCls} />
            </Field>
          </div>

          {/* Agent assignment */}
          <div className="p-5 rounded-2xl border transition-all duration-300"
            style={{
              background: agentAvail && !agentAvail.available
                ? 'linear-gradient(135deg, rgba(251,113,133,0.04), transparent)'
                : agentAvail?.available && form.assigned_agent_id
                  ? 'linear-gradient(135deg, rgba(52,211,153,0.04), transparent)'
                  : 'rgba(255,255,255,0.02)',
              borderColor: agentAvail && !agentAvail.available
                ? 'rgba(251,113,133,0.2)'
                : agentAvail?.available && form.assigned_agent_id
                  ? 'rgba(52,211,153,0.2)'
                  : 'rgba(255,255,255,0.06)'
            }}>
            <Field label="👷 Assigner à un intervenant">
              <select value={form.assigned_agent_id}
                onChange={e => {
                  const m = members.find(x => x.member_id === e.target.value);
                  setForm(p => ({...p, assigned_agent_id: e.target.value, assigned_agent_name: m?.name || ''}));
                }} className={inputCls}>
                <option value="" className="bg-slate-900">— Non assigné —</option>
                {memberStats.map(m => {
                  const avail = form.scheduled_date && form.scheduled_time
                    ? checkAgentAvailability(m.member_id, form.scheduled_date, form.scheduled_time, form.duration_hours, interventions)
                    : { available: true };
                  return (
                    <option key={m.member_id} value={m.member_id} className="bg-slate-900" disabled={!avail.available}>
                      {!avail.available ? '🚫 ' : '✅ '}{m.name} ({m.today} auj.)
                      {!avail.available ? ' — INDISPONIBLE' : ''}
                    </option>
                  );
                })}
              </select>
            </Field>
            {agentAvail && !agentAvail.available && (
              <div className="mt-3 p-3.5 rounded-2xl text-xs text-rose-400 flex items-center gap-2.5 animate-fade-in"
                style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.15)' }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
                <span>{agentAvail.reason || `Conflit avec "${agentAvail.conflict?.title || 'une autre mission'}" à ${agentAvail.conflict?.scheduled_time}`}</span>
              </div>
            )}
            {agentAvail?.available && form.assigned_agent_id && (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 animate-fade-in">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="font-medium">{form.assigned_agent_name} est disponible sur ce créneau</span>
              </div>
            )}
            {/* Agent color preview */}
            {form.assigned_agent_id && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full ring-2 ring-black/20"
                  style={{ background: getAgentColor(form.assigned_agent_id, members) }} />
                <span className="text-[11px] font-bold" style={{ color: getAgentColor(form.assigned_agent_id, members) }}>
                  {form.assigned_agent_name}
                </span>
              </div>
            )}
          </div>

          {/* Récurrence */}
          {!editMode && (
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-all duration-300 hover:border-white/[0.12]">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(167,139,250,0.05))', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <Repeat className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-xs font-bold text-slate-300">Récurrence automatique</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Fréquence">
                  <select value={form.recurrence} onChange={e => setForm(p => ({...p, recurrence: e.target.value}))} className={inputCls}>
                    <option value="none" className="bg-slate-900">Aucune</option>
                    <option value="hebdo" className="bg-slate-900">Hebdomadaire</option>
                    <option value="bi-hebdo" className="bg-slate-900">Bi-hebdomadaire</option>
                    <option value="mensuel" className="bg-slate-900">Mensuel</option>
                  </select>
                </Field>
                {form.recurrence !== 'none' && (
                  <Field label="Jusqu'au">
                    <input type="date" value={form.recurrence_end}
                      onChange={e => setForm(p => ({...p, recurrence_end: e.target.value}))} className={inputCls} />
                  </Field>
                )}
              </div>
            </div>
          )}

          <Field label="Description / Notes">
            <textarea value={form.description} rows={3}
              onChange={e => setForm(p => ({...p, description: e.target.value}))}
              placeholder="Accès, matériel nécessaire, instructions spéciales..."
              className={`${inputCls} resize-none`} />
          </Field>

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={() => { setShowForm(false); setEditMode(false); }}
              className="flex-1 px-4 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-slate-200 rounded-2xl text-sm font-bold transition-all duration-300">
              Annuler
            </button>
            <button type="submit" disabled={agentAvail && !agentAvail.available}
              className="flex-1 px-4 py-3.5 text-white rounded-2xl text-sm font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: editMode
                  ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                  : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                boxShadow: editMode
                  ? '0 4px 20px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
                  : '0 4px 20px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
              }}>
              {editMode ? '💾 Sauvegarder' : '✅ Planifier l\'intervention'}
            </button>
          </div>
        </form>
      </ModalWrapper>

      {/* ── CSS ANIMATIONS INLINE ── */}
      <style>{`
        .shimmer-premium {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer-sweep 2s ease-in-out infinite;
        }
        @media (max-width: 640px) {
          .grid-cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PlanningCalendar;