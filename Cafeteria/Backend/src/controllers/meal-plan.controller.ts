import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { mealPlanService } from '../services/meal-plan.service';

const planItemSchema = z.object({
  menuItemId: z.string().min(1),
  servingsPlanned: z.number().int().positive(),
});

const createSchema = z.object({
  planDate: z.coerce.date(),
  mealType: z.enum(['BREAKFAST', 'MORNING_TEA', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER']),
  planType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'EVENT', 'HOLIDAY']),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  items: z.array(planItemSchema).optional(),
});

const updateSchema = createSchema.partial();

export class MealPlanController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await mealPlanService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await mealPlanService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await mealPlanService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await mealPlanService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await mealPlanService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Meal plan deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const mealPlanController = new MealPlanController();
