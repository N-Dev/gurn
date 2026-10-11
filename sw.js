/* Gurn offline support.
 * The app's own files: network first, so updates arrive straight away, with the saved copy as the offline fallback.
 * The face tracker, its models and fonts (from CDNs): saved copy first, since those files never change at a given address. */
const APP = 'gurn-app-v1', LIBS = 'gurn-libs-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('gurn-') && k !== APP && k !== LIBS) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      try { const res = await fetch(req); if (res.ok) (await caches.open(APP)).put(req, res.clone()); return res; }
      catch (err) { return (await caches.match(req, {ignoreSearch: true})) || (await caches.match('index.html')) || Response.error(); }
    })());
  } else if (/(^|\.)(jsdelivr\.net|googleapis\.com|gstatic\.com)$/.test(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(LIBS), hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req); if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res;
    })());
  }
});
