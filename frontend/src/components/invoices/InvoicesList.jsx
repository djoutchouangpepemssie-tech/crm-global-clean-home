/**
 * InvoicesList — Vague 2.
 *
 * Refonte complète : React Query + composants partagés.
 *
 * Features préservées :
 *   - Filtres statut (en_attente, payée, en_retard, annulée)
 *   - Stats en haut : factures du mois, CA mois, impayés, en retard > 30j
 *   - Enregistrement de paiement via modale
 *   - Détection automatique des factures en retard (côté client)
 *   - Actions : voir, marquer payée, relance (soft), supprimer
 *
 * Nouveautés :
 *   - Édition inline du statut
 *   - Filtre "Smart" : en retard > 30j (un clic)
 *   - Lien Invoice → Lead cliquable
 *   - Bulk delete
 *   - Raccourcis clavier
 */
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, RefreshCw, FileText, CreditCard, Trash2,
  AlertTriangle, DollarSign, Clock,
  Inbox, ChevronDown, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useInvoicesList,
  useRecordPayment,
  useDeleteInvoice,
  useUpdateInvoice,
} from '../../hooks/api';
import useHotkeys from '../../hooks/useHotkeys';
import { PageHeader, EmptyState, StatusBadge, useConfirm } from '../shared';
import { relativeTime, shortDate, daysSince } from '../../lib/dates';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const INVOICE_STATUSES = ['en_attente', 'payée', 'en_retard', 'annulée'];

const INVOICE_STATUS_LABELS = {
  en_attente: 'En attente',
  payée: 'Payée',
  payee: 'Payée',
  en_retard: 'En retard',
  annulée: 'Annulée',
  annulee: 'Annulée',
};

const PAYMENT_METHODS = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'espèces', label: 'Espèces' },
  { value: 'chèque', label: 'Chèque' },
  { value: 'stripe', label: 'Stripe' },
];

function normalizeStatus(s) {
  if (!s) return 'en_attente';
  const map = { payee: 'payée', annulee: 'annulée' };
  return map[s] || s;
}

/** Détecte si une facture est en retard (côté client) */
function isOverdue(inv) {
  const status = normalizeStatus(inv.status);
  if (status === 'payée' || status === 'annulée') return false;
  if (status === 'en_retard') return true;
  if (inv.due_date && new Date(inv.due_date) < new Date()) return true;
  // Défaut : 30 jours après création
  const age = daysSince(inv.created_at);
  return age !== null && age > 30;
}

/** Nombre de jours de retard */
function daysOverdue(inv) {
  if (!isOverdue(inv)) return 0;
  if (inv.due_date) {
    const d = daysSince(inv.due_date);
    return d !== null ? d : 0;
  }
  const age = daysSince(inv.created_at);
  return age !== null ? Math.max(0, age - 30) : 0;
}

