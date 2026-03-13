const CACHE = 'crm-gch-v1';
const OFFLINE_PAGES = [
  '/',
  '/dashboard',
  '/leads',
  '/quotes',
  '/index.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(OFFLINE_PAGES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
