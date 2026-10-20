'use client';

import { useEffect } from 'react';
import { getToken } from '@/shared/auth-token';

export type LiveNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  link: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3048/api';

function showBrowserPush(n: LiveNotification) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(n.title, { body: n.body, tag: n.id });
  } catch {
    /* ignore blocked notifications */
  }
}

export function useNotificationStream(onNotification: (n: LiveNotification) => void) {
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const controller = new AbortController();
    let cancelled = false;

    async function listen() {
      try {
        const res = await fetch(`${API_BASE}/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() ?? '';
          for (const chunk of chunks) {
            const line = chunk.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
              const json = JSON.parse(line.slice(6)) as {
                type?: string;
                payload?: LiveNotification;
              };
              if (json.type === 'notification' && json.payload) {
                onNotification(json.payload);
                showBrowserPush(json.payload);
              }
            } catch {
              /* ignore malformed SSE */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('[parent-notifications] live stream unavailable');
        }
      }
    }

    void listen();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [onNotification]);
}
