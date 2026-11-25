// Offline: network-first for pages (fresh deploys win), cache-first for hashed static assets.
// One cache per deploy ('bulk-<time>'): sw.js does not change between deploys, so a page whose HTML names an asset
// the cache lacks is a new deploy, and the cache is rebuilt as on a fresh install and the old one deleted. Before
// this, one cache ('bulk-v1') kept every deploy's hashed files forever.
const PAGES = ['/bulk/', '/bulk/ingredienser/', '/bulk/tillagning/', '/bulk/prepp/'];
const assetsIn = (html) => [...new Set(html.match(/\/bulk\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
const isOurs = (k) => k.startsWith('bulk-');
const current = async () => (await caches.keys()).filter((k) => /^bulk-\d+$/.test(k)).sort().pop() ?? 'bulk-0';

// Every route and the assets its HTML names: a first visit to one page must still open the others offline
// (before 2026-11-24 only visited pages were cached, and a deep link to Tillagning showed Välj).
// Assets already cached by the previous deploy are copied, not fetched again.
let refreshing = null;
function refresh() {
  return (refreshing ??= (async () => {
    const name = 'bulk-' + Date.now();
    const c = await caches.open(name);
    await Promise.all(PAGES.map(async (u) => {
      const res = await fetch(u);
      if (!res.ok) return;
      const html = await res.clone().text();
      await c.put(u, res);
      await Promise.all(assetsIn(html).map(async (a) => {
        const r = (await caches.match(a)) ?? (await fetch(a));
        if (r.ok) await c.put(a, r);
      }));
    }));
    await Promise.all((await caches.keys()).filter((k) => isOurs(k) && k !== name).map((k) => caches.delete(k)));
  })().catch(() => {}).finally(() => { refreshing = null; }));
}

// ponytail: an asset that fails to precache makes every later page view rebuild the cache; harmless, only extra fetches.
async function stale(html) {
  const c = await caches.open(await current());
  for (const a of assetsIn(html)) if (!(await c.match(a))) return true;
  return false;
}

self.addEventListener('install', (e) => e.waitUntil(refresh().then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin + '/bulk/')) return;
  const hashed = req.url.includes('/_next/static/');
  e.respondWith(
    hashed
      ? caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res)))
      // Only a page falls back to Välj: an RSC payload answered with HTML sent the app back to Välj offline.
      : fetch(req).then((res) => {
          if (res.ok && req.mode === 'navigate') e.waitUntil(res.clone().text().then(stale).then((s) => s && refresh()));
          return put(req, res);
        }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/bulk/') : Response.error())))
  );
});

function put(req, res) {
  if (res.ok) { const copy = res.clone(); current().then((k) => caches.open(k)).then((c) => c.put(req, copy)); }
  return res;
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow('/bulk/tillagning/'))));
});
