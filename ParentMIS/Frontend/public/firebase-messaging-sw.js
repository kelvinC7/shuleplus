importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

fetch('/firebase-config.json', { cache: 'no-store' })
  .then((response) => (response.ok ? response.json() : null))
  .then((config) => {
    if (!config || !config.apiKey || !config.projectId) return;
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title ?? 'Parent Portal';
      const body = payload.notification?.body ?? 'You have a new notification.';
      const link = payload.data?.link || '/notifications';

      self.registration.showNotification(title, {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: payload.data?.notificationId || payload.data?.type || 'parentmis-notification',
        data: { ...payload.data, link },
      });
    });

    self.addEventListener('notificationclick', (event) => {
      event.notification.close();
      const link = event.notification?.data?.link || '/notifications';
      const url = new URL(link, self.location.origin).href;
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          for (const client of clientList) {
            if ('focus' in client) {
              client.navigate(url);
              return client.focus();
            }
          }
          if (clients.openWindow) return clients.openWindow(url);
        })
      );
    });
  })
  .catch(() => undefined);
