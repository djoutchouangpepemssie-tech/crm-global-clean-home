/**
 * Hooks React Query pour les leads.
 *
 * Ces hooks remplacent tous les `useState + useEffect + axios.get('/api/leads')`
 * éparpillés dans l'app. Ils offrent :
 *   - Cache partagé entre pages (le Dashboard et LeadsList lisent la même source)
 *   - Invalidation automatique après mutation (création, update, delete)
 *   - Loading / error states normalisés
 *   - Retry intelligent, refetch au focus, etc. (config dans queryClient.js)
 *
 * Usage dans un composant :
 *   const { data: leads, isLoading } = useLeadsList({ status: 'NEW' });
 *   const createLead = useCreateLead();
 *   createLead.mutate({ name: '...', email: '...' });
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { queryKeys } from '../../lib/api';

// ── Queries ─────────────────────────────────────────────────────

/** Liste paginée/filtrée des leads */
export function useLeadsList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/leads?${params.toString()}`);
      return Array.isArray(data) ? data : data.leads || [];
    },
  });
}

/** Détail d'un lead + ses interactions associées */
export function useLead(leadId) {
  return useQuery({
    queryKey: queryKeys.leads.detail(leadId),
    queryFn: async () => {
      const { data } = await api.get(`/leads/${leadId}`);
      return data;
    },
    enabled: !!leadId,
  });
}

/** Leads récents pour le dashboard */
export function useRecentLeads(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.leads.recent(), limit],
    queryFn: async () => {
      const { data } = await api.get(`/leads/recent?limit=${limit}`);
      return data;
    },
    staleTime: 30_000, // Plus frais que le reste : le dashboard est une vitrine
  });
}

// ── Mutations ───────────────────────────────────────────────────

/**
 * Création d'un lead. Après succès :
 *   - Invalide la liste des leads (elle se refetch)
 *   - Invalide les stats du dashboard (pour que les KPIs se mettent à jour)
 *   - Invalide les leads récents (pour apparaître dans la carte du dashboard)
 */
export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/leads', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      qc.invalidateQueries({ queryKey: queryKeys.leads.recent() });
      toast.success('Lead créé avec succès');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création du lead');
    },
  });
}

/**
 * Mise à jour d'un lead (changement de statut, assignation, notes...).
 * Invalide le détail ET la liste pour que tout se synchronise.
 */
export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, payload }) => {
      const { data } = await api.patch(`/leads/${leadId}`, payload);
      return data;
    },
    // Mise à jour optimiste : on patche immédiatement le cache avant
    // que le serveur réponde. Si ça foire, on rollback.
    onMutate: async ({ leadId, payload }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads.detail(leadId) });
      const previous = qc.getQueryData(queryKeys.leads.detail(leadId));
      if (previous) {
        qc.setQueryData(queryKeys.leads.detail(leadId), { ...previous, ...payload });
      }
      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.leads.detail(variables.leadId), context.previous);
      }
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    },
  });
}

/** Suppression d'un lead (soft delete côté backend) */
export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId) => {
      await api.delete(`/leads/${leadId}`);
      return leadId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      toast.success('Lead supprimé');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });
}

/** Bulk update : changer le statut, assigner... sur plusieurs leads d'un coup */
export function useBulkUpdateLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/leads/bulk', payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      toast.success(`${data?.updated || 0} leads mis à jour`);
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'action groupée');
    },
  });
}
