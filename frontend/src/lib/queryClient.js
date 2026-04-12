/**
 * QueryClient global — configuration partagée par toutes les pages.
 *
 * Stratégie :
 *   - staleTime 60s : on considère les données fraîches pendant 1 minute
 *     (évite le re-fetch en boucle quand on navigue entre pages)
 *   - refetchOnWindowFocus : actif → si l'utilisateur revient sur l'onglet
 *     après 5 minutes, les listes se rafraîchissent automatiquement
 *   - retry 1 : une seule nouvelle tentative sur erreur réseau (UX > UX++)
 *   - gcTime 5min : garde les données en cache 5 min après déconnexion
 *     d'un composant (navigation fluide sans flash blanc)
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Pas de retry sur les 401/403/404 — c'est définitif
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
