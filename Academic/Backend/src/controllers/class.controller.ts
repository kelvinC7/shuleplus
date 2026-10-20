import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { classService } from '../services/class.service';

const educationLevelSchema = z.enum(['NURSERY', 'PRIMARY', 'SECONDARY', 'TVET']);

const createSchema = z.object({
  name: z.string().min(1),
  stream: z.string().optional(),
  category: educationLevelSchema.optional(),
  gradeId: z.string().optional(),
  combinationId: z.string().optional(),
});

const updateSchema = createSchema.partial();

export class ClassController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await classService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await classService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await classService.getById(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await classService.update(req.params.id as string, req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await classService.delete(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const classController = new ClassController();
