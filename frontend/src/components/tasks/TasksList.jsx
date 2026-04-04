import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  CheckSquare, Plus, Clock, CheckCircle, Circle, AlertCircle,
  Calendar, Trash2, Search, Filter, RefreshCw, ChevronDown,
  Flag, User, Tag, X, LayoutGrid, List, Zap, Star,
  Phone, Mail, FileText, Home, Edit2, ChevronRight,
  Inbox, Sparkles, ArrowUpRight, Timer, TrendingUp
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

// ═══════════════════════════════════════════
//  PRIORITY & TYPE CONFIG
// ═══════════════════════════════════════════

const PRIORITY = {
  urgente: { label:'Urgente', color:'#f43f5e', bg:'rgba(244,63,94,0.10)', border:'rgba(244,63,94,0.22)', gradient:'linear-gradient(135deg,#f43f5e20,#e1115520)', dot:'bg-red-500', icon:'🔴', ring:'ring-red-500/30' },
  haute:   { label:'Haute',   color:'#f97316', bg:'rgba(249,115,22,0.10)', border:'rgba(249,115,22,0.22)', gradient:'linear-gradient(135deg,#f9731620,#ea580c20)', dot:'bg-orange-500', icon:'🟠', ring:'ring-orange-500/30' },
  normale: { label:'Normale', color:'#60a5fa', bg:'rgba(96,165,250,0.10)', border:'rgba(96,165,250,0.22)', gradient:'linear-gradient(135deg,#60a5fa20,#3b82f620)', dot:'bg-blue-400', icon:'🔵', ring:'ring-blue-500/30' },
  basse:   { label:'Basse',   color:'#94a3b8', bg:'rgba(148,163,184,0.06)', border:'rgba(148,163,184,0.12)', gradient:'linear-gradient(135deg,#94a3b810,#64748b10)', dot:'bg-slate-500', icon:'⚪', ring:'ring-slate-500/20' },
  high:    { label:'Haute',   color:'#f97316', bg:'rgba(249,115,22,0.10)', border:'rgba(249,115,22,0.22)', gradient:'linear-gradient(135deg,#f9731620,#ea580c20)', dot:'bg-orange-500', icon:'🟠', ring:'ring-orange-500/30' },
  medium:  { label:'Normale', color:'#60a5fa', bg:'rgba(96,165,250,0.10)', border:'rgba(96,165,250,0.22)', gradient:'linear-gradient(135deg,#60a5fa20,#3b82f620)', dot:'bg-blue-400', icon:'🔵', ring:'ring-blue-500/30' },
  low:     { label:'Basse',   color:'#94a3b8', bg:'rgba(148,163,184,0.06)', border:'rgba(148,163,184,0.12)', gradient:'linear-gradient(135deg,#94a3b810,#64748b10)', dot:'bg-slate-500', icon:'⚪', ring:'ring-slate-500/20' },
};

const TYPES = [
  { v:'rappel',     l:'📞 Rappel téléphone', icon: Phone },
  { v:'email',      l:'📧 Email à envoyer', icon: Mail },
  { v:'visite',     l:'🏠 Visite / Intervention', icon: Home },
  { v:'devis',      l:'📄 Envoyer devis', icon: FileText },
  { v:'relance',    l:'🔔 Relance client', icon: Zap },
  { v:'facturation',l:'💰 Facturation', icon: Star },
  { v:'suivi',      l:'👁️ Suivi client', icon: TrendingUp },
  { v:'autre',      l:'✨ Autre', icon: Sparkles },
];

const typeIcon = (type='') => {
  const map = {rappel:'📞',email:'📧',visite:'🏠',devis:'📄',relance:'🔔',facturation:'💰',suivi:'👁️',autre:'✨'};
  return map[type] || '✨';
};

// ═══════════════════════════════════════════
//  CSS-IN-JS ANIMATIONS (injected once)
// ═══════════════════════════════════════════

