import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';
import { syncShuleTripFromModule } from '../services/shule-trip-sync.service';

export class ShuleTripSyncController {
  async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.headers['x-organization-id'] ?? '').trim();
      if (!organizationId) throw new AppError(400, 'x-organization-id header is required');

      const body = z
        .object({
          trip: z.object({
            id: z.string().uuid(),
            reference: z.string(),
            title: z.string(),
            purpose: z.string().nullable().optional(),
            destination: z.string().nullable().optional(),
            departAt: z.string().nullable().optional(),
            returnAt: z.string().nullable().optional(),
            tripLeaderName: z.string().nullable().optional(),
            itinerary: z.string().nullable().optional(),
            emergencyContact: z.unknown().optional(),
          }),
          participants: z.array(
            z.object({
              studentId: z.string().min(1),
              fullName: z.string().min(1),
              guardianPhone: z.string().nullable().optional(),
              guardianEmail: z.string().email().nullable().optional().or(z.literal('')),
              classLabel: z.string().nullable().optional(),
            })
          ),
        })
        .parse(req.body);

      const data = await syncShuleTripFromModule(organizationId, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const shuleTripSyncController = new ShuleTripSyncController();
