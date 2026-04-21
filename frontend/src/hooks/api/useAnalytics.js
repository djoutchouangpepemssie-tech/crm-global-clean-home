/**
 * Hooks React Query pour la page Analytics.
 *
 * 3 sources de données indépendantes (CRM stats, SEO, GA4)
 * chargées en parallèle. Chaque source a son propre hook car
 * les données sont indépendantes et leurs taux de rafraîchissement
 * diffèrent (CRM : 60s, SEO/GA4 : 5min).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

export function useCrmAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'crm-stats'],
    queryFn: async () => {
      const { data } = await api.get('/analytics-data/crm-stats');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useSeoAnalytics(days = 30) {
  return useQuery({
    queryKey: ['analytics', 'seo', days],
    queryFn: async () => {
      const { data } = await api.get(`/analytics-data/seo?days=${days}`);
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useGa4Analytics(days = 30) {
  return useQuery({
    queryKey: ['analytics', 'ga4', days],
    queryFn: async () => {
      const { data } = await api.get(`/analytics-data/overview?days=${days}`);
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useRealtime() {
  return useQuery({
    queryKey: ['analytics', 'realtime'],
    queryFn: async () => (await api.get('/analytics-data/realtime')).data,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useTrackerHealth() {
  return useQuery({
    queryKey: ['tracker', 'health'],
    queryFn: async () => (await api.get('/tracker/health')).data,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useTrackerSnippet() {
  return useQuery({
    queryKey: ['tracker', 'snippet'],
    queryFn: async () => (await api.get('/tracker/snippet')).data,
    staleTime: 10 * 60_000,
  });
}

export function useTrackerRecent(limit = 50) {
  return useQuery({
    queryKey: ['tracker', 'recent', limit],
    queryFn: async () => (await api.get(`/tracker/recent?limit=${limit}`)).data,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}

export function useTrackerFunnel(period = '30d') {
  return useQuery({
    queryKey: ['tracker', 'funnel', period],
    queryFn: async () => (await api.get(`/tracker/funnel?period=${period}`)).data,
    staleTime: 60_000,
  });
}

export function useTrackerKeywords(days = 28, limit = 50) {
  return useQuery({
    queryKey: ['tracker', 'keywords', days, limit],
    queryFn: async () => (await api.get(`/tracker/keywords?days=${days}&limit=${limit}`)).data,
    staleTime: 5 * 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════════
// Phase 2 — SEO Advanced (scoring par URL, cannibalisation, orphelines,
// indexation, changelog, opportunities)
// ═══════════════════════════════════════════════════════════════════

export function useSeoScore(url, days = 28) {
  return useQuery({
    queryKey: ['seo', 'score', url, days],
    queryFn: async () => (await api.get(`/seo/score?url=${encodeURIComponent(url)}&days=${days}`)).data,
    enabled: !!url,
    staleTime: 5 * 60_000,
  });
}

export function useCannibalization(days = 28, minImpressions = 50) {
  return useQuery({
    queryKey: ['seo', 'cannibalization', days, minImpressions],
    queryFn: async () => (await api.get(`/seo/cannibalization?days=${days}&min_impressions=${minImpressions}`)).data,
    staleTime: 10 * 60_000,
  });
}

export function useOrphans(days = 28, minViews = 20) {
  return useQuery({
    queryKey: ['seo', 'orphans', days, minViews],
    queryFn: async () => (await api.get(`/seo/orphans?days=${days}&min_views=${minViews}`)).data,
    staleTime: 10 * 60_000,
  });
}

export function useIndexation(url) {
  return useQuery({
    queryKey: ['seo', 'indexation', url],
    queryFn: async () => (await api.get(`/seo/indexation?url=${encodeURIComponent(url)}`)).data,
    enabled: !!url,
    staleTime: 10 * 60_000,
  });
}

export function useChangelog(days = 7, top = 30) {
  return useQuery({
    queryKey: ['seo', 'changelog', days, top],
    queryFn: async () => (await api.get(`/seo/changelog?days=${days}&top=${top}`)).data,
    staleTime: 5 * 60_000,
  });
}

export function useSeoOpportunities(days = 28) {
  return useQuery({
    queryKey: ['seo', 'opportunities', days],
    queryFn: async () => (await api.get(`/seo/opportunities?days=${days}`)).data,
    staleTime: 10 * 60_000,
  });
}

export function useTakeSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (days = 1) => (await api.post(`/seo/snapshot?days=${days}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seo', 'changelog'] }),
  });
}
