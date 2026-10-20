import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error.middleware';

/** Resolve the unified CanteenProfile for the authenticated IAM user. */
export const profileController = {
  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const profile = await prisma.canteenProfile.findUnique({
        where: {
          organizationId_userId: { organizationId: user.organizationId, userId: user.sub },
        },
      });
      if (!profile) throw new AppError(404, 'Canteen profile not found for this user');

      const [supplier, driver] = await Promise.all([
        profile.supplierId ? prisma.supplier.findUnique({ where: { id: profile.supplierId } }) : Promise.resolve(null),
        profile.driverId ? prisma.driver.findUnique({ where: { id: profile.driverId } }) : Promise.resolve(null),
      ]);

      res.json({ success: true, data: { ...profile, supplier, driver } });
    } catch (error) {
      next(error);
    }
  },
};
