/**
 * LeadsList — ATELIER direction
 * Identité visuelle crème / émeraude / terracotta / Fraunces
 * Logique 100% préservée (React Query, bulk ops, favoris, hotkeys, export).
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Search, Download, Users, Filter, X, ChevronDown, LayoutGrid, List as ListIcon,
  Phone, Mail, Star, Trash2, RefreshCw,
  Check, Inbox, UserCheck, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLeadsList, useBulkUpdateLeads, useDeleteLead, useUpdateLead } from '../../hooks/api';
import useHotkeys from '../../hooks/useHotkeys';
import { PageHeader, EmptyState, StatusBadge, useConfirm } from '../shared';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import { relativeTime } from '../../lib/dates';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  getAllowedNextStatuses,
} from '../../lib/leadStatus';
import BACKEND_URL from '../../config.js';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';

const SERVICES = ['Ménage', 'Canapé', 'Matelas', 'Tapis', 'Bureaux'];
const SOURCES = ['Google Ads', 'SEO', 'Meta Ads', 'Direct', 'Referral', 'Recommandation'];
const PERIODS = [
  { value: 'all', label: 'Tous les leads' },
  { value: '1d', label: "Aujourd'hui" },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
  { value: '1y', label: 'Cette année' },
];
const FAVORITES_KEY = 'crm:favorite-leads';

// ── Favoris persistés ───────────────────────────────────────────
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveFavorites(set) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(set))); } catch {}
}

// ── Avatar (crème → encre, pas de violet) ───────────────────────
const Avatar = ({ name, size = 'md' }) => {
  const letter = (name || '?').charAt(0).toUpperCase();
  const cls = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-10 h-10 text-base';
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center font-display font-semibold text-neutral-700 flex-shrink-0`}>
      {letter}
    </div>
  );
};

// ── Skeleton (crème) ────────────────────────────────────────────
function LeadsSkeleton({ view = 'table' }) {
  const rows = Array.from({ length: 6 });
  if (view === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rows.map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-neutral-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-neutral-100 rounded-full animate-pulse" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-16 bg-neutral-100 rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-neutral-100 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
      {rows.map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-200 last:border-b-0">
          <div className="w-4 h-4 bg-neutral-200 rounded animate-pulse" />
          <div className="w-9 h-9 rounded-full bg-neutral-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 bg-neutral-200 rounded animate-pulse" />
            <div className="h-3 w-28 bg-neutral-100 rounded animate-pulse" />
          </div>
          <div className="h-6 w-20 bg-neutral-100 rounded-full animate-pulse" />
          <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ── Menu statut ─────────────────────────────────────────────────
function StatusQuickMenu({ currentStatus, onChange, trigger }) {
  const allowed = getAllowedNextStatuses(currentStatus);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
          Changer le statut
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allowed.length === 0 ? (
          <DropdownMenuItem disabled className="text-xs text-neutral-400">
            Aucune transition disponible
          </DropdownMenuItem>
        ) : (
          allowed.map((s) => (
            <DropdownMenuItem key={s} onClick={() => onChange(s)} className="gap-2">
              <StatusBadge domain="lead" status={s} size="xs" />
              <span className="text-sm">{LEAD_STATUS_LABELS[s]}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Service chip (terracotta au lieu de violet) ─────────────────
const ServiceChip = ({ service }) => (
  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-terracotta-50 text-terracotta-700 ring-1 ring-inset ring-terracotta-200">
    {service || '—'}
  </span>
);

// ── Vue tableau ─────────────────────────────────────────────────
function LeadsTable({ leads, selectedIds, onToggleSelect, onToggleAll, favorites, onToggleFavorite, onStatusChange, onRowClick, updatingId }) {
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.lead_id));
  const someSelected = leads.some((l) => selectedIds.has(l.lead_id));

  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="py-3 pl-4 pr-2 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onToggleAll(!allSelected)}
                  aria-label="Tout sélectionner"
                  className={someSelected && !allSelected ? 'opacity-60' : ''}
                />
              </th>
              <th className="py-3 pr-2 w-10"></th>
              {['Client', 'Contact', 'Service', 'Source', 'Score', 'Statut', 'Dernière activité'].map(h => (
                <th key={h} className="py-3 px-2 text-left font-semibold text-neutral-600 text-[10px] uppercase tracking-[0.08em] font-mono">{h}</th>
              ))}
              <th className="py-3 pr-4 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, idx) => {
              const isSelected = selectedIds.has(lead.lead_id);
              const isFavorite = favorites.has(lead.lead_id);
              const isUpdating = updatingId === lead.lead_id;
              const lastActivity = lead.updated_at || lead.created_at;

              return (
                <tr
                  key={lead.lead_id}
                  className={`
                    border-b border-neutral-200 last:border-b-0 transition-colors cursor-pointer group
                    ${isSelected ? 'bg-brand-50/50' : 'hover:bg-neutral-50'}
                    ${isUpdating ? 'opacity-60 pointer-events-none' : ''}
                  `}
                  style={{ animationDelay: `${idx * 20}ms` }}
                  onClick={() => onRowClick(lead.lead_id)}
                >
                  <td className="py-3 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(lead.lead_id)} aria-label={`Sélectionner ${lead.name}`} />
                  </td>
                  <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(lead.lead_id)}
                      className="p-1 rounded hover:bg-neutral-100 transition-colors"
                      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Star className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-terracotta-400 text-terracotta-500' : 'text-neutral-300 group-hover:text-neutral-400'}`} />
                    </button>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={lead.name} size="sm" />
                      <div className="min-w-0">
                        <div className="font-semibold text-neutral-900 truncate">{lead.name || 'Sans nom'}</div>
                        {lead.surface && <div className="text-xs text-neutral-500">{lead.surface} m²</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="space-y-0.5">
                      {lead.email && <div className="text-xs text-neutral-600 truncate max-w-[180px]">{lead.email}</div>}
                      {lead.phone && <div className="text-xs text-neutral-500">{lead.phone}</div>}
                    </div>
                  </td>
                  <td className="py-3 px-2"><ServiceChip service={lead.service_type} /></td>
                  <td className="py-3 px-2 text-xs text-neutral-600">{lead.source || '—'}</td>
                  <td className="py-3 px-2"><LeadScoreBadge score={lead.score} /></td>
                  <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                    <StatusQuickMenu
                      currentStatus={lead.status}
                      onChange={(next) => onStatusChange(lead.lead_id, next)}
                      trigger={
                        <button type="button" className="inline-flex items-center gap-1 group/status">
                          <StatusBadge domain="lead" status={lead.status} />
                          <ChevronDown className="w-3 h-3 text-neutral-400 opacity-0 group-hover/status:opacity-100 transition-opacity" />
                        </button>
                      }
                    />
                  </td>
                  <td className="py-3 px-2 text-xs text-neutral-500 whitespace-nowrap">{relativeTime(lastActivity)}</td>
                  <td className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRowClick(lead.lead_id)}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Vue cartes ──────────────────────────────────────────────────
function LeadsCards({ leads, selectedIds, onToggleSelect, favorites, onToggleFavorite, onStatusChange, onCardClick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {leads.map((lead, idx) => {
        const isSelected = selectedIds.has(lead.lead_id);
        const isFavorite = favorites.has(lead.lead_id);
        return (
          <div
            key={lead.lead_id}
            onClick={() => onCardClick(lead.lead_id)}
            className={`
              group relative rounded-xl border p-4 cursor-pointer bg-white transition-all duration-200
              ${isSelected ? 'border-brand-300 bg-brand-50/40 shadow-brand' : 'border-neutral-200 hover:border-neutral-300 hover:shadow-card-lg'}
            `}
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div className="flex items-start gap-3">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(lead.lead_id)} aria-label={`Sélectionner ${lead.name}`} className="mt-1" />
              </div>
              <Avatar name={lead.name} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-neutral-900 truncate">{lead.name || 'Sans nom'}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{relativeTime(lead.updated_at || lead.created_at)}</div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(lead.lead_id); }}
                className="p-1 rounded hover:bg-neutral-100 transition-colors flex-shrink-0"
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-terracotta-400 text-terracotta-500' : 'text-neutral-300'}`} />
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              {lead.email && (
                <div className="flex items-center gap-1.5 text-neutral-600 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <Phone className="w-3 h-3 flex-shrink-0" /><span>{lead.phone}</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <ServiceChip service={lead.service_type} />
              <div onClick={(e) => e.stopPropagation()}>
                <StatusQuickMenu
                  currentStatus={lead.status}
                  onChange={(next) => onStatusChange(lead.lead_id, next)}
                  trigger={<button type="button"><StatusBadge domain="lead" status={lead.status} /></button>}
                />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center justify-between">
              <LeadScoreBadge score={lead.score} />
              {lead.source && <span className="text-xs text-neutral-400 truncate max-w-[100px]">{lead.source}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Barre bulk (flottante bas) ──────────────────────────────────
function BulkActionsBar({ count, onClearSelection, onBulkStatusChange, onBulkDelete, onBulkExport }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-neutral-900 text-white shadow-card-xl ring-1 ring-neutral-800">
        <span className="text-sm font-medium">
          {count} {count > 1 ? 'leads sélectionnés' : 'lead sélectionné'}
        </span>
        <div className="w-px h-5 bg-neutral-700" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-sm font-medium hover:opacity-80 transition-opacity flex items-center gap-1">
              <UserCheck className="w-4 h-4" />Changer statut
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuLabel className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
              Appliquer à {count} leads
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LEAD_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onBulkStatusChange(s)} className="gap-2">
                <StatusBadge domain="lead" status={s} size="xs" />
                <span className="text-sm">{LEAD_STATUS_LABELS[s]}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button type="button" onClick={onBulkExport} className="text-sm font-medium hover:opacity-80 transition-opacity flex items-center gap-1">
          <Download className="w-4 h-4" />Exporter
        </button>
        <button type="button" onClick={onBulkDelete} className="text-sm font-medium text-terracotta-300 hover:opacity-80 transition-opacity flex items-center gap-1">
          <Trash2 className="w-4 h-4" />Supprimer
        </button>
        <div className="w-px h-5 bg-neutral-700" />
        <button type="button" onClick={onClearSelection} className="hover:opacity-80 transition-opacity" aria-label="Effacer la sélection">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════
export default function LeadsList() {
  const navigate = useNavigate();
  const { confirm, ConfirmElement } = useConfirm();
  const searchInputRef = useRef(null);

  const [view, setView] = useState(() => localStorage.getItem('crm:leads-view') || 'table');
  const [status, setStatus] = useState('');
  const [service, setService] = useState('');
  const [source, setSource] = useState('');
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [favorites, setFavorites] = useState(loadFavorites);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => { localStorage.setItem('crm:leads-view', view); }, [view]);

  const filters = useMemo(() => ({
    status: status || undefined,
    service_type: service || undefined,
    source: source || undefined,
    period,
    page: 1,
    page_size: 200,
  }), [status, service, source, period]);

  const { data: allLeads = [], isLoading, isRefetching, refetch } = useLeadsList(filters);
  const bulkUpdate = useBulkUpdateLeads();
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();

  const visibleLeads = useMemo(() => {
    if (!search.trim()) {
      return [...allLeads].sort((a, b) => {
        const af = favorites.has(a.lead_id) ? 1 : 0;
        const bf = favorites.has(b.lead_id) ? 1 : 0;
        return bf - af;
      });
    }
    const q = search.trim().toLowerCase();
    return allLeads.filter((l) =>
      [l.name, l.email, l.phone, l.service_type, l.address]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [allLeads, search, favorites]);

  const statusCounts = useMemo(() => {
    const counts = { '': allLeads.length };
    allLeads.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return counts;
  }, [allLeads]);

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((checked) => {
    if (checked) setSelectedIds(new Set(visibleLeads.map((l) => l.lead_id)));
    else setSelectedIds(new Set());
  }, [visibleLeads]);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleToggleFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleStatusChange = useCallback(async (leadId, nextStatus) => {
    setUpdatingId(leadId);
    try {
      await updateLead.mutateAsync({ leadId, payload: { status: nextStatus } });
      toast.success(`Statut changé en "${LEAD_STATUS_LABELS[nextStatus]}"`);
    } finally { setUpdatingId(null); }
  }, [updateLead]);

  const handleRowClick = useCallback((leadId) => navigate(`/leads/${leadId}`), [navigate]);

  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (service) params.append('service_type', service);
      if (source) params.append('source', source);
      const response = await axios.get(`${BACKEND_URL}/api/leads/export?${params.toString()}`, { responseType: 'blob', withCredentials: true });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export CSV généré');
    } catch (err) { toast.error(err?.message || "Échec de l'export"); }
  }, [status, service, source]);

  const handleBulkStatusChange = useCallback(async (nextStatus) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const ok = await confirm({
      title: `Changer le statut de ${ids.length} leads ?`,
      description: `Tous les leads sélectionnés passeront en "${LEAD_STATUS_LABELS[nextStatus]}".`,
      confirmText: 'Appliquer', variant: 'warning',
    });
    if (!ok) return;
    await bulkUpdate.mutateAsync({ lead_ids: ids, status: nextStatus });
    setSelectedIds(new Set());
  }, [selectedIds, bulkUpdate, confirm]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const ok = await confirm({
      title: `Supprimer ${ids.length} leads ?`,
      description: "Cette action est irréversible. Les leads seront archivés et n'apparaîtront plus dans la liste.",
      confirmText: 'Supprimer', variant: 'danger',
    });
    if (!ok) return;
    await Promise.all(ids.map((id) => deleteLead.mutateAsync(id)));
    setSelectedIds(new Set());
  }, [selectedIds, deleteLead, confirm]);

  const handleBulkExport = useCallback(() => handleExport(), [handleExport]);

  const resetFilters = useCallback(() => {
    setStatus(''); setService(''); setSource(''); setPeriod('all'); setSearch('');
  }, []);

  useHotkeys({
    '/': () => searchInputRef.current?.focus(),
    c: () => navigate('/leads/new'),
    e: () => handleExport(),
    r: () => refetch(),
    escape: () => handleClearSelection(),
  });

  const hasFilters = status || service || source || search || period !== 'all';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Leads"
        subtitle={`${allLeads.length} ${allLeads.length > 1 ? 'leads trouvés' : 'lead trouvé'}${hasFilters ? ' (filtrés)' : ''}`}
        actions={[
          { label: 'Actualiser', icon: RefreshCw, onClick: () => refetch(), loading: isRefetching },
          { label: 'Exporter', icon: Download, onClick: handleExport },
          { label: 'Nouveau lead', icon: Plus, onClick: () => navigate('/leads/new'), variant: 'primary' },
        ]}
      />

      {/* Chips de statut */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
            ${status === '' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'}`}
        >
          <Users className="w-3.5 h-3.5" />
          Tous
          <span className="text-xs opacity-70 tabular-nums">{statusCounts[''] || 0}</span>
        </button>
        {LEAD_STATUSES.map((s) => {
          const count = statusCounts[s] || 0;
          if (count === 0 && status !== s) return null;
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(active ? '' : s)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${active ? 'bg-neutral-900 text-white shadow-sm' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'}`}
            >
              <StatusBadge domain="lead" status={s} size="xs" className="-ml-1 pointer-events-none" />
              <span className="text-xs opacity-70 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Recherche + filtres avancés */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher par nom, email, téléphone… (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100">
              <X className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />{service || 'Service'}<ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setService('')}>Tous les services</DropdownMenuItem>
            <DropdownMenuSeparator />
            {SERVICES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setService(s)}>
                {service === s && <Check className="w-3.5 h-3.5 mr-1.5" />}{s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {source || 'Source'}<ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setSource('')}>Toutes les sources</DropdownMenuItem>
            <DropdownMenuSeparator />
            {SOURCES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setSource(s)}>
                {source === s && <Check className="w-3.5 h-3.5 mr-1.5" />}{s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {PERIODS.find((p) => p.value === period)?.label || 'Période'}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {PERIODS.map((p) => (
              <DropdownMenuItem key={p.value} onClick={() => setPeriod(p.value)}>
                {period === p.value && <Check className="w-3.5 h-3.5 mr-1.5" />}{p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-neutral-500">
            <X className="w-3.5 h-3.5" />Réinitialiser
          </Button>
        )}

        <div className="flex-1" />

        {/* Toggle vue */}
        <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setView('table')}
            className={`p-2 transition-colors ${view === 'table' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            aria-label="Vue tableau"
          >
            <ListIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('cards')}
            className={`p-2 transition-colors ${view === 'cards' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            aria-label="Vue cartes"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <LeadsSkeleton view={view} />
      ) : visibleLeads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={hasFilters ? 'Aucun lead trouvé' : 'Aucun lead pour le moment'}
          description={hasFilters ? 'Essayez de modifier vos filtres ou de réinitialiser la recherche.' : 'Créez votre premier lead pour commencer à suivre vos prospects.'}
          action={hasFilters
            ? { label: 'Réinitialiser les filtres', onClick: resetFilters }
            : { label: 'Créer un lead', icon: Plus, onClick: () => navigate('/leads/new') }}
        />
      ) : view === 'table' ? (
        <LeadsTable
          leads={visibleLeads}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleAll={handleToggleAll}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onStatusChange={handleStatusChange}
          onRowClick={handleRowClick}
          updatingId={updatingId}
        />
      ) : (
        <LeadsCards
          leads={visibleLeads}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onStatusChange={handleStatusChange}
          onCardClick={handleRowClick}
        />
      )}

      {selectedIds.size > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          onClearSelection={handleClearSelection}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
        />
      )}

      <ConfirmElement />
    </div>
  );
}
