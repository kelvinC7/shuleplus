import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { physicalCountService } from '../services/physical-count.service';

const itemSchema = z.object({
  productId: z.string().min(1),
  systemQty: z.number(),
  actualQty: z.number(),
  notes: z.string().optional(),
});

const createSchema = z.object({
  storeId: z.string().min(1),
  countType: z.string().min(1),
  notes: z.string().optional(),
  countDate: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export class PhysicalCountController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await physicalCountService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await physicalCountService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await physicalCountService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await physicalCountService.complete(req.organizationRef!, req.params.id, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const physicalCountController = new PhysicalCountController();
