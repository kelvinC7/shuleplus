import { Request, Response, NextFunction } from 'express';
import { describeAfroBulkConfig } from '../clients/afrobulk-sms.client';
import { internalChatClient } from '../clients/internal-chat.client';
import { listSchoolSmsAccessForSuperAdmin } from '../services/school-sms-access.service';
import { sendSmsDetailed, normalizePhoneNumber } from '../utils/sms';
import { AppError } from '../middleware/error.middleware';

function chatUpstreamError(e: unknown): AppError {
  const message = e instanceof Error ? e.message : 'ShuleChat API unavailable';
  return new AppError(502, message);
}

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

  async schoolSmsAccess(_req: Request, res: Response, next: NextFunction) {
    try {
      const { rows, chatApiOk, chatError } = await listSchoolSmsAccessForSuperAdmin();
      res.json({
        success: true,
        data: rows,
        meta: { chatApiOk, chatError: chatApiOk ? undefined : chatError },
      });
    } catch (e) {
      next(e);
    }
  },

  async parentPurchaseStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await internalChatClient.parentPurchaseStats();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listParentPurchases(req: Request, res: Response, next: NextFunction) {
    try {
      const bucket = typeof req.query.bucket === 'string' ? req.query.bucket : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = await internalChatClient.listParentPurchases({ bucket, search, organizationId });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async activateParentPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const purchaseId = String(req.params.purchaseId);
      const adminId = (req as Request & { user?: { sub?: string } }).user?.sub;
      const data = await internalChatClient.activateParentPurchase(purchaseId, adminId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async rejectParentPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const purchaseId = String(req.params.purchaseId);
      const { reason } = req.body as { reason?: string };
      if (!reason || reason.trim().length < 3) {
        res.status(400).json({ success: false, message: 'Rejection reason is required' });
        return;
      }
      const adminId = (req as Request & { user?: { sub?: string } }).user?.sub;
      const data = await internalChatClient.rejectParentPurchase(purchaseId, reason.trim(), adminId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateSchoolSmsAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId);
      const data = await internalChatClient.updateSchoolSmsSettings(organizationId, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(chatUpstreamError(e));
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
