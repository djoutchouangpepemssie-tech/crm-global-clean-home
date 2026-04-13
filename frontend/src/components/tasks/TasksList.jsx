/**
 * TasksList — Vague 3a.
 *
 * Refonte complète : React Query + composants partagés.
 *
 * Features préservées :
 *   - Filtres : statut (pending, completed), priorité, type, recherche
 *   - Regroupement par date : En retard, Aujourd'hui, Demain, Cette semaine, Plus tard, Sans date
 *   - Actions : compléter, supprimer, voir le lead associé
 *   - Création via modale (TaskFormModal)
 *   - Stats KPIs en haut : en attente, en retard, terminées, total
 *
 * Nouveautés Vague 3a :
 *   - Branché sur React Query → dashboard.stats invalidé à chaque action
 *   - Composants partagés : PageHeader, EmptyState, StatusBadge, useConfirm
 *   - Sélection multiple + bulk delete + bulk complete
 *   - Smart filter "En retard uniquement" en un clic
 *   - Raccourcis clavier : / recherche, C créer, R refresh
 *   - Intégration avec leads : click sur le nom du client → /leads/{id}
 */
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, RefreshCw, CheckSquare, Trash2, AlertTriangle,
  Clock, CheckCircle2, Inbox, ChevronDown, ExternalLink,
  Phone, Mail, FileText, UserPlus, Calendar, Save,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useTasksList,
  useCreateTask,
  useCompleteTask,
  useDeleteTask,
  useLeadsList,
} from '../../hooks/api';
import useHotkeys from '../../hooks/useHotkeys';
import { PageHeader, EmptyState, useConfirm } from '../shared';
import { relativeTime, daysSince } from '../../lib/dates';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

// ── Types et constantes ─────────────────────────────────────────

const TASK_TYPES = [
  { value: 'relance', label: 'Relance', icon: Clock },
  { value: 'appel', label: 'Appel', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'devis', label: 'Devis', icon: FileText },
  { value: 'visite', label: 'Visite', icon: Calendar },
  { value: 'suivi', label: 'Suivi', icon: UserPlus },
  { value: 'autre', label: 'Autre', icon: CheckSquare },
];

const PRIORITIES = [
  { value: 'urgente', label: 'Urgente', classes: 'bg-rose-50 text-rose-700 ring-rose-200' },
  { value: 'haute', label: 'Haute', classes: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { value: 'normale', label: 'Normale', classes: 'bg-blue-50 text-blue-700 ring-blue-200' },
  { value: 'basse', label: 'Basse', classes: 'bg-slate-50 text-slate-600 ring-slate-200' },
];

function getTypeConfig(type) {
  return TASK_TYPES.find((t) => t.value === type) || TASK_TYPES[TASK_TYPES.length - 1];
}

function getPriorityConfig(priority) {
  return PRIORITIES.find((p) => p.value === priority) || PRIORITIES[2];
}

// ── Helper : regroupe les tâches par "bucket" temporel ─────────
function groupTasksByDate(tasks) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));

  const buckets = {
    overdue: { label: 'En retard', icon: AlertTriangle, accent: 'rose', tasks: [] },
    today: { label: "Aujourd'hui", icon: Clock, accent: 'violet', tasks: [] },
    tomorrow: { label: 'Demain', icon: Calendar, accent: 'blue', tasks: [] },
    week: { label: 'Cette semaine', icon: Calendar, accent: 'slate', tasks: [] },
    later: { label: 'Plus tard', icon: Calendar, accent: 'slate', tasks: [] },
    noDate: { label: 'Sans date', icon: Inbox, accent: 'slate', tasks: [] },
  };

  tasks.forEach((task) => {
    if (task.status === 'completed') return;
    if (!task.due_date) {
      buckets.noDate.tasks.push(task);
      return;
    }
    const due = new Date(task.due_date);
    if (due < today) {
      buckets.overdue.tasks.push(task);
    } else if (due < tomorrow) {
      buckets.today.tasks.push(task);
    } else if (due.getTime() === tomorrow.getTime() || (due > tomorrow && due < new Date(tomorrow.getTime() + 86400000))) {
      buckets.tomorrow.tasks.push(task);
    } else if (due <= endOfWeek) {
      buckets.week.tasks.push(task);
    } else {
      buckets.later.tasks.push(task);
    }
  });

  return buckets;
}

