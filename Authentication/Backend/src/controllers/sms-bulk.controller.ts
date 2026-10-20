import { Request, Response, NextFunction } from 'express';
import { describeAfroBulkConfig } from '../clients/afrobulk-sms.client';
import { sendSmsDetailed, normalizePhoneNumber } from '../utils/sms';

export const smsBulkController = {
  async status(_req: Request, res: Response) {
    const config = describeAfroBulkConfig();
    res.json({
      success: true,
      data: {
        ...config,
        ready: config.directConfigured || config.notificationServiceConfigured,
        route:
          config.notificationServiceConfigured && config.directConfigured
            ? 'Notification service, then AfroBulk fallback'
            : config.directConfigured
              ? 'AfroBulk direct'
              : config.notificationServiceConfigured
                ? 'Notification service only'
                : 'Not configured',
      },
    });
  },

  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, body, studentName, parentName } = req.body as {
        to: string;
        body: string;
        studentName?: string;
        parentName?: string;
      };

      if (!to || !body) {
        res.status(400).json({ success: false, message: 'to and body are required' });
        return;
      }

      const normalized = normalizePhoneNumber(to);
      const result = await sendSmsDetailed(normalized, body);

      if (!result.delivered) {
        res.status(502).json({
          success: false,
          message: result.error ?? 'SMS not delivered',
          data: {
            sent: false,
            to: normalized,
            channel: result.channel ?? 'none',
            studentName: studentName ?? null,
            parentName: parentName ?? null,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          sent: true,
          to: normalized,
          body,
          channel: result.channel,
          providerCode: result.providerCode ?? null,
          studentName: studentName ?? null,
          parentName: parentName ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {
      next(e);
    }
  },

  async sendBulk(req: Request, res: Response, next: NextFunction) {
    try {
      const { recipients, body, messageType } = req.body as {
        recipients: Array<{ parentId: string; phone: string; parentName: string; studentName: string }>;
        body: string;
        messageType?: string;
      };

      if (!Array.isArray(recipients) || !body) {
        res.status(400).json({ success: false, message: 'recipients array and body are required' });
        return;
      }

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const r of recipients) {
        const personalized = body
          .replace(/\{\{parent_name\}\}/g, r.parentName)
          .replace(/\{\{student_name\}\}/g, r.studentName);
        const result = await sendSmsDetailed(normalizePhoneNumber(r.phone), personalized);
        if (result.delivered) sent += 1;
        else {
          failed += 1;
          if (errors.length < 3 && result.error) errors.push(result.error);
        }
      }

      res.json({
        success: sent > 0 || failed === 0,
        data: {
          sent,
          failed,
          total: recipients.length,
          messageType: messageType ?? 'general',
          errors: errors.length ? errors : undefined,
        },
      });
    } catch (e) {
      next(e);
    }
  },
};
