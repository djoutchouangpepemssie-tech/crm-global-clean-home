// HotAlertNotifier — composant invisible qui poll /audience/hot-alerts
// et déclenche un toast + une notif browser native quand un nouveau visiteur
// "hot" est détecté côté backend (CTA cliqué, form soumis, 5+ min sur le site).
//
// Marche tant que le CRM est ouvert dans un onglet. Pour les notifs même
// onglet fermé, c'est Telegram qui prend le relais (configuré côté backend).

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useHotAlerts } from '../../hooks/api';

const STORAGE_KEY = 'gch_seen_hot_alerts';
const MAX_TRACKED = 50; // garde les 50 derniers IDs vus en mémoire

function getSeenIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function setSeenIds(ids) {
  try {
    const arr = Array.from(ids).slice(-MAX_TRACKED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { /* quota — pas grave */ }
}

export default function HotAlertNotifier() {
  const navigate = useNavigate();
  const { data } = useHotAlerts(20);
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (!data || !data.alerts) return;
    const alerts = data.alerts;
    const seen = getSeenIds();

    // Premier mount : marquer tout comme vu (on ne notifie pas l'historique)
    if (!initializedRef.current) {
      alerts.forEach((a) => seen.add(a.alert_id));
      setSeenIds(seen);
      initializedRef.current = true;
      return;
    }

    // Trouver les nouveaux (du plus ancien au plus récent pour respecter l'ordre)
    const fresh = alerts.filter((a) => !seen.has(a.alert_id)).reverse();
    if (fresh.length === 0) return;

    fresh.forEach((a) => {
      seen.add(a.alert_id);
      const where = a.city ? ` · ${a.city}${a.postal ? ' ' + a.postal : ''}` : '';
      const who = a.lead_name ? ` (${a.lead_name})` : '';

      // 1. Toast in-app (sonner)
      toast(`${a.trigger_label}${where}`, {
        description: `${a.page || '/'}${who}`,
        duration: 8000,
        action: {
          label: 'Voir parcours',
          onClick: () => navigate(`/seo/journeys/${a.visitor_id}`),
        },
      });

      // 2. Notification browser native (si permission accordée)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(`🔥 ${a.trigger_label}`, {
            body: `${a.page || '/'}${where}${who}`,
            icon: '/favicon.svg',
            tag: a.alert_id,
            silent: false,
          });
          notif.onclick = () => {
            window.focus();
            navigate(`/seo/journeys/${a.visitor_id}`);
            notif.close();
          };
        } catch { /* certains navigateurs throw — pas grave */ }
      }
    });

    setSeenIds(seen);
  }, [data, navigate]);

  // Demande la permission browser au premier mount (1 fois max)
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      // Délai 3s pour ne pas demander dès le load (UX)
      const t = setTimeout(() => {
        try { Notification.requestPermission(); } catch { /* pas grave */ }
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  return null; // composant invisible
}
