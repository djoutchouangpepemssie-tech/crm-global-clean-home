/**
 * QuotesList — Atelier direction.
 *
 * Palette Atelier (terracotta + émeraude + crème + encre chaude) en remplacement
 * des accents violet/blue/emerald/amber génériques.
 *
 * Features préservées 1:1 : filtres, recherche, stats, actions, bulk,
 * raccourcis clavier, devis vocal. Aucune logique modifiée.
 */
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Search, X, RefreshCw, FileText, Send, Trash2,
  ArrowRight, Mic, AlertTriangle,
  Coins, TrendingUp, BarChart3, Zap, Inbox, ExternalLink, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { useQuotesList, useSendQuote, useDeleteQuote, useUpdateQuote } from '../../hooks/api';
import useHotkeys from '../../hooks/useHotkeys';
import { PageHeader, EmptyState, StatusBadge, useConfirm } from '../shared';
import { relativeTime, daysSince } from '../../lib/dates';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import VoiceQuote from './VoiceQuote';
import BACKEND_URL from '../../config.js';

const QUOTE_STATUSES = ['brouillon', 'envoyé', 'accepté', 'refusé', 'expiré'];

const QUOTE_STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoyé: 'Envoyé',
  accepté: 'Accepté',
  refusé: 'Refusé',
  expiré: 'Expiré',
};

function normalizeStatus(s) {
  if (!s) return 'brouillon';
  const map = { envoye: 'envoyé', accepte: 'accepté', refuse: 'refusé', expire: 'expiré' };
  return map[s] || s;
}

