'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';

type PrefsSlice = {
  pushEnabled: boolean;
  webPushToken: string | null;
  transportNotifications: { push: boolean; inApp: boolean; sms: boolean };
};

export function useTransportWebPush() {
  const [prefs, setPrefs] = useState<PrefsSlice | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    void api.get('/notification-preferences').then(({ data: res }) => {
      const row = res.data as PrefsSlice & Record<string, unknown>;
      setPrefs({
        pushEnabled: Boolean(row.pushEnabled),
        webPushToken: row.webPushToken ?? null,
        transportNotifications: row.transportNotifications ?? { push: true, inApp: true, sms: true },
      });
    });
  }, []);

  const pushActive = Boolean(prefs?.webPushToken && prefs.pushEnabled && prefs.transportNotifications.push);

  const enablePush = useCallback(async () => {
    if (!prefs || !('Notification' in window)) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;
      const next = {
        ...prefs,
        pushEnabled: true,
        webPushToken: 'browser-push-enabled',
        transportNotifications: { ...prefs.transportNotifications, push: true },
      };
      await api.patch('/notification-preferences', next);
      setPrefs(next);
      try {
        new Notification('Shule+ bus alerts', {
          body: 'You will receive transport updates in this browser.',
        });
      } catch {
        /* ignore */
      }
      return true;
    } finally {
      setBusy(false);
    }
  }, [prefs]);

  const updateTransportPrefs = useCallback(async (patch: Partial<PrefsSlice['transportNotifications']>) => {
    if (!prefs) return;
    setBusy(true);
    try {
      const transportNotifications = { ...prefs.transportNotifications, ...patch };
      const body = { transportNotifications, pushEnabled: prefs.pushEnabled, webPushToken: prefs.webPushToken };
      await api.patch('/notification-preferences', body);
      setPrefs({ ...prefs, transportNotifications });
    } finally {
      setBusy(false);
    }
  }, [prefs]);

  return { prefs, permission, pushActive, busy, enablePush, updateTransportPrefs, setPrefs };
}
