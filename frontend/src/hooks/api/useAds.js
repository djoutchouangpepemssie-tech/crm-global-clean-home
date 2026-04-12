/**
 * Hooks React Query pour le module Ads (Google Ads + Meta Ads).
 *
 * 6 sources de données chargées en parallèle au montage :
 *   - Summary (KPIs consolidés)
 *   - Google Campaigns
 *   - Meta Campaigns
 *   - Manual campaigns
 *   - Alertes
 *   - Rapport hebdomadaire
 *
 * Mutations : créer/supprimer une campagne manuelle,
 * connecter/déconnecter Meta.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../lib/api';

const KEYS = {
  all: ['ads'],
  summary: () => ['ads', 'summary'],
  google: () => ['ads', 'google'],
  meta: () => ['ads', 'meta'],
  manual: () => ['ads', 'manual'],
  alerts: () => ['ads', 'alerts'],
  weeklyReport: () => ['ads', 'weekly-report'],
};

export function useAdsSummary() {
  return useQuery({
    queryKey: KEYS.summary(),
    queryFn: async () => {
      const { data } = await api.get('/ads-connect/summary');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useGoogleCampaigns() {
  return useQuery({
    queryKey: KEYS.google(),
    queryFn: async () => {
      const { data } = await api.get('/ads-connect/google/campaigns');
      return Array.isArray(data) ? data : data?.items || data?.campaigns || [];
    },
    staleTime: 60_000,
  });
}

export function useMetaCampaigns() {
  return useQuery({
    queryKey: KEYS.meta(),
    queryFn: async () => {
      const { data } = await api.get('/ads-connect/meta/campaigns');
      return Array.isArray(data) ? data : data?.items || data?.campaigns || [];
    },
    staleTime: 60_000,
  });
}

export function useManualCampaigns() {
  return useQuery({
    queryKey: KEYS.manual(),
    queryFn: async () => {
      const { data } = await api.get('/ads/campaigns');
      return Array.isArray(data) ? data : data?.items || data?.campaigns || [];
    },
    staleTime: 60_000,
  });
}

export function useAdsAlerts() {
  return useQuery({
    queryKey: KEYS.alerts(),
    queryFn: async () => {
      const { data } = await api.get('/ads-connect/alerts');
      return data;
    },
    staleTime: 2 * 60_000,
  });
}

export function useAdsWeeklyReport() {
  return useQuery({
    queryKey: KEYS.weeklyReport(),
    queryFn: async () => {
      const { data } = await api.get('/ads-connect/report/weekly');
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateManualCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/ads/campaigns', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Campagne ajoutée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });
}

export function useDeleteManualCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId) => {
      await api.delete(`/ads/campaigns/${campaignId}`);
      return campaignId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Campagne supprimée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });
}
