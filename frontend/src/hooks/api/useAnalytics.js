/**
 * Hooks React Query pour la page Analytics.
 *
 * 3 sources de données indépendantes (CRM stats, SEO, GA4)
 * chargées en parallèle. Chaque source a son propre hook car
 * les données sont indépendantes et leurs taux de rafraîchissement
 * diffèrent (CRM : 60s, SEO/GA4 : 5min).
 */
import { useQuery } from '@tanstack/react-query';
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
