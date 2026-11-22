const CACHE_NAME = 'yoshule-shell-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    } catch {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.indexOf('/api/') !== -1) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200 && (event.request.mode === 'navigate' || url.origin === self.location.origin)) {
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(function() {
        return cache.match(event.request).then(function(cached) {
          return cached || cache.match('./');
        });
      });
    })
  );
});

function normalizePushPayload(event) {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    try { data = { body: event.data.text() }; } catch { data = {}; }
  }
  const d = (data && typeof data === 'object') ? data : {};
  const nested = (d.data && typeof d.data === 'object') ? d.data : {};
  const title = d.title || nested.title || 'yoShule';
  const body = d.body || d.message || nested.body || nested.message || '';
  const payload = {
    id: String(d.id || nested.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    type: d.type || nested.type || 'general',
    title,
    body,
    time: d.time || 'Just now',
    read: false,
    data: { ...nested, ...(d.url ? { url: d.url } : {}), ...(nested.url ? { url: nested.url } : {}) },
    createdAt: d.createdAt || nested.createdAt || new Date().toISOString(),
  };
  const options = {
    body,
    icon: d.icon || nested.icon || './appLogo.png',
    badge: d.badge || nested.badge || './appLogo.png',
    data: payload,
    tag: d.tag || nested.tag || payload.id,
    renotify: false,
  };
  return { payload, options };
}

self.addEventListener('push', function(event) {
  event.waitUntil((async () => {
    const { payload, options } = normalizePushPayload(event);
    try {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        try { client.postMessage({ type: 'PUSH_NOTIFICATION_RECEIVED', payload }); } catch {}
      }
    } catch {}
    await self.registration.showNotification(payload.title || 'yoShule', options);
  })());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const data = event.notification.data || {};
  const url = (data && (data.url || data.data?.url)) || './';
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      try {
        if ('focus' in client) {
          await client.focus();
          if (client.navigate) { try { await client.navigate(url); } catch {} }
          client.postMessage({ type: 'PUSH_NOTIFICATION_CLICKED', payload: data });
          return;
        }
      } catch {}
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});

self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil((async () => {
    try {
      const reg = await self.registration;
      const sub = await reg.pushManager.getSubscription();
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        try { client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', payload: sub ? sub.toJSON() : null }); } catch {}
      }
    } catch {}
  })());
});
