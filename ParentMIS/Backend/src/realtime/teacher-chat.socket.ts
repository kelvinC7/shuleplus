import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { socketIoCorsOrigin } from '../config/cors';

let io: Server | null = null;

export function initTeacherChatSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: socketIoCorsOrigin(env.CORS_ORIGIN, env.NODE_ENV),
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
