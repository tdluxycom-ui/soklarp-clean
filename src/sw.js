/* ========================================
   SOKLARP.ORG - Service Worker v2.0
   Advanced caching for PWA & offline support
   ======================================== */

const CACHE_NAME = 'soklarp-cache-v5';
const STATIC_CACHE = 'soklarp-static-v5';
const IMAGE_CACHE = 'soklarp-images-v5';

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/style.css',
  '/main.js',
  '/assets/fonts/fonts.css',
  '/assets/libs/slick/slick.css',
  '/assets/libs/slick/slick.min.js',
  '/assets/libs/jquery/jquery.min.js'
];

// Install: pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, STATIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Never cache API responses: they can contain user profiles, balances, and tickets.
  if (url.pathname.startsWith('/api/')) return;

  // Images: cache first, network fallback
  if (request.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (/\.(css|js)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (/\.(woff2?|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML & other: network first for navigate (do NOT fallback to /)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(request));
    return;
  }

  // Default: network first
  event.respondWith(networkFirst(request));
});

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const contentType = response.headers.get('content-type') || '';
    const isAssetRequest = request.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot)$/i.test(new URL(request.url).pathname);
    const isValidAsset = !isAssetRequest || !contentType.includes('text/html');
    if (response.ok && isValidAsset) {
      const cache = await caches.open(cacheName || CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first strategy for regular requests
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy for navigate (do NOT fallback to home page)
async function networkFirstNavigate(request) {
  try {
    const response = await fetch(request);
    if (response.ok || response.status === 404) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return 503 instead of home page for offline/failed navigation
    return new Response('Service Unavailable - Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Message handler for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
