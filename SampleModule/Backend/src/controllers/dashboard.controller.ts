import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { recordService } from '../services/record.service';
import { dashboardService } from '../services/dashboard.service';

const createRecordSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export class DashboardController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getSummary(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class RecordController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await recordService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createRecordSchema.parse(req.body);
      const data = await recordService.create(
        req.organizationRef!,
        req.user!.sub,
        body.title,
        body.description
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
export const recordController = new RecordController();
