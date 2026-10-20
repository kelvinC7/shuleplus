import { ConversationType, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { presence } from '../socket/presence';

function memberSummary(member: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  department: string | null;
  position: string | null;
  kind: string;
}) {
  return {
    userId: member.userId,
    name: `${member.firstName} ${member.lastName}`.trim(),
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    avatarUrl: member.avatarUrl,
    department: member.department,
    position: member.position,
    kind: member.kind,
    online: presence.isOnline(member.userId),
  };
}

export class ConversationService {
  async assertMembership(conversationId: string, userId: string, organizationId: string) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'You are not a member of this conversation');
    }
    return member;
  }

  async list(userId: string, organizationId: string) {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    });
    const convIds = memberships.map((m) => m.conversationId);
    if (convIds.length === 0) return [];

    const conversations = await prisma.conversation.findMany({
      where: { id: { in: convIds }, organizationId },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
    });
    const readMap = new Map(memberships.map((m) => [m.conversationId, m.lastReadAt]));

    const rows = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await prisma.message.findFirst({
          where: { conversationId: conv.id, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            deletedAt: null,
            NOT: { senderId: userId },
            createdAt: { gt: readMap.get(conv.id) ?? new Date(0) },
          },
        });
        const memberCount = await prisma.conversationMember.count({
          where: { conversationId: conv.id },
        });

        let peer: ReturnType<typeof memberSummary> | null = null;
        if (conv.type === 'DIRECT') {
          const other = await prisma.conversationMember.findFirst({
            where: { conversationId: conv.id, NOT: { userId } },
            include: {
              member: {
                select: {
                  userId: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  department: true,
                  position: true,
                  kind: true,
                },
              },
            },
          });
          if (other) peer = memberSummary(other.member);
        }

        return {
          id: conv.id,
          organizationId: conv.organizationId,
          type: conv.type,
          name: conv.name,
          department: conv.department,
          description: conv.description,
          createdById: conv.createdById,
          lastMessageAt: conv.lastMessageAt,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          memberCount,
          unreadCount,
          lastMessage,
          peer,
        };
      })
    );

    rows.sort(
      (a, b) =>
        new Date(b.lastMessageAt ?? b.createdAt).getTime() -
        new Date(a.lastMessageAt ?? a.createdAt).getTime()
    );
    return rows;
  }

  async getById(id: string, userId: string, organizationId: string) {
    await this.assertMembership(id, userId, organizationId);
    const conv = await prisma.conversation.findFirst({ where: { id, organizationId } });
    if (!conv) throw new AppError(404, 'Conversation not found');

    const members = await prisma.conversationMember.findMany({
      where: { conversationId: id },
      include: {
        member: {
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            department: true,
            position: true,
            kind: true,
          },
        },
      },
    });

    const myMembership = members.find((m) => m.userId === userId);
    let peer: ReturnType<typeof memberSummary> | null = null;
    if (conv.type === 'DIRECT') {
      const other = members.find((m) => m.userId !== userId);
      if (other) peer = memberSummary(other.member);
    }
    return {
      ...conv,
      memberCount: members.length,
      unreadCount: await prisma.message.count({
        where: {
          conversationId: id,
          deletedAt: null,
          NOT: { senderId: userId },
          createdAt: { gt: myMembership?.lastReadAt ?? new Date(0) },
        },
      }),
      peer,
      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        mutedAt: m.mutedAt,
        lastReadAt: m.lastReadAt,
        joinedAt: m.joinedAt,
        online: presence.isOnline(m.userId),
        member: memberSummary(m.member),
      })),
    };
  }

  async create(input: {
    organizationId: string;
    createdById: string;
    type: ConversationType;
    name?: string;
    department?: string;
    description?: string;
    memberIds?: string[];
  }) {
    const now = new Date();
    let memberIds: string[];

    const actor = await prisma.chatMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.createdById,
        },
      },
      select: { kind: true },
    });
    const actorIsParent = actor?.kind === 'PARENT';

    if (input.type === 'DIRECT') {
      const peerId = input.memberIds?.[0];
      if (!peerId) throw new AppError(400, 'Peer user is required for a direct conversation');
      if (peerId === input.createdById) {
        throw new AppError(400, 'You cannot start a conversation with yourself');
      }
      if (actorIsParent) {
        const peer = await prisma.chatMember.findUnique({
          where: { organizationId_userId: { organizationId: input.organizationId, userId: peerId } },
          select: { kind: true },
        });
        if (peer?.kind !== 'STAFF') {
          throw new AppError(403, 'Parents can only start conversations with staff');
        }
      }
      const mine = await prisma.conversationMember.findMany({
        where: { userId: input.createdById },
        select: { conversationId: true },
      });
      const theirs = await prisma.conversationMember.findMany({
        where: { userId: peerId },
        select: { conversationId: true },
      });
      const theirsSet = new Set(theirs.map((t) => t.conversationId));
      const shared = mine.map((m) => m.conversationId).filter((id) => theirsSet.has(id));
      if (shared.length) {
        const existing = await prisma.conversation.findFirst({
          where: { id: { in: shared }, organizationId: input.organizationId, type: 'DIRECT' },
        });
        if (existing) return existing;
      }
      memberIds = [input.createdById, peerId];
    } else {
      if (actorIsParent) {
        throw new AppError(403, 'Parents cannot create group, department or announcement chats');
      }
      if (input.type === 'ANNOUNCEMENT') {
      const members = await prisma.chatMember.findMany({
        where: { organizationId: input.organizationId },
        select: { userId: true },
      });
      memberIds = [...new Set([input.createdById, ...members.map((m) => m.userId)])];
    } else if (input.type === 'DEPARTMENT') {
      if (!input.department?.trim()) throw new AppError(400, 'department is required');
      const members = await prisma.chatMember.findMany({
        where: { organizationId: input.organizationId, department: input.department },
        select: { userId: true },
      });
      memberIds = [...new Set([input.createdById, ...members.map((m) => m.userId)])];
    } else {
      memberIds = [...new Set([input.createdById, ...(input.memberIds ?? [])])];
      if (memberIds.length < 2) throw new AppError(400, 'Add at least one member');
      if (!input.name?.trim()) throw new AppError(400, 'Group name is required');
    }
    }

    const conversation = await prisma.conversation.create({
      data: {
        organizationId: input.organizationId,
        type: input.type,
        name:
          input.type === 'DEPARTMENT'
            ? input.department?.trim()
            : input.name?.trim() ?? (input.type === 'ANNOUNCEMENT' ? 'Announcements' : null),
        department: input.type === 'DEPARTMENT' ? input.department?.trim() : null,
        description: input.description?.trim() || null,
        createdById: input.createdById,
      },
    });

    await prisma.conversationMember.createMany({
      data: memberIds.map((userId) => ({
        conversationId: conversation.id,
        organizationId: input.organizationId,
        userId,
        role: userId === input.createdById ? 'ADMIN' : 'MEMBER',
        lastReadAt: now,
      })),
    });

    return conversation;
  }

  async addMember(id: string, userId: string, actorId: string, organizationId: string) {
    const myMembership = await this.assertMembership(id, actorId, organizationId);
    if (myMembership.role !== 'ADMIN') {
      throw new AppError(403, 'Only conversation admins can add members');
    }
    const target = await prisma.chatMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!target) throw new AppError(404, 'User is not in the organization directory');

    await prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: id, userId } },
      update: {},
      create: { conversationId: id, organizationId, userId, role: 'MEMBER', lastReadAt: new Date() },
    });
    return this.getById(id, actorId, organizationId);
  }

  async removeMember(id: string, userId: string, actorId: string, organizationId: string) {
    if (userId === actorId) throw new AppError(400, 'Use leave to exit a conversation');
    const myMembership = await this.assertMembership(id, actorId, organizationId);
    if (myMembership.role !== 'ADMIN') {
      throw new AppError(403, 'Only conversation admins can remove members');
    }
    await prisma.conversationMember.deleteMany({
      where: { conversationId: id, userId },
    });
    return this.getById(id, actorId, organizationId);
  }

  async leave(id: string, userId: string, organizationId: string) {
    await prisma.conversationMember.deleteMany({
      where: { conversationId: id, userId },
    });
    return { id, left: true };
  }
}

export const conversationService = new ConversationService();
