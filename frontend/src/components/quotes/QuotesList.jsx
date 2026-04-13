/**
 * QuotesList — Vague 2.
 *
 * Refonte complète : branchement sur React Query + composants partagés.
 *
 * Features préservées :
 *   - Filtres statut (chips avec compteurs live) + recherche
 *   - Stats en haut (total, CA total, CA accepté, taux de conversion)
 *   - Actions : voir (→ lead), envoyer, convertir en facture, supprimer
 *   - Détection des devis expirants (≤ 3j) et expirés
 *   - Création devis classique + devis vocal (modal VoiceQuote)
 *
 * Nouveautés :
 *   - Branchement React Query → création/update répercutés partout
 *   - Édition inline du statut via menu contextuel
 *   - Lien Quote → Lead cliquable
 *   - Bulk actions (suppression multiple)
 *   - Raccourcis clavier : / recherche, C créer, R refresh
 */
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Search, X, RefreshCw, FileText, Send, Trash2,
  ArrowRight, Mic, AlertTriangle,
  DollarSign, TrendingUp, BarChart3, Zap, Inbox, ExternalLink, ChevronDown,
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

// Mappe les variantes sans accent vers le statut canonique
function normalizeStatus(s) {
  if (!s) return 'brouillon';
  const map = {
    envoye: 'envoyé',
    accepte: 'accepté',
    refuse: 'refusé',
    expire: 'expiré',
  };
  return map[s] || s;
}

