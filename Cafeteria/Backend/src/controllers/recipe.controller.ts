import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { recipeService } from '../services/recipe.service';

const ingredientSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  notes: z.string().optional(),
});

const createSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  prepTimeMinutes: z.number().int().positive().optional(),
  cookTimeMinutes: z.number().int().positive().optional(),
  servings: z.number().int().positive().optional(),
  calories: z.number().int().positive().optional(),
  protein: z.number().int().positive().optional(),
  carbohydrates: z.number().int().positive().optional(),
  fat: z.number().int().positive().optional(),
  vitamins: z.string().optional(),
  allergens: z.string().optional(),
  ingredients: z.array(ingredientSchema).optional(),
});

const updateSchema = createSchema.partial();

export class RecipeController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await recipeService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await recipeService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await recipeService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await recipeService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await recipeService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Recipe deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const recipeController = new RecipeController();
