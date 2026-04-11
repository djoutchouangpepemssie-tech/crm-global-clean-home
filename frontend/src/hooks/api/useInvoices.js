/**
 * Hooks React Query pour les factures.
 *
 * Chaîne métier : lead → devis accepté → facture → paiement.
 * À chaque mutation on invalide dashboard.stats + le lead lié si présent.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { queryKeys } from '../../lib/api';

// ── Queries ─────────────────────────────────────────────────────

export function useInvoicesList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/invoices?${params.toString()}`);
      return Array.isArray(data) ? data : data.invoices || [];
    },
  });
}

export function useInvoice(invoiceId) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(invoiceId),
    queryFn: async () => {
      const { data } = await api.get(`/invoices/${invoiceId}`);
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useInvoicesByLead(leadId) {
  return useQuery({
    queryKey: queryKeys.invoices.byLead(leadId),
    queryFn: async () => {
      const { data } = await api.get(`/invoices?lead_id=${leadId}`);
      return Array.isArray(data) ? data : data.invoices || [];
    },
    enabled: !!leadId,
  });
}

// ── Mutations ───────────────────────────────────────────────────

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/invoices', payload);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.financial() });
      if (variables?.lead_id) {
        qc.invalidateQueries({ queryKey: queryKeys.invoices.byLead(variables.lead_id) });
      }
      toast.success('Facture créée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création de la facture');
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, payload }) => {
      const { data } = await api.patch(`/invoices/${invoiceId}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      qc.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.invoiceId) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.financial() });
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });
}

/** Enregistrer un paiement (partiel ou total) sur une facture */
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, payload }) => {
      const { data } = await api.post(`/invoices/${invoiceId}/payment`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      qc.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.invoiceId) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.financial() });
      toast.success('Paiement enregistré');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'enregistrement du paiement');
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId) => {
      await api.delete(`/invoices/${invoiceId}`);
      return invoiceId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.financial() });
      toast.success('Facture supprimée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });
}