// ── KPI card ─────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, accent = 'violet', onClick, active = false }) {
  const accents = {
    violet: 'from-violet-500/10 to-violet-500/5 ring-violet-200 text-violet-600',
    emerald: 'from-emerald-500/10 to-emerald-500/5 ring-emerald-200 text-emerald-600',
    amber: 'from-amber-500/10 to-amber-500/5 ring-amber-200 text-amber-600',
    rose: 'from-rose-500/10 to-rose-500/5 ring-rose-200 text-rose-600',
  };
  const clickableClasses = onClick
    ? `cursor-pointer hover:scale-[1.02] ${active ? 'ring-2 ring-violet-500' : ''}`
    : '';
  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-gradient-to-br ${accents[accent]} ring-1 p-4 animate-fade-in-up transition-transform ${clickableClasses}`}
    >
      <Icon className="w-5 h-5 mb-3" />
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div className="text-xs text-slate-600 mt-1">{label}</div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────
function TasksSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          {Array.from({ length: 2 }).map((_, j) => (
            <div
              key={j}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 section-card/30"
            >
              <div className="h-5 w-5 bg-slate-200 rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-32 /60 rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 /60 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Ligne tâche ──────────────────────────────────────────────────
function TaskRow({ task, onToggleSelect, isSelected, onComplete, onDelete, onOpenLead, idx }) {
  const typeConfig = getTypeConfig(task.type);
  const priorityConfig = getPriorityConfig(task.priority);
  const TypeIcon = typeConfig.icon;
  const isOverdue = task.due_date && daysSince(task.due_date) > 0 && task.status !== 'completed';
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`
        group flex items-start gap-3 p-4 rounded-xl border transition-all duration-150 animate-fade-in-up
        ${isSelected
          ? 'border-violet-300 bg-violet-50/50'
          : isOverdue
            ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
            : 'border-slate-200 section-card/30 hover:border-slate-300'}
      `}
      style={{ animationDelay: `${idx * 20}ms` }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} aria-label="Sélectionner" />
      </div>

      {/* Bouton compléter */}
      <button
        type="button"
        onClick={onComplete}
        disabled={isCompleted}
        className={`
          mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
          ${isCompleted
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'}
        `}
        aria-label={isCompleted ? 'Tâche terminée' : 'Marquer comme terminée'}
      >
        {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
      </button>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <TypeIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                {task.title || '(sans titre)'}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset uppercase tracking-wider ${priorityConfig.classes}`}>
                {priorityConfig.label}
              </span>
            </div>
            {task.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs">
              {task.due_date && (
                <span
                  className={`flex items-center gap-1 ${
                    isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {relativeTime(task.due_date)}
                  {isOverdue && ' · en retard'}
                </span>
              )}
              {task.lead_name && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLead();
                  }}
                  className="flex items-center gap-1 text-slate-500 hover:text-violet-600 transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  {task.lead_name}
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

          {/* Actions au hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-rose-50 text-rose-500"
              aria-label="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bucket de tâches ─────────────────────────────────────────────
function TasksBucket({ bucket, children }) {
  if (bucket.tasks.length === 0) return null;
  const Icon = bucket.icon;
  const accents = {
    rose: 'text-rose-600',
    violet: 'text-violet-600',
    blue: 'text-blue-600',
    slate: 'text-slate-500',
  };
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${accents[bucket.accent]}`} />
        <h3 className="text-sm font-semibold text-slate-900">{bucket.label}</h3>
        <span className="text-xs text-slate-500">{bucket.tasks.length}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ── Modale de création de tâche ─────────────────────────────────
function TaskFormModal({ open, onOpenChange, onSubmit, isPending, leads }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'relance',
    priority: 'normale',
    due_date: '',
    lead_id: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        type: 'relance',
        priority: 'normale',
        due_date: '',
        lead_id: '',
      });
    }
  }, [open]);

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('Le titre de la tâche est requis');
      return;
    }
    onSubmit({
      ...form,
      due_date: form.due_date || undefined,
      lead_id: form.lead_id || undefined,
    });
  };

  const selectedLead = leads.find((l) => l.lead_id === form.lead_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Titre <span className="text-rose-500">*</span>
            </label>
            <Input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Appeler le client pour confirmer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Type
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between font-normal">
                    {getTypeConfig(form.type).label}
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {TASK_TYPES.map((t) => (
                    <DropdownMenuItem key={t.value} onClick={() => setForm({ ...form, type: t.value })}>
                      <t.icon className="w-3.5 h-3.5 mr-2" />
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Priorité
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between font-normal">
                    {getPriorityConfig(form.priority).label}
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {PRIORITIES.map((p) => (
                    <DropdownMenuItem key={p.value} onClick={() => setForm({ ...form, priority: p.value })}>
                      {p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Échéance
            </label>
            <Input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Lead associé (optionnel)
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between font-normal">
                  {selectedLead ? selectedLead.name : 'Aucun'}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto">
                <DropdownMenuItem onClick={() => setForm({ ...form, lead_id: '' })}>
                  Aucun lead
                </DropdownMenuItem>
                {leads.map((l) => (
                  <DropdownMenuItem key={l.lead_id} onClick={() => setForm({ ...form, lead_id: l.lead_id })}>
                    <div className="flex flex-col items-start">
                      <span className="text-sm">{l.name}</span>
                      <span className="text-xs text-slate-500">{l.email}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Contexte, notes…"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !form.title.trim()}
            className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isPending ? 'Création…' : 'Créer la tâche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Composant principal ─────────────────────────────────────────
export default function TasksList() {
  const navigate = useNavigate();
  const { confirm, ConfirmElement } = useConfirm();
  const searchInputRef = useRef(null);

  const [statusFilter, setStatusFilter] = useState('pending'); // '', 'pending', 'completed'
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);

  // Pour la modale : liste des leads
  const { data: leads = [] } = useLeadsList({ period: '90d', page: 1, page_size: 200 });

  const filters = useMemo(
    () => ({
      status: statusFilter || undefined,
      page_size: 200,
    }),
    [statusFilter]
  );
  const { data: allTasks = [], isLoading, isRefetching, refetch } = useTasksList(filters);

  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  // Stats
  const stats = useMemo(() => {
    const pending = allTasks.filter((t) => t.status !== 'completed');
    const completed = allTasks.filter((t) => t.status === 'completed');
    const overdue = pending.filter((t) => t.due_date && daysSince(t.due_date) > 0);
    const urgent = pending.filter((t) => t.priority === 'urgente' || t.priority === 'haute');
    return {
      pending: pending.length,
      completed: completed.length,
      overdue: overdue.length,
      urgent: urgent.length,
    };
  }, [allTasks]);

  // Filtrage final
  const filteredTasks = useMemo(() => {
    let list = allTasks;
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);
    if (showOverdueOnly)
      list = list.filter((t) => t.due_date && daysSince(t.due_date) > 0 && t.status !== 'completed');
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) =>
        [t.title, t.description, t.lead_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [allTasks, priorityFilter, showOverdueOnly, search]);

  const buckets = useMemo(() => groupTasksByDate(filteredTasks), [filteredTasks]);
  const completedTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'completed'),
    [filteredTasks]
  );
  const hasActiveTasks = Object.values(buckets).some((b) => b.tasks.length > 0);

  // Handlers
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleComplete = useCallback(
    async (task) => {
      await completeTask.mutateAsync(task.task_id || task.id);
    },
    [completeTask]
  );

  const handleDelete = useCallback(
    async (task) => {
      const ok = await confirm({
        title: 'Supprimer cette tâche ?',
        description: 'La tâche sera archivée. Cette action peut être annulée par un administrateur.',
        variant: 'danger',
        confirmText: 'Supprimer',
      });
      if (ok) await deleteTask.mutateAsync(task.task_id || task.id);
    },
    [confirm, deleteTask]
  );

  const handleOpenLead = useCallback(
    (task) => {
      if (task.lead_id) navigate(`/leads/${task.lead_id}`);
    },
    [navigate]
  );

  const handleSubmitTask = useCallback(
    async (payload) => {
      await createTask.mutateAsync(payload);
      setModalOpen(false);
    },
    [createTask]
  );

  const handleBulkComplete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await Promise.all(ids.map((id) => completeTask.mutateAsync(id)));
    setSelectedIds(new Set());
  }, [selectedIds, completeTask]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const ok = await confirm({
      title: `Supprimer ${ids.length} tâches ?`,
      description: 'Les tâches seront archivées. Action annulable par un admin.',
      variant: 'danger',
      confirmText: 'Supprimer',
    });
    if (!ok) return;
    await Promise.all(ids.map((id) => deleteTask.mutateAsync(id)));
    setSelectedIds(new Set());
  }, [selectedIds, confirm, deleteTask]);

  const resetFilters = useCallback(() => {
    setPriorityFilter('');
    setShowOverdueOnly(false);
    setSearch('');
    setStatusFilter('pending');
  }, []);

  useHotkeys({
    '/': () => searchInputRef.current?.focus(),
    c: () => setModalOpen(true),
    r: () => refetch(),
    escape: () => setSelectedIds(new Set()),
  });

  const hasFilters = priorityFilter || showOverdueOnly || search || statusFilter !== 'pending';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Tâches"
        subtitle={`${stats.pending} en attente · ${stats.completed} terminées`}
        actions={[
          {
            label: 'Actualiser',
            icon: RefreshCw,
            onClick: () => refetch(),
            loading: isRefetching,
          },
          {
            label: 'Nouvelle tâche',
            icon: Plus,
            onClick: () => setModalOpen(true),
            variant: 'primary',
          },
        ]}
      />

      {/* Stats KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={Clock} label="En attente" value={stats.pending} accent="violet" />
        <KpiCard
          icon={AlertTriangle}
          label="En retard"
          value={stats.overdue}
          accent="rose"
          onClick={() => {
            setShowOverdueOnly((v) => !v);
            setStatusFilter('pending');
          }}
          active={showOverdueOnly}
        />
        <KpiCard icon={AlertTriangle} label="Prioritaires" value={stats.urgent} accent="amber" />
        <KpiCard icon={CheckCircle2} label="Terminées" value={stats.completed} accent="emerald" />
      </div>

      {/* Tabs statut + filtre priorité */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
          {[
            { value: 'pending', label: 'À faire' },
            { value: 'completed', label: 'Terminées' },
            { value: '', label: 'Toutes' },
          ].map((t) => {
            const active = statusFilter === t.value;
            return (
              <button
                key={t.value || 'all'}
                type="button"
                onClick={() => setStatusFilter(t.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white  '
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {priorityFilter ? getPriorityConfig(priorityFilter).label : 'Priorité'}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setPriorityFilter('')}>Toutes</DropdownMenuItem>
            {PRIORITIES.map((p) => (
              <DropdownMenuItem key={p.value} onClick={() => setPriorityFilter(p.value)}>
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-slate-500">
            <X className="w-3.5 h-3.5" />
            Réinitialiser
          </Button>
        )}

        <div className="flex-1" />

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher… (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <TasksSkeleton />
      ) : statusFilter === 'completed' ? (
        completedTasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Aucune tâche terminée"
            description="Les tâches terminées apparaîtront ici."
          />
        ) : (
          <div className="space-y-2">
            {completedTasks.map((t, idx) => (
              <TaskRow
                key={t.task_id || t.id}
                task={t}
                idx={idx}
                isSelected={selectedIds.has(t.task_id || t.id)}
                onToggleSelect={() => handleToggleSelect(t.task_id || t.id)}
                onComplete={() => handleComplete(t)}
                onDelete={() => handleDelete(t)}
                onOpenLead={() => handleOpenLead(t)}
              />
            ))}
          </div>
        )
      ) : !hasActiveTasks ? (
        <EmptyState
          icon={CheckSquare}
          title={hasFilters ? 'Aucune tâche trouvée' : 'Aucune tâche en attente'}
          description={
            hasFilters
              ? 'Ajustez vos filtres ou créez une nouvelle tâche.'
              : 'Créez une tâche pour organiser votre travail de suivi.'
          }
          action={
            hasFilters
              ? { label: 'Réinitialiser les filtres', onClick: resetFilters }
              : { label: 'Créer une tâche', icon: Plus, onClick: () => setModalOpen(true) }
          }
        />
      ) : (
        <div>
          {['overdue', 'today', 'tomorrow', 'week', 'later', 'noDate'].map((key) => {
            const bucket = buckets[key];
            return (
              <TasksBucket key={key} bucket={bucket}>
                {bucket.tasks.map((t, idx) => (
                  <TaskRow
                    key={t.task_id || t.id}
                    task={t}
                    idx={idx}
                    isSelected={selectedIds.has(t.task_id || t.id)}
                    onToggleSelect={() => handleToggleSelect(t.task_id || t.id)}
                    onComplete={() => handleComplete(t)}
                    onDelete={() => handleDelete(t)}
                    onOpenLead={() => handleOpenLead(t)}
                  />
                ))}
              </TasksBucket>
            );
          })}
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-900 text-white  shadow-card-xl ring-1 ring-slate-700/50">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size > 1 ? 'tâches' : 'tâche'} sélectionnée
              {selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="w-px h-5 bg-slate-700" />
            <button
              type="button"
              onClick={handleBulkComplete}
              className="text-sm font-medium text-emerald-300 hover:opacity-80 flex items-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              Terminer
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="text-sm font-medium text-rose-300 hover:opacity-80 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
            <div className="w-px h-5 bg-slate-700" />
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="hover:opacity-80 transition-opacity"
              aria-label="Effacer la sélection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <TaskFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleSubmitTask}
        isPending={createTask.isPending}
        leads={leads}
      />

      <ConfirmElement />
    </div>
  );
}
