/* global self, clients, caches */
// Service worker: app-shell caching (PWA) + Web Push (Ticha Avance).
// Keep this file at /sw.js (Vite public/). Bump VERSION to force a refresh of caches.

const VERSION = 'v3';
const SHELL_CACHE = `ticha-shell-${VERSION}`;
const RUNTIME_CACHE = `ticha-runtime-${VERSION}`;
const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/st-wordmark.webp',
  '/logo_white.png',
];

// Never cache API / realtime / uploads: data must always be live.
const NETWORK_ONLY = ['/api', '/tp-api', '/iam-api', '/kazi-api', '/socket.io', '/uploads'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => undefined)
  );
  // Do not skipWaiting automatically: the app shows an "Update available" banner
  // and sends SKIP_WAITING when the user taps Refresh.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL_CACHE, RUNTIME_CACHE];
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('ticha-') && !keep.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NETWORK_ONLY.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))) return;
  if (url.pathname === '/sw.js') return;

  // Page navigations: network first, fall back to the cached app shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => (await caches.match('/')) || (await caches.match(req)) || Response.error())
    );
    return;
  }

  // Static assets (hashed JS/CSS, images, fonts): serve from cache, refresh in background.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
          return res;
        })
        .catch(() => undefined);
      return cached || (await network) || Response.error();
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Ticha', body: '', tag: 'ticha-notification', url: '/' };
  try {
    if (event.data) {
      const j = event.data.json();
      payload = {
        title: j.title || payload.title,
        body: j.body || '',
        tag: j.tag || payload.tag,
        url: j.url || payload.url,
        icon: j.icon || payload.icon,
        badge: j.badge || payload.badge,
      };
    }
  } catch (_) {
    try {
      const t = event.data && event.data.text();
      if (t) payload.body = t;
    } catch (__) {
      /* ignore */
    }
  }

  const targetUrl = payload.url || '/';
  const title = payload.title;
  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    tag: payload.tag,
    renotify: true,
    data: { url: targetUrl },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      try {
        const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windowClients) {
          client.postMessage({ type: 'PUSH_NOTIFICATION', payload: { title, body: payload.body, url: targetUrl, tag: payload.tag } });
        }
      } catch (_) {
        /* ignore */
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/shule-avance';
  const openUrl = new URL(url, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const c of windowClients) {
        if (c.url === openUrl && 'focus' in c) {
          return c.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(openUrl);
      }
      return undefined;
    })
  );
});
