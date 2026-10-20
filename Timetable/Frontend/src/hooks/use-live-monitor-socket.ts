'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureFreshAccessToken } from '@/services/api';

function liveWebSocketUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010/api';
  const wsBase = base.replace(/^http/i, 'ws');
  return `${wsBase}/live/ws?token=${encodeURIComponent(token)}`;
}

export function useLiveMonitorSocket(onUpdate: () => void, enabled = true) {
  const [connected, setConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const reconnect = useCallback(() => {
    onUpdateRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let ws: WebSocket | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    async function connect() {
      if (cancelled) return;
      const token = await ensureFreshAccessToken();
      if (!token || cancelled) return;

      ws = new WebSocket(liveWebSocketUrl(token));

      ws.onopen = () => {
        reconnectAttempt = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as { type?: string };
          if (msg.type === 'live_update') {
            onUpdateRef.current();
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (cancelled) return;
        const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt);
        reconnectAttempt += 1;
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    void connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
      setConnected(false);
    };
  }, [enabled, reconnect]);

  return { connected, reconnect };
}
