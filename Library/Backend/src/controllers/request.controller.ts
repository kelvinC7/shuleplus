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

export const requestController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { status, priority } = req.query as Record<string, string>;

      const where: any = { organizationId: orgId };
      if (status) where.status = status;
      if (priority) where.priority = priority;

      const requests = await prisma.bookRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: requests });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { requesterType, requesterId, requesterName, title, author, reason, priority } = req.body;

      if (!requesterType || !requesterId || !requesterName || !title) {
        throw new AppError(400, 'requesterType, requesterId, requesterName, and title are required');
      }

      const request = await prisma.bookRequest.create({
        data: {
          organizationId: orgId,
          requesterType,
          requesterId,
          requesterName,
          title,
          author,
          reason,
          priority: priority ?? 'MEDIUM',
        },
      });

      res.status(201).json({ success: true, data: request });
    } catch (err) { next(err); }
  },

  async review(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const { status, reviewedBy } = req.body;

      if (!status || !['APPROVED', 'REJECTED', 'PURCHASED'].includes(status)) {
        throw new AppError(400, 'Status must be APPROVED, REJECTED, or PURCHASED');
      }

      const existing = await prisma.bookRequest.findFirst({
        where: { id, organizationId: orgId, status: 'PENDING' },
      });
      if (!existing) throw new AppError(404, 'Pending request not found');

      const updated = await prisma.bookRequest.update({
        where: { id },
        data: { status, reviewedBy, reviewedAt: new Date() },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },
};
