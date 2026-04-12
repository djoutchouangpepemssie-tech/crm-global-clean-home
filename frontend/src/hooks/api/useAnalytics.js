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