/* ── KPI card — Atelier ─────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, accent = 'brand' }) {
  // Atelier accents : brand (émeraude), accent (terracotta), amber (safran), ink (sable)
  const accents = {
    brand:   { bg: 'bg-brand-50/60',   ring: 'ring-brand-200/60',   icon: 'text-brand-700',   bar: 'bg-brand-600' },
    accent:  { bg: 'bg-accent-50/60',  ring: 'ring-accent-200/60',  icon: 'text-accent-700',  bar: 'bg-accent-600' },
    amber:   { bg: 'bg-amber-50/60',   ring: 'ring-amber-200/60',   icon: 'text-amber-700',   bar: 'bg-amber-600' },
    ink:     { bg: 'bg-ink-50/80',     ring: 'ring-ink-200/60',     icon: 'text-ink-700',     bar: 'bg-ink-600' },
  };
  const a = accents[accent] || accents.brand;
  return (
    <div className={`relative rounded-card ${a.bg} ring-1 ${a.ring} p-4 animate-fade-in-up overflow-hidden`}>
      <span className={`absolute top-0 left-0 h-full w-[3px] ${a.bar}`} aria-hidden />
      <Icon className={`w-[18px] h-[18px] mb-3 ${a.icon}`} strokeWidth={1.8} />
      <div className="text-display text-2xl font-semibold text-ink-900 tracking-tight tabular-nums">
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-600 mt-1">
        {label}
      </div>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function QuotesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-card border border-ink-200 p-5 bg-bg-card">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-ink-100 rounded animate-pulse" />
              <div className="h-3 w-20 bg-ink-100/60 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-ink-100/60 rounded-full animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-ink-100 rounded animate-pulse mt-4" />
          <div className="h-3 w-full bg-ink-100/60 rounded animate-pulse mt-4" />
        </div>
      ))}
    </div>
  );
}

/* ── Quote card — Atelier ───────────────────────────────────────── */
function QuoteCard({ quote, isSelected, onToggleSelect, onView, onSend, onConvert, onDelete, onStatusChange }) {
  const status = normalizeStatus(quote.status);
  const isDraft = status === 'brouillon';
  const isSent = status === 'envoyé';
  const isAccepted = status === 'accepté';

  const expiryDays = quote.expiry_date ? -daysSince(quote.expiry_date) : null;
  const isExpiringSoon = expiryDays !== null && expiryDays > 0 && expiryDays <= 3 && isSent;
  const isExpired = expiryDays !== null && expiryDays < 0 && isSent;

  // Filet de gauche selon statut (plus éditorial qu'une barre top colorée)
  const statusBar =
    isAccepted ? 'bg-brand-600'
    : isSent ? 'bg-accent-600'
    : isDraft ? 'bg-ink-300'
    : 'bg-amber-600';

  return (
    <div
      className={`
        group relative rounded-card border p-5 cursor-pointer overflow-hidden
        transition-all duration-200 ease-out animate-fade-in-up
        ${isSelected
          ? 'border-accent-300 bg-accent-50/40 shadow-sm'
          : 'border-ink-200 bg-bg-card hover:border-ink-300 hover:shadow-md'}
      `}
      onClick={onView}
    >
      {/* Filet gauche statut */}
      <span className={`absolute top-0 left-0 h-full w-[3px] ${statusBar}`} aria-hidden />

      <div className="flex items-start justify-between gap-3 mb-3 ml-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                aria-label="Sélectionner"
              />
            </div>
            <FileText className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" strokeWidth={1.8} />
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-500 truncate">
              {quote.quote_number || (quote.quote_id ? quote.quote_id.slice(0, 8) : '—')}
            </span>
          </div>
          <div className="text-display font-semibold text-ink-900 truncate leading-tight">
            {quote.lead_name || quote.client_name || 'Sans client'}
          </div>
          <div className="text-xs text-ink-500 mt-1">
            {quote.service_type || 'Service non précisé'}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <StatusBadge domain="quote" status={status} />
        </div>
      </div>

      <div className="flex items-end justify-between mt-4 ml-1">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-500">Montant</div>
          <div className="text-display text-2xl font-semibold text-ink-900 tracking-tight tabular-nums mt-0.5">
            {quote.amount
              ? `${Number(quote.amount).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
              : '—'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] tracking-[0.02em] text-ink-400">
            {relativeTime(quote.created_at)}
          </div>
          {(isExpiringSoon || isExpired) && (
            <div className={`mt-1 text-xs font-semibold flex items-center gap-1 justify-end ${
              isExpired ? 'text-rose-700' : 'text-amber-700'
            }`}>
              <AlertTriangle className="w-3 h-3" strokeWidth={2} />
              {isExpired ? 'Expiré' : `Expire dans ${expiryDays}j`}
            </div>
          )}
        </div>
      </div>

      {/* Actions row */}
      <div
        className="mt-4 pt-3 ml-1 border-t border-ink-200 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {isDraft && (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs flex-1" onClick={onSend}>
            <Send className="w-3 h-3 mr-1" />
            Envoyer
          </Button>
        )}
        {isAccepted && (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs flex-1" onClick={onConvert}>
            <ArrowRight className="w-3 h-3 mr-1" />
            En facture
          </Button>
        )}
        {quote.lead_id && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onView}>
            <ExternalLink className="w-3 h-3 mr-1" />
            Lead
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs font-mono uppercase tracking-wider">
              Changer le statut
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {QUOTE_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                <StatusBadge domain="quote" status={s} size="xs" />
                <span className="ml-2 text-sm">{QUOTE_STATUS_LABELS[s]}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-rose-700 focus:text-rose-700">
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function QuotesList() {
  const navigate = useNavigate();
  const { confirm, ConfirmElement } = useConfirm();
  const searchInputRef = useRef(null);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const { data: quotes = [], isLoading, isRefetching, refetch } = useQuotesList();
  const sendQuote = useSendQuote();
  const deleteQuote = useDeleteQuote();
  const updateQuote = useUpdateQuote();

  const quotesList = useMemo(() => {
    if (Array.isArray(quotes)) return quotes;
    return quotes?.items || quotes?.quotes || [];
  }, [quotes]);

  const stats = useMemo(() => {
    const totalCount = quotesList.length;
    const totalAmount = quotesList.reduce((s, q) => s + (Number(q.amount) || 0), 0);
    const accepted = quotesList.filter((q) => normalizeStatus(q.status) === 'accepté');
    const acceptedAmount = accepted.reduce((s, q) => s + (Number(q.amount) || 0), 0);
    const conversionRate = totalCount > 0 ? Math.round((accepted.length / totalCount) * 100) : 0;
    return { totalCount, totalAmount, acceptedAmount, conversionRate };
  }, [quotesList]);

  const statusCounts = useMemo(() => {
    const counts = { '': quotesList.length };
    quotesList.forEach((q) => {
      const s = normalizeStatus(q.status);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [quotesList]);

  const filteredQuotes = useMemo(() => {
    let list = quotesList;
    if (status) list = list.filter((q) => normalizeStatus(q.status) === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((quote) =>
        [quote.lead_name, quote.client_name, quote.service_type, quote.quote_number, quote.details]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [quotesList, status, search]);

  const handleView = useCallback((quote) => {
    if (quote.lead_id) navigate(`/leads/${quote.lead_id}`);
    else toast.info('Ce devis n\'est lié à aucun lead');
  }, [navigate]);

  const handleSend = useCallback(async (quote) => {
    const ok = await confirm({
      title: 'Envoyer ce devis ?',
      description: 'Le devis sera envoyé par email au client. Cette action est définitive.',
      variant: 'info',
      confirmText: 'Envoyer',
    });
    if (ok) await sendQuote.mutateAsync(quote.quote_id);
  }, [confirm, sendQuote]);

  const handleConvert = useCallback(async (quote) => {
    const ok = await confirm({
      title: 'Convertir en facture ?',
      description: `Une facture sera créée à partir de ce devis (${Number(quote.amount).toLocaleString('fr-FR')} €).`,
      variant: 'info',
      confirmText: 'Convertir',
    });
    if (!ok) return;
    try {
      await axios.post(`${BACKEND_URL}/api/invoices/from-quote/${quote.quote_id}`, {}, { withCredentials: true });
      toast.success('Facture créée à partir du devis');
      refetch();
      navigate('/invoices');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la conversion');
    }
  }, [confirm, refetch, navigate]);

  const handleDelete = useCallback(async (quote) => {
    const ok = await confirm({
      title: 'Supprimer ce devis ?',
      description: 'Le devis sera archivé. Cette action peut être annulée par un administrateur.',
      variant: 'danger',
      confirmText: 'Supprimer',
    });
    if (ok) await deleteQuote.mutateAsync(quote.quote_id);
  }, [confirm, deleteQuote]);

  const handleStatusChange = useCallback(async (quote, nextStatus) => {
    await updateQuote.mutateAsync({ quoteId: quote.quote_id, payload: { status: nextStatus } });
    toast.success(`Statut changé en "${QUOTE_STATUS_LABELS[nextStatus]}"`);
  }, [updateQuote]);

  const handleToggleSelect = useCallback((quoteId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(quoteId)) next.delete(quoteId);
      else next.add(quoteId);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const ok = await confirm({
      title: `Supprimer ${ids.length} devis ?`,
      description: 'Les devis seront archivés. Action annulable par un admin.',
      variant: 'danger',
      confirmText: 'Supprimer',
    });
    if (!ok) return;
    await Promise.all(ids.map((id) => deleteQuote.mutateAsync(id)));
    setSelectedIds(new Set());
  }, [selectedIds, confirm, deleteQuote]);

  const resetFilters = useCallback(() => {
    setStatus('');
    setSearch('');
  }, []);

  useHotkeys({
    '/': () => searchInputRef.current?.focus(),
    c: () => navigate('/quotes/new'),
    r: () => refetch(),
    escape: () => setSelectedIds(new Set()),
  });

  const hasFilters = status || search;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Devis"
        subtitle={`${stats.totalCount} ${stats.totalCount > 1 ? 'devis au total' : 'devis'}${hasFilters ? ' · filtrés' : ''}`}
        actions={[
          {
            label: 'Actualiser',
            icon: RefreshCw,
            onClick: () => refetch(),
            loading: isRefetching,
          },
          {
            label: 'Devis vocal',
            icon: Mic,
            onClick: () => setShowVoice(true),
          },
          {
            label: 'Nouveau devis',
            icon: Plus,
            onClick: () => navigate('/quotes/new'),
            variant: 'primary',
          },
        ]}
      />

      {/* KPIs Atelier */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={BarChart3}  label="Total devis"        value={stats.totalCount} accent="ink" />
        <KpiCard icon={Coins}      label="CA total"           value={`${stats.totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`} accent="accent" />
        <KpiCard icon={TrendingUp} label="CA accepté"         value={`${stats.acceptedAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`} accent="brand" />
        <KpiCard icon={Zap}        label="Taux de conversion" value={`${stats.conversionRate}%`} accent="amber" />
      </div>

      {/* Chips filtres */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
            ${status === ''
              ? 'bg-ink-900 text-bg-base shadow-sm'
              : 'bg-bg-card text-ink-700 border border-ink-200 hover:border-ink-300'}
          `}
        >
          <FileText className="w-3.5 h-3.5" strokeWidth={1.8} />
          Tous
          <span className="font-mono text-[10px] opacity-70 tabular-nums">{statusCounts[''] || 0}</span>
        </button>
        {QUOTE_STATUSES.map((s) => {
          const count = statusCounts[s] || 0;
          if (count === 0 && status !== s) return null;
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(active ? '' : s)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${active
                  ? 'bg-ink-900 text-bg-base shadow-sm'
                  : 'bg-bg-card text-ink-700 border border-ink-200 hover:border-ink-300'}
              `}
            >
              <StatusBadge domain="quote" status={s} size="xs" className="-ml-1 pointer-events-none" />
              <span className="font-mono text-[10px] opacity-70 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Recherche */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" strokeWidth={1.8} />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher par client, service, numéro…  ( / )"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-ink-100"
            >
              <X className="w-3.5 h-3.5 text-ink-400" />
            </button>
          )}
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-ink-600">
            <X className="w-3.5 h-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Contenu */}
      {isLoading ? (
        <QuotesSkeleton />
      ) : filteredQuotes.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={hasFilters ? 'Aucun devis trouvé' : 'Aucun devis pour le moment'}
          description={
            hasFilters
              ? 'Ajustez vos filtres ou créez un nouveau devis.'
              : 'Créez votre premier devis manuellement ou utilisez la dictée vocale.'
          }
          action={
            hasFilters
              ? { label: 'Réinitialiser les filtres', onClick: resetFilters }
              : { label: 'Créer un devis', icon: Plus, onClick: () => navigate('/quotes/new') }
          }
          secondaryAction={!hasFilters ? { label: 'Dictée vocale', icon: Mic, onClick: () => setShowVoice(true) } : null}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.map((quote) => (
            <QuoteCard
              key={quote.quote_id}
              quote={quote}
              isSelected={selectedIds.has(quote.quote_id)}
              onToggleSelect={() => handleToggleSelect(quote.quote_id)}
              onView={() => handleView(quote)}
              onSend={() => handleSend(quote)}
              onConvert={() => handleConvert(quote)}
              onDelete={() => handleDelete(quote)}
              onStatusChange={(s) => handleStatusChange(quote, s)}
            />
          ))}
        </div>
      )}

      {/* Bulk actions floating bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-ink-900 text-bg-base shadow-lg ring-1 ring-ink-800">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size > 1 ? 'devis sélectionnés' : 'devis sélectionné'}
            </span>
            <div className="w-px h-5 bg-ink-700" />
            <button
              type="button"
              onClick={handleBulkDelete}
              className="text-sm font-medium text-rose-300 hover:text-rose-200 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
            <div className="w-px h-5 bg-ink-700" />
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

      {showVoice && (
        <VoiceQuote
          onClose={() => setShowVoice(false)}
          onQuoteCreated={() => {
            setShowVoice(false);
            refetch();
          }}
        />
      )}

      <ConfirmElement />
    </div>
  );
}
