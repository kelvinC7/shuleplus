import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dashboardService } from '../services/dashboard.service';
import { getRequestedStudent } from '../utils/student-param';

export class DashboardController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getSummary(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
