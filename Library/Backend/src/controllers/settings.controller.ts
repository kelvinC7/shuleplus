import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

function getOrgId(req: Request): string {
  const orgId = (req as AuthenticatedRequest).organizationRef;
  if (!orgId) throw new AppError(401, 'Organization not resolved');
  return orgId;
}

export const settingsController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      let settings = await prisma.librarySettings.findUnique({ where: { organizationId: orgId } });

      if (!settings) {
        settings = await prisma.librarySettings.create({ data: { organizationId: orgId } });
      }

      res.json({ success: true, data: settings });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const data = req.body;

      let settings = await prisma.librarySettings.findUnique({ where: { organizationId: orgId } });

      if (!settings) {
        settings = await prisma.librarySettings.create({ data: { organizationId: orgId, ...data } });
      } else {
        settings = await prisma.librarySettings.update({
          where: { organizationId: orgId },
          data,
        });
      }

      res.json({ success: true, data: settings });
    } catch (err) { next(err); }
  },
};
