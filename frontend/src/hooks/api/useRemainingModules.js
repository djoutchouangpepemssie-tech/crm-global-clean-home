/**
 * Hooks React Query pour les modules secondaires.
 *
 * Regroupe les hooks des pages qui n'avaient pas assez de complexité
 * pour justifier un fichier séparé : Chat, Booking, Workflows, Stock,
 * SEO, Rentabilité, AI, Accounting simple.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../lib/api';

// ── Chat ────────────────────────────────────────────────────────

export function useChatMessages(filters = {}) {
  return useQuery({
    queryKey: ['chat', 'messages', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/chat/messages?${params}`);
      return Array.isArray(data) ? data : data.messages || data.items || [];
    },
    refetchInterval: 10_000,
  });
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/chat/messages', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur envoi message');
    },
  });
}

// ── Booking ─────────────────────────────────────────────────────

export function useBookingsList(filters = {}) {
  return useQuery({
    queryKey: ['bookings', 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/booking?${params}`);
      return Array.isArray(data) ? data : data.bookings || data.items || [];
    },
  });
}

export function useBookingAvailability(date) {
  return useQuery({
    queryKey: ['bookings', 'availability', date],
    queryFn: async () => {
      const { data } = await api.get(`/booking/availability${date ? `?date=${date}` : ''}`);
      return data;
    },
    enabled: !!date,
  });
}

// ── Workflows ───────────────────────────────────────────────────

export function useWorkflowsList() {
  return useQuery({
    queryKey: ['workflows', 'list'],
    queryFn: async () => {
      const { data } = await api.get('/workflows');
      return Array.isArray(data) ? data : data.workflows || data.items || [];
    },
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/workflows', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow créé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur création workflow');
    },
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, payload }) => {
      const { data } = await api.patch(`/workflows/${workflowId}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur mise à jour');
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workflowId) => {
      await api.delete(`/workflows/${workflowId}`);
      return workflowId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow supprimé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur suppression');
    },
  });
}

// ── Stock ───────────────────────────────────────────────────────

export function useStockList(filters = {}) {
  return useQuery({
    queryKey: ['stock', 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/stock?${params}`);
      return Array.isArray(data) ? data : data.items || data.stock || [];
    },
  });
}

export function useCreateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/stock', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Article ajouté au stock');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur ajout stock');
    },
  });
}

export function useUpdateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, payload }) => {
      const { data } = await api.patch(`/stock/${itemId}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur mise à jour');
    },
  });
}

export function useDeleteStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId) => {
      await api.delete(`/stock/${itemId}`);
      return itemId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Article supprimé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur suppression');
    },
  });
}

// ── SEO Dashboard ───────────────────────────────────────────────

export function useSeoStats(days = 30) {
  return useQuery({
    queryKey: ['seo', 'stats', days],
    queryFn: async () => {
      const { data } = await api.get(`/ga4/search-console?days=${days}`);
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Rentabilité ─────────────────────────────────────────────────

export function useRentabiliteStats(period = '30d') {
  return useQuery({
    queryKey: ['rentabilite', 'stats', period],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/profitability?period=${period}`);
      return data;
    },
    staleTime: 60_000,
  });
}

// ── AI / Suggestions ────────────────────────────────────────────

export function useAISuggestions() {
  return useQuery({
    queryKey: ['ai', 'suggestions'],
    queryFn: async () => {
      const { data } = await api.get('/ai/suggestions');
      return data;
    },
    staleTime: 2 * 60_000,
  });
}

export function useAIEmailGenerator() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/ai/email-generator', payload);
      return data;
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur génération email');
    },
  });
}

export function useAIChat() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/ai/chat', payload);
      return data;
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur chat IA');
    },
  });
}

// ── Accounting simple ───────────────────────────────────────────

export function useAccountingBalance(period = '30d') {
  return useQuery({
    queryKey: ['accounting', 'balance', period],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/balance?period=${period}`);
      return data;
    },
    staleTime: 60_000,
  });
}

export function useAccountingJournal(filters = {}) {
  return useQuery({
    queryKey: ['accounting', 'journal', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/accounting/journal?${params}`);
      return Array.isArray(data) ? data : data.entries || data.items || [];
    },
  });
}
