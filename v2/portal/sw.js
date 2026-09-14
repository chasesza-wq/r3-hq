/* RecoverRevenue Portal — service worker
   Strategy:
   - navigations: network-first, fall back to cached index.html when offline
   - same-origin static assets: cache-first, populate cache on miss
   - cross-origin (Google Fonts etc.): never intercepted — browser handles them
   Bump CACHE_NAME to invalidate everything. */

'use strict';

var CACHE_NAME = 'rr-portal-v1';

var PRECACHE = [
  './index.html',
  '../assets/icon-512.png',
  '../assets/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Add each entry individually — a missing icon must not break install.
      return Promise.all(
        PRECACHE.map(function (url) {
          return cache.add(url).catch(function () {
            // Swallow: precache is best-effort per file.
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME && key.indexOf('rr-portal-') === 0) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Only handle GET.
  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // Never intercept cross-origin requests (Google Fonts, CDNs) — pass through untouched.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first with cached index.html fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        // Keep the cached shell fresh on successful loads.
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put('./index.html', copy).catch(function () {});
          }).catch(function () {});
        }
        return response;
      }).catch(function () {
        return caches.match('./index.html').then(function (cached) {
          return cached || Response.error();
        });
      })
    );
    return;
  }

  // Same-origin static assets: cache-first, populate on miss.
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok && (response.type === 'basic' || response.type === 'default')) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy).catch(function () {});
          }).catch(function () {});
        }
        return response;
      });
    })
  );
});
