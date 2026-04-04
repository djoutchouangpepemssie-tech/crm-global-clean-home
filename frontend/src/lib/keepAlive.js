import BACKEND_URL from '../config.js';

// Ping le backend pour éviter le cold start Railway
const PING_INTERVAL = 4 * 60 * 1000; // 4 min (Railway sleep après 5 min d'inactivité)

export const startKeepAlive = () => {
  let isFirstLoad = true;

  const ping = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/ping`, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000) 
      });
      if (res.ok && isFirstLoad) {
        isFirstLoad = false;
        console.log('[KeepAlive] Backend is up');
      }
    } catch {
      // Silently fail
    }
  };

  // Ping immédiat + burst initial (3 pings rapides pour wake-up)
  ping();
  setTimeout(ping, 3000);
  setTimeout(ping, 8000);

  return setInterval(ping, PING_INTERVAL);
};
