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

export const inventoryController = {
  async copies(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { status, resourceId, search } = req.query as Record<string, string>;

      const where: any = { organizationId: orgId };
      if (status) where.status = status;
      if (resourceId) where.resourceId = resourceId;
      if (search) {
        where.OR = [
          { barcode: { contains: search, mode: 'insensitive' } },
          { resource: { title: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const copies = await prisma.bookCopy.findMany({
        where,
        include: { resource: { include: { category: true, subject: true, shelf: true } } },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: copies });
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const { status, condition, notes } = req.body;

      const copy = await prisma.bookCopy.findFirst({ where: { id, organizationId: orgId } });
      if (!copy) throw new AppError(404, 'Book copy not found');

      const updated = await prisma.bookCopy.update({
        where: { id },
        data: { ...(status && { status }), ...(condition && { condition }), ...(notes !== undefined && { notes }) },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },

  async damages(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const copies = await prisma.bookCopy.findMany({
        where: { organizationId: orgId, status: 'DAMAGED' },
        include: { resource: true },
        orderBy: { updatedAt: 'desc' },
      });
      res.json({ success: true, data: copies });
    } catch (err) { next(err); }
  },

  async lost(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const copies = await prisma.bookCopy.findMany({
        where: { organizationId: orgId, status: 'LOST' },
        include: { resource: true },
        orderBy: { updatedAt: 'desc' },
      });
      res.json({ success: true, data: copies });
    } catch (err) { next(err); }
  },

  async transfers(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { status } = req.query as Record<string, string>;

      const where: any = { organizationId: orgId };
      if (status) where.status = status;

      const transfers = await prisma.bookTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: transfers });
    } catch (err) { next(err); }
  },

  async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { copyId, toOrgId, requestedBy, notes } = req.body;

      if (!copyId || !toOrgId || !requestedBy) {
        throw new AppError(400, 'copyId, toOrgId, and requestedBy are required');
      }

      const copy = await prisma.bookCopy.findFirst({ where: { id: copyId, organizationId: orgId } });
      if (!copy) throw new AppError(404, 'Book copy not found');

      const transfer = await prisma.bookTransfer.create({
        data: {
          organizationId: orgId,
          copyId,
          fromOrgId: orgId,
          toOrgId,
          requestedBy,
          notes,
        },
      });

      res.status(201).json({ success: true, data: transfer });
    } catch (err) { next(err); }
  },

  async approveTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const { approvedBy, status } = req.body;

      if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
        throw new AppError(400, 'Status must be APPROVED or REJECTED');
      }

      const transfer = await prisma.bookTransfer.findFirst({
        where: { id, organizationId: orgId, status: 'PENDING' },
      });
      if (!transfer) throw new AppError(404, 'Pending transfer not found');

      const updated = await prisma.bookTransfer.update({
        where: { id },
        data: { status, approvedBy },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },
};
