import { Router, Response, NextFunction } from 'express';
import { notificationClient } from '../clients/notification.client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { routeParam } from '../utils/route-param';

const router = Router();

function normalizeInAppList(data: unknown): unknown[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const raw = row as Record<string, unknown>;
    const priority = raw.priority;
    return {
      id: raw.id,
      title: raw.title,
      body: raw.body,
      priority: typeof priority === 'string' ? priority.toLowerCase() : priority,
      isRead: Boolean(raw.isRead ?? raw.read),
      isArchived: Boolean(raw.isArchived ?? raw.archived),
      actionUrl: raw.actionUrl,
      createdAt: raw.createdAt,
    };
  });
}

/** Proxy in-app notifications from Notification Service (frontend uses IAM, not microservice directly). */
router.get('/in-app', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) ?? req.user!.sub;
    const filter = (req.query.filter as 'all' | 'unread' | 'archived') ?? 'all';
    const data = await notificationClient.listInApp(userId, filter);
    res.json({ success: true, data: normalizeInAppList(data) });
  } catch (e) {
    next(e);
  }
});

router.get('/in-app/unread-count', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) ?? req.user!.sub;
    const data = await notificationClient.unreadCount(userId);
    res.json({ success: true, data: data ?? { count: 0 } });
  } catch (e) {
    next(e);
  }
});

router.patch('/in-app/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.body.userId ?? req.user!.sub;
    await notificationClient.markInAppRead(routeParam(req.params.id), userId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.patch('/in-app/read-all', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.body.userId ?? req.user!.sub;
    await notificationClient.markAllInAppRead(userId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.patch('/in-app/:id/archive', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.body.userId ?? req.user!.sub;
    await notificationClient.archiveInApp(routeParam(req.params.id), userId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
