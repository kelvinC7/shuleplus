import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { reportService } from '../services/report.service';

const dateRangeSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

const budgetSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020),
});

export class ReportController {
  async getProductionReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      const data = await reportService.getProductionReport(req.organizationRef!, startDate, endDate);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getWasteReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      const data = await reportService.getWasteReport(req.organizationRef!, startDate, endDate);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getStaffReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportService.getStaffReport(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getBudgetReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { month, year } = budgetSchema.parse(req.query);
      const data = await reportService.getBudgetReport(req.organizationRef!, month, year);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
