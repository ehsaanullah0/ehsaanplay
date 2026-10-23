// EHSAAN MOVIE — PWA Application Shell Service Worker
// NOTE: Application owns artwork caching via Cache API. Service worker handles app shell only.

const SHELL_CACHE_NAME = 'ehsaan-play-static-v5';
const OBSOLETE_SHELL_CACHES = [
  'ehsaan-play-static-v4',
  'ehsaan-movie-shell-v1',
  'ehsaan-movie-shell-v2',
  'ehsaan-movie-shell-v2.2.0',
  'ehsaan-movie-shell-v2.3.0',
  'ehsaan-movie-shell-v2.4.0',
  'ehsaan-movie-shell-v2.5.0',
  'ehsaan-movie-shell-v2.6.0',
  'ehsaan-movie-shell-v2.7.0',
  'ehsaan-movie-shell-v2.8.0',
  'ehsaan-movie-shell-v2.9.0',
  'ehsaan-movie-shell-v3.0.0',
  'ehsaan-movie-shell-v3.2.0'
];

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json',
  '/icons/apple-touch-icon-v2.png',
  '/icons/icon-192-v2.png',
  '/icons/icon-512-v2.png',
  '/icons/icon-512-maskable-v2.png',
];

// 1. INSTALL LIFECYCLE - Skip waiting immediately to activate fresh code
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. USER-TRIGGERED UPDATE ACTIVATION
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 3. ACTIVATE LIFECYCLE (Safely clean obsolete application shell caches ONLY)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Delete obsolete shell caches ONLY.
          // CRITICAL: NEVER delete artwork cache (ehsaan-movie-offline-images-v1) or user data!
          if (
            OBSOLETE_SHELL_CACHES.includes(key) ||
            key === 'ehsaan-play-static-v4' ||
            (key.startsWith('ehsaan-movie-shell-') && key !== SHELL_CACHE_NAME)
          ) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 4. FETCH INTERCEPTION & NETWORK-FIRST HTML REVALIDATION
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // TMDB Artwork: Network with cache fallback to ehsaan-movie-offline-images-v1
  if (url.hostname.includes('image.tmdb.org') || url.hostname.includes('themoviedb.org')) {
    event.respondWith(
      caches.open('ehsaan-movie-offline-images-v1').then((artCache) => {
        return artCache.match(request, { ignoreSearch: true, ignoreVary: true }).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((res) => {
              if (res && res.status === 200) {
                artCache.put(request, res.clone());
              }
              return res;
            })
            .catch(() => {
              // Try matching by image filename on offline network failure
              const filename = url.pathname.split('/').pop()?.split('?')[0];
              if (filename && filename.length > 4) {
                return artCache.keys().then((keys) => {
                  const matchKey = keys.find((k) => k.url.includes(filename));
                  if (matchKey) {
                    return artCache.match(matchKey);
                  }
                  return new Response('', { status: 404, statusText: 'Offline Artwork Missing' });
                });
              }
              return new Response('', { status: 404, statusText: 'Offline Artwork Missing' });
            });
        });
      })
    );
    return;
  }

  // DO NOT intercept dev server dependencies, Vite internals, node_modules, or API
  if (
    url.hostname.includes('unsplash.com') ||
    request.url.startsWith('chrome-extension') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/@') ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('vite')
  ) {
    return;
  }

  if (request.method !== 'GET') return;

  // Navigation / HTML requests: Network-first with Cache fallback to prevent stale index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(SHELL_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html').then((cachedIndex) => {
            return cachedIndex || new Response('Offline', { status: 503, statusText: 'Offline' });
          });
        })
    );
    return;
  }

  // Static Assets: Only cache production dist assets, never dev node_modules
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === location.origin || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(SHELL_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response('Asset unavailable offline', { status: 503, statusText: 'Service Unavailable' });
        });
    })
  );
});
