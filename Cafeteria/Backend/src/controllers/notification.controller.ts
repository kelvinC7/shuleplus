import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.markRead(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllRead(req.organizationRef!);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
