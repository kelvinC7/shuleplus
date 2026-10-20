import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dashboardService } from '../services/dashboard.service';

export class DashboardController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const academicYear =
        typeof req.query.academicYear === 'string' && req.query.academicYear.trim()
          ? req.query.academicYear.trim()
          : undefined;
      const data = await dashboardService.getSummary(req.organizationRef!, academicYear);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
