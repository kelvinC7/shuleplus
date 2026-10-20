import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { NotificationChannel, NotificationPriority } from '@prisma/client';
import { emailService } from '../services/email.service';
import { smsService } from '../services/sms.service';
import { pushService } from '../services/push.service';
import { inAppService } from '../services/in-app.service';
import { otpService } from '../services/otp.service';
import { templateService } from '../services/template.service';
import { logService } from '../services/log.service';
import { preferenceService } from '../services/preference.service';

const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  templateSlug: z.string().optional(),
  templateVariables: z.record(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const smsSchema = z.object({
  to: z.string().min(8),
  body: z.string().min(1),
  templateSlug: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const pushSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

const inAppSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  priority: z.nativeEnum(NotificationPriority).optional(),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const otpSendSchema = z.object({
  purpose: z.string().min(1),
  recipient: z.string().min(3),
  channel: z.enum(['email', 'sms', 'both']).default('email'),
  name: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const otpVerifySchema = z.object({
  purpose: z.string().min(1),
  recipient: z.string().min(3),
  code: z.string().length(6),
});

export const notificationController = {
  async sendEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const body = emailSchema.parse(req.body);
      let { subject, html, text } = body;

      if (body.templateSlug) {
        const rendered = await templateService.renderTemplate(
          body.templateSlug,
          body.templateVariables ?? {}
        );
        if (rendered) {
          subject = rendered.subject ?? subject;
          html = rendered.html ?? html;
          text = rendered.text ?? text;
        }
      }

      const data = await emailService.send({
        sourceService: req.sourceService ?? 'UNKNOWN',
        to: body.to,
        subject,
        html,
        text,
        templateSlug: body.templateSlug,
        metadata: body.metadata,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async sendSms(req: Request, res: Response, next: NextFunction) {
    try {
      const body = smsSchema.parse(req.body);
      const data = await smsService.send({
        sourceService: req.sourceService ?? 'UNKNOWN',
        to: body.to,
        body: body.body,
        templateSlug: body.templateSlug,
        metadata: body.metadata,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async sendPush(req: Request, res: Response, next: NextFunction) {
    try {
      const body = pushSchema.parse(req.body);
      const data = await pushService.send({
        sourceService: req.sourceService ?? 'UNKNOWN',
        ...body,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async sendInApp(req: Request, res: Response, next: NextFunction) {
    try {
      const body = inAppSchema.parse(req.body);
      const data = await inAppService.send({
        sourceService: req.sourceService ?? 'UNKNOWN',
        ...body,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listInApp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.query.userId ?? '');
      const filter = (req.query.filter as 'all' | 'unread' | 'archived') ?? 'all';
      const data = await inAppService.list(userId, filter);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async markInAppRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
      await inAppService.markRead(req.params.id, userId);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },

  async markAllInAppRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
      await inAppService.markAllRead(userId);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },

  async archiveInApp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
      await inAppService.archive(req.params.id, userId);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },

  async unreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.query.userId ?? '');
      const count = await inAppService.unreadCount(userId);
      res.json({ success: true, data: { count } });
    } catch (e) {
      next(e);
    }
  },

  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const body = otpSendSchema.parse(req.body);
      const data = await otpService.send({
        sourceService: req.sourceService ?? 'UNKNOWN',
        ...body,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const body = otpVerifySchema.parse(req.body);
      const data = await otpService.verify(body.purpose, body.recipient, body.code);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const channel = req.query.channel as NotificationChannel | undefined;
      const data = await templateService.list(channel);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await logService.list({
        sourceService: req.query.sourceService as string | undefined,
        channel: req.query.channel as NotificationChannel | undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 100,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.params.userId);
      const data = await preferenceService.get(userId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const data = await preferenceService.update(userId, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  health(_req: Request, res: Response) {
    res.json({
      success: true,
      service: 'shuleplus-notification-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  },
};
