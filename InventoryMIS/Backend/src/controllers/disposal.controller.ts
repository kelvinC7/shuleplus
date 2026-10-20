import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { disposalService } from '../services/disposal.service';

const itemSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().optional(),
  quantity: z.number().positive(),
  unitCost: z.number().optional(),
});

const createSchema = z.object({
  storeId: z.string().min(1),
  reason: z.string().min(1),
  disposalMethod: z.string().optional(),
  notes: z.string().optional(),
  disposalDate: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export class DisposalController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disposalService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disposalService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await disposalService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const disposalController = new DisposalController();
