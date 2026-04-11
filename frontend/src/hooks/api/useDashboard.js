/**
 * Hooks React Query pour le dashboard.
 *
 * Les stats du dashboard sont la vitrine du CRM. Elles doivent se mettre à
 * jour instantanément après n'importe quelle action (créer un lead, accepter
 * un devis, enregistrer un paiement). C'est précisément ce que fait
 * l'invalidation croisée dans les autres hooks (useLeads, useQuotes...).
 */
import { useQuery } from '@tanstack/react-query';
import api, { queryKeys } from '../../lib/api';

/** KPIs du dashboard : leads aujourd'hui, conversion, revenu, graphs */
export function useDashboardStats(period = '30d') {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(period),
    queryFn: async () => {
      const { data } = await api.get(`/stats/dashboard?period=${period}`);
      return data;
    },
    staleTime: 30_000,
  });
}

/** Stats financières : CA, paiements en attente, retards */
export function useFinancialStats(period = '30d') {
  return useQuery({
    queryKey: queryKeys.dashboard.financial(period),
    queryFn: async () => {
      const { data } = await api.get(`/stats/financial?period=${period}`);
      return data;
    },
    staleTime: 60_000,
  });
}
