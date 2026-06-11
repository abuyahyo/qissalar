// Qissalar Service Worker — network-first to avoid stale-cache problem.
// Online users always get fresh content; cache is only a fallback for offline.

const VERSION = 'v2';
const CACHE = `qissalar-${VERSION}`;
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './qissalar.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting(); // take over immediately on first install
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim(); // start controlling open pages right away
  })());
});

// Network-first with 3s timeout + cache fallback.
// Cache is updated in the background on every successful network fetch.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ignore cross-origin

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // Race: network vs 3-second timeout
    const networkP = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    });

    try {
      const res = await Promise.race([
        networkP,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
      ]);
      if (res && res.ok) return res;
    } catch (_) {
      // fall through to cache
    }

    // Prefer the exact cached resource. Only fall back to the app shell for
    // navigation requests — never answer a JSON/asset request with index.html,
    // which would otherwise surface as a confusing JSON parse error.
    const cached = await cache.match(req) ||
      (req.mode === 'navigate' ? await cache.match('./index.html') : null);
    if (cached) return cached;

    // last-ditch: wait for the original network promise
    try { return await networkP; } catch (_) {
      return new Response('Офлайн ва кеш бўш', { status: 503, statusText: 'Offline' });
    }
  })());
});

// Allow the page to ask SW for its version (debug)
self.addEventListener('message', e => {
  if (e.data === 'version') e.source.postMessage({ version: VERSION });
});
