import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

function getOrgId(req: Request): string {
  const orgId = (req as AuthenticatedRequest).organizationRef;
  if (!orgId) throw new AppError(401, 'Organization not resolved');
  return orgId;
}

function getId(req: Request): string {
  const id = req.params.id;
  if (!id) throw new AppError(400, 'Missing resource id');
  return Array.isArray(id) ? id[0] : id;
}

export const visitController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { borrowerId, date } = req.query as Record<string, string>;

      const where: any = { organizationId: orgId };
      if (borrowerId) where.borrowerId = borrowerId;
      if (date) {
        const d = new Date(date);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        where.checkIn = { gte: d, lt: next };
      }

      const visits = await prisma.libraryVisit.findMany({
        where,
        orderBy: { checkIn: 'desc' },
      });

      res.json({ success: true, data: visits });
    } catch (err) { next(err); }
  },

  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { borrowerType, borrowerId, borrowerName, borrowerClass, reason } = req.body;

      if (!borrowerType || !borrowerId || !borrowerName) {
        throw new AppError(400, 'borrowerType, borrowerId, and borrowerName are required');
      }

      const visit = await prisma.libraryVisit.create({
        data: { organizationId: orgId, borrowerType, borrowerId, borrowerName, borrowerClass, reason },
      });

      res.status(201).json({ success: true, data: visit });
    } catch (err) { next(err); }
  },

  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);

      const visit = await prisma.libraryVisit.findFirst({
        where: { id, organizationId: orgId, checkOut: null },
      });
      if (!visit) throw new AppError(404, 'Active visit not found');

      const updated = await prisma.libraryVisit.update({
        where: { id },
        data: { checkOut: new Date() },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekAgo = new Date(Date.now() - 7 * 86400000);

      const [today, thisWeek, currentlyInside] = await Promise.all([
        prisma.libraryVisit.count({ where: { organizationId: orgId, checkIn: { gte: todayStart } } }),
        prisma.libraryVisit.count({ where: { organizationId: orgId, checkIn: { gte: weekAgo } } }),
        prisma.libraryVisit.count({ where: { organizationId: orgId, checkOut: null } }),
      ]);

      res.json({ success: true, data: { today, thisWeek, currentlyInside } });
    } catch (err) { next(err); }
  },
};
