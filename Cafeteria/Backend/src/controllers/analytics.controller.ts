import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { analyticsService } from '../services/analytics.service';

export class AnalyticsController {
  async getCostAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as any;
      const data = await analyticsService.getCostAnalytics(req.organizationRef!, startDate, endDate);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getConsumptionAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getConsumptionAnalytics(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getWasteAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getWasteAnalytics(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getPopularMeals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getPopularMeals(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
