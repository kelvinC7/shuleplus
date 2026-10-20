import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env';

let io: Server | null = null;

export function initTeacherChatSocket(httpServer: HttpServer) {
  const corsOrigins = String(env.CORS_ORIGIN)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (corsOrigins.includes(origin) || corsOrigins.includes('*')) return cb(null, true);
        if (
          process.env.NODE_ENV !== 'production' &&
          /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
        ) {
          return cb(null, true);
        }
        cb(null, false);
      },
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('chat:join', (payload: { threadId?: string }) => {
      const threadId = payload?.threadId?.trim();
      if (threadId) socket.join(`thread:${threadId}`);
    });
    socket.on('chat:leave', (payload: { threadId?: string }) => {
      const threadId = payload?.threadId?.trim();
      if (threadId) socket.leave(`thread:${threadId}`);
    });
  });

  return io;
}

export function emitTeacherChatMessage(
  threadId: string,
  message: {
    id: string;
    senderRole: string;
    senderName: string;
    body: string;
    isRead?: boolean;
    createdAt: string;
  }
) {
  io?.to(`thread:${threadId}`).emit('chat:message', { threadId, message });
}
