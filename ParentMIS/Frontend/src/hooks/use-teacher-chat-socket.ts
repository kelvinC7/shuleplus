'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { parentMisSocketUrl } from '@/lib/parent-mis-socket';

export type LiveChatMessage = {
  id: string;
  senderRole: string;
  senderName: string;
  body: string;
  isRead?: boolean;
  createdAt: string;
};

export function useTeacherChatSocket(
  threadId: string | null | undefined,
  onMessage: (message: LiveChatMessage) => void,
  onConnectionChange?: (connected: boolean) => void
) {
  useEffect(() => {
    if (!threadId) return;

    let socket: Socket | null = null;
    try {
      socket = io(parentMisSocketUrl(), {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });
      const setConnected = (v: boolean) => onConnectionChange?.(v);
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.emit('chat:join', { threadId });
      socket.on('chat:message', (payload: { threadId?: string; message?: LiveChatMessage }) => {
        if (payload?.threadId !== threadId || !payload?.message?.id) return;
        onMessage(payload.message);
      });
    } catch {
      /* socket optional — REST still works */
    }

    return () => {
      onConnectionChange?.(false);
      if (socket?.connected) {
        socket.emit('chat:leave', { threadId });
      }
      socket?.disconnect();
    };
  }, [threadId, onMessage, onConnectionChange]);
}
