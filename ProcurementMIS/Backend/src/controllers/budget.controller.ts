import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { budgetService } from '../services/budget.service';

const createBudgetSchema = z.object({
  name: z.string().min(1),
  year: z.coerce.number().min(2020),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  totalBudget: z.coerce.number().positive(),
  departmentId: z.string().optional(),
});

export class BudgetController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const year = Number(String(req.query.year)) || undefined;
      const data = await budgetService.list(req.organizationRef!, year);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await budgetService.getById(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createBudgetSchema.parse(req.body);
      const data = await budgetService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createBudgetSchema.partial().parse(req.body);
      const data = await budgetService.update(req.organizationRef!, String(req.params.id), body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const year = Number(String(req.query.year)) || undefined;
      const data = await budgetService.getSummary(req.organizationRef!, year);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const budgetController = new BudgetController();
