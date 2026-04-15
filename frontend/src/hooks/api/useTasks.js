/**
 * Hooks React Query pour les tâches / relances.
 *
 * Les tâches sont liées à un lead. Après complétion, on invalide
 * dashboard.stats pour que la carte "tâches urgentes" se mette à jour.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { queryKeys } from '../../lib/api';

// ── Queries ─────────────────────────────────────────────────────

export function useTasksList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/tasks?${params.toString()}`);
      // L'endpoint renvoie {items, total, page, page_size, total_pages}
      if (Array.isArray(data)) return data;
      return data.items || data.items || data.tasks || [];
    },
  });
}

export function useTasksByLead(leadId) {
  return useQuery({
    queryKey: queryKeys.tasks.byLead(leadId),
    queryFn: async () => {
      const { data } = await api.get(`/tasks?lead_id=${leadId}`);
      return Array.isArray(data) ? data : data.items || data.tasks || [];
    },
    enabled: !!leadId,
  });
}

/** Tâches urgentes (en retard ou dues aujourd'hui) — utilisé par le dashboard */
export function useUrgentTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.urgent(),
    queryFn: async () => {
      const { data } = await api.get('/tasks?status=pending&urgent=true');
      return Array.isArray(data) ? data : data.items || data.tasks || [];
    },
    staleTime: 30_000,
  });
}

// ── Mutations ───────────────────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/tasks', payload);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      if (variables?.lead_id) {
        qc.invalidateQueries({ queryKey: queryKeys.tasks.byLead(variables.lead_id) });
      }
      toast.success('Tâche créée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création de la tâche');
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, payload }) => {
      const { data } = await api.patch(`/tasks/${taskId}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });
}

/** Raccourci : marquer une tâche comme complétée (endpoint dédié backend) */
export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId) => {
      // Le backend expose un endpoint dédié /tasks/{id}/complete
      // qui met le status + completed_at automatiquement
      const { data } = await api.patch(`/tasks/${taskId}/complete`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      qc.invalidateQueries({ queryKey: queryKeys.tasks.urgent() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      toast.success('Tâche terminée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la complétion');
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId) => {
      await api.delete(`/tasks/${taskId}`);
      return taskId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      toast.success('Tâche supprimée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });
}
