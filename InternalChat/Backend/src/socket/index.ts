import http from 'node:http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { presence } from './presence';
import { conversationService } from '../services/conversation.service';
import { memberService } from '../services/member.service';
import type { JwtPayload } from '../middleware/auth.middleware';

let io: Server | null = null;

function corsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
  const token =
    (socket.handshake.auth?.token as string | undefined) ??
    (socket.handshake.query?.token as string | undefined);
  if (!token) return next(new Error('Authentication required'));
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    socket.data.userId = payload.sub;
    socket.data.organizationId = payload.organizationId;
    socket.data.email = payload.email;
    socket.data.roles = payload.roles ?? [];
    next();
  } catch {
    next(new Error('Invalid or expired access token'));
  }
}

async function joinUserRooms(socket: Socket): Promise<void> {
  const userId = socket.data.userId as string;
  const orgId = socket.data.organizationId as string;
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  for (const m of memberships) socket.join(`conv:${m.conversationId}`);
  socket.join(`org:${orgId}`);
}

async function handleConnection(socket: Socket): Promise<void> {
  const userId = socket.data.userId as string;
  const orgId = socket.data.organizationId as string;
  const email = socket.data.email as string | undefined;

  try {
    await memberService.ensureSelf(
      {
        sub: userId,
        email: email ?? '',
        organizationId: orgId,
        sessionId: '',
        roles: (socket.data.roles as string[] | undefined) ?? [],
        modules: [],
      },
      orgId
    );
  } catch {
    /* directory sync is best-effort on connect */
  }
  await joinUserRooms(socket);

  presence.markOnline(userId, orgId, socket.id);
  socket.emit('presence:init', { onlineUserIds: presence.onlineUserIds(orgId) });
  socket.to(`org:${orgId}`).emit('presence:online', { userId });

  socket.on('typing:start', (data: unknown) => void handleTyping(socket, data, 'typing:start'));
  socket.on('typing:stop', (data: unknown) => void handleTyping(socket, data, 'typing:stop'));

  socket.on('disconnect', () => {
    const fullyOffline = presence.markOffline(userId, socket.id);
    if (fullyOffline) {
      socket.to(`org:${orgId}`).emit('presence:offline', { userId });
    }
  });
}

async function handleTyping(
  socket: Socket,
  data: unknown,
  event: 'typing:start' | 'typing:stop'
): Promise<void> {
  const conversationId = (data as { conversationId?: string } | null)?.conversationId;
  if (!conversationId) return;
  try {
    await conversationService.assertMembership(
      conversationId,
      socket.data.userId as string,
      socket.data.organizationId as string
    );
  } catch {
    return;
  }
  socket
    .to(`conv:${conversationId}`)
    .emit(event, { conversationId, userId: socket.data.userId });
}

export function initSocket(server: http.Server): Server {
  io = new Server(server, {
    cors: { origin: corsOrigins(), credentials: true },
  });
  io.use(authenticateSocket);
  io.on('connection', (socket) => {
    void handleConnection(socket);
  });
  return io;
}

function joinRoomsForMember(organizationId: string, userId: string, conversationId: string): void {
  if (!io) return;
  for (const socket of io.sockets.sockets.values()) {
    if (
      socket.data.organizationId === organizationId &&
      socket.data.userId === userId
    ) {
      socket.join(`conv:${conversationId}`);
    }
  }
}

/** Emitters used by REST controllers to push realtime updates over WebSocket. */
export const chatEvents = {
  emitNewMessage(
    organizationId: string,
    message: {
      conversationId: string;
      senderId: string;
      createdAt: string | Date;
      type: string;
      body: string | null;
    }
  ): void {
    if (!io) return;
    io.to(`conv:${message.conversationId}`).emit('message:new', message);
    io.to(`org:${organizationId}`).emit('conversation:updated', {
      conversationId: message.conversationId,
      senderId: message.senderId,
      lastMessageAt: message.createdAt,
      type: message.type,
      body: message.body,
    });
  },

  emitConversationCreated(
    organizationId: string,
    conversation: { id: string },
    memberIds: string[]
  ): void {
    if (!io) return;
    for (const userId of memberIds) joinRoomsForMember(organizationId, userId, conversation.id);
    io.to(`org:${organizationId}`).emit('conversation:new', conversation);
  },

  emitConversationMemberChanged(
    organizationId: string,
    conversationId: string,
    kind: 'member_added' | 'member_removed' | 'left',
    payload: { conversationId: string; userId: string }
  ): void {
    if (!io) return;
    if (kind === 'member_added') {
      joinRoomsForMember(organizationId, payload.userId, conversationId);
    }
    io.to(`org:${organizationId}`).emit('conversation:member', { kind, payload });
  },

  emitRead(
    organizationId: string,
    read: { conversationId: string; messageId: string; userId: string; lastReadAt: string | Date }
  ): void {
    if (!io) return;
    io.to(`conv:${read.conversationId}`).emit('message:read', read);
  },

  emitTyping(
    organizationId: string,
    conversationId: string,
    payload: { conversationId: string; userId: string; isTyping: boolean }
  ): void {
    if (!io) return;
    io.to(`conv:${conversationId}`).emit(payload.isTyping ? 'typing:start' : 'typing:stop', {
      conversationId,
      userId: payload.userId,
    });
  },

  emitMemberSynced(
    organizationId: string,
    result: { synced: boolean; count: number }
  ): void {
    if (!io) return;
    io.to(`org:${organizationId}`).emit('member:synced', result);
  },
};
