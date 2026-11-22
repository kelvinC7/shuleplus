import { Request, Response, NextFunction } from 'express';
import { purchaseRequestService } from '../services/purchase-request.service';
import type { RequestVisibility } from '../utils/module-access';
import { AppError } from '../middleware/error.middleware';

/** Director Console (service-to-service) sees every purchase request in the organization. */
const DIRECTOR_VISIBILITY: RequestVisibility = { userId: 'director-console', canViewAll: true };

function orgOf(req: Request): string {
  const id = (req as Request & { organizationRef?: string }).organizationRef;
  if (!id) throw new AppError(400, 'organizationId is required');
  return id;
}

export const purchaseRequestServiceController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await purchaseRequestService.list(orgOf(req), { status }, DIRECTOR_VISIBILITY);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { comment, actorName } = req.body ?? {};
      const data = await purchaseRequestService.approve(
        orgOf(req),
        String(req.params.id),
        'director-console',
        typeof actorName === 'string' && actorName.trim() ? actorName.trim() : 'Director',
        typeof comment === 'string' ? comment : undefined,
        DIRECTOR_VISIBILITY
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason, actorName } = req.body ?? {};
      if (typeof reason !== 'string' || !reason.trim()) {
        throw new AppError(400, 'Rejection reason is required');
      }
      const data = await purchaseRequestService.reject(
        orgOf(req),
        String(req.params.id),
        'director-console',
        typeof actorName === 'string' && actorName.trim() ? actorName.trim() : 'Director',
        reason.trim(),
        DIRECTOR_VISIBILITY
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};