const STYLE_ID = 'tasks-premium-animations';
const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Slide in from bottom with fade */
    @keyframes taskSlideIn {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes taskSlideInLeft {
      from { opacity: 0; transform: translateX(-20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes modalSlideUp {
      from { opacity: 0; transform: translateY(32px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes modalBackdropIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes shimmerPremium {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4); }
      50%      { box-shadow: 0 0 16px 4px rgba(244,63,94,0.15); }
    }
    @keyframes kanbanColIn {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes statCountUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes floatIn {
      from { opacity: 0; transform: scale(0.9) translateY(12px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes checkBounce {
      0%   { transform: scale(0.5); opacity: 0; }
      60%  { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes overdueShake {
      0%, 100% { transform: translateX(0); }
      20%      { transform: translateX(-2px); }
      40%      { transform: translateX(2px); }
      60%      { transform: translateX(-1px); }
      80%      { transform: translateX(1px); }
    }
    @keyframes progressFill {
      from { width: 0%; }
    }
    @keyframes dotPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.5; transform: scale(1.5); }
    }

    .task-slide-in      { animation: taskSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
    .task-slide-in-left { animation: taskSlideInLeft 0.35s cubic-bezier(0.16,1,0.3,1) both; }
    .modal-slide-up     { animation: modalSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
    .modal-backdrop-in  { animation: modalBackdropIn 0.25s ease both; }
    .kanban-col-in      { animation: kanbanColIn 0.5s cubic-bezier(0.16,1,0.3,1) both; }
    .stat-count-up      { animation: statCountUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
    .float-in           { animation: floatIn 0.5s cubic-bezier(0.16,1,0.3,1) both; }
    .check-bounce       { animation: checkBounce 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
    .overdue-shake      { animation: overdueShake 0.5s ease both; }
    .pulse-glow-urgent  { animation: pulseGlow 2s ease-in-out infinite; }

    .skeleton-premium {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(139,92,246,0.08) 40%, rgba(139,92,246,0.12) 50%, rgba(139,92,246,0.08) 60%, rgba(255,255,255,0.03) 100%);
      background-size: 200% 100%;
      animation: shimmerPremium 1.8s ease infinite;
      border-radius: 12px;
    }

    .dot-pulse { animation: dotPulse 1.5s ease-in-out infinite; }

    /* Stagger children */
    .stagger-children > *:nth-child(1)  { animation-delay: 0.02s; }
    .stagger-children > *:nth-child(2)  { animation-delay: 0.05s; }
    .stagger-children > *:nth-child(3)  { animation-delay: 0.08s; }
    .stagger-children > *:nth-child(4)  { animation-delay: 0.11s; }
    .stagger-children > *:nth-child(5)  { animation-delay: 0.14s; }
    .stagger-children > *:nth-child(6)  { animation-delay: 0.17s; }
    .stagger-children > *:nth-child(7)  { animation-delay: 0.20s; }
    .stagger-children > *:nth-child(8)  { animation-delay: 0.23s; }
    .stagger-children > *:nth-child(9)  { animation-delay: 0.26s; }
    .stagger-children > *:nth-child(10) { animation-delay: 0.29s; }
    .stagger-children > *:nth-child(n+11) { animation-delay: 0.32s; }

    /* Premium task card hover */
    .task-card-premium {
      transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    .task-card-premium:hover {
      transform: translateY(-3px) scale(1.01);
      box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(139,92,246,0.2);
    }

    /* Filter chip transitions */
    .filter-chip {
      transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    }
    .filter-chip:hover {
      transform: translateY(-1px);
    }
    .filter-chip-active {
      box-shadow: 0 4px 16px rgba(124,58,237,0.3), 0 0 0 1px rgba(124,58,237,0.5);
    }

    /* Progress bar animation */
    .progress-fill {
      animation: progressFill 1s cubic-bezier(0.16,1,0.3,1) both;
      animation-delay: 0.3s;
    }
  `;
  document.head.appendChild(style);
};

// ═══════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════

const inputCls = "w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 focus:bg-white/[0.06] transition-all duration-300";

const Field = ({label, children}) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);

// ── PREMIUM LOADING SKELETONS ──
const SkeletonCard = ({ index = 0 }) => (
  <div className="task-slide-in p-4 rounded-2xl border border-white/[0.05]" style={{ animationDelay: `${index * 0.08}s` }}>
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full skeleton-premium flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-3">
        <div className="h-4 skeleton-premium rounded-lg w-3/4" />
        <div className="h-3 skeleton-premium rounded-lg w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 skeleton-premium rounded-md w-16" />
          <div className="h-5 skeleton-premium rounded-md w-20" />
          <div className="h-5 skeleton-premium rounded-md w-14" />
        </div>
      </div>
    </div>
  </div>
);

const SkeletonKanban = () => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    {[0,1,2].map(col => (
      <div key={col} className="flex-1 min-w-[260px] kanban-col-in" style={{ animationDelay: `${col * 0.12}s` }}>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-3 h-3 rounded-full skeleton-premium" />
          <div className="h-4 skeleton-premium rounded-lg w-20" />
        </div>
        <div className="space-y-2.5">
          {[0,1,2].map(i => <SkeletonCard key={i} index={i} />)}
        </div>
      </div>
    ))}
  </div>
);

const SkeletonList = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-2 px-1">
      <div className="w-3.5 h-3.5 skeleton-premium rounded" />
      <div className="h-3.5 skeleton-premium rounded-lg w-24" />
    </div>
    <div className="section-card overflow-hidden divide-y divide-white/[0.04]">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 task-slide-in" style={{ animationDelay: `${i * 0.06}s` }}>
          <div className="w-5 h-5 rounded-full skeleton-premium flex-shrink-0" />
          <div className="w-2.5 h-2.5 rounded-full skeleton-premium flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton-premium rounded-lg w-2/3" />
            <div className="h-3 skeleton-premium rounded-lg w-1/3" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 skeleton-premium rounded-full w-16" />
            <div className="h-5 skeleton-premium rounded-full w-12" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── PREMIUM EMPTY STATE ──
const EmptyState = ({ filter, onCreateClick }) => {
  const emptyData = {
    pending: { icon: Inbox, title: 'Aucune tâche en attente', subtitle: "Tout est géré ! Créez une nouvelle tâche pour avancer.", gradient: 'from-violet-500/20 to-blue-500/20' },
    completed: { icon: CheckCircle, title: 'Aucune tâche complétée', subtitle: 'Complétez des tâches pour les voir apparaître ici.', gradient: 'from-emerald-500/20 to-teal-500/20' },
    all: { icon: CheckSquare, title: 'Aucune tâche trouvée', subtitle: 'Créez votre première tâche pour commencer.', gradient: 'from-violet-500/20 to-purple-500/20' },
  };
  const data = emptyData[filter] || emptyData.all;
  const IconComp = data.icon;

  return (
    <div className="float-in flex flex-col items-center justify-center py-16 sm:py-24">
      {/* Decorative glow */}
      <div className={`relative mb-6`}>
        <div className={`absolute inset-0 blur-3xl bg-gradient-to-br ${data.gradient} rounded-full scale-150 opacity-50`} />
        <div className="relative w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center backdrop-blur-sm">
          <IconComp className="w-9 h-9 text-slate-600" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{data.title}</h3>
      <p className="text-sm text-slate-600 text-center max-w-xs mb-6">{data.subtitle}</p>
      <button onClick={onCreateClick}
        className="group flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_rgba(124,58,237,0.4)]"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
        Créer une tâche
        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
      </button>
    </div>
  );
};

// ── OVERDUE INDICATOR ──
const OverdueIndicator = ({ dueDate, compact = false }) => {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  if (due >= now) return null;

  const diffMs = now - due;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  const label = diffD > 0 ? `${diffD}j de retard` : `${diffH}h de retard`;

  if (compact) {
    return (
      <span className="overdue-shake inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
        <AlertCircle className="w-2.5 h-2.5" />
        {label}
      </span>
    );
  }

  return (
    <div className="overdue-shake flex items-center gap-2 text-xs font-bold text-red-400 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/15">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 dot-pulse" />
      <AlertCircle className="w-3 h-3" />
      {label}
    </div>
  );
};

// ── URGENT BADGE ──
const UrgentBadge = () => (
  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 pulse-glow-urgent">
    <Zap className="w-2.5 h-2.5" />
    Urgent
  </span>
);

// ═══════════════════════════════════════════
//  KANBAN COLUMN
// ═══════════════════════════════════════════

const KanbanCol = ({ title, color, tasks, onComplete, onDelete, onSelect, count, index }) => (
  <div className="flex-1 min-w-[260px] max-w-[380px] kanban-col-in" style={{ animationDelay: `${index * 0.1}s` }}>
    {/* Column header */}
    <div className="flex items-center gap-2.5 mb-4 px-1">
      <div className="w-3 h-3 rounded-full relative" style={{ background: color }}>
        <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: color }} />
      </div>
      <span className="text-sm font-bold text-slate-200" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</span>
      <span className="ml-auto text-[11px] font-black px-2.5 py-1 rounded-full stat-count-up"
        style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>
        {count}
      </span>
    </div>

    {/* Column content */}
    <div className="space-y-2.5 stagger-children min-h-[120px]">
      {tasks.map(task => (
        <TaskCard key={task.task_id} task={task} onComplete={onComplete} onDelete={onDelete} onSelect={onSelect} />
      ))}
      {tasks.length === 0 && (
        <div className="float-in h-28 rounded-2xl border-2 border-dashed border-white/[0.06] flex flex-col items-center justify-center gap-2 bg-white/[0.01]">
          <div className="w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center">
            <Inbox className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-[11px] text-slate-700 font-medium">Aucune tâche</p>
        </div>
      )}
    </div>
  </div>
);

// ═══════════════════════════════════════════
//  TASK CARD (Kanban)
// ═══════════════════════════════════════════

const TaskCard = ({ task, onComplete, onDelete, onSelect }) => {
  const p = PRIORITY[task.priority || 'normale'] || PRIORITY.normale;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const isUrgent = ['urgente', 'haute', 'high'].includes(task.priority);
  const isDone = task.status === 'completed';

  return (
    <div
      onClick={() => onSelect(task)}
      className={`task-slide-in task-card-premium group relative p-3.5 rounded-2xl border cursor-pointer overflow-hidden
        ${isDone ? 'opacity-40 hover:opacity-60' : ''}
        ${isOverdue ? 'pulse-glow-urgent' : ''}`}
      style={{
        background: p.gradient,
        borderColor: isOverdue ? 'rgba(244,63,94,0.3)' : p.border,
      }}
    >
      {/* Priority accent line */}
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: p.color, opacity: 0.6 }} />

      <div className="flex items-start gap-2.5 pl-1.5">
        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); if (!isDone) onComplete(task.task_id); }}
          className="mt-0.5 flex-shrink-0 hover:scale-125 transition-all duration-300"
        >
          {isDone
            ? <CheckCircle className="w-[18px] h-[18px] text-emerald-400 check-bounce" />
            : <Circle className="w-[18px] h-[18px] text-slate-600 hover:text-violet-400 transition-colors" />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title + urgent badge */}
          <div className="flex items-start gap-2">
            <p className={`text-[13px] font-bold leading-tight flex-1 ${isDone ? 'line-through text-slate-500' : 'text-slate-100'}`}>
              {task.title}
            </p>
            {isUrgent && !isDone && <UrgentBadge />}
          </div>

          {task.description && (
            <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{task.description}</p>
          )}

          {/* Meta chips */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/[0.06] text-slate-400 px-2 py-0.5 rounded-lg border border-white/[0.05]">
              {typeIcon(task.type)} {task.type || 'autre'}
            </span>

            {task.due_date && !isOverdue && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-lg">
                <Clock className="w-2.5 h-2.5" />
                {new Date(task.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
            )}

            {isOverdue && <OverdueIndicator dueDate={task.due_date} compact />}

            {task.lead_name && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-[90px]">
                <User className="w-2.5 h-2.5" /> {task.lead_name}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 -mt-0.5 -mr-0.5">
          <button
            onClick={e => { e.stopPropagation(); onDelete(task.task_id); }}
            className="p-1.5 rounded-xl hover:bg-red-500/15 text-slate-700 hover:text-red-400 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
//  TASK ROW (List view)
// ═══════════════════════════════════════════

const TaskRow = ({ task, onComplete, onDelete, onSelect, index = 0 }) => {
  const p = PRIORITY[task.priority || 'normale'] || PRIORITY.normale;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const isUrgent = ['urgente', 'haute', 'high'].includes(task.priority);
  const isDone = task.status === 'completed';

  return (
    <div
      onClick={() => onSelect(task)}
      className={`task-slide-in group relative flex items-center gap-4 px-4 py-3.5 transition-all duration-300 cursor-pointer
        border-b border-white/[0.04] last:border-0
        hover:bg-white/[0.03]
        ${isDone ? 'opacity-40 hover:opacity-60' : ''}
        ${isOverdue ? 'bg-red-500/[0.03]' : ''}`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Overdue left accent */}
      {isOverdue && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-red-500/60" />}

      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); if (!isDone) onComplete(task.task_id); }}
        className="flex-shrink-0 hover:scale-125 transition-all duration-300"
      >
        {isDone
          ? <CheckCircle className="w-5 h-5 text-emerald-400 check-bounce" />
          : <Circle className="w-5 h-5 text-slate-600 hover:text-violet-400 transition-colors" />}
      </button>

      {/* Priority dot with glow */}
      <div className="relative flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
        {isUrgent && !isDone && (
          <div className={`absolute inset-0 rounded-full ${p.dot} animate-ping opacity-30`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
            {task.title}
          </p>
          {isUrgent && !isDone && <UrgentBadge />}
        </div>
        {task.description && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{task.description}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <span className="text-xs text-slate-500 hidden sm:inline-flex items-center gap-1">
          {typeIcon(task.type)} {task.type || '—'}
        </span>

        {task.lead_name && (
          <span className="text-xs text-slate-500 hidden md:inline-flex items-center gap-1 truncate max-w-[100px]">
            <User className="w-3 h-3" /> {task.lead_name}
          </span>
        )}

        {isOverdue
          ? <OverdueIndicator dueDate={task.due_date} compact />
          : task.due_date && (
            <span className="text-xs flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )
        }

        {/* Priority badge */}
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap"
          style={{ color: p.color, background: p.bg, borderColor: p.border }}>
          {p.label}
        </span>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(task.task_id); }}
          className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/15 text-slate-600 hover:text-red-400 transition-all duration-300"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
//  STAT CARD
// ═══════════════════════════════════════════

const StatCard = ({ label, value, color, icon: Icon, index, total }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="stat-count-up metric-card flex items-center gap-3.5 group" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
        style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-black text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>{value}</p>
          <span className="text-[10px] font-bold text-slate-600">{pct}%</span>
        </div>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
        {/* Mini progress bar */}
        <div className="mt-1.5 h-[3px] w-full rounded-full bg-white/[0.04] overflow-hidden">
          <div className="h-full rounded-full progress-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
//  FILTER CHIP
// ═══════════════════════════════════════════

const FilterChip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`filter-chip px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300
      ${active
        ? 'bg-violet-600 text-white filter-chip-active'
        : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] hover:border-white/[0.12]'
      }`}
  >
    {children}
  </button>
);

// ═══════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════

const TasksList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('liste');
  const [filter, setFilter] = useState('pending');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', type: 'rappel', priority: 'normale',
    due_date: '', lead_id: '', lead_name: ''
  });

  // Inject premium animations on mount
  useEffect(() => { injectStyles(); }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await axios.get(`${API_URL}/tasks${params}`, { withCredentials: true });
      const raw = res.data;
      setTasks(Array.isArray(raw) ? raw : (raw?.items || raw?.tasks || []));
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleComplete = async (id) => {
    try {
      await axios.patch(`${API_URL}/tasks/${id}/complete`, {}, { withCredentials: true });
      toast.success('✅ Tâche complétée !');
      fetchTasks();
    } catch { toast.error('Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    try {
      await axios.delete(`${API_URL}/tasks/${id}`, { withCredentials: true });
      toast.success('Tâche supprimée');
      fetchTasks();
    } catch { toast.error('Erreur'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setFormSubmitting(true);
    try {
      await axios.post(`${API_URL}/tasks`, form, { withCredentials: true });
      toast.success('✅ Tâche créée');
      setForm({ title: '', description: '', type: 'rappel', priority: 'normale', due_date: '', lead_id: '', lead_name: '' });
      setShowForm(false);
      fetchTasks();
    } catch { toast.error('Erreur lors de la création'); }
    finally { setFormSubmitting(false); }
  };

  // Filtered tasks
  const filtered = useMemo(() => tasks.filter(t => {
    if (filterPriority && (t.priority || 'normale') !== filterPriority) return false;
    if (filterType && t.type !== filterType) return false;
    if (search && !((t.title || '') + (t.description || '') + (t.lead_name || '')).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [tasks, filterPriority, filterType, search]);

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
    urgente: tasks.filter(t => ['urgente', 'haute', 'high'].includes(t.priority)).length,
  }), [tasks]);

  // Kanban columns
  const kanbanCols = useMemo(() => [
    { key: 'pending', title: 'À faire', color: '#60a5fa', tasks: filtered.filter(t => t.status === 'pending' && !['urgente', 'haute', 'high'].includes(t.priority || '')) },
    { key: 'urgent', title: '🔥 Urgent', color: '#f43f5e', tasks: filtered.filter(t => t.status === 'pending' && ['urgente', 'haute', 'high'].includes(t.priority || '')) },
    { key: 'completed', title: '✅ Terminé', color: '#34d399', tasks: filtered.filter(t => t.status === 'completed').slice(0, 10) },
  ], [filtered]);

  // Group by date for list view
  const { grouped, noDateTasks } = useMemo(() => {
    const today = new Date().toLocaleDateString('fr-FR');
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('fr-FR');
    const groups = {};
    const noDt = [];

    filtered.forEach(t => {
      if (!t.due_date) { noDt.push(t); return; }
      const d = new Date(t.due_date).toLocaleDateString('fr-FR');
      const label = d === today ? "Aujourd'hui" : d === tomorrow ? 'Demain' : d;
      if (!groups[label]) groups[label] = [];
      groups[label].push(t);
    });

    return { grouped: groups, noDateTasks: noDt };
  }, [filtered]);

  const hasActiveFilters = filterPriority || filterType || search;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 max-w-[1400px] mx-auto">

      {/* ═══ HEADER ═══ */}
      <div className="task-slide-in flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600/25 to-violet-500/10 border border-violet-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.15)]">
              <CheckSquare className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>Tâches</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                <span className="text-amber-400 font-bold">{stats.pending}</span> en attente ·{' '}
                <span className="text-emerald-400 font-bold">{stats.completed}</span> complétées
                {stats.overdue > 0 && <span className="text-red-400 font-bold"> · {stats.overdue} en retard ⚠️</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchTasks}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/[0.06] transition-all duration-300 hover:rotate-180"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* View toggle */}
          <div className="flex gap-1 bg-white/[0.04] rounded-xl border border-white/[0.06] p-1">
            {[{ v: 'liste', i: List, label: 'Liste' }, { v: 'kanban', i: LayoutGrid, label: 'Kanban' }].map(({ v, i: Icon, label }) => (
              <button key={v} onClick={() => setView(v)}
                className={`p-2 rounded-lg transition-all duration-300 ${view === v
                  ? 'bg-violet-600 text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]'
                  : 'text-slate-500 hover:text-slate-300'}`}
                title={label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {/* New task button */}
          <button onClick={() => setShowForm(true)}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_rgba(124,58,237,0.4)]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
            <span className="hidden sm:inline">Nouvelle tâche</span>
          </button>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'En attente', value: stats.pending, color: '#60a5fa', icon: Circle },
          { label: 'En retard', value: stats.overdue, color: '#f43f5e', icon: AlertCircle },
          { label: 'Urgentes', value: stats.urgente, color: '#f97316', icon: Zap },
          { label: 'Complétées', value: stats.completed, color: '#34d399', icon: CheckCircle },
        ].map((s, i) => (
          <StatCard key={s.label} {...s} index={i} total={stats.total} />
        ))}
      </div>

      {/* ═══ FILTERS ═══ */}
      <div className="task-slide-in flex flex-col sm:flex-row gap-3" style={{ animationDelay: '0.1s' }}>
        {/* Search */}
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-violet-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 focus:bg-white/[0.06] transition-all duration-300"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { v: 'pending', l: '⏳ En cours' },
            { v: 'completed', l: '✅ Complétées' },
            { v: 'all', l: '📋 Toutes' },
          ].map(f => (
            <FilterChip key={f.v} active={filter === f.v} onClick={() => setFilter(f.v)}>
              {f.l}
            </FilterChip>
          ))}

          {/* Priority select */}
          <div className="relative">
            <select
              value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className={`filter-chip appearance-none pl-3 pr-7 py-2 rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all duration-300
                ${filterPriority
                  ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300'
                  : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200'}`}
            >
              <option value="" className="bg-slate-800 text-slate-300">🎯 Priorité</option>
              {['urgente', 'haute', 'normale', 'basse'].map(pr => (
                <option key={pr} value={pr} className="bg-slate-800">{PRIORITY[pr]?.icon} {PRIORITY[pr]?.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Type select */}
          <div className="relative">
            <select
              value={filterType} onChange={e => setFilterType(e.target.value)}
              className={`filter-chip appearance-none pl-3 pr-7 py-2 rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all duration-300
                ${filterType
                  ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300'
                  : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200'}`}
            >
              <option value="" className="bg-slate-800 text-slate-300">📂 Type</option>
              {TYPES.map(t => <option key={t.v} value={t.v} className="bg-slate-800">{t.l}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterPriority(''); setFilterType(''); setSearch(''); }}
              className="filter-chip flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-300"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      {loading ? (
        view === 'kanban' ? <SkeletonKanban /> : <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} onCreateClick={() => setShowForm(true)} />
      ) : (
        <>
          {/* ── KANBAN VIEW ── */}
          {view === 'kanban' && (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory md:snap-none hide-scrollbar">
              {kanbanCols.map((col, i) => (
                <KanbanCol key={col.key} {...col} count={col.tasks.length} index={i}
                  onComplete={handleComplete} onDelete={handleDelete} onSelect={setSelected} />
              ))}
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === 'liste' && (
            <div className="space-y-5">
              {Object.entries(grouped)
                .sort(([a], [b]) => {
                  if (a === "Aujourd'hui") return -1;
                  if (b === "Aujourd'hui") return 1;
                  if (a === 'Demain') return -1;
                  if (b === 'Demain') return 1;
                  return a.localeCompare(b);
                })
                .map(([date, dateTasks]) => (
                  <div key={date} className="task-slide-in">
                    <div className="flex items-center gap-2.5 mb-2.5 px-1">
                      <Calendar className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">{date}</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-violet-500/20 to-transparent" />
                      <span className="text-[10px] font-bold text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded-full">
                        {dateTasks.length}
                      </span>
                    </div>
                    <div className="section-card overflow-hidden">
                      {dateTasks.map((task, i) => (
                        <TaskRow key={task.task_id} task={task} index={i}
                          onComplete={handleComplete} onDelete={handleDelete} onSelect={setSelected} />
                      ))}
                    </div>
                  </div>
                ))}

              {noDateTasks.length > 0 && (
                <div className="task-slide-in">
                  <div className="flex items-center gap-2.5 mb-2.5 px-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sans date</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-slate-500/20 to-transparent" />
                    <span className="text-[10px] font-bold text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded-full">
                      {noDateTasks.length}
                    </span>
                  </div>
                  <div className="section-card overflow-hidden">
                    {noDateTasks.map((task, i) => (
                      <TaskRow key={task.task_id} task={task} index={i}
                        onComplete={handleComplete} onDelete={handleDelete} onSelect={setSelected} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {selected && (
        <div
          className="modal-backdrop-in fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="modal-slide-up w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, hsl(224,71%,7%) 0%, hsl(224,71%,5%) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile handle */}
            <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl relative"
                  style={{
                    background: PRIORITY[selected.priority || 'normale']?.gradient,
                    border: `1px solid ${PRIORITY[selected.priority || 'normale']?.border}`,
                  }}>
                  {typeIcon(selected.type)}
                  {/* Priority accent */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center text-[10px]"
                    style={{ background: PRIORITY[selected.priority || 'normale']?.bg, border: `1px solid ${PRIORITY[selected.priority || 'normale']?.border}` }}>
                    {PRIORITY[selected.priority || 'normale']?.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>{selected.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                      style={{
                        color: PRIORITY[selected.priority || 'normale']?.color,
                        background: PRIORITY[selected.priority || 'normale']?.bg,
                        borderColor: PRIORITY[selected.priority || 'normale']?.border,
                      }}>
                      {PRIORITY[selected.priority || 'normale']?.label}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">{typeIcon(selected.type)} {selected.type}</span>
                    {selected.status === 'completed' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        ✅ Complétée
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] rounded-xl transition-all duration-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overdue warning */}
            {selected.due_date && new Date(selected.due_date) < new Date() && selected.status !== 'completed' && (
              <div className="overdue-shake mb-4 flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-400">Tâche en retard</p>
                  <p className="text-xs text-red-400/70">Échéance dépassée depuis {Math.floor((new Date() - new Date(selected.due_date)) / 86400000)} jour(s)</p>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-2.5 mb-5">
              {selected.description && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
                </div>
              )}
              {selected.due_date && (
                <div className="flex items-center gap-3 text-sm text-slate-300 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Échéance</p>
                    <p className="text-sm font-medium">{new Date(selected.due_date).toLocaleString('fr-FR')}</p>
                  </div>
                </div>
              )}
              {selected.lead_name && (
                <div className="flex items-center gap-3 text-sm text-slate-300 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client</p>
                    <p className="text-sm font-medium">{selected.lead_name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
              {selected.status !== 'completed' && (
                <button
                  onClick={() => { handleComplete(selected.task_id); setSelected(null); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.1))', border: '1px solid rgba(52,211,153,0.25)' }}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Compléter</span>
                </button>
              )}
              <button
                onClick={() => { handleDelete(selected.task_id); setSelected(null); }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-[1.02]"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CREATE MODAL ═══ */}
      {showForm && (
        <div
          className="modal-backdrop-in fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="modal-slide-up w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, hsl(224,71%,7%) 0%, hsl(224,71%,5%) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile handle */}
            <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/25 to-violet-600/10 border border-violet-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                  <Plus className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>Nouvelle tâche</h3>
                  <p className="text-[11px] text-slate-500">Ajoutez une tâche à votre planning</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)}
                className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] rounded-xl transition-all duration-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Titre *">
                <input
                  required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Rappeler M. Dupont pour devis canapé"
                  className={inputCls}
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                    {TYPES.map(t => <option key={t.v} value={t.v} className="bg-slate-800">{t.l}</option>)}
                  </select>
                </Field>
                <Field label="Priorité">
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className={inputCls}>
                    {['urgente', 'haute', 'normale', 'basse'].map(pr => (
                      <option key={pr} value={pr} className="bg-slate-800">{PRIORITY[pr]?.icon} {PRIORITY[pr]?.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Priority visual preview */}
              <div className="flex gap-1.5">
                {['urgente', 'haute', 'normale', 'basse'].map(pr => (
                  <button
                    key={pr} type="button"
                    onClick={() => setForm(p => ({ ...p, priority: pr }))}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 border
                      ${form.priority === pr
                        ? 'scale-105 shadow-lg'
                        : 'opacity-50 hover:opacity-80'}`}
                    style={{
                      color: PRIORITY[pr]?.color,
                      background: form.priority === pr ? PRIORITY[pr]?.bg : 'transparent',
                      borderColor: form.priority === pr ? PRIORITY[pr]?.border : 'rgba(255,255,255,0.05)',
                      boxShadow: form.priority === pr ? `0 4px 16px ${PRIORITY[pr]?.color}20` : 'none',
                    }}
                  >
                    {PRIORITY[pr]?.icon} {PRIORITY[pr]?.label}
                  </button>
                ))}
              </div>

              <Field label="Description">
                <textarea
                  value={form.description} rows={2}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Détails supplémentaires..."
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Échéance">
                  <input
                    type="datetime-local" value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Client">
                  <input
                    value={form.lead_name}
                    onChange={e => setForm(p => ({ ...p, lead_name: e.target.value }))}
                    placeholder="Ex: Jean Dupont"
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 rounded-xl text-sm font-bold transition-all duration-300">
                  Annuler
                </button>
                <button type="submit" disabled={formSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl text-sm font-bold transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
                  }}>
                  {formSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Créer la tâche
                    </>
                  )}
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
