/* Shule+ fee reminder service worker — enables clickable notifications + "Pay now". */
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function payUrlFromData(data) {
  const origin = self.location.origin;
  const params = new URLSearchParams({ pay: 'fees' });
  if (data?.code) params.set('code', String(data.code));
  if (data?.planId) params.set('reminder', String(data.planId));
  return `${origin}/?${params.toString()}`;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action || 'default';
  // "pay-now" button or clicking the notification body both open payment
  if (action && action !== 'pay-now' && action !== 'default') return;

  const targetUrl = data.url || payUrlFromData(data);

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if (!client.url.startsWith(self.location.origin)) continue;
        try {
          client.postMessage({
            type: 'FEE_REMINDER_PAY',
            code: data.code || null,
            planId: data.planId || null,
            url: targetUrl,
          });
        } catch {
          /* ignore */
        }
        if ('focus' in client) {
          await client.focus();
          try {
            client.navigate(targetUrl);
          } catch {
            /* older browsers */
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
