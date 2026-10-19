// Offline cache. Bump VERSION (same as APP_VERSION in app.js) on each release so the old cache is replaced.
const VERSION = '0.3.0', CACHE = 'alvel-garage-' + VERSION;
const CORE = ['./', 'index.html', 'app.js', 'app.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  ...['vehicles', 'specs', 'parts', 'schedule', 'fuses', 'guides', 'faults', 'buying', 'auction', 'resources', 'sources'].map(f => `data/${f}.json`)];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE))); });
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Network first so data corrections show up straight away, cached copy when offline.
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./'))));
});
