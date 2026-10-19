/* GLOWNESS SHOP Service Worker — PWA offline + notifikasi admin */
const CACHE_NAME = 'glowness-shop-v1.4.0-pwa';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/styles.css?v=1.4.0',
  '/assets/app.js?v=1.4.0',
  '/assets/img/logo-sm.png',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
  '/assets/img/apple-touch-icon.png'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML/API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin (except same origin)
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation / HTML
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets (css, js, images)
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/seed-from-supabase.json'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
  }
});

// Notifikasi klik: buka/fokus tab app ke URL target (portal pesanan/penarikan/chat)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetHash = data.url || '#/portal/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus().then(() => {
            try {
              client.postMessage({ type: 'GL_NOTIF_CLICK', url: targetHash, data });
            } catch (_) {}
            if (typeof client.navigate === 'function') {
              const base = client.url.split('#')[0];
              return client.navigate(base + targetHash).catch(() => client);
            }
            return client;
          });
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/' + targetHash);
      }
    })
  );
});

// Optional: support push payload (jika nanti VAPID / server push diaktifkan)
self.addEventListener('push', (event) => {
  let payload = { title: 'GLOWNESS SHOP', body: 'Ada pembaruan baru', url: '#/portal/dashboard' };
  try {
    if (event.data) {
      const json = event.data.json();
      payload = Object.assign(payload, json);
    }
  } catch (_) {
    try {
      payload.body = event.data ? event.data.text() : payload.body;
    } catch (__) {}
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'GLOWNESS SHOP', {
      body: payload.body || '',
      icon: '/assets/img/icon-192.png',
      badge: '/assets/img/icon-192.png',
      tag: payload.tag || 'gl-push',
      data: { url: payload.url || '#/portal/dashboard', type: payload.type || 'push' },
      renotify: true
    })
  );
});
