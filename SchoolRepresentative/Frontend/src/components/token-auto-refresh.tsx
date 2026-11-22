'use client';

import { useEffect } from 'react';
import {
  AUTH_CHANGE_EVENT,
  getRefreshToken,
  getToken,
  getTokenExpiryMs,
} from '@/shared/auth-token';
import { refreshAccessToken } from '@/services/api';

const REFRESH_LEAD_MS = 60_000;
const MIN_RETRY_MS = 15_000;

export function TokenAutoRefresh() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    const run = async () => {
      if (cancelled || !getRefreshToken()) return;
      const token = await refreshAccessToken();
      if (!token) return;
      schedule();
    };

    function schedule() {
      clearTimer();
      if (cancelled) return;
      const token = getToken();
      if (!token || !getRefreshToken()) return;
      const expiresAt = getTokenExpiryMs(token);
      if (!expiresAt) return;

      const delay = expiresAt - Date.now() - REFRESH_LEAD_MS;
      timer = setTimeout(() => void run(), Math.max(delay, MIN_RETRY_MS));
    }

    const refreshIfDue = () => {
      if (document.visibilityState !== 'visible') return;
      const token = getToken();
      if (!token) return;
      const expiresAt = getTokenExpiryMs(token);
      if (!expiresAt || expiresAt - Date.now() <= REFRESH_LEAD_MS) void run();
      else schedule();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key.startsWith('DirectorConsole_')) schedule();
    };

    schedule();
    document.addEventListener('visibilitychange', refreshIfDue);
    window.addEventListener('focus', refreshIfDue);
    window.addEventListener(AUTH_CHANGE_EVENT, schedule);
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener('visibilitychange', refreshIfDue);
      window.removeEventListener('focus', refreshIfDue);
      window.removeEventListener(AUTH_CHANGE_EVENT, schedule);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
