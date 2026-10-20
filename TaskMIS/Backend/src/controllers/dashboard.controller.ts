import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dashboardService } from '../services/dashboard.service';

function orgId(req: AuthenticatedRequest) {
  return req.organizationRef!;
}

export class DashboardController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.summary(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const dashboardController = new DashboardController();