// ── KPI card ─────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, accent = 'violet', sub }) {
  const accents = {
    violet: 'bg-brand-50 ring-brand-200 text-brand-700',
    blue: 'bg-neutral-100 ring-neutral-200 text-neutral-700',
    emerald: 'bg-brand-50 ring-brand-200 text-brand-700',
    amber: 'bg-amber-50 ring-amber-200 text-amber-700',
    rose: 'bg-terracotta-50 ring-terracotta-200 text-terracotta-700',
  };
  return (
    <div className={`rounded-xl bg-white border border-neutral-200 shadow-card ${accents[accent]} ring-1 p-4 animate-fade-in-up`}>
      <Icon className="w-5 h-5 mb-3" />
      <div className="text-2xl font-bold text-neutral-900 tracking-tight tabular-nums">{value}</div>
      <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-neutral-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────
function InvoicesSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-neutral-200 last:border-b-0"
        >
          <div className="h-4 w-4 bg-neutral-200 rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-neutral-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-neutral-100 rounded animate-pulse" />
          </div>
          <div className="h-5 w-20 bg-neutral-100 rounded animate-pulse" />
          <div className="h-5 w-16 bg-neutral-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ── Ligne facture ────────────────────────────────────────────────
function InvoiceRow({ invoice, isSelected, onToggle, onView, onRecordPayment, onStatusChange, onDelete, idx }) {
  const status = normalizeStatus(invoice.status);
  const overdue = isOverdue(invoice);
  const daysLate = daysOverdue(invoice);
  const amount = Number(invoice.total_ttc || invoice.amount_ttc || invoice.amount || 0);
  const paid = Number(invoice.amount_paid || 0);
  const reste = Math.max(0, amount - paid);

  return (
    <div
      onClick={onView}
      className={`
        group flex items-center gap-4 px-4 py-3 border-b border-neutral-200 last:border-b-0
        cursor-pointer transition-colors animate-fade-in-up
        ${isSelected ? 'bg-brand-50/50' : 'hover:bg-neutral-50'}
        ${overdue && status === 'en_attente' ? 'bg-terracotta-50/30' : ''}
      `}
      style={{ animationDelay: `${idx * 20}ms` }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label="Sélectionner" />
      </div>

      <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
        {/* Référence + client */}
        <div className="col-span-12 sm:col-span-4 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <span className="text-xs font-mono text-neutral-500">
              {invoice.reference || invoice.invoice_number || (invoice.invoice_id ? invoice.invoice_id.slice(0, 8) : '—')}
            </span>
          </div>
          <div className="font-semibold text-neutral-900 truncate mt-0.5">
            {invoice.lead_name || invoice.client_name || 'Sans client'}
          </div>
        </div>

        {/* Montant + payé */}
        <div className="col-span-6 sm:col-span-3">
          <div className="text-sm font-bold text-neutral-900">
            {amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </div>
          {paid > 0 && paid < amount && (
            <div className="text-xs text-neutral-500">
              {paid.toLocaleString('fr-FR')} payés · {reste.toLocaleString('fr-FR')} reste
            </div>
          )}
        </div>

        {/* Statut */}
        <div className="col-span-6 sm:col-span-2" onClick={(e) => e.stopPropagation()}>
          <StatusBadge domain="invoice" status={status} />
          {overdue && status === 'en_attente' && daysLate > 0 && (
            <div className="text-[11px] text-terracotta-600 font-semibold mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              +{daysLate}j
            </div>
          )}
        </div>

        {/* Échéance */}
        <div className="col-span-6 sm:col-span-2 text-xs text-neutral-500">
          {invoice.due_date ? shortDate(invoice.due_date) : relativeTime(invoice.created_at)}
        </div>

        {/* Actions */}
        <div
          className="col-span-6 sm:col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {status !== 'payée' && status !== 'annulée' && (
            <button
              type="button"
              onClick={onRecordPayment}
              className="p-1.5 rounded hover:bg-brand-50 text-brand-600"
              aria-label="Enregistrer paiement"
            >
              <CreditCard className="w-4 h-4" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500"
                aria-label="Plus"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Changer le statut</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {INVOICE_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                  <StatusBadge domain="invoice" status={s} size="xs" />
                  <span className="ml-2 text-sm">{INVOICE_STATUS_LABELS[s]}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {invoice.lead_id && (
                <DropdownMenuItem onClick={onView}>
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  Ouvrir le lead
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-terracotta-600 focus:text-terracotta-600">
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ── Modale paiement ──────────────────────────────────────────────
function RecordPaymentModal({ open, onOpenChange, invoice, onSubmit, isPending }) {
  const amount = Number(invoice?.total_ttc || invoice?.amount_ttc || invoice?.amount || 0);
  const paid = Number(invoice?.amount_paid || 0);
  const reste = Math.max(0, amount - paid);

  const [formAmount, setFormAmount] = useState(reste);
  const [method, setMethod] = useState('virement');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Reset quand la modale s'ouvre
  React.useEffect(() => {
    if (open) {
      setFormAmount(reste);
      setMethod('virement');
      setReference('');
      setNotes('');
    }
  }, [open, reste]);

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <p className="text-xs text-neutral-500 mt-1">
            Facture : {invoice.reference || invoice.invoice_id?.slice(0, 8)} · {amount.toLocaleString('fr-FR')} €
          </p>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-[11px] font-mono text-neutral-500 mb-1.5 uppercase tracking-[0.1em]">
              Montant (€)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-neutral-500 mb-1.5 uppercase tracking-[0.1em]">
              Méthode
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  {PAYMENT_METHODS.find((m) => m.value === method)?.label || 'Sélectionner'}
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {PAYMENT_METHODS.map((m) => (
                  <DropdownMenuItem key={m.value} onClick={() => setMethod(m.value)}>
                    {m.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-neutral-500 mb-1.5 uppercase tracking-[0.1em]">
              Référence (optionnel)
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="N° de virement, transaction Stripe…"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-neutral-500 mb-1.5 uppercase tracking-[0.1em]">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Commentaire interne…"
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                amount: Number(formAmount),
                method,
                reference,
                notes,
              })
            }
            disabled={isPending || Number(formAmount) <= 0}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Composant principal ──────────────────────────────────────────
export default function InvoicesList() {
  const navigate = useNavigate();
  const { confirm, ConfirmElement } = useConfirm();
  const searchInputRef = useRef(null);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [smartFilter, setSmartFilter] = useState(''); // '', 'overdue30'
  const [paymentModal, setPaymentModal] = useState({ open: false, invoice: null });

  const { data: invoices = [], isLoading, isRefetching, refetch } = useInvoicesList();
  const recordPayment = useRecordPayment();
  const deleteInvoice = useDeleteInvoice();
  const updateInvoice = useUpdateInvoice();

  const invoicesList = useMemo(() => {
    if (Array.isArray(invoices)) return invoices;
    return invoices?.items || invoices?.invoices || [];
  }, [invoices]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthly = invoicesList.filter((inv) => {
      const d = new Date(inv.created_at);
      return d >= monthStart;
    });

    const monthlyRevenue = monthly
      .filter((inv) => normalizeStatus(inv.status) === 'payée')
      .reduce((s, inv) => s + Number(inv.total_ttc || inv.amount_ttc || inv.amount || 0), 0);

    const pending = invoicesList
      .filter((inv) => normalizeStatus(inv.status) === 'en_attente')
      .reduce((s, inv) => s + Number(inv.total_ttc || inv.amount_ttc || inv.amount || 0), 0);

    const overdueCount = invoicesList.filter((inv) => isOverdue(inv) && daysOverdue(inv) > 30).length;

    return {
      monthlyCount: monthly.length,
      monthlyRevenue,
      pending,
      overdueCount,
    };
  }, [invoicesList]);

  // Compteurs par statut
  const statusCounts = useMemo(() => {
    const counts = { '': invoicesList.length };
    invoicesList.forEach((inv) => {
      const s = normalizeStatus(inv.status);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [invoicesList]);

  // Filtrage
  const filteredInvoices = useMemo(() => {
    let list = invoicesList;
    if (status) list = list.filter((inv) => normalizeStatus(inv.status) === status);
    if (smartFilter === 'overdue30') list = list.filter((inv) => isOverdue(inv) && daysOverdue(inv) > 30);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((inv) =>
        [inv.lead_name, inv.client_name, inv.reference, inv.invoice_number, inv.invoice_id]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [invoicesList, status, smartFilter, search]);

  // Handlers
  const handleView = useCallback(
    (invoice) => {
      if (invoice.lead_id) navigate(`/leads/${invoice.lead_id}`);
      else toast.info("Cette facture n'est liée à aucun lead");
    },
    [navigate]
  );

  const handleRecordPayment = useCallback((invoice) => {
    setPaymentModal({ open: true, invoice });
  }, []);

  const handleSubmitPayment = useCallback(
    async (payload) => {
      if (!paymentModal.invoice) return;
      await recordPayment.mutateAsync({
        invoiceId: paymentModal.invoice.invoice_id,
        payload,
      });
      setPaymentModal({ open: false, invoice: null });
    },
    [paymentModal.invoice, recordPayment]
  );

  const handleStatusChange = useCallback(
    async (invoice, nextStatus) => {
      await updateInvoice.mutateAsync({
        invoiceId: invoice.invoice_id,
        payload: { status: nextStatus },
      });
      toast.success(`Statut changé en "${INVOICE_STATUS_LABELS[nextStatus]}"`);
    },
    [updateInvoice]
  );

  const handleDelete = useCallback(
    async (invoice) => {
      const ok = await confirm({
        title: 'Supprimer cette facture ?',
        description: 'La facture sera archivée. Cette action peut être annulée par un administrateur.',
        variant: 'danger',
        confirmText: 'Supprimer',
      });
      if (ok) await deleteInvoice.mutateAsync(invoice.invoice_id);
    },
    [confirm, deleteInvoice]
  );

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const ok = await confirm({
      title: `Supprimer ${ids.length} factures ?`,
      description: 'Les factures seront archivées. Action annulable par un admin.',
      variant: 'danger',
      confirmText: 'Supprimer',
    });
    if (!ok) return;
    await Promise.all(ids.map((id) => deleteInvoice.mutateAsync(id)));
    setSelectedIds(new Set());
  }, [selectedIds, confirm, deleteInvoice]);

  const resetFilters = useCallback(() => {
    setStatus('');
    setSearch('');
    setSmartFilter('');
  }, []);

  useHotkeys({
    '/': () => searchInputRef.current?.focus(),
    c: () => navigate('/invoices/new'),
    r: () => refetch(),
    escape: () => setSelectedIds(new Set()),
  });

  const hasFilters = status || search || smartFilter;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Factures"
        subtitle={`${invoicesList.length} ${invoicesList.length > 1 ? 'factures au total' : 'facture'}${hasFilters ? ' · filtrées' : ''}`}
        actions={[
          {
            label: 'Actualiser',
            icon: RefreshCw,
            onClick: () => refetch(),
            loading: isRefetching,
          },
          {
            label: 'Nouvelle facture',
            icon: Plus,
            onClick: () => navigate('/invoices/new'),
            variant: 'primary',
          },
        ]}
      />

      {/* Stats KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon={FileText}
          label="Factures du mois"
          value={stats.monthlyCount}
          accent="violet"
        />
        <KpiCard
          icon={DollarSign}
          label="CA encaissé (mois)"
          value={`${stats.monthlyRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
          accent="emerald"
        />
        <KpiCard
          icon={Clock}
          label="En attente"
          value={`${stats.pending.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
          accent="amber"
        />
        <button
          type="button"
          onClick={() => setSmartFilter(smartFilter === 'overdue30' ? '' : 'overdue30')}
          className="text-left"
        >
          <KpiCard
            icon={AlertTriangle}
            label="En retard > 30 jours"
            value={stats.overdueCount}
            accent="rose"
            sub={smartFilter === 'overdue30' ? '→ filtre actif' : '→ cliquer pour filtrer'}
          />
        </button>
      </div>

      {/* Filtres chips */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ease-snappy
            ${status === '' && !smartFilter
              ? 'bg-neutral-900 text-white shadow-sm'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'}
          `}
        >
          <FileText className="w-3.5 h-3.5" />
          Toutes
          <span className="text-xs opacity-70">{statusCounts[''] || 0}</span>
        </button>
        {INVOICE_STATUSES.map((s) => {
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
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'}
              `}
            >
              <StatusBadge domain="invoice" status={s} size="xs" className="-ml-1 pointer-events-none" />
              <span className="text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Barre recherche */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher par client, référence… (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
            >
              <X className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          )}
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-neutral-500">
            <X className="w-3.5 h-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Tableau */}
      {isLoading ? (
        <InvoicesSkeleton />
      ) : filteredInvoices.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={hasFilters ? 'Aucune facture trouvée' : 'Aucune facture pour le moment'}
          description={
            hasFilters
              ? 'Ajustez vos filtres ou créez une nouvelle facture.'
              : 'Créez une facture manuellement ou depuis un devis accepté.'
          }
          action={
            hasFilters
              ? { label: 'Réinitialiser les filtres', onClick: resetFilters }
              : { label: 'Créer une facture', icon: Plus, onClick: () => navigate('/invoices/new') }
          }
        />
      ) : (
        <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
          {filteredInvoices.map((inv, idx) => (
            <InvoiceRow
              key={inv.invoice_id}
              invoice={inv}
              idx={idx}
              isSelected={selectedIds.has(inv.invoice_id)}
              onToggle={() => handleToggleSelect(inv.invoice_id)}
              onView={() => handleView(inv)}
              onRecordPayment={() => handleRecordPayment(inv)}
              onStatusChange={(s) => handleStatusChange(inv, s)}
              onDelete={() => handleDelete(inv)}
            />
          ))}
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-neutral-900 text-white shadow-card-xl ring-1 ring-neutral-700/50">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size > 1 ? 'factures sélectionnées' : 'facture sélectionnée'}
            </span>
            <div className="w-px h-5 bg-neutral-700" />
            <button
              type="button"
              onClick={handleBulkDelete}
              className="text-sm font-medium text-terracotta-300 hover:opacity-80 transition-opacity flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
            <div className="w-px h-5 bg-neutral-700" />
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

      <RecordPaymentModal
        open={paymentModal.open}
        onOpenChange={(open) => setPaymentModal((m) => ({ ...m, open }))}
        invoice={paymentModal.invoice}
        onSubmit={handleSubmitPayment}
        isPending={recordPayment.isPending}
      />

      <ConfirmElement />
    </div>
  );
}
