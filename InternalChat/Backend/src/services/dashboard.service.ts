import { prisma } from '../config/database';
import { presence } from '../socket/presence';
import { messageService } from './message.service';

export class DashboardService {
  async overview(organizationId: string, userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [tenant, memberCount, conversationCount, messagesToday, announcements, memberships] =
      await Promise.all([
        prisma.tenant.findFirst({ where: { organizationId }, select: { organizationName: true } }),
        prisma.chatMember.count({ where: { organizationId } }),
        prisma.conversation.count({ where: { organizationId } }),
        prisma.message.count({ where: { organizationId, createdAt: { gte: startOfDay } } }),
        prisma.conversation.count({ where: { organizationId, type: 'ANNOUNCEMENT' } }),
        prisma.conversationMember.findMany({
          where: { userId },
          select: { conversationId: true, lastReadAt: true },
        }),
      ]);

    let unreadCount = 0;
    for (const m of memberships) {
      unreadCount += await prisma.message.count({
        where: {
          conversationId: m.conversationId,
          deletedAt: null,
          NOT: { senderId: userId },
          createdAt: { gt: m.lastReadAt ?? new Date(0) },
        },
      });
    }

    const convIds = memberships.map((m) => m.conversationId);
    const recentMessages = convIds.length
      ? await prisma.message.findMany({
          where: { conversationId: { in: convIds }, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
        })
      : [];
    const recent = await messageService.withSenders(recentMessages, organizationId);

    return {
      organizationName: tenant?.organizationName ?? null,
      memberCount,
      onlineCount: presence.onlineCount(organizationId),
      conversationCount,
      unreadCount,
      messagesToday,
      announcements,
      recentMessages: recent,
    };
  }
}

export const dashboardService = new DashboardService();
