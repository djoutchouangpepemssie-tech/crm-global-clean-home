import BACKEND_URL from '../config.js';

// Ping le backend toutes les 10 minutes pour éviter le cold start Railway
const PING_INTERVAL = 10 * 60 * 1000; // 10 min

export const startKeepAlive = () => {
  const ping = () => {
    fetch(`${BACKEND_URL}/ping`).catch(() => {});
  };
  ping(); // ping immédiat
  return setInterval(ping, PING_INTERVAL);
};
