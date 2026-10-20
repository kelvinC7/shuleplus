import nodemailer from 'nodemailer';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { env } from '../config/env';
import { logService } from './log.service';

function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export const emailService = {
  async send(params: {
    sourceService: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    templateSlug?: string;
    metadata?: Record<string, unknown>;
  }) {
    const log = await logService.create({
      sourceService: params.sourceService,
      channel: NotificationChannel.EMAIL,
      recipient: params.to,
      subject: params.subject,
      body: params.html ?? params.text ?? '',
      templateSlug: params.templateSlug,
      metadata: params.metadata,
    });

    const transporter = createTransporter();
    if (!transporter) {
      console.log(`\n[DEV EMAIL] to ${params.to}\nSubject: ${params.subject}\n`);
      await logService.markSent(log.id);
      return { id: log.id, delivered: false, devMode: true };
    }

    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      await logService.markSent(log.id);
      return { id: log.id, delivered: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email send failed';
      await logService.markFailed(log.id, message);
      throw err;
    }
  },
};
