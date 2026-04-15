// Service worker désactivé - force le rechargement du nouveau bundle
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter - laisser passer toutes les requêtes
  return;
});
