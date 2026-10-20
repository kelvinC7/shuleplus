import { NotificationChannel } from '@prisma/client';
import { env } from '../config/env';
import { logService } from './log.service';

export const pushService = {
  async send(params: {
    sourceService: string;
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    const log = await logService.create({
      sourceService: params.sourceService,
      channel: NotificationChannel.PUSH,
      recipient: params.userId,
      subject: params.title,
      body: params.body,
      metadata: params.data,
    });

    // Wire Firebase Cloud Messaging / APNs in production
    if (env.PUSH_PROVIDER === 'console') {
      console.log(`\n[DEV PUSH] user ${params.userId}\n${params.title}: ${params.body}\n`);
    }

    await logService.markSent(log.id);
    return { id: log.id, delivered: env.PUSH_PROVIDER !== 'console' };
  },
};
