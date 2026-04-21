/**
 * Hooks React Query pour le module Planning / Interventions.
 *
 * Le backend expose ces endpoints sous le router planning.py :
 *   - GET/POST  /api/interventions
 *   - GET/PATCH/DELETE /api/interventions/{id}
 *   - POST /api/interventions/{id}/check-in-out
 *   - GET /api/calendar?month=YYYY-MM
 *   - GET/POST /api/teams + /api/teams/{id}/members
 *   - GET /api/team-members
 *
 * Ces hooks sont utilisés par :
 *   - PlanningCalendar (à refaire en Vague 3b)
 *   - IntervenantsManager (à refaire en Vague 3b)
 *   - InterventionsMap (à refaire en Vague 3c)
 *   - Dashboard (sidebar "Interventions du jour" — à brancher progressivement)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { queryKeys } from '../../lib/api';

// ── Queries : interventions ──────────────────────────────────────

export function useInterventionsList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.planning.interventions(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const { data } = await api.get(`/interventions?${params.toString()}`);
      return Array.isArray(data) ? data : data.items || data.interventions || [];
    },
  });
}

export function useIntervention(interventionId) {
  return useQuery({
    queryKey: ['planning', 'intervention', interventionId],
    queryFn: async () => {
      const { data } = await api.get(`/interventions/${interventionId}`);
      return data;
    },
    enabled: !!interventionId,
  });
}

/** Vue calendrier : interventions d'un mois donné (format YYYY-MM) */
export function useCalendar(month) {
  return useQuery({
    queryKey: queryKeys.planning.calendar(month),
    queryFn: async () => {
      const params = month ? `?month=${month}` : '';
      const { data } = await api.get(`/calendar${params}`);
      return data;
    },
  });
}

// ── Mutations : interventions ────────────────────────────────────

export function useCreateIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/interventions', payload);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      if (variables?.lead_id) {
        qc.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.lead_id) });
      }
      toast.success('Intervention planifiée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création de l\'intervention');
    },
  });
}

export function useUpdateIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ interventionId, payload }) => {
      const { data } = await api.patch(`/interventions/${interventionId}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      qc.invalidateQueries({ queryKey: ['planning', 'intervention', variables.interventionId] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });
}

export function useDeleteIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (interventionId) => {
      await api.delete(`/interventions/${interventionId}`);
      return interventionId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      toast.success('Intervention supprimée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });
}

/** Check-in ou check-out d'un intervenant sur une intervention */
export function useCheckInOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ interventionId, action }) => {
      const { data } = await api.post(`/interventions/${interventionId}/check-in-out`, { action });
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      qc.invalidateQueries({ queryKey: ['planning', 'intervention', variables.interventionId] });
      toast.success(variables.action === 'check_in' ? 'Check-in enregistré' : 'Check-out enregistré');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors du check-in/out');
    },
  });
}

// ── Queries : teams ──────────────────────────────────────────────

export function useTeams() {
  return useQuery({
    queryKey: queryKeys.planning.teams(),
    queryFn: async () => {
      const { data } = await api.get('/teams');
      return Array.isArray(data) ? data : data.teams || [];
    },
  });
}

export function useAllTeamMembers() {
  return useQuery({
    queryKey: ['planning', 'team-members', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/team-members');
      return Array.isArray(data) ? data : data.members || [];
    },
  });
}

// ── Mutations : teams ────────────────────────────────────────────

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/teams', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      toast.success('Équipe créée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création de l\'équipe');
    },
  });
}

export function useAddTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, member }) => {
      const { data } = await api.post(`/teams/${teamId}/members`, member);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      toast.success('Membre ajouté');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'ajout du membre');
    },
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, memberId }) => {
      await api.delete(`/teams/${teamId}/members/${memberId}`);
      return { teamId, memberId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      toast.success('Membre retiré');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors du retrait');
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// CRUD enrichi pour les intervenants (avec photo + filtres + stats)
// ═══════════════════════════════════════════════════════════════════

export function useAllMembers(filters = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== null))
  ).toString();
  return useQuery({
    queryKey: ['planning', 'members', 'enriched', filters],
    queryFn: async () => {
      const { data } = await api.get(`/planning/members${qs ? `?${qs}` : ''}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useMember(memberId) {
  return useQuery({
    queryKey: ['planning', 'member', memberId],
    queryFn: async () => (await api.get(`/planning/members/${memberId}`)).data,
    enabled: !!memberId,
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, patch }) => (await api.put(`/planning/members/${memberId}`, patch)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      toast.success('Intervenant mis à jour');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e.message || 'Erreur mise à jour'),
  });
}

export function useUploadMemberAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, photoB64 }) =>
      (await api.post(`/planning/members/${memberId}/avatar`, { photo_b64: photoB64 })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      toast.success('Photo mise à jour');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e.message || 'Erreur upload photo'),
  });
}

export function useRemoveMemberAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId) => (await api.delete(`/planning/members/${memberId}/avatar`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      toast.success('Photo retirée');
    },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId) => (await api.delete(`/planning/members/${memberId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning'] });
      toast.success('Intervenant supprimé');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e.message || 'Erreur suppression'),
  });
}
