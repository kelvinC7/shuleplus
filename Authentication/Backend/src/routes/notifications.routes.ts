import { Router, Response, NextFunction } from 'express';
import { notificationClient } from '../clients/notification.client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { routeParam } from '../utils/route-param';

const router = Router();

router.use(authenticate);

/** Proxy in-app notifications from Notification Service (frontend uses IAM, not microservice directly). */
router.get('/in-app', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) ?? req.user!.sub;
    const filter = (req.query.filter as 'all' | 'unread' | 'archived') ?? 'all';
    const data = await notificationClient.listInApp(userId, filter);
    res.json({ success: true, data: data ?? [] });
  } catch (e) {
    next(e);
  }
});

router.get('/in-app/unread-count', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) ?? req.user!.sub;
    const data = await notificationClient.unreadCount(userId);
    res.json({ success: true, data: data ?? { count: 0 } });
  } catch (e) {
    next(e);
  }
});

router.patch('/in-app/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.body.userId ?? req.user!.sub;
    await notificationClient.markInAppRead(routeParam(req.params.id), userId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.patch('/in-app/read-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.body.userId ?? req.user!.sub;
    await notificationClient.markAllInAppRead(userId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.patch('/in-app/:id/archive', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.body.userId ?? req.user!.sub;
    await notificationClient.archiveInApp(routeParam(req.params.id), userId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
