import { MessageType } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { conversationService } from './conversation.service';

export interface AttachmentInput {
  url: string;
  name?: string;
  mime: string;
  size?: number;
}

const VALID_TYPES = new Set(['TEXT', 'IMAGE', 'FILE']);

export class MessageService {
  async assertConversation(conversationId: string, organizationId: string) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
    });
    if (!conv) throw new AppError(404, 'Conversation not found');
    return conv;
  }

  async list(
    conversationId: string,
    userId: string,
    organizationId: string,
    opts: { before?: string; limit?: number } = {}
  ) {
    await conversationService.assertMembership(conversationId, userId, organizationId);
    await this.assertConversation(conversationId, organizationId);

    const limit = Math.min(Math.max(Number(opts.limit ?? 50), 1), 200);
    const before = opts.before ? new Date(opts.before) : undefined;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        organizationId,
        deletedAt: null,
        ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const ordered = messages.reverse();
    return this.withSenders(ordered, organizationId);
  }

  async create(input: {
    conversationId: string;
    organizationId: string;
    senderId: string;
    type?: string;
    body?: string;
    attachment?: AttachmentInput | null;
  }) {
    const conv = await this.assertConversation(input.conversationId, input.organizationId);
    await conversationService.assertMembership(input.conversationId, input.senderId, input.organizationId);

    const type = (input.type ?? 'TEXT') as MessageType;
    if (!VALID_TYPES.has(type)) throw new AppError(400, 'Invalid message type');

    const body = input.body?.trim();
    if (type === 'TEXT' && !body) throw new AppError(400, 'Message body is required');

    if (conv.type === 'ANNOUNCEMENT') {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: conv.id, userId: input.senderId } },
      });
      if (membership?.role !== 'ADMIN') {
        throw new AppError(403, 'Only admins can post announcements');
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        organizationId: input.organizationId,
        senderId: input.senderId,
        type,
        body: type === 'TEXT' ? body : null,
        attachmentUrl: input.attachment?.url ?? null,
        attachmentName: input.attachment?.name ?? null,
        attachmentMime: input.attachment?.mime ?? null,
        attachmentSize: input.attachment?.size ?? null,
      },
    });

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: message.createdAt },
    });

    await prisma.conversationMember.updateMany({
      where: { conversationId: conv.id, userId: input.senderId },
      data: { lastReadAt: message.createdAt, lastReadMessageId: message.id },
    });

    const [serialized] = await this.withSenders([message], input.organizationId);
    return serialized;
  }

  async markRead(conversationId: string, messageId: string, userId: string, organizationId: string) {
    await conversationService.assertMembership(conversationId, userId, organizationId);
    await this.assertConversation(conversationId, organizationId);
    const message = await prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true },
    });
    if (!message) throw new AppError(404, 'Message not found');

    const now = new Date();
    await prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: now, lastReadMessageId: messageId },
    });
    return { conversationId, messageId, userId, lastReadAt: now };
  }

  async withSenders(
    messages: Array<{
      id: string;
      conversationId: string;
      organizationId: string;
      senderId: string;
      type: string;
      body: string | null;
      attachmentUrl: string | null;
      attachmentName: string | null;
      attachmentMime: string | null;
      attachmentSize: number | null;
      editedAt: Date | null;
      deletedAt: Date | null;
      createdAt: Date;
    }>,
    organizationId: string
  ) {
    if (messages.length === 0) return [];
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const members = await prisma.chatMember.findMany({
      where: { organizationId, userId: { in: senderIds } },
      select: { userId: true, firstName: true, lastName: true, avatarUrl: true },
    });
    const map = new Map(members.map((m) => [m.userId, m]));

    return messages.map((m) => {
      const sender = map.get(m.senderId);
      return {
        id: m.id,
        conversationId: m.conversationId,
        organizationId: m.organizationId,
        senderId: m.senderId,
        type: m.type,
        body: m.body,
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        attachmentMime: m.attachmentMime,
        attachmentSize: m.attachmentSize,
        editedAt: m.editedAt,
        deletedAt: m.deletedAt,
        createdAt: m.createdAt,
        sender: sender
          ? {
              userId: sender.userId,
              name: `${sender.firstName} ${sender.lastName}`.trim(),
              firstName: sender.firstName,
              lastName: sender.lastName,
              avatarUrl: sender.avatarUrl,
            }
          : null,
      };
    });
  }
}

export const messageService = new MessageService();
