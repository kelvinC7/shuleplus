import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.list(req.organizationRef!, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAsRead(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllAsRead(req.organizationRef!, req.user!.sub);
      res.json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }

  async unreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.unreadCount(req.organizationRef!, req.user!.sub);
      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
