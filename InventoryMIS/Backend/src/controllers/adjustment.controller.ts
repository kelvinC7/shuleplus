import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { adjustmentService } from '../services/adjustment.service';

const itemSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().optional(),
  expectedQty: z.number(),
  actualQty: z.number(),
  unitCost: z.number().optional(),
});

const createSchema = z.object({
  storeId: z.string().min(1),
  reason: z.enum(['DAMAGE', 'SPOILAGE', 'EXPIRED', 'COUNTING_ERROR', 'DONATION', 'LOSS']),
  reasonDescription: z.string().optional(),
  notes: z.string().optional(),
  adjustmentDate: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export class AdjustmentController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adjustmentService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adjustmentService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await adjustmentService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const adjustmentController = new AdjustmentController();
