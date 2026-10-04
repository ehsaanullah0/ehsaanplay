// EHSAAN MOVIE — PWA Application Shell Service Worker
// NOTE: Application owns artwork caching via Cache API. Service worker handles app shell only.

const SHELL_CACHE_NAME = 'ehsaan-movie-shell-v2.4.0';
const OBSOLETE_SHELL_CACHES = ['ehsaan-movie-shell-v1', 'ehsaan-movie-shell-v2', 'ehsaan-movie-shell-v2.2.0', 'ehsaan-movie-shell-v2.3.0'];

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json',
];

// 1. INSTALL LIFECYCLE
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
    // Do NOT automatically skipWaiting here so user controls when to apply updates
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

  // DO NOT intercept TMDB artwork or external images (application owns artwork cache)
  if (
    url.hostname.includes('tmdb.org') ||
    url.hostname.includes('themoviedb.org') ||
    url.hostname.includes('unsplash.com') ||
    request.url.startsWith('chrome-extension')
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

  // Static Assets (JS, CSS, SVGs, Fonts): Cache-first with Network fallback
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
