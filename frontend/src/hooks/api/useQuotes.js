/**
 * Hooks React Query pour les devis.
 *
 * Communique avec useLeads : un devis accepté met à jour le statut du lead
 * lié, donc on invalide leads.detail + dashboard.stats après chaque mutation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { queryKeys } from '../../lib/api';

// ── Queries ─────────────────────────────────────────────────────

export function useQuotesList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.quotes.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/quotes?${params.toString()}`);
      return Array.isArray(data) ? data : data.quotes || [];
    },
  });
}

export function useQuote(quoteId) {
  return useQuery({
    queryKey: queryKeys.quotes.detail(quoteId),
    queryFn: async () => {
      const { data } = await api.get(`/quotes/${quoteId}`);
      return data;
    },
    enabled: !!quoteId,
  });
}

/** Devis d'un lead spécifique (timeline lead detail) */
export function useQuotesByLead(leadId) {
  return useQuery({
    queryKey: queryKeys.quotes.byLead(leadId),
    queryFn: async () => {
      const { data } = await api.get(`/quotes?lead_id=${leadId}`);
      return Array.isArray(data) ? data : data.quotes || [];
    },
    enabled: !!leadId,
  });
}

// ── Mutations ───────────────────────────────────────────────────

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/quotes', payload);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      if (variables?.lead_id) {
        qc.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.lead_id) });
        qc.invalidateQueries({ queryKey: queryKeys.quotes.byLead(variables.lead_id) });
      }
      toast.success('Devis créé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création du devis');
    },
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quoteId, payload }) => {
      const { data } = await api.patch(`/quotes/${quoteId}`, payload);
      return data;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
      qc.invalidateQueries({ queryKey: queryKeys.quotes.detail(variables.quoteId) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      if (data?.lead_id) {
        qc.invalidateQueries({ queryKey: queryKeys.leads.detail(data.lead_id) });
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour du devis');
    },
  });
}

/** Envoi du devis par email via l'intégration Gmail backend */
export function useSendQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId) => {
      const { data } = await api.post(`/quotes/${quoteId}/send`);
      return data;
    },
    onSuccess: (_, quoteId) => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.detail(quoteId) });
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
      toast.success('Devis envoyé par email');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi du devis');
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId) => {
      await api.delete(`/quotes/${quoteId}`);
      return quoteId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      toast.success('Devis supprimé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });
}
