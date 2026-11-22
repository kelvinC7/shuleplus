import { API_BASE_URL } from './config';

export type AppNotification = {
  id: string;
  type: 'academic' | 'attendance' | 'homework' | 'wallet' | 'general' | 'gate' | 'trip' | 'health' | string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  data?: any;
  createdAt?: string;
};

const NOTIF_STORE_KEY = 'yoshule_notifications_v1';
const PUSH_SUB_KEY = 'parent_push_sub';
const PUSH_TOKEN_KEY = 'parent_push_token';
const PUSH_ENABLED_KEY = 'sp_push_enabled';
const PUSH_SYNC_KEY = 'yoshule_push_synced_endpoint_v1';
export const PUSH_UPDATED_EVENT = 'yoshule:notifications-updated';

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getStoredNotifications(): AppNotification[] {
  try {
    return safeJsonParse<AppNotification[]>(localStorage.getItem(NOTIF_STORE_KEY), []);
  } catch {
    return [];
  }
}

export function saveStoredNotifications(items: AppNotification[]) {
  try {
    localStorage.setItem(NOTIF_STORE_KEY, JSON.stringify((items || []).slice(0, 200)));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(PUSH_UPDATED_EVENT, { detail: { notifications: items } }));
  } catch {}
}

export function upsertNotification(input: Partial<AppNotification> & { title?: string; body?: string }) {
  const list = getStoredNotifications();
  const id = String(input.id || `push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const nowIso = new Date().toISOString();
  const createdAt = input.createdAt || nowIso;
  const normalized: AppNotification = {
    id,
    type: (input.type as any) || inferType(input),
    title: input.title || 'yoShule',
    body: input.body || '',
    time: input.time || formatRelativeTime(createdAt),
    read: !!input.read,
    data: input.data || {},
    createdAt,
  };
  const idx = list.findIndex((n) => n.id === id);
  if (idx >= 0) list[idx] = { ...list[idx], ...normalized };
  else list.unshift(normalized);
  saveStoredNotifications(list);
  return normalized;
}

export function markAllNotificationsReadLocal() {
  const list = getStoredNotifications().map((n) => ({ ...n, read: true }));
  saveStoredNotifications(list);
  return list;
}

export function markNotificationReadLocal(id: string) {
  const list = getStoredNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  saveStoredNotifications(list);
  return list;
}

function inferType(input: any): AppNotification['type'] {
  const t = String(input?.type || input?.data?.type || input?.module || '').toLowerCase();
  const title = String(input?.title || '').toLowerCase();
  const body = String(input?.body || input?.message || '').toLowerCase();
  const hay = `${t} ${title} ${body}`;
  if (hay.includes('discipline') || hay.includes('conduct') || hay.includes('demerit') || hay.includes('merit')) return 'discipline';
  if (hay.includes('attend') || hay.includes('gate') || hay.includes('absence') || hay.includes('late')) return 'attendance';
  if (hay.includes('academ') || hay.includes('mark') || hay.includes('report') || hay.includes('exam') || hay.includes('grade')) return 'academic';
  if (hay.includes('fee') || hay.includes('invoice') || hay.includes('receipt') || hay.includes('payment')) return 'fees';
  if (hay.includes('wallet') || hay.includes('card') || hay.includes('balance') || hay.includes('topup') || hay.includes('top up')) return 'wallet';
  if (hay.includes('shulekit') || hay.includes('kit') || hay.includes('uniform') || hay.includes('order')) return 'shulekit';
  if (hay.includes('babyeyi')) return 'babyeyi';
  if (hay.includes('student') || hay.includes('profile') || hay.includes('admission') || hay.includes('management')) return 'studentmanagement';
  if (hay.includes('homework') || hay.includes('assignment')) return 'homework';
  return 'general';
}

function formatRelativeTime(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function syncSubscriptionToBackend(subscription: PushSubscription | null, token?: string | null) {
  try {
    if (!subscription && !token) return;
    const endpoint = subscription?.endpoint || token || '';
    if (!endpoint) return;
    if (localStorage.getItem(PUSH_SYNC_KEY) === endpoint) return;
    const auth = localStorage.getItem('parent_access_token');
    const body = {
      platform: (window as any).Capacitor?.isNativePlatform?.() ? 'native' : 'web',
      subscription: subscription ? subscription.toJSON() : null,
      token: token || null,
      userAgent: navigator.userAgent,
    };
    // Best-effort sync to app API (does not make app rely on notifications module)
    const candidates = [`${API_BASE_URL}/push-subscriptions`, `${API_BASE_URL}/push/subscribe`, `${API_BASE_URL}/device-tokens`];
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
          },
          body: JSON.stringify(body),
        });
        if (res.ok || res.status === 409) {
          localStorage.setItem(PUSH_SYNC_KEY, endpoint);
          break;
        }
      } catch {}
    }
  } catch {}
}

export function listenForPushMessages() {
  if (!('serviceWorker' in navigator)) return;
  const handler = (event: MessageEvent) => {
    const msg = event.data || {};
    if (msg?.type === 'PUSH_NOTIFICATION_RECEIVED' && msg.payload) {
      upsertNotification(msg.payload);
    }
  };
  navigator.serviceWorker.addEventListener('message', handler);
}

export async function registerPush(options?: { silent?: boolean }) {
  const silent = !!options?.silent;
  try {
    listenForPushMessages();

    const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
    if (isNative) {
      try {
        const Plugins = (window as any).Capacitor?.Plugins || {};
        const PushNotifications = Plugins.PushNotifications;
        const LocalNotifications = Plugins.LocalNotifications;
        const enableNativeFcm = String((import.meta as any).env?.VITE_ENABLE_NATIVE_FCM || '').toLowerCase() === 'true';

        // Native FCM (PushNotifications.register) requires Firebase to be configured
        // (google-services.json / FirebaseApp initialization). Calling it without setup
        // can crash the app on Android, so keep it opt-in until Firebase is configured.
        if (enableNativeFcm && PushNotifications) {
          let perm = await PushNotifications.checkPermissions();
          if (perm.receive !== 'granted') perm = await PushNotifications.requestPermissions();
          if (perm.receive === 'granted') {
            await PushNotifications.removeAllListeners?.();
            await PushNotifications.register();
            PushNotifications.addListener('registration', async (token: any) => {
              try { localStorage.setItem(PUSH_TOKEN_KEY, token?.value || ''); } catch {}
              await syncSubscriptionToBackend(null, token?.value || null);
            });
            PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
              upsertNotification({
                id: notification?.id ? String(notification.id) : undefined,
                title: notification?.title || notification?.data?.title || 'yoShule',
                body: notification?.body || notification?.data?.body || notification?.data?.message || '',
                data: notification?.data || {},
                type: notification?.data?.type,
              });
            });
            PushNotifications.addListener('pushNotificationActionPerformed', () => {
              window.dispatchEvent(new CustomEvent('yoshule:push-opened'));
            });
          } else if (!silent) {
            return null;
          }
        }

        if (LocalNotifications) {
          try {
            let perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
          } catch {}
        }
        localStorage.setItem(PUSH_ENABLED_KEY, '1');
        return { platform: 'native', permission: 'granted' as const };
      } catch (e) {
        console.warn('Native push registration failed', e);
        return null;
      }
    }

    if (!('serviceWorker' in navigator) || !('Notification' in window)) return null;
    const reg = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    localStorage.setItem(PUSH_ENABLED_KEY, '1');

    let sub: PushSubscription | null = null;
    const vapid = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
    if (vapid && 'PushManager' in window) {
      try {
        sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid),
          });
        }
      } catch (e) {
        console.warn('Push subscribe failed', e);
      }
    }

    if (sub) {
      try { localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(sub.toJSON())); } catch {}
      await syncSubscriptionToBackend(sub, null);
    }

    return { registration: reg, subscription: sub, permission };
  } catch (e) {
    console.warn('Push registration error', e);
    return null;
  }
}

let _notifStream: EventSource | null = null;

export function connectNotificationStream() {
  try {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    const token = localStorage.getItem('parent_access_token');
    if (!token) return;
    if (_notifStream) {
      try { _notifStream.close(); } catch {}
      _notifStream = null;
    }
    const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    _notifStream = es;
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data || '{}');
        const payload = msg?.payload || msg?.notification || msg;
        if (payload && (payload.title || payload.body || payload.id)) {
          upsertNotification({
            id: payload.id ? String(payload.id) : undefined,
            title: payload.title || payload.type || 'School update',
            body: payload.body || payload.message || '',
            type: payload.type || payload.sourceModule || payload.module,
            read: !!payload.isRead,
            createdAt: payload.createdAt,
            data: { ...(payload.data || {}), source: 'stream', link: payload.link || payload.data?.link },
          });
        }
      } catch {}
    };
    es.onerror = () => {
      try { es.close(); } catch {}
      if (_notifStream === es) _notifStream = null;
    };
  } catch {}
}

export async function initPush() {
  listenForPushMessages();
  connectNotificationStream();
  try {
    window.addEventListener('storage', (e) => {
      if (e.key === 'parent_access_token') connectNotificationStream();
    });
    window.addEventListener('focus', connectNotificationStream);
  } catch {}
  try {
    const enabled = localStorage.getItem(PUSH_ENABLED_KEY) === '1';
    const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
    if (isNative || enabled || granted) {
      await registerPush({ silent: true });
    }
  } catch {}
}

export function getPushEnabled() {
  try { return localStorage.getItem(PUSH_ENABLED_KEY) === '1'; } catch { return false; }
}

export function setPushEnabled(v: boolean) {
  try { localStorage.setItem(PUSH_ENABLED_KEY, v ? '1' : '0'); } catch {}
}
