import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { analyticsService } from '../services/analytics.service';

export class DashboardController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDashboard(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
