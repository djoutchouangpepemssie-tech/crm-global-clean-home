const CACHE_NAME = 'gch-crm-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Installation - cache les assets statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activation - supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch - stratégie Network First pour API, Cache First pour assets
self.addEventListener('fetch', event => {
  try {
    const url = new URL(event.request.url);
    
    // Ignorer les requêtes non-GET
    if (event.request.method !== 'GET') return;
    
    // Ignorer les requêtes externes (Google, Firebase, Railway API)
    if (url.hostname !== location.hostname) return;

    // Network First pour les pages HTML
    if (event.request.headers.get('accept')?.includes('text/html')) {
      event.respondWith(
        fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              try {
                cache.put(event.request, clone);
              } catch (e) {
                console.error('[SW] Cache put error:', e);
              }
            });
            return response;
          })
          .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
      );
      return;
    }

    // Cache First pour assets statiques (JS, CSS, images)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            try {
              cache.put(event.request, clone);
            } catch (e) {
              console.error('[SW] Cache put error:', e);
            }
          });
          return response;
        }).catch(err => {
          console.error('[SW] Fetch error:', err);
          return cached || new Response('Network error', { status: 503 });
        });
      })
    );
  } catch (error) {
    console.error('[SW] Fetch event error:', error);
  }
});

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch(e) { data = { title: 'GCH CRM', body: event.data.text() }; }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Global Clean Home', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/director' },
      actions: [
        { action: 'open', title: 'Ouvrir' },
        { action: 'close', title: 'Fermer' }
      ]
    })
  );
});

// Clic sur notification
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/director';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Sync en arrière-plan
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Sync les données offline quand la connexion revient
  console.log('[SW] Syncing offline data...');
}
