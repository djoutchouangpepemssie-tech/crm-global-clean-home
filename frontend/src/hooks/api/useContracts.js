/**
 * Hooks React Query pour les contrats récurrents.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../lib/api';

const KEYS = {
  all: ['contracts'],
  list: (filters) => ['contracts', 'list', filters],
  detail: (id) => ['contracts', 'detail', id],
};

export function useContractsList(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/contracts?${params.toString()}`);
      return Array.isArray(data) ? data : data.contracts || data.items || [];
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/contracts', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Contrat créé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création du contrat');
    },
  });
}

export function useContractAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contractId, action }) => {
      const { data } = await api.post(`/contracts/${contractId}/${action}`);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      const labels = { activate: 'activé', pause: 'mis en pause', cancel: 'annulé', resume: 'repris' };
      toast.success(`Contrat ${labels[variables.action] || 'mis à jour'}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'action');
    },
  });
}

export function useGenerateInterventions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/contracts/generate-interventions');
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['planning'] });
      toast.success(`${data?.created || 0} interventions générées`);
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la génération');
    },
  });
}
