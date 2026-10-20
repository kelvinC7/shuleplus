import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dutyRosterService } from '../services/duty-roster.service';

const createSchema = z.object({
  staffId: z.string().min(1),
  rosterDate: z.coerce.date(),
  shift: z.string().min(1),
  duty: z.string().min(1),
  status: z.enum(['SCHEDULED', 'ON_DUTY', 'COMPLETED', 'ABSENT']).optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export class DutyRosterController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await dutyRosterService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await dutyRosterService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await dutyRosterService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await dutyRosterService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await dutyRosterService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Duty roster deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const dutyRosterController = new DutyRosterController();
