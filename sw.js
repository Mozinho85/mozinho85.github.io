// Bump BUILD on every deploy and keep the ?v= query in index.html / game.html
// in sync with it. The versioned JS URLs change each build, so browsers always
// fetch fresh code instead of serving a stale cached copy.
const BUILD = '17';
const CACHE_NAME = 'penalty-cup-v' + BUILD;
const ASSETS = [
  './',
  './index.html',
  './game.html',
  './app.js?v=' + BUILD,
  './data.js?v=' + BUILD,
  './game.js?v=' + BUILD,
  './bgm.mp3',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle same-origin GET requests. Cross-origin calls (Google ads,
  // analytics, etc.) and non-GET requests go straight to the network so the
  // service worker can never stall the page on a third-party request.
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.search.indexOf('v=') !== -1) {
    // Versioned asset (immutable for this build) → cache-first: instant + offline.
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        return res;
      }))
    );
  } else {
    // HTML / unversioned → network-first so new deploys appear right away.
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  }
});
