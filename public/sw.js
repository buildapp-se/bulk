// Offline: network-first for pages (fresh deploys win), cache-first for hashed static assets.
const CACHE = 'bulk-v1';

// Every route and the assets its HTML names, cached at install: a first visit to one page must still open the
// others offline (before this only visited pages were cached, and a deep link to Tillagning showed Välj).
const PAGES = ['/bulk/', '/bulk/ingredienser/', '/bulk/tillagning/', '/bulk/prepp/'];
async function precache() {
  const c = await caches.open(CACHE);
  await Promise.all(PAGES.map(async (u) => {
    const res = await fetch(u);
    if (!res.ok) return;
    const html = await res.clone().text();
    await c.put(u, res);
    const assets = [...new Set(html.match(/\/bulk\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
    await Promise.all(assets.map(async (a) => { if (!(await c.match(a))) { const r = await fetch(a); if (r.ok) await c.put(a, r); } }));
  }));
}

self.addEventListener('install', (e) => e.waitUntil(precache().catch(() => {}).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin + '/bulk/')) return;
  const hashed = req.url.includes('/_next/static/');
  e.respondWith(
    hashed
      ? caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res)))
      // Only a page falls back to Välj: an RSC payload answered with HTML sent the app back to Välj offline.
      : fetch(req).then((res) => put(req, res)).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/bulk/') : Response.error())))
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
