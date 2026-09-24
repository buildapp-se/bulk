// Offline: network-first for pages (fresh deploys win), cache-first for hashed static assets.
const CACHE = 'bulk-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin + '/bulk/')) return;
  const hashed = req.url.includes('/_next/static/');
  e.respondWith(
    hashed
      ? caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res)))
      : fetch(req).then((res) => put(req, res)).catch(() => caches.match(req).then((hit) => hit || caches.match('/bulk/')))
  );
});

function put(req, res) {
  if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow('/bulk/tillagning/'))));
});
