import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { mealProductionService } from '../services/meal-production.service';

const productionItemSchema = z.object({
  menuItemId: z.string().min(1),
  recipeId: z.string().optional(),
  plannedQuantity: z.number().positive(),
  actualQuantity: z.number().positive().optional(),
});

const createSchema = z.object({
  mealPlanId: z.string().optional(),
  productionDate: z.coerce.date(),
  mealType: z.enum(['BREAKFAST', 'MORNING_TEA', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER']),
  plannedServings: z.number().int().positive(),
  notes: z.string().optional(),
  items: z.array(productionItemSchema).optional(),
});

const updateSchema = createSchema.partial();

const completeSchema = z.object({
  actualServings: z.number().int().min(0),
});

export class MealProductionController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await mealProductionService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await mealProductionService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await mealProductionService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await mealProductionService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = completeSchema.parse(req.body);
      const data = await mealProductionService.complete(
        req.organizationRef!,
        req.params.id,
        req.user!.sub,
        body.actualServings
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await mealProductionService.cancel(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await mealProductionService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Production deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const mealProductionController = new MealProductionController();
