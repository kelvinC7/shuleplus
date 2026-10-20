import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { foodWasteService } from '../services/food-waste.service';

const createSchema = z.object({
  productionId: z.string().optional(),
  wasteDate: z.coerce.date(),
  wasteType: z.enum(['SPOILED', 'LEFTOVERS', 'EXPIRED', 'COOKING_WASTE', 'OVERPRODUCED']),
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  cost: z.number().positive().optional(),
  reason: z.string().optional(),
});

const updateSchema = createSchema.partial();

export class FoodWasteController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await foodWasteService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await foodWasteService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await foodWasteService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await foodWasteService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await foodWasteService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Food waste record deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const foodWasteController = new FoodWasteController();
