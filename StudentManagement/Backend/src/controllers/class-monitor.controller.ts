import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { classMonitorService } from '../services/class-monitor.service';

const createSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
  slot: z.union([z.literal(1), z.literal(2)]).optional(),
});

const updateSchema = z.object({
  studentId: z.string().min(1).optional(),
  slot: z.union([z.literal(1), z.literal(2)]).optional(),
});

export class ClassMonitorController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
      const data = await classMonitorService.list(req.organizationRef!, classId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await classMonitorService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await classMonitorService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await classMonitorService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const classMonitorController = new ClassMonitorController();
