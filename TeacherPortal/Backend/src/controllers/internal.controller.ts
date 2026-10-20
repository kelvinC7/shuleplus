import { Response, NextFunction, Request } from 'express';
import { z } from 'zod';
import { payrollSyncService } from '../services/payroll-sync.service';

const syncSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  employeeNumber: z.string().optional(),
  displayName: z.string().optional(),
  netSalaryRwf: z.number().int().nonnegative().optional(),
  tichaAvanceEligible: z.boolean().optional(),
  source: z.enum(['hr', 'payroll']),
});

export class InternalController {
  async syncPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const body = syncSchema.parse(req.body);
      const data = await payrollSyncService.upsertSnapshot(body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const internalController = new InternalController();
