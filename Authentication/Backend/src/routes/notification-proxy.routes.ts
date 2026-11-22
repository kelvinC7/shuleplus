import { Router, Request, Response, NextFunction } from 'express';
import { requireServiceKey } from '../middleware/service-auth.middleware';
import { embeddedNotificationsService } from '../services/embedded-notifications.service';
import {
  dispatchIamEmail,
  dispatchIamSms,
} from '../services/iam-notification-dispatch.service';

const router = Router();

router.post('/sms', requireServiceKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, body } = req.body as { to: string; body: string; metadata?: unknown };
    if (!to || !body) {
      res.status(400).json({ success: false, message: 'to and body are required' });
      return;
    }
    const result = await dispatchIamSms({ to, body });
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

router.post('/email', requireServiceKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, subject, html, text } = req.body as {
      to: string; subject: string; html?: string; text?: string; metadata?: unknown;
    };
    if (!to || !subject) {
      res.status(400).json({ success: false, message: 'to and subject are required' });
      return;
    }
    const result = await dispatchIamEmail({ to, subject, html, text });
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

router.post('/push', requireServiceKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, title, body } = req.body as { userId: string; title: string; body: string; data?: unknown };
    console.log(`[PUSH] -> ${userId}: ${title} - ${body}`);
    res.json({ data: { id: `push-${Date.now()}`, delivered: true } });
  } catch (e) {
    next(e);
  }
});

router.post('/in-app', requireServiceKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, title, body, priority, actionUrl } = req.body as {
      userId: string;
      title: string;
      body: string;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      actionUrl?: string;
      metadata?: unknown;
    };
    if (!userId || !title || !body) {
      res.status(400).json({ success: false, message: 'userId, title, and body are required' });
      return;
    }
    const result = embeddedNotificationsService.sendInApp({
      userId,
      title,
      body,
      priority,
      actionUrl,
    });
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
