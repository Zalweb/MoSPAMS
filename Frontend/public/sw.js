// MoSPAMS Service Worker — network-first for API, stale-while-revalidate for assets
const CACHE_VERSION = 'mospams-v2';
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;

const PRECACHE_URLS = ['/'];

const SKIP_CACHE = ['/api/', 'hot-update', 'sockjs-node', '@vite'];

function shouldSkip(url) {
  return SKIP_CACHE.some(p => url.includes(p));
}

// Install: pre-cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(ASSET_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: purge old cache versions and claim clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(n => n.startsWith('mospams-') && n !== ASSET_CACHE && n !== FONT_CACHE)
          .map(n => caches.delete(n)),
      ),
    ).then(() => self.clients.claim()),
  );
});

// Fetch: strategy by request type
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  if (request.method !== 'GET' || shouldSkip(url)) return;

  // Fonts — cache-first (immutable)
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic') || url.includes('/fonts/')) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // JS/CSS/images — stale-while-revalidate (instant + stays fresh)
  if (/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)(\?|$)/.test(url)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // HTML navigation — network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, ASSET_CACHE));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached ?? await fetchPromise ?? new Response('Offline', { status: 503 });
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response('Offline — please reconnect', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
