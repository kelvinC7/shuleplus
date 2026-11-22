import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { shuleTripSchoolRegistrationsService } from '../services/shule-trip-school-registrations.service';

const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED']),
  reviewNote: z.string().optional(),
});

function authHeader(req: AuthenticatedRequest): string {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) throw new AppError(401, 'Authentication required');
  return h;
}

export const shuleTripSchoolRegistrationsController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleTripSchoolRegistrationsService.list(authHeader(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async review(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = reviewSchema.parse(req.body);
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      const data = await shuleTripSchoolRegistrationsService.review(authHeader(req), id, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
