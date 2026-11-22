import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dashboardService } from '../services/dashboard.service';

export class DashboardController {
  async schoolSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const academicYear =
        typeof req.query.academicYear === 'string' && req.query.academicYear.trim()
          ? req.query.academicYear.trim()
          : undefined;
      const data = await dashboardService.getSchoolSummary(req.organizationRef!, req.user!, academicYear);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async governmentSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const jurisdiction = {
        district: typeof user.district === 'string' ? user.district : undefined,
        sector: typeof user.sector === 'string' ? user.sector : undefined,
      };
      const data = await dashboardService.getGovernmentSummary(jurisdiction);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
