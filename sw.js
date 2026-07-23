// Lawn Legend service worker — offline play + clean updates.
// Bump CACHE_VERSION on every deploy that changes index.html.
const CACHE_VERSION = 'v8';
const CACHE_NAME = 'lawn-legend-' + CACHE_VERSION;

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/privacy.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Page posts this when the player taps the update banner.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // NEVER cache or intercept Supabase — cloud saves and the leaderboard
  // must always hit the network, no stale data.
  if (url.href.includes('supabase')) return;

  // Only handle same-origin GETs
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isNav = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';

  if (isNav) {
    // Network-first: players get updates when online; cache keeps pages
    // loading with no connection. Cache under the page's own path — the game
    // shell at '/', other pages (e.g. /privacy.html) under themselves.
    const cacheKey = (url.pathname === '/' || url.pathname === '/index.html') ? '/index.html' : url.pathname;
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(cacheKey, copy));
          return res;
        })
        .catch(() => caches.match(cacheKey).then(hit => hit || caches.match('/index.html')))
    );
    return;
  }

  // Static assets (icons, manifest): cache-first
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});
