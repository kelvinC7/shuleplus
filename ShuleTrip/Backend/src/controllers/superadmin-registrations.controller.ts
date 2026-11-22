import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { listSchoolRegistrations, reviewSchoolRegistration } from '../services/portal-auth.service';

const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED']),
  reviewNote: z.string().optional(),
});

export const superadminRegistrationsController = {
  async list(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rows = await listSchoolRegistrations();
      res.json({ success: true, data: rows });
    } catch (e) {
      next(e);
    }
  },

  async review(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = reviewSchema.parse(req.body);
      const reviewer = req.user?.email ?? req.user?.sub ?? 'superadmin';
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      const row = await reviewSchoolRegistration(id, body.decision, body.reviewNote, reviewer);
      res.json({ success: true, data: row });
    } catch (e) {
      next(e);
    }
  },
};
