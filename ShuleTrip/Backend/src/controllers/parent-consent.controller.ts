import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { tripService } from '../services/trip.service';
import { AppError } from '../middleware/error.middleware';

export class ParentConsentController {
  /** ParentMIS (or other modules) record guardian consent — schools cannot toggle this in the wizard. */
  async recordFromParentPortal(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.headers['x-organization-id'] ?? '').trim();
      if (!organizationId) throw new AppError(400, 'x-organization-id header is required');

      const tripId = String(req.params.tripId);
      const body = z
        .object({
          studentId: z.string().min(1),
          guardianPhone: z.string().min(9),
          approved: z.boolean(),
        })
        .parse(req.body);

      const data = await tripService.recordGuardianConsentFromParent(
        organizationId,
        tripId,
        body
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const parentConsentController = new ParentConsentController();
