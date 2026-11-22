'use client';

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import { api } from '@/services/api';

async function loadFirebaseConfig(): Promise<Partial<Record<string, string>> | null> {
  if (typeof window === 'undefined') return null;

  const envConfig: Partial<Record<string, string>> = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  };

  if (Object.values(envConfig).every(Boolean)) {
    return envConfig;
  }

  try {
    const response = await fetch('/firebase-config.json', { cache: 'no-store' });
    if (!response.ok) return null;
    const config = (await response.json()) as Record<string, string>;
    return config.apiKey && config.projectId ? config : null;
  } catch {
    return null;
  }
}

export async function isFirebaseConfigured(): Promise<boolean> {
  const config = await loadFirebaseConfig();
  return Boolean(config && config.apiKey && config.projectId);
}

export async function getFirebaseApp() {
  if (typeof window === 'undefined') return null;
  const config = await loadFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) return null;
  return getApps().length ? getApp() : initializeApp(config);
}

export function isNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function registerAndroidPushToken(): Promise<string | null> {
  if (!isNativeAndroid()) return null;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return null;

  await PushNotifications.register();

  return await new Promise<string | null>(async (resolve) => {
    let registrationListener: Awaited<ReturnType<typeof PushNotifications.addListener>> | null = null;
    let errorListener: Awaited<ReturnType<typeof PushNotifications.addListener>> | null = null;
    let timer: number | undefined;

    const complete = (value: string | null) => {
      if (timer) clearTimeout(timer);
      registrationListener?.remove();
      errorListener?.remove();
      resolve(value);
    };

    registrationListener = await PushNotifications.addListener('registration', ({ value }) => {
      complete(value || null);
    });
    errorListener = await PushNotifications.addListener('registrationError', () => {
      complete(null);
    });
    timer = window.setTimeout(() => complete(null), 15000);
  });
}

export async function requestWebFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  const config = await loadFirebaseConfig();
  if (!config || !config.vapidKey) return null;
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
  }

  const app = await getFirebaseApp();
  if (!app) return null;

  await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => undefined);

  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  return getToken(messaging, { vapidKey: config.vapidKey, serviceWorkerRegistration: registration }).catch(() => null);
}

export function listenForForegroundMessages(handler: (payload: MessagePayload) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let unsubscribe: (() => void) | undefined;
  void getFirebaseApp().then((app) => {
    if (!app) return;
    const messaging = getMessaging(app);
    unsubscribe = onMessage(messaging, (payload) => handler(payload));
  });

  return () => unsubscribe?.();
}

export async function registerParentDeviceToken(token: string, platform: 'WEB' | 'ANDROID' | 'IOS') {
  if (!token || !token.trim()) return null;

  try {
    const { data } = await api.post('/notifications/fcm/register', {
      token,
      platform,
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
    return data?.data ?? null;
  } catch (error) {
    console.warn('[fcm] register token failed', error);
    return null;
  }
}
