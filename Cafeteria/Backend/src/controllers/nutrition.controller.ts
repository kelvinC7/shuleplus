import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { nutritionService } from '../services/nutrition.service';

const createNutritionSchema = z.object({
  mealPlanId: z.string().min(1),
  calories: z.number().int().positive().optional(),
  protein: z.number().int().positive().optional(),
  carbohydrates: z.number().int().positive().optional(),
  fat: z.number().int().positive().optional(),
  vitamins: z.string().optional(),
  notes: z.string().optional(),
});

const createAllergySchema = z.object({
  beneficiaryType: z.string().min(1),
  beneficiaryId: z.string().optional(),
  beneficiaryName: z.string().min(1),
  allergyType: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  notes: z.string().optional(),
});

const updateAllergySchema = createAllergySchema.partial();

export class NutritionController {
  async listNutrition(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await nutritionService.listNutrition(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createNutrition(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createNutritionSchema.parse(req.body);
      const data = await nutritionService.createNutrition(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listAllergies(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await nutritionService.listAllergies(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createAllergy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createAllergySchema.parse(req.body);
      const data = await nutritionService.createAllergy(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateAllergy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateAllergySchema.parse(req.body);
      const data = await nutritionService.updateAllergy(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async removeAllergy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await nutritionService.removeAllergy(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Allergy profile deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const nutritionController = new NutritionController();
