// Cache mémoire simple pour éviter les re-fetches inutiles
const cache = new Map();
const CACHE_DURATION = 30000; // 30 secondes

export const apiCache = {
  get: (key) => {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > CACHE_DURATION) {
      cache.delete(key);
      return null;
    }
    return item.data;
  },
  set: (key, data) => {
    cache.set(key, { data, timestamp: Date.now() });
  },
  invalidate: (pattern) => {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  },
  clear: () => cache.clear()
};

// Hook React pour utiliser le cache avec axios
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useCachedApi = (url, options = {}) => {
  const { deps = [], withCredentials = true, skip = false } = options;
  const [data, setData] = useState(() => apiCache.get(url));
  const [loading, setLoading] = useState(!apiCache.get(url));
  const [error, setError] = useState(null);

  const fetch = useCallback(async (force = false) => {
    if (!url || skip) return;
    
    // Utiliser le cache si disponible et pas forcé
    if (!force) {
      const cached = apiCache.get(url);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await axios.get(url, { withCredentials });
      apiCache.set(url, res.data);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [url, skip]);

  useEffect(() => { fetch(); }, [url, ...deps]);

  return { data, loading, error, refetch: () => fetch(true) };
};
