import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { hygieneService } from '../services/hygiene.service';

const checklistItemSchema = z.object({
  item: z.string().min(1),
  status: z.string().min(1),
  notes: z.string().optional(),
});

const createSchema = z.object({
  checkDate: z.coerce.date(),
  checkType: z.enum([
    'KITCHEN_CLEANING',
    'EQUIPMENT_CLEANING',
    'FOOD_TEMPERATURE',
    'WATER_QUALITY',
    'HEALTH_INSPECTION',
    'SANITATION',
  ]),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).optional(),
  score: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
  items: z.array(checklistItemSchema).optional(),
});

const updateSchema = createSchema.partial();

export class HygieneController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await hygieneService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await hygieneService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await hygieneService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await hygieneService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await hygieneService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Hygiene checklist deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const hygieneController = new HygieneController();