// ── KPI card ─────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, accent = 'violet' }) {
  const accents = {
    violet: 'from-violet-500/10 to-violet-500/5 ring-violet-200 dark:ring-violet-900/40 text-violet-600',
    blue: 'from-blue-500/10 to-blue-500/5 ring-blue-200 dark:ring-blue-900/40 text-blue-600',
    emerald: 'from-emerald-500/10 to-emerald-500/5 ring-emerald-200 dark:ring-emerald-900/40 text-emerald-600',
    amber: 'from-amber-500/10 to-amber-500/5 ring-amber-200 dark:ring-amber-900/40 text-amber-600',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${accents[accent]} ring-1 p-4 animate-fade-in-up`}>
      <Icon className="w-5 h-5 mb-3" />
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{value}</div>
      <div className="text-xs text-slate-600 mt-1">{label}</div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────
function QuotesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 p-5 section-card/30"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-20 /60 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 /60 rounded-full animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-4" />
          <div className="h-3 w-full /60 rounded animate-pulse mt-4" />
        </div>
      ))}
    </div>
  );
}

// ── Carte devis ──────────────────────────────────────────────────
function QuoteCard({ quote, isSelected, onToggleSelect, onView, onSend, onConvert, onDelete, onStatusChange }) {
  const status = normalizeStatus(quote.status);
  const isDraft = status === 'brouillon';
  const isSent = status === 'envoyé';
  const isAccepted = status === 'accepté';

  // Calcul jours avant expiration (devis envoyés seulement)
  const expiryDays = quote.expiry_date ? -daysSince(quote.expiry_date) : null;
  const isExpiringSoon = expiryDays !== null && expiryDays > 0 && expiryDays <= 3 && isSent;
  const isExpired = expiryDays !== null && expiryDays < 0 && isSent;

  return (
    <div
      className={`
        group relative rounded-xl border p-5 cursor-pointer
        transition-all duration-200 ease-standard animate-fade-in-up
        ${isSelected
          ? 'border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-950/20 shadow-brand'
          : 'border-slate-200 section-card/30 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-card-lg'}
      `}
      onClick={onView}
    >
      {/* Accent top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl opacity-80"
        style={{
          background: isAccepted
            ? 'linear-gradient(90deg, #10b981, #34d399)'
            : isSent
              ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
              : isDraft
                ? 'linear-gradient(90deg, #94a3b8, #cbd5e1)'
                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
        }}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                aria-label="Sélectionner"
              />
            </div>
            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs font-mono text-slate-500 truncate">
              {quote.quote_number || (quote.quote_id ? quote.quote_id.slice(0, 8) : '—')}
            </span>
          </div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {quote.lead_name || quote.client_name || 'Sans client'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {quote.service_type || 'Service non précisé'}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <StatusBadge domain="quote" status={status} />
        </div>
      </div>

      <div className="flex items-end justify-between mt-4">
        <div>
          <div className="text-xs text-slate-500">Montant</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {quote.amount
              ? `${Number(quote.amount).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
              : '—'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">{relativeTime(quote.created_at)}</div>
          {(isExpiringSoon || isExpired) && (
            <div className={`mt-1 text-xs font-semibold flex items-center gap-1 justify-end ${
              isExpired ? 'text-rose-600' : 'text-amber-600'
            }`}>
              <AlertTriangle className="w-3 h-3" />
              {isExpired ? 'Expiré' : `Expire dans ${expiryDays}j`}
            </div>
          )}
        </div>
      </div>

      {/* Actions row */}
      <div
        className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <DropdownMenuLabel className="text-xs">Changer le statut</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {QUOTE_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                <StatusBadge domain="quote" status={s} size="xs" />
                <span className="ml-2 text-sm">{QUOTE_STATUS_LABELS[s]}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-600">
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────
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

  // Normaliser la liste : la route GET /quotes renvoie parfois {items: [...]}
  const quotesList = useMemo(() => {
    if (Array.isArray(quotes)) return quotes;
    return quotes?.items || quotes?.quotes || [];
  }, [quotes]);

  // Stats live calculées depuis le cache
  const stats = useMemo(() => {
    const totalCount = quotesList.length;
    const totalAmount = quotesList.reduce((s, q) => s + (Number(q.amount) || 0), 0);
    const accepted = quotesList.filter((q) => normalizeStatus(q.status) === 'accepté');
    const acceptedAmount = accepted.reduce((s, q) => s + (Number(q.amount) || 0), 0);
    const conversionRate = totalCount > 0 ? Math.round((accepted.length / totalCount) * 100) : 0;
    return { totalCount, totalAmount, acceptedAmount, conversionRate };
  }, [quotesList]);

  // Compteurs par statut (pour les chips)
  const statusCounts = useMemo(() => {
    const counts = { '': quotesList.length };
    quotesList.forEach((q) => {
      const s = normalizeStatus(q.status);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [quotesList]);

  // Filtrage
  const filteredQuotes = useMemo(() => {
    let list = quotesList;
    if (status) {
      list = list.filter((q) => normalizeStatus(q.status) === status);
    }
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

  // Handlers
  const handleView = useCallback(
    (quote) => {
      if (quote.lead_id) navigate(`/leads/${quote.lead_id}`);
      else toast.info('Ce devis n\'est lié à aucun lead');
    },
    [navigate]
  );

  const handleSend = useCallback(
    async (quote) => {
      const ok = await confirm({
        title: 'Envoyer ce devis ?',
        description: 'Le devis sera envoyé par email au client. Cette action est définitive.',
        variant: 'info',
        confirmText: 'Envoyer',
      });
      if (ok) await sendQuote.mutateAsync(quote.quote_id);
    },
    [confirm, sendQuote]
  );

  const handleConvert = useCallback(
    async (quote) => {
      const ok = await confirm({
        title: 'Convertir en facture ?',
        description: `Une facture sera créée à partir de ce devis (${Number(quote.amount).toLocaleString('fr-FR')} €).`,
        variant: 'info',
        confirmText: 'Convertir',
      });
      if (!ok) return;
      try {
        await axios.post(
          `${BACKEND_URL}/api/invoices/from-quote/${quote.quote_id}`,
          {},
          { withCredentials: true }
        );
        toast.success('Facture créée à partir du devis');
        refetch();
        navigate('/invoices');
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Erreur lors de la conversion');
      }
    },
    [confirm, refetch, navigate]
  );

  const handleDelete = useCallback(
    async (quote) => {
      const ok = await confirm({
        title: 'Supprimer ce devis ?',
        description: 'Le devis sera archivé. Cette action peut être annulée par un administrateur.',
        variant: 'danger',
        confirmText: 'Supprimer',
      });
      if (ok) await deleteQuote.mutateAsync(quote.quote_id);
    },
    [confirm, deleteQuote]
  );

  const handleStatusChange = useCallback(
    async (quote, nextStatus) => {
      await updateQuote.mutateAsync({ quoteId: quote.quote_id, payload: { status: nextStatus } });
      toast.success(`Statut changé en "${QUOTE_STATUS_LABELS[nextStatus]}"`);
    },
    [updateQuote]
  );

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

  // Raccourcis clavier
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

      {/* Stats KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={BarChart3} label="Total devis" value={stats.totalCount} accent="violet" />
        <KpiCard
          icon={DollarSign}
          label="CA total"
          value={`${stats.totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
          accent="blue"
        />
        <KpiCard
          icon={TrendingUp}
          label="CA accepté"
          value={`${stats.acceptedAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
          accent="emerald"
        />
        <KpiCard
          icon={Zap}
          label="Taux de conversion"
          value={`${stats.conversionRate}%`}
          accent="amber"
        />
      </div>

      {/* Filtres chips */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ease-snappy
            ${status === ''
              ? 'bg-slate-900 text-white   shadow-sm'
              : 'section-card/40 text-slate-600 border border-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}
          `}
        >
          <FileText className="w-3.5 h-3.5" />
          Tous
          <span className="text-xs opacity-70">{statusCounts[''] || 0}</span>
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
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ease-snappy
                ${active
                  ? 'bg-slate-900 text-white   shadow-sm'
                  : 'section-card/40 text-slate-600 border border-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}
              `}
            >
              <StatusBadge domain="quote" status={s} size="xs" className="-ml-1 pointer-events-none" />
              <span className="text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Barre recherche */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher par client, service, numéro… (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-slate-500">
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
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-900 text-white  shadow-card-xl ring-1 ring-slate-700/50 dark:ring-slate-300/50">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size > 1 ? 'devis sélectionnés' : 'devis sélectionné'}
            </span>
            <div className="w-px h-5 bg-slate-700 dark:bg-slate-300" />
            <button
              type="button"
              onClick={handleBulkDelete}
              className="text-sm font-medium text-rose-300 dark:text-rose-600 hover:opacity-80 transition-opacity flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
            <div className="w-px h-5 bg-slate-700 dark:bg-slate-300" />
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

      {/* Modal devis vocal */}
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
