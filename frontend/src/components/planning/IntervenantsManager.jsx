import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  useAllTeamMembers,
  useTeams,
  useInterventionsList,
  useAddTeamMember,
  useCreateTeam,
} from '../../hooks/api';
// api non utilisé dans ce fichier : les endpoints restants (messages,
// congés, rating) appellent encore axios+API direct. Migration prévue
// en Vague 3c quand le module portail sera refait.
import {
  Users, Plus, Trash2, Phone, Mail, MapPin, Calendar,
  CheckCircle, Clock, X, RefreshCw, Search, Shield,
  ChevronRight, ExternalLink, Copy, Star, TrendingUp,
  FileText, Upload, Download, MessageSquare, Send,
  Award, AlertCircle, Eye, Edit2, BarChart2, Zap,
  Navigation, Briefcase, User, CheckSquare, XCircle,
  Filter, SlidersHorizontal, Activity, Target, Crown,
  Sparkles, ArrowUpRight, ChevronDown, UserCheck, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../shared';
import BACKEND_URL from '../../config.js';
const API = BACKEND_URL + '/api';

/* ═══════════════════════════════════════════════════════════════════
   CSS-IN-JS KEYFRAMES & STYLES (injected once)
   ═══════════════════════════════════════════════════════════════════ */
const STYLE_ID = 'intervenants-premium-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes iv-fadeInUp {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes iv-fadeInDown {
      from { opacity: 0; transform: translateY(-16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes iv-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes iv-slideInRight {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes iv-slideInLeft {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes iv-scaleIn {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes iv-modalIn {
      from { opacity: 0; transform: translateY(40px) scale(0.92); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes iv-backdropIn {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to { opacity: 1; backdrop-filter: blur(12px); }
    }
    @keyframes iv-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes iv-pulse-ring {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.15); opacity: 0; }
      100% { transform: scale(0.9); opacity: 0; }
    }
    @keyframes iv-countUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes iv-cascadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes iv-progressFill {
      from { width: 0%; }
    }
    @keyframes iv-float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
    }
    @keyframes iv-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.15); }
      50% { box-shadow: 0 0 40px rgba(16,185,129,0.3); }
    }
    @keyframes iv-tabSlide {
      from { opacity: 0; transform: translateX(12px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes iv-skeleton {
      0% { opacity: 0.4; }
      50% { opacity: 0.8; }
      100% { opacity: 0.4; }
    }
    @keyframes iv-badge-pop {
      0% { transform: scale(0); }
      60% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    @keyframes iv-stat-grow {
      from { transform: scaleY(0); }
      to { transform: scaleY(1); }
    }
    @keyframes iv-ring-fill {
      from { stroke-dashoffset: 251.2; }
    }
    .iv-card-enter { animation: iv-fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
    .iv-cascade { animation: iv-cascadeIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
    .iv-modal-enter { animation: iv-modalIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
    .iv-backdrop-enter { animation: iv-backdropIn 0.3s ease both; }
    .iv-tab-content { animation: iv-tabSlide 0.35s cubic-bezier(0.16,1,0.3,1) both; }
    .iv-skeleton-line {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
      background-size: 200% 100%;
      animation: iv-shimmer 1.8s ease-in-out infinite;
      border-radius: 12px;
    }
    .iv-skeleton-pulse { animation: iv-skeleton 1.5s ease-in-out infinite; }
    .iv-badge-pop { animation: iv-badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
    .iv-progress-fill { animation: iv-progressFill 1.2s cubic-bezier(0.16,1,0.3,1) both; }
    .iv-float { animation: iv-float 3s ease-in-out infinite; }
    .iv-glow { animation: iv-glow 2s ease-in-out infinite; }
    .iv-stat-count { animation: iv-countUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
    .iv-ring-anim { animation: iv-ring-fill 1.5s cubic-bezier(0.16,1,0.3,1) both; }
    .iv-scrollbar::-webkit-scrollbar { width: 4px; }
    .iv-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .iv-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    .iv-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    .iv-card-hover { transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
    .iv-card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.15); }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS & CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */
const inputCls = "w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all duration-300";
const Field = ({label, children}) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const SKILLS = ['Ménage','Bureaux','Canapé','Matelas','Tapis','Vitres','Fin de chantier'];
const ZONES  = ['Paris 1-4','Paris 5-8','Paris 9-12','Paris 13-16','Paris 17-20','Banlieue Nord','Banlieue Sud','Banlieue Est','Banlieue Ouest'];
const DOCS   = ['Contrat','Pièce d\'identité','Assurance RC Pro','RIB','Attestation URSSAF','Certificat médical'];
const TABS_MEMBER = ['Profil','Missions','Disponibilités','Documents','Performance','Messages'];
const TAB_ICONS = {
  Profil: User, Missions: Calendar, Disponibilités: Clock,
  Documents: FileText, Performance: BarChart2, Messages: MessageSquare,
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #7c3aed, #4f46e5)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #60a5fa, #3b82f6)',
  'linear-gradient(135deg, #f43f5e, #e11d48)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
];

const getAvatarGradient = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const SKILL_COLORS = {
  'Ménage': { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  'Bureaux': { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'Canapé': { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  'Matelas': { bg: 'rgba(52,211,153,0.12)', text: '#34d399', border: 'rgba(52,211,153,0.25)' },
  'Tapis': { bg: 'rgba(244,63,94,0.12)', text: '#fb7185', border: 'rgba(244,63,94,0.25)' },
  'Vitres': { bg: 'rgba(56,189,248,0.12)', text: '#38bdf8', border: 'rgba(56,189,248,0.25)' },
  'Fin de chantier': { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.25)' },
};

const getSkillColor = (skill) => SKILL_COLORS[skill] || { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.25)' };

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

// ── Premium Loading Skeleton ──
const PremiumSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
    {[...Array(6)].map((_, i) => (
      <div key={i}
        className="rounded-3xl border border-white/[0.06] p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', animationDelay: `${i * 0.1}s` }}>
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl iv-skeleton-line flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 iv-skeleton-line" />
            <div className="h-3 w-1/2 iv-skeleton-line" />
          </div>
          <div className="h-5 w-16 iv-skeleton-line" />
        </div>
        {/* Contact */}
        <div className="space-y-2">
          <div className="h-3 w-full iv-skeleton-line" />
          <div className="h-3 w-2/3 iv-skeleton-line" />
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, j) => (
            <div key={j} className="h-16 iv-skeleton-line" />
          ))}
        </div>
        {/* Skills */}
        <div className="flex gap-2">
          {[...Array(3)].map((_, j) => (
            <div key={j} className="h-6 w-16 iv-skeleton-line" />
          ))}
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          <div className="h-9 flex-1 iv-skeleton-line" />
          <div className="h-9 flex-1 iv-skeleton-line" />
        </div>
      </div>
    ))}
  </div>
);

// ── Animated Counter ──
const AnimatedCounter = ({ value, duration = 800, suffix = '', prefix = '' }) => {
  const [display, setDisplay] = useState(0);
  const numVal = typeof value === 'number' ? value : parseInt(value) || 0;

  useEffect(() => {
    let start = 0;
    const end = numVal;
    if (end === 0) { setDisplay(0); return; }
    const step = Math.max(1, Math.floor(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [numVal, duration]);

  return <span className="iv-stat-count inline-block">{prefix}{display}{suffix}</span>;
};

// ── Circular Progress Ring ──
const ProgressRing = ({ percent, size = 56, strokeWidth = 4, color = '#10b981', label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="var(--border-default, rgba(0,0,0,0.06))" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="iv-ring-anim" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-black" style={{ color }}>{percent}%</span>
        {label && <span className="text-[8px] text-slate-500 font-semibold">{label}</span>}
      </div>
    </div>
  );
};

// ── Premium Empty State ──
const EmptyState = ({ icon: Icon, title, description, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-5 iv-cascade">
    <div className="relative">
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center iv-float"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.15)' }}>
        <Icon className="w-10 h-10 text-emerald-400/60" />
      </div>
      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
        <Sparkles className="w-4 h-4 text-violet-400" />
      </div>
    </div>
    <div className="text-center space-y-2">
      <p className="text-lg font-black text-slate-300" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</p>
      <p className="text-sm text-slate-500 max-w-xs">{description}</p>
    </div>
    {action && (
      <button onClick={action}
        className="flex items-center gap-2 px-6 py-3 text-white rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg"
        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.25)' }}>
        <Plus className="w-4 h-4" /> {actionLabel || 'Ajouter'}
      </button>
    )}
  </div>
);

// ── Filter Chip ──
const FilterChip = ({ label, active, onClick, color = 'emerald' }) => {
  const colors = {
    emerald: { active: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-emerald-500/10', inactive: 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/10 hover:bg-white/[0.03]' },
    violet:  { active: 'border-violet-500/40 bg-violet-500/15 text-violet-300 shadow-violet-500/10',   inactive: 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/10 hover:bg-white/[0.03]' },
  };
  const c = colors[color] || colors.emerald;
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-300 ${active ? `${c.active} shadow-lg` : c.inactive}`}
      style={active ? { transform: 'scale(1.02)' } : {}}>
      {label}
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
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
  const [filterSkills, setFilterSkills] = useState([]);
  const [filterZones, setFilterZones] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'technicien',
    skills: [], zones: [], notes: '', max_missions_day: 4, rating: 5,
  });
  const [availability, setAvailability] = useState({});
  const [congés, setCongés] = useState([]);
  const [newCongé, setNewCongé] = useState({ start: '', end: '', reason: '' });
  const [modalClosing, setModalClosing] = useState(false);
  const messagesEndRef = useRef(null);

  /* ── Vague 3b : React Query ────────────────────────────────────
     fetchData axios → hooks centralisés avec cache + invalidation croisée.
     Fallback : si /team-members renvoie vide, on dérive les membres depuis
     /teams (ancien comportement préservé). */
  const { data: fetchedMembers, isLoading: membersLoading, refetch: refetchMembers } = useAllTeamMembers();
  const { data: fetchedTeams } = useTeams();
  const { data: fetchedInterventions, isLoading: intvLoading, refetch: refetchInterventions } =
    useInterventionsList({ limit: 200 });
  const addMemberMutation = useAddTeamMember();
  const createTeamMutation = useCreateTeam();

  // Dérivation des membres : prioritise /team-members, fallback sur teams[].members
  useEffect(() => {
    if (Array.isArray(fetchedMembers) && fetchedMembers.length > 0) {
      setMembers(fetchedMembers);
    } else if (Array.isArray(fetchedTeams) && fetchedTeams.length > 0) {
      const allM = fetchedTeams.flatMap(t => (t.members || []).map(mb => ({ ...mb, team_name: t.name })));
      setMembers(allM);
    } else {
      setMembers([]);
    }
  }, [fetchedMembers, fetchedTeams]);

  useEffect(() => {
    setInterventions(Array.isArray(fetchedInterventions) ? fetchedInterventions : []);
  }, [fetchedInterventions]);

  useEffect(() => {
    setLoading(membersLoading || intvLoading);
  }, [membersLoading, intvLoading]);

  // Alias pour ne pas casser les handlers existants qui appelaient fetchData()
  const fetchData = useCallback(async () => {
    await Promise.all([refetchMembers(), refetchInterventions()]);
  }, [refetchMembers, refetchInterventions]);

  const fetchMessages = useCallback(async (agentId) => {
    try {
      const res = await axios.get(`${API}/intervenant-messages/${agentId}`, { withCredentials: true });
      setMessages(res.data?.messages || []);
    } catch { setMessages([]); }
  }, []);

  useEffect(() => {
    if (selectedMember && memberTab === 'Messages') {
      fetchMessages(selectedMember.member_id);
      const t = setInterval(() => fetchMessages(selectedMember.member_id), 8000);
      return () => clearInterval(t);
    }
  }, [selectedMember, memberTab, fetchMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ── Actions ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Récupérer (ou créer) l'équipe principale
      let teamId;
      const currentTeams = fetchedTeams || [];
      if (currentTeams.length > 0) {
        teamId = currentTeams[0]?.team_id;
      }
      if (!teamId) {
        const created = await createTeamMutation.mutateAsync({ name: 'Équipe principale' });
        teamId = created?.team_id;
      }
      if (!teamId) { toast.error('Impossible de trouver ou créer une équipe'); return; }
      await addMemberMutation.mutateAsync({ teamId, member: form });
      toast.success(`✅ ${form.name} ajouté(e) ! Email de bienvenue envoyé.`);
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', role: 'technicien', skills: [], zones: [], notes: '', max_missions_day: 4, rating: 5 });
      // Plus besoin de fetchData() : addMemberMutation invalide ['planning'] automatiquement
    } catch (err) { toast.error(err.response?.data?.detail || err.message || 'Erreur'); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedMember) return;
    try {
      await axios.post(`${API}/intervenant-messages/${selectedMember.member_id}`, {
        content: newMsg, from_admin: true, sender: 'admin',
      }, { withCredentials: true });
      setNewMsg('');
      fetchMessages(selectedMember.member_id);
      toast.success('Message envoyé');
    } catch {
      try {
        await axios.post(`${API}/gmail/send`, {
          to: selectedMember.email,
          subject: 'Message de Global Clean Home',
          html: `<p>${newMsg}</p>`,
        }, { withCredentials: true });
        setNewMsg('');
        toast.success('Message envoyé par email');
      } catch { toast.error('Erreur envoi message'); }
    }
  };

  const addCongé = async () => {
    if (!newCongé.start || !newCongé.end) return;
    try {
      await axios.post(`${API}/team-members/${selectedMember.member_id}/conges`, newCongé, { withCredentials: true });
      setCongés(p => [...p, { ...newCongé, id: Date.now() }]);
      setNewCongé({ start: '', end: '', reason: '' });
      toast.success('Congé ajouté');
    } catch {
      setCongés(p => [...p, { ...newCongé, id: Date.now() }]);
      setNewCongé({ start: '', end: '', reason: '' });
      toast.success('Congé enregistré');
    }
  };

  const rateAgent = async (rating) => {
    try {
      await axios.patch(`${API}/team-members/${selectedMember.member_id}/rating`, { rating }, { withCredentials: true });
      setMembers(p => p.map(m => m.member_id === selectedMember.member_id ? { ...m, rating } : m));
      setSelectedMember(p => ({ ...p, rating }));
      toast.success(`Note mise à jour : ${rating}/5 ⭐`);
    } catch {
      setMembers(p => p.map(m => m.member_id === selectedMember.member_id ? { ...m, rating } : m));
      setSelectedMember(p => ({ ...p, rating }));
    }
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/intervenant`);
    toast.success('🔗 Lien portail copié !');
  };

  const closeModal = () => {
    setModalClosing(true);
    setTimeout(() => { setSelectedMember(null); setModalClosing(false); }, 250);
  };

  /* ── Stats ── */
  const getMemberStats = useCallback((m) => {
    const mIntvs = interventions.filter(i => i.assigned_agent_id === m.member_id || i.assigned_agent_name === m.name);
    const done = mIntvs.filter(i => i.status === 'terminée').length;
    const total = mIntvs.length;
    const thisMonth = mIntvs.filter(i => (i.scheduled_date || '').startsWith(new Date().toISOString().slice(0, 7))).length;
    const today = mIntvs.filter(i => (i.scheduled_date || '').startsWith(new Date().toISOString().slice(0, 10))).length;
    const onTime = done > 0 ? Math.round((done / Math.max(total, 1)) * 100) : 100;
    return { total, done, thisMonth, today, onTime };
  }, [interventions]);

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !search ||
        (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.role || '').toLowerCase().includes(search.toLowerCase());
      const matchSkills = filterSkills.length === 0 || filterSkills.some(s => (m.skills || []).includes(s));
      const matchZones = filterZones.length === 0 || filterZones.some(z => (m.zones || []).includes(z));
      return matchSearch && matchSkills && matchZones;
    });
  }, [members, search, filterSkills, filterZones]);

  const activeFiltersCount = filterSkills.length + filterZones.length;

  /* ── Global Stats ── */
  const globalStats = useMemo(() => {
    const enCours = interventions.filter(i => i.status === 'en_cours').length;
    const ceMois = interventions.filter(i => (i.scheduled_date || '').startsWith(new Date().toISOString().slice(0, 7))).length;
    const terminées = interventions.filter(i => i.status === 'terminée').length;
    const taux = Math.round((terminées / Math.max(interventions.length, 1)) * 100);
    return { enCours, ceMois, terminées, taux };
  }, [interventions]);

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto" style={{ animation: 'iv-fadeIn 0.5s ease' }}>

      <PageHeader title="Intervenants" subtitle="Gestion de vos équipes" />

      {/* ════════════════ HEADER ACTIONS ════════════════ */}
      <div className="flex justify-end -mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyPortalLink}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all duration-300 hover:border-emerald-500/40">
            <Copy className="w-3.5 h-3.5" /> Lien portail
          </button>
          <a href="/intervenant" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-white/[0.08] text-slate-400 hover:bg-white/[0.04] transition-all duration-300">
            <ExternalLink className="w-3.5 h-3.5" /> Portail
          </a>
          <button onClick={fetchData}
            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-300 hover:rotate-90"
            style={{ transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 24px rgba(16,185,129,0.3)' }}>
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* ════════════════ STATS GLOBALES ANIMÉES ════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total agents', value: members.length, color: '#10b981', icon: Users, gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))' },
          { label: 'En mission', value: globalStats.enCours, color: '#f59e0b', icon: Zap, gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06))' },
          { label: 'Missions ce mois', value: globalStats.ceMois, color: '#60a5fa', icon: Calendar, gradient: 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(59,130,246,0.06))' },
          { label: 'Taux completion', value: globalStats.taux, color: '#a78bfa', icon: TrendingUp, gradient: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(139,92,246,0.06))', suffix: '%' },
        ].map((s, idx) => (
          <div key={s.label}
            className="relative overflow-hidden flex items-center gap-3 p-4 md:p-5 rounded-2xl border border-white/[0.06] iv-card-enter group"
            style={{ background: s.gradient, animationDelay: `${idx * 0.08}s` }}>
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
              style={{ background: `${s.color}18`, border: `1px solid ${s.color}25` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <AnimatedCounter value={s.suffix ? s.value : s.value} suffix={s.suffix || ''} />
              </p>
              <p className="text-[10px] md:text-[11px] text-slate-500 font-semibold">{s.label}</p>
            </div>
            {/* Decorative glow */}
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-20 blur-2xl"
              style={{ background: s.color }} />
          </div>
        ))}
      </div>

      {/* ════════════════ SEARCH & FILTERS ════════════════ */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un intervenant par nom, email, rôle..."
              className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/20 transition-all duration-300" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold border transition-all duration-300 ${
              showFilters || activeFiltersCount > 0
                ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                : 'border-white/[0.08] text-slate-400 hover:bg-white/[0.04]'
            }`}>
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-black flex items-center justify-center iv-badge-pop">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel with slide transition */}
        <div className={`overflow-hidden transition-all duration-500 ${showFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}>
          <div className="p-5 rounded-2xl border border-white/[0.06] space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
            {/* Skills Filter */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-2.5 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-violet-400" /> Compétences
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(s => (
                  <FilterChip key={s} label={s}
                    active={filterSkills.includes(s)}
                    color="violet"
                    onClick={() => setFilterSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} />
                ))}
              </div>
            </div>
            {/* Zones Filter */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-2.5 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Zones d'intervention
              </p>
              <div className="flex flex-wrap gap-2">
                {ZONES.map(z => (
                  <FilterChip key={z} label={`📍 ${z}`}
                    active={filterZones.includes(z)}
                    color="emerald"
                    onClick={() => setFilterZones(p => p.includes(z) ? p.filter(x => x !== z) : [...p, z])} />
                ))}
              </div>
            </div>
            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <button onClick={() => { setFilterSkills([]); setFilterZones([]); }}
                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>

        {/* Active filters summary */}
        {activeFiltersCount > 0 && !showFilters && (
          <div className="flex items-center gap-2 flex-wrap" style={{ animation: 'iv-fadeIn 0.3s ease' }}>
            <span className="text-[10px] text-slate-500 font-semibold">Filtres actifs :</span>
            {filterSkills.map(s => (
              <span key={s} onClick={() => setFilterSkills(p => p.filter(x => x !== s))}
                className="text-[10px] px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all hover:scale-105"
                style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                {s} ✕
              </span>
            ))}
            {filterZones.map(z => (
              <span key={z} onClick={() => setFilterZones(p => p.filter(x => x !== z))}
                className="text-[10px] px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all hover:scale-105"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                📍 {z} ✕
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════ GRILLE INTERVENANTS ════════════════ */}
      {loading ? (
        <PremiumSkeleton />
      ) : filtered.length === 0 ? (
        search || activeFiltersCount > 0 ? (
          <EmptyState
            icon={Search}
            title="Aucun résultat"
            description={`Aucun intervenant ne correspond à ${search ? `"${search}"` : 'ces filtres'}. Modifiez vos critères de recherche.`}
            action={() => { setSearch(''); setFilterSkills([]); setFilterZones([]); }}
            actionLabel="Réinitialiser"
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Aucun intervenant"
            description="Commencez par ajouter votre premier intervenant pour constituer votre équipe."
            action={() => setShowForm(true)}
            actionLabel="Ajouter le premier"
          />
        )
      ) : (
        <>
          <p className="text-[11px] text-slate-600 font-semibold">{filtered.length} intervenant{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {filtered.map((member, idx) => {
              const stats = getMemberStats(member);
              const isOnMission = interventions.some(i =>
                (i.assigned_agent_id === member.member_id || i.assigned_agent_name === member.name) && i.status === 'en_cours'
              );
              const avatarGrad = getAvatarGradient(member.name);

              return (
                <div key={member.member_id}
                  onClick={() => { setSelectedMember(member); setMemberTab('Profil'); }}
                  className="iv-card-enter iv-card-hover rounded-3xl border border-white/[0.06] cursor-pointer group relative overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    animationDelay: `${idx * 0.06}s`,
                  }}>

                  {/* Top decorative bar */}
                  <div className="h-1 w-full" style={{
                    background: isOnMission
                      ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                      : avatarGrad
                  }} />

                  <div className="p-5">
                    {/* Header with avatar */}
                    <div className="flex items-start gap-3.5 mb-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2"
                          style={{ background: avatarGrad, boxShadow: `0 8px 24px ${avatarGrad.includes('10b981') ? 'rgba(16,185,129,0.25)' : 'rgba(124,58,237,0.25)'}` }}>
                          {(member.name || 'A').charAt(0).toUpperCase()}
                        </div>
                        {isOnMission && (
                          <>
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-slate-900 flex items-center justify-center">
                              <Zap className="w-2.5 h-2.5 text-slate-900" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400/60" style={{ animation: 'iv-pulse-ring 2s ease-out infinite' }} />
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-100 truncate text-[15px]">{member.name}</p>
                          {(member.rating || 5) >= 5 && <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-emerald-400 font-bold capitalize">{member.role || 'Technicien'}</p>
                        {member.team_name && (
                          <p className="text-[10px] text-slate-600 flex items-center gap-1 mt-0.5">
                            <Shield className="w-2.5 h-2.5" /> {member.team_name}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {isOnMission && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                            <Activity className="w-2.5 h-2.5" /> ACTIF
                          </span>
                        )}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3 h-3 transition-all duration-300 ${s <= (member.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Contact info */}
                    <div className="space-y-1.5 mb-4">
                      {member.email && (
                        <div className="flex items-center gap-2.5 text-xs text-slate-500 group/email">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-3 h-3 text-blue-400" />
                          </div>
                          <span className="truncate group-hover/email:text-blue-400 transition-colors">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2.5 text-xs text-slate-500 group/phone">
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Phone className="w-3 h-3 text-emerald-400" />
                          </div>
                          <a href={`tel:${member.phone}`} onClick={e => e.stopPropagation()} className="hover:text-emerald-400 transition-colors">{member.phone}</a>
                        </div>
                      )}
                    </div>

                    {/* Stats mini - animated */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: "Aujourd'hui", value: stats.today, color: '#f59e0b' },
                        { label: "Ce mois", value: stats.thisMonth, color: '#60a5fa' },
                        { label: "Total", value: stats.total, color: '#10b981' },
                      ].map((s, i) => (
                        <div key={s.label} className="text-center p-2.5 rounded-xl transition-all duration-300 hover:scale-105"
                          style={{ background: `${s.color}08`, border: `1px solid ${s.color}15` }}>
                          <p className="text-lg font-black" style={{ color: s.color, fontFamily: 'Manrope, sans-serif' }}>
                            {s.value}
                          </p>
                          <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: `${s.color}90` }}>{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Skills badges - colorés */}
                    {member.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {member.skills.slice(0, 4).map((s, i) => {
                          const c = getSkillColor(s);
                          return (
                            <span key={s} className="iv-badge-pop text-[10px] px-2.5 py-1 rounded-lg font-bold"
                              style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, animationDelay: `${i * 0.05}s` }}>
                              {s}
                            </span>
                          );
                        })}
                        {member.skills.length > 4 && (
                          <span className="text-[10px] px-2 py-1 rounded-lg font-bold text-slate-500 bg-white/[0.04] border border-white/[0.06]">
                            +{member.skills.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Zones mini */}
                    {member.zones?.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-4 overflow-hidden">
                        <MapPin className="w-3 h-3 text-emerald-500/60 flex-shrink-0" />
                        <p className="text-[10px] text-slate-500 truncate">
                          {member.zones.slice(0, 2).join(', ')}{member.zones.length > 2 ? ` +${member.zones.length - 2}` : ''}
                        </p>
                      </div>
                    )}

                    {/* Actions - with smooth reveal */}
                    <div className="flex gap-2 pt-2 border-t border-white/[0.04] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400">
                      <button onClick={e => { e.stopPropagation(); setSelectedMember(member); setMemberTab('Messages'); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold border border-emerald-500/15 text-emerald-400 hover:bg-emerald-500/10 transition-all duration-300">
                        <MessageSquare className="w-3.5 h-3.5" /> Message
                      </button>
                      <button onClick={e => { e.stopPropagation(); setSelectedMember(member); setMemberTab('Missions'); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold border border-blue-500/15 text-blue-400 hover:bg-blue-500/10 transition-all duration-300">
                        <Calendar className="w-3.5 h-3.5" /> Missions
                      </button>
                      <button onClick={e => { e.stopPropagation(); setSelectedMember(member); setMemberTab('Performance'); }}
                        className="flex items-center justify-center py-2.5 px-3 rounded-xl text-[11px] font-bold border border-violet-500/15 text-violet-400 hover:bg-violet-500/10 transition-all duration-300">
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════════ MODAL FICHE AGENT (PREMIUM) ════════════════ */}
      {selectedMember && (
        <div className={`fixed inset-0 flex items-start justify-center z-50 p-3 md:p-4 pt-8 md:pt-12 overflow-y-auto iv-scrollbar ${modalClosing ? 'opacity-0' : 'iv-backdrop-enter'}`}
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', transition: 'opacity 0.25s ease' }}
          onClick={closeModal}>
          <div className={`rounded-3xl w-full max-w-2xl mb-8 overflow-hidden ${modalClosing ? 'scale-95 opacity-0' : 'iv-modal-enter'}`}
            style={{
              background: 'linear-gradient(180deg, hsl(224,71%,7%) 0%, hsl(224,71%,5%) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 32px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
              transition: 'all 0.25s ease',
            }}
            onClick={e => e.stopPropagation()}>

            {/* Modal Header - Gradient banner */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 opacity-40" style={{ background: getAvatarGradient(selectedMember.name) }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 0%, hsl(224,71%,7%) 100%)' }} />

              <div className="relative p-6 pt-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-18 h-18 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-2xl"
                        style={{
                          width: 72, height: 72,
                          background: getAvatarGradient(selectedMember.name),
                          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                        }}>
                        {(selectedMember.name || 'A').charAt(0).toUpperCase()}
                      </div>
                      {interventions.some(i => (i.assigned_agent_id === selectedMember.member_id || i.assigned_agent_name === selectedMember.name) && i.status === 'en_cours') && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-amber-400 border-2 border-slate-900 flex items-center justify-center">
                          <Zap className="w-3 h-3 text-slate-900" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {selectedMember.name}
                      </h2>
                      <p className="text-sm text-emerald-300 font-bold capitalize flex items-center gap-1.5">
                        {selectedMember.role || 'Technicien'}
                        {(selectedMember.rating || 5) >= 5 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} onClick={() => rateAgent(s)}
                            className="transition-all duration-300 hover:scale-125">
                            <Star className={`w-4 h-4 ${s <= (selectedMember.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                          </button>
                        ))}
                        <span className="text-xs text-slate-400 ml-2 font-bold">{selectedMember.rating || 5}/5</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={closeModal}
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs - Premium */}
                <div className="flex gap-1 mt-6 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
                  {TABS_MEMBER.map(tab => {
                    const TabIcon = TAB_ICONS[tab];
                    const isActive = memberTab === tab;
                    return (
                      <button key={tab} onClick={() => setMemberTab(tab)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-300 flex items-center gap-2 ${
                          isActive
                            ? 'bg-white/15 text-white shadow-lg backdrop-blur-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                        }`}>
                        {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{tab}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tab Content - Animated */}
            <div className="p-6 iv-tab-content" key={memberTab}>

              {/* ── PROFIL ── */}
              {memberTab === 'Profil' && (
                <div className="space-y-4">
                  {/* Info Cards - Cascading animation */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Email', value: selectedMember.email, icon: Mail, color: '#60a5fa', gradient: 'rgba(96,165,250,0.08)' },
                      { label: 'Téléphone', value: selectedMember.phone, icon: Phone, color: '#10b981', gradient: 'rgba(16,185,129,0.08)' },
                      { label: 'Rôle', value: selectedMember.role || 'Technicien', icon: Briefcase, color: '#a78bfa', gradient: 'rgba(167,139,250,0.08)' },
                      { label: 'Max missions/jour', value: selectedMember.max_missions_day || 4, icon: Zap, color: '#f59e0b', gradient: 'rgba(245,158,11,0.08)' },
                    ].map((item, i) => (
                      <div key={item.label} className="iv-cascade p-4 rounded-2xl border border-white/[0.06] group/card hover:border-white/[0.12] transition-all duration-300"
                        style={{ background: item.gradient, animationDelay: `${i * 0.08}s` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover/card:scale-110"
                            style={{ background: `${item.color}15`, border: `1px solid ${item.color}20` }}>
                            <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.label}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-200 truncate">{item.value || '—'}</p>
                      </div>
                    ))}
                  </div>

                  {/* Compétences */}
                  <div className="iv-cascade p-5 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)', animationDelay: '0.32s' }}>
                    <p className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-violet-400" /> Compétences
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.skills?.length > 0 ? selectedMember.skills.map((s, i) => {
                        const c = getSkillColor(s);
                        return (
                          <span key={s} className="iv-badge-pop text-xs px-3.5 py-1.5 rounded-xl font-bold"
                            style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, animationDelay: `${0.35 + i * 0.05}s` }}>
                            {s}
                          </span>
                        );
                      }) : (
                        <p className="text-sm text-slate-600 italic">Aucune compétence renseignée</p>
                      )}
                    </div>
                  </div>

                  {/* Zones */}
                  <div className="iv-cascade p-5 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)', animationDelay: '0.4s' }}>
                    <p className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Zones d'intervention
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.zones?.length > 0 ? selectedMember.zones.map((z, i) => (
                        <span key={z} className="iv-badge-pop text-xs px-3.5 py-1.5 rounded-xl font-bold"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', animationDelay: `${0.45 + i * 0.05}s` }}>
                          📍 {z}
                        </span>
                      )) : (
                        <p className="text-sm text-slate-600 italic">Aucune zone renseignée</p>
                      )}
                    </div>
                  </div>

                  {selectedMember.notes && (
                    <div className="iv-cascade p-5 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)', animationDelay: '0.48s' }}>
                      <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">📝 Notes</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{selectedMember.notes}</p>
                    </div>
                  )}

                  {/* Portal link */}
                  <div className="iv-cascade p-5 rounded-2xl border border-emerald-500/15 iv-glow" style={{ background: 'rgba(16,185,129,0.04)', animationDelay: '0.56s' }}>
                    <p className="text-xs font-bold text-emerald-300 mb-3 flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5" /> Lien portail intervenant
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-400 font-mono flex-1 truncate bg-black/20 px-3 py-2 rounded-xl">
                        {window.location.origin}/intervenant
                      </p>
                      <button onClick={copyPortalLink}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all duration-300">
                        Copier
                      </button>
                      {selectedMember.email && (
                        <button onClick={() => {
                          window.open(`mailto:${selectedMember.email}?subject=Votre accès portail Global Clean Home&body=Bonjour ${selectedMember.name},%0A%0AVoici votre lien portail intervenant : ${window.location.origin}/intervenant%0A%0AConnectez-vous avec votre email : ${selectedMember.email}%0A%0ACordialement,%0AEquipe Global Clean Home`);
                        }} className="px-3 py-2 rounded-xl text-xs font-bold text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition-all duration-300">
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── MISSIONS ── */}
              {memberTab === 'Missions' && (
                <div className="space-y-4">
                  {(() => {
                    const stats = getMemberStats(selectedMember);
                    const mIntvs = interventions.filter(i => i.assigned_agent_id === selectedMember.member_id || i.assigned_agent_name === selectedMember.name);
                    return (
                      <>
                        {/* Mission KPIs with animated counters */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                          {[
                            { label: "Aujourd'hui", value: stats.today, color: '#f59e0b', icon: Target },
                            { label: 'Ce mois', value: stats.thisMonth, color: '#60a5fa', icon: Calendar },
                            { label: 'Terminées', value: stats.done, color: '#10b981', icon: CheckCircle },
                            { label: 'Total', value: stats.total, color: '#a78bfa', icon: BarChart2 },
                          ].map((s, i) => (
                            <div key={s.label} className="iv-cascade text-center p-4 rounded-2xl relative overflow-hidden"
                              style={{ background: `${s.color}08`, border: `1px solid ${s.color}15`, animationDelay: `${i * 0.08}s` }}>
                              <s.icon className="w-4 h-4 mx-auto mb-1.5 opacity-50" style={{ color: s.color }} />
                              <p className="text-2xl font-black" style={{ color: s.color, fontFamily: 'Manrope, sans-serif' }}>
                                <AnimatedCounter value={s.value} />
                              </p>
                              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: `${s.color}90` }}>{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Missions list */}
                        {mIntvs.length === 0 ? (
                          <EmptyState
                            icon={Calendar}
                            title="Aucune mission"
                            description="Cet intervenant n'a pas encore de missions assignées."
                          />
                        ) : (
                          <div className="space-y-2.5">
                            {[...mIntvs].sort((a, b) => (b.scheduled_date || '').localeCompare(a.scheduled_date || '')).map((intv, idx) => {
                              const sc = {
                                planifiée: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.15)', icon: Clock },
                                en_cours: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.15)', icon: Zap },
                                terminée: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.15)', icon: CheckCircle },
                                annulée: { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.15)', icon: XCircle },
                              }[intv.status] || { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.15)', icon: Clock };
                              const StatusIcon = sc.icon;
                              return (
                                <div key={intv.intervention_id || intv.id}
                                  className="iv-cascade flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 hover:border-white/[0.12]"
                                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', animationDelay: `${idx * 0.05}s` }}>
                                  <div className="text-center w-12 flex-shrink-0 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <p className="text-lg font-black text-slate-200">{(intv.scheduled_date || '').slice(8, 10)}</p>
                                    <p className="text-[9px] text-slate-500 font-bold">
                                      {['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][parseInt((intv.scheduled_date || '').slice(5, 7))] || ''}
                                    </p>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-200 truncate">{intv.title || intv.service_type}</p>
                                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {intv.scheduled_time}
                                      {intv.address && <><span className="mx-1">·</span><MapPin className="w-3 h-3" /> {intv.address}</>}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
                                    style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                                    <StatusIcon className="w-3 h-3" />
                                    <span className="text-[10px] font-bold capitalize">{intv.status}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── DISPONIBILITÉS ── */}
              {memberTab === 'Disponibilités' && (
                <div className="space-y-5">
                  <div className="iv-cascade p-5 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Jours disponibles
                    </p>
                    <div className="grid grid-cols-7 gap-2">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, i) => {
                        const isAvail = (selectedMember.availability || [0, 1, 2, 3, 4]).includes ? (selectedMember.availability || [0, 1, 2, 3, 4]).includes(i) : true;
                        return (
                          <div key={day} className={`iv-cascade p-3 rounded-xl text-center border transition-all duration-300 hover:scale-105 ${
                            isAvail ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-white/[0.04] bg-white/[0.01] opacity-40'
                          }`} style={{ animationDelay: `${i * 0.05}s` }}>
                            <p className="text-[11px] font-black" style={{ color: isAvail ? '#10b981' : '#475569' }}>{day}</p>
                            <div className={`w-2.5 h-2.5 rounded-full mx-auto mt-1.5 transition-all duration-300 ${isAvail ? 'bg-emerald-400 shadow-lg shadow-emerald-500/30' : 'bg-slate-700'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="iv-cascade p-5 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)', animationDelay: '0.1s' }}>
                    <p className="text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Congés & Absences
                    </p>
                    <div className="space-y-2.5 mb-4">
                      {congés.map((c, i) => (
                        <div key={c.id} className="iv-cascade flex items-center gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/15"
                          style={{ animationDelay: `${i * 0.05}s` }}>
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-amber-300 font-bold">{c.start} → {c.end}</p>
                            {c.reason && <p className="text-[10px] text-slate-500">{c.reason}</p>}
                          </div>
                          <button onClick={() => setCongés(p => p.filter(x => x.id !== c.id))}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {congés.length === 0 && (
                        <div className="text-center py-6">
                          <CheckCircle className="w-8 h-8 text-emerald-500/30 mx-auto mb-2" />
                          <p className="text-xs text-slate-600">Aucun congé — Disponible ✨</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input type="date" value={newCongé.start} onChange={e => setNewCongé(p => ({ ...p, start: e.target.value }))} className={inputCls} />
                      <input type="date" value={newCongé.end} onChange={e => setNewCongé(p => ({ ...p, end: e.target.value }))} className={inputCls} />
                      <input value={newCongé.reason} onChange={e => setNewCongé(p => ({ ...p, reason: e.target.value }))} placeholder="Raison" className={inputCls} />
                    </div>
                    <button onClick={addCongé}
                      className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 transition-all duration-300 flex items-center justify-center gap-2">
                      <Plus className="w-3.5 h-3.5" /> Ajouter un congé
                    </button>
                  </div>
                </div>
              )}

              {/* ── DOCUMENTS ── */}
              {memberTab === 'Documents' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 mb-2">Documents RH de <span className="text-slate-300 font-bold">{selectedMember.name}</span></p>

                  {/* Progress bar */}
                  <div className="iv-cascade p-4 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Progression</p>
                      <p className="text-xs font-bold text-emerald-400">
                        {(selectedMember.documents || []).length}/{DOCS.length} documents
                      </p>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full iv-progress-fill"
                        style={{
                          width: `${((selectedMember.documents || []).length / DOCS.length) * 100}%`,
                          background: 'linear-gradient(90deg, #10b981, #059669)',
                        }} />
                    </div>
                  </div>

                  {DOCS.map((doc, idx) => {
                    const hasDoc = (selectedMember.documents || []).includes(doc);
                    return (
                      <div key={doc} className={`iv-cascade flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 hover:border-white/[0.12] ${
                        hasDoc ? 'border-emerald-500/15 bg-emerald-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'
                      }`} style={{ animationDelay: `${idx * 0.06}s` }}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                          hasDoc ? 'bg-emerald-500/15' : 'bg-white/[0.04]'
                        }`}>
                          {hasDoc ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <FileText className="w-5 h-5 text-slate-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-200">{doc}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{hasDoc ? '✅ Document reçu et vérifié' : '⏳ En attente de réception'}</p>
                        </div>
                        {hasDoc ? (
                          <span className="text-[10px] font-bold px-3 py-1 rounded-lg bg-emerald-500/12 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Reçu
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (selectedMember.email) {
                                window.open(`mailto:${selectedMember.email}?subject=Document requis : ${doc}&body=Bonjour ${selectedMember.name},%0A%0ANous avons besoin de votre ${doc}.%0A%0AMerci de nous l'envoyer dès que possible.%0A%0ACordialement,%0AEquipe Global Clean Home`);
                              }
                            }}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-amber-500/12 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all duration-300 flex items-center gap-1.5">
                            <Send className="w-3 h-3" /> Demander
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── PERFORMANCE ── */}
              {memberTab === 'Performance' && (
                <div className="space-y-5">
                  {(() => {
                    const stats = getMemberStats(selectedMember);
                    const mIntvs = interventions.filter(i => i.assigned_agent_id === selectedMember.member_id || i.assigned_agent_name === selectedMember.name);
                    const byMonth = {};
                    mIntvs.forEach(i => {
                      const m = (i.scheduled_date || '').slice(0, 7);
                      if (!byMonth[m]) byMonth[m] = { total: 0, done: 0 };
                      byMonth[m].total++;
                      if (i.status === 'terminée') byMonth[m].done++;
                    });
                    return (
                      <>
                        {/* Performance KPIs with rings */}
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: 'Taux réussite', value: stats.onTime, suffix: '%', color: '#10b981', ring: true },
                            { label: 'Ce mois', value: stats.thisMonth, color: '#60a5fa', ring: false },
                            { label: 'Note', value: selectedMember.rating || 5, suffix: '/5', color: '#f59e0b', ring: false },
                          ].map((s, i) => (
                            <div key={s.label} className="iv-cascade text-center p-5 rounded-2xl relative overflow-hidden"
                              style={{ background: `${s.color}08`, border: `1px solid ${s.color}18`, animationDelay: `${i * 0.1}s` }}>
                              {s.ring ? (
                                <div className="flex justify-center mb-2">
                                  <ProgressRing percent={s.value} size={64} color={s.color} />
                                </div>
                              ) : (
                                <p className="text-3xl font-black mb-1" style={{ color: s.color, fontFamily: 'Manrope, sans-serif' }}>
                                  <AnimatedCounter value={typeof s.value === 'number' ? s.value : parseInt(s.value)} suffix={s.suffix || ''} />
                                </p>
                              )}
                              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${s.color}90` }}>{s.label}</p>
                              <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full opacity-10 blur-xl" style={{ background: s.color }} />
                            </div>
                          ))}
                        </div>

                        {/* Monthly History - Premium bars */}
                        <div className="iv-cascade p-5 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)', animationDelay: '0.3s' }}>
                          <p className="text-[11px] font-bold text-slate-400 mb-5 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Historique mensuel
                          </p>
                          {Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6).map(([month, data], idx) => {
                            const pct = Math.round((data.done / Math.max(data.total, 1)) * 100);
                            return (
                              <div key={month} className="flex items-center gap-3 mb-4 group/bar">
                                <p className="text-xs text-slate-400 w-20 flex-shrink-0 font-bold">{month}</p>
                                <div className="flex-1 h-3 bg-white/[0.04] rounded-full overflow-hidden relative">
                                  <div className="h-full rounded-full iv-progress-fill relative overflow-hidden"
                                    style={{
                                      width: `${pct}%`,
                                      background: `linear-gradient(90deg, #10b981, #059669)`,
                                      animationDelay: `${0.4 + idx * 0.1}s`,
                                    }}>
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 opacity-30"
                                      style={{
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'iv-shimmer 2s ease-in-out infinite',
                                        animationDelay: `${idx * 0.2}s`,
                                      }} />
                                  </div>
                                </div>
                                <p className="text-xs text-slate-400 w-20 text-right flex-shrink-0 font-bold group-hover/bar:text-emerald-400 transition-colors">
                                  {data.done}/{data.total} <span className="text-[10px] text-slate-600">({pct}%)</span>
                                </p>
                              </div>
                            );
                          })}
                          {Object.keys(byMonth).length === 0 && (
                            <EmptyState icon={BarChart2} title="Pas de données" description="Aucune donnée de performance disponible." />
                          )}
                        </div>

                        {/* Rating Section */}
                        <div className="iv-cascade p-5 rounded-2xl border border-amber-500/15" style={{ background: 'rgba(245,158,11,0.04)', animationDelay: '0.4s' }}>
                          <p className="text-xs font-bold text-amber-300 mb-4 flex items-center gap-2">
                            <Crown className="w-4 h-4" /> Notation interne
                          </p>
                          <div className="flex items-center gap-4">
                            <p className="text-sm text-slate-400">Note actuelle :</p>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onClick={() => rateAgent(s)}
                                  className="transition-all duration-300 hover:scale-125 active:scale-90">
                                  <Star className={`w-7 h-7 ${s <= (selectedMember.rating || 5) ? 'fill-amber-400 text-amber-400 drop-shadow-lg' : 'text-slate-700 hover:text-slate-500'}`} />
                                </button>
                              ))}
                            </div>
                            <span className="text-lg font-black text-amber-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {selectedMember.rating || 5}/5
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── MESSAGES ── */}
              {memberTab === 'Messages' && (
                <div className="flex flex-col" style={{ height: '420px' }}>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 iv-scrollbar">
                    {messages.length === 0 && (
                      <EmptyState
                        icon={MessageSquare}
                        title="Aucun message"
                        description={`Commencez une conversation avec ${selectedMember.name}`}
                      />
                    )}
                    {messages.map((msg, i) => {
                      const isAdmin = msg.from_admin || msg.sender === 'admin';
                      return (
                        <div key={i} className={`iv-cascade flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                          style={{ animationDelay: `${i * 0.04}s` }}>
                          {!isAdmin && (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-emerald-400 mr-2 mt-auto flex-shrink-0"
                              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' }}>
                              {(selectedMember.name || 'A').charAt(0)}
                            </div>
                          )}
                          <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${isAdmin ? 'rounded-br-lg' : 'rounded-bl-lg'}`}
                            style={isAdmin
                              ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', boxShadow: '0 4px 20px rgba(124,58,237,0.25)' }
                              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                            <p className="leading-relaxed">{msg.content}</p>
                            <p className={`text-[10px] mt-1.5 ${isAdmin ? 'text-white/40' : 'text-slate-600'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                    <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder={`Message à ${selectedMember.name}...`}
                      className="flex-1 px-4 py-3 rounded-2xl border text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/30 transition-all duration-300"
                      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }} />
                    <button onClick={sendMessage} disabled={!newMsg.trim()}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-30 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:hover:scale-100"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.25)' }}>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL CRÉATION (PREMIUM) ════════════════ */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3 md:p-4 iv-backdrop-enter"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          onClick={() => setShowForm(false)}>
          <div className="rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto iv-modal-enter iv-scrollbar"
            style={{
              background: 'linear-gradient(180deg, hsl(224,71%,7%) 0%, hsl(224,71%,5%) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 32px 100px rgba(0,0,0,0.7)',
            }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>Nouvel intervenant</h3>
                    <p className="text-[11px] text-slate-500">Ajouter un membre à l'équipe</p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)}
                  className="p-2.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <Field label="Nom complet *">
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Marie Dupont" className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Email *">
                  <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="marie@..." className={inputCls} />
                </Field>
                <Field label="Téléphone">
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="06 ..." className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Rôle">
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputCls}>
                    {['technicien', 'senior', 'chef_equipe', 'responsable'].map(r => (
                      <option key={r} value={r} className="bg-slate-800">
                        {r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Max missions/jour">
                  <input type="number" min="1" max="8" value={form.max_missions_day}
                    onChange={e => setForm(p => ({ ...p, max_missions_day: parseInt(e.target.value) }))} className={inputCls} />
                </Field>
              </div>

              <Field label="Compétences">
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s => {
                    const c = getSkillColor(s);
                    const active = form.skills.includes(s);
                    return (
                      <button key={s} type="button"
                        onClick={() => setForm(p => ({ ...p, skills: p.skills.includes(s) ? p.skills.filter(x => x !== s) : [...p.skills, s] }))}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 border ${
                          active ? 'scale-105 shadow-lg' : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/10'
                        }`}
                        style={active ? { background: c.bg, color: c.text, borderColor: c.border } : {}}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Zones d'intervention">
                <div className="flex flex-wrap gap-2">
                  {ZONES.map(z => {
                    const active = form.zones.includes(z);
                    return (
                      <button key={z} type="button"
                        onClick={() => setForm(p => ({ ...p, zones: p.zones.includes(z) ? p.zones.filter(x => x !== z) : [...p.zones, z] }))}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 border ${
                          active ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 scale-105 shadow-lg' : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/10'
                        }`}>
                        📍 {z}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Notes">
                <textarea value={form.notes} rows={2}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Infos complémentaires..." className={`${inputCls} resize-none`} />
              </Field>

              <div className="p-4 rounded-2xl border border-emerald-500/15" style={{ background: 'rgba(16,185,129,0.04)' }}>
                <p className="text-xs text-emerald-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  Un email de bienvenue avec le lien portail sera envoyé à <span className="font-bold">{form.email || "l'intervenant"}</span>.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 rounded-2xl text-sm font-bold transition-all duration-300">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-3.5 text-white rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.25)' }}>
                  <UserCheck className="w-4 h-4" /> Créer l'intervenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntervenantsManager;
