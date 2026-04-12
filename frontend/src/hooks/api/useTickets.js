/**
 * Hooks React Query pour les tickets support.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../lib/api';

const KEYS = {
  all: ['tickets'],
  list: (q) => ['tickets', 'list', q],
  detail: (id) => ['tickets', 'detail', id],
  stats: () => ['tickets', 'stats'],
};

export function useTicketsList(query = '') {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn: async () => {
      const { data } = await api.get(`/tickets/${query}`);
      return Array.isArray(data) ? data : data.tickets || data.items || [];
    },
  });
}

export function useTicket(ticketId) {
  return useQuery({
    queryKey: KEYS.detail(ticketId),
    queryFn: async () => {
      const { data } = await api.get(`/tickets/${ticketId}`);
      return data;
    },
    enabled: !!ticketId,
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: async () => {
      const { data } = await api.get('/tickets/stats');
      return data;
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/tickets/', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Ticket créé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création du ticket');
    },
  });
}

export function useReplyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, message, is_internal = false }) => {
      const { data } = await api.post(`/tickets/${ticketId}/reply`, { message, is_internal });
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.ticketId) });
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Réponse envoyée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    },
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }) => {
      const { data } = await api.patch(`/tickets/${ticketId}`, { status });
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.ticketId) });
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Statut du ticket mis à jour');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });
}
