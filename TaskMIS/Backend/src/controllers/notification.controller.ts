import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { timeTrackingService } from '../services/time-tracking.service';

function orgId(req: AuthenticatedRequest) {
  return req.organizationRef!;
}

function userId(req: AuthenticatedRequest) {
  return req.user!.sub;
}

export class NotificationController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.list(orgId(req), userId(req), req.query as Record<string, string>);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = await notificationService.markRead(orgId(req), id, userId(req));
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.markAllRead(orgId(req), userId(req));
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async unreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.unreadCount(orgId(req), userId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export class TimeTrackingController {
  async startTimer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.body as { taskId: string };
      const data = await timeTrackingService.startTimer(orgId(req), taskId, userId(req), req.user!.email);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async stopTimer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = await timeTrackingService.stopTimer(orgId(req), id, userId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async addManualEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const data = await timeTrackingService.addManualEntry(orgId(req), taskId, userId(req), req.user!.email, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getTaskTimeEntries(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const data = await timeTrackingService.getTaskTimeEntries(orgId(req), taskId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getUserSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const data = await timeTrackingService.getUserTimeSummary(orgId(req), userId(req), startDate, endDate);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getRunningTimer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await timeTrackingService.getRunningTimer(userId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const notificationController = new NotificationController();
export const timeTrackingController = new TimeTrackingController();
