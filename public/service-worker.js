// public/service-worker.js
const CACHE_NAME = 'bucket-list-cache-v1';

const ASSETS = [
  // App shell (local files)
  '/frontend/index.html',
  '/frontend/script.js',
  '/frontend/style.css',              // if you have it; safe to include even if missing
  '/public/manifest.json',
  '/public/icons/icon-192x192.png',
  '/public/icons/icon-512x512.png',

  // CDN assets (so design works offline)
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/daisyui@4.0.0/dist/full.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Utility: attempt to cache each URL (tolerant to failures)
async function cacheAssets(cache, urls) {
  return Promise.all(urls.map(async (url) => {
    try {
      // Use mode:'no-cors' for some CDN hosts to avoid CORS blocking in caching.
      const response = await fetch(url, { mode: 'no-cors' });
      // If fetch succeeded, put a clone into cache.
      await cache.put(url, response.clone());
    } catch (err) {
      // We'll warn but do not fail install because some CDNs may behave differently.
      console.warn('[SW] Failed to cache', url, err);
    }
  }));
}

self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // Try a tolerant caching routine so install won't fail if some assets can't be fetched.
        await cacheAssets(cache, ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Navigation request (HTML pages) -> Network-first (try online, fallback to cache)
  if (event.request.mode === 'navigate' ||
      (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Update cache with latest HTML
          caches.open(CACHE_NAME).then(cache => {
            try { cache.put(event.request, networkResponse.clone()); } catch(e) { /* ignore */ }
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/frontend/index.html');
        })
    );
    return;
  }

  // For other requests (CSS/JS/images/CDNs) -> Cache-first, then network and update cache
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then(networkResponse => {
          // Cache successful network responses for future
          return caches.open(CACHE_NAME).then(cache => {
            try { cache.put(event.request, networkResponse.clone()); } catch(e) { /* ignore */ }
            return networkResponse;
          });
        })
        .catch(() => {
          // Optionally provide fallback for images or fonts here (not required)
          return caches.match('/public/icons/icon-192x192.png'); // fallback icon if something fails
        });
    })
  );
});
