/**
 * Hook React Query pour les interactions (historique lead).
 *
 * Les interactions sont affichées dans la timeline du détail lead.
 * Créer/supprimer une interaction invalide le détail du lead associé
 * + le dashboard (leads récents).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { queryKeys } from '../../lib/api';

export function useInteractionsByLead(leadId) {
  return useQuery({
    queryKey: queryKeys.interactions.byLead(leadId),
    queryFn: async () => {
      const { data } = await api.get(`/interactions?lead_id=${leadId}`);
      return Array.isArray(data) ? data : data.interactions || [];
    },
    enabled: !!leadId,
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/interactions', payload);
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables?.lead_id) {
        qc.invalidateQueries({ queryKey: queryKeys.interactions.byLead(variables.lead_id) });
        qc.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.lead_id) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.leads.recent() });
      toast.success('Interaction enregistrée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'ajout de l\'interaction');
    },
  });
}

export function useDeleteInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ interactionId, leadId }) => {
      await api.delete(`/interactions/${interactionId}`);
      return { interactionId, leadId };
    },
    onSuccess: ({ leadId }) => {
      if (leadId) {
        qc.invalidateQueries({ queryKey: queryKeys.interactions.byLead(leadId) });
        qc.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      }
      toast.success('Interaction supprimée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });
}
