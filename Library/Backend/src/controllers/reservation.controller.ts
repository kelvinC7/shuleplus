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

export const reservationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { status, borrowerId } = req.query as Record<string, string>;

      const where: any = { organizationId: orgId };
      if (status) where.status = status;
      if (borrowerId) where.borrowerId = borrowerId;

      const reservations = await prisma.reservation.findMany({
        where,
        include: {
          resource: { include: { category: true, subject: true } },
          copy: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: reservations });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { resourceId, borrowerType, borrowerId, borrowerName, borrowerClass, expiryDate } = req.body;

      if (!resourceId || !borrowerType || !borrowerId || !borrowerName) {
        throw new AppError(400, 'resourceId, borrowerType, borrowerId, and borrowerName are required');
      }

      const resource = await prisma.bookResource.findFirst({
        where: { id: resourceId, organizationId: orgId },
      });
      if (!resource) throw new AppError(404, 'Resource not found');

      if (resource.availableCopies > 0) {
        throw new AppError(400, 'Book is currently available — please borrow directly instead');
      }

      const existing = await prisma.reservation.findFirst({
        where: { organizationId: orgId, resourceId, borrowerId, status: 'PENDING' },
      });
      if (existing) throw new AppError(409, 'You already have a pending reservation for this book');

      const count = await prisma.reservation.count({
        where: { organizationId: orgId, resourceId, status: 'PENDING' },
      });

      const reservation = await prisma.reservation.create({
        data: {
          organizationId: orgId,
          resourceId,
          borrowerType,
          borrowerId,
          borrowerName,
          borrowerClass,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          position: count + 1,
        },
        include: { resource: true },
      });

      res.status(201).json({ success: true, data: reservation });
    } catch (err) { next(err); }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);

      const reservation = await prisma.reservation.findFirst({
        where: { id, organizationId: orgId, status: 'PENDING' },
      });
      if (!reservation) throw new AppError(404, 'Pending reservation not found');

      await prisma.reservation.update({ where: { id }, data: { status: 'CANCELLED' } });
      res.json({ success: true, message: 'Reservation cancelled' });
    } catch (err) { next(err); }
  },

  async fulfill(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const { copyId, dueDate } = req.body;

      const reservation = await prisma.reservation.findFirst({
        where: { id, organizationId: orgId, status: 'PENDING' },
        include: { resource: true },
      });
      if (!reservation) throw new AppError(404, 'Pending reservation not found');

      const settings = await prisma.librarySettings.findUnique({ where: { organizationId: orgId } });
      const loanPeriod = settings?.loanPeriodDays ?? 7;
      const calculatedDue = dueDate ? new Date(dueDate) : new Date(Date.now() + loanPeriod * 86400000);

      const loan = await prisma.$transaction(async (tx) => {
        const copy = copyId
          ? await tx.bookCopy.findFirst({ where: { id: copyId, organizationId: orgId, status: 'AVAILABLE' } })
          : await tx.bookCopy.findFirst({ where: { resourceId: reservation.resourceId, organizationId: orgId, status: 'AVAILABLE' } });

        if (!copy) throw new AppError(400, 'No available copy found');

        const newLoan = await tx.loan.create({
          data: {
            organizationId: orgId,
            copyId: copy.id,
            borrowerType: reservation.borrowerType,
            borrowerId: reservation.borrowerId,
            borrowerName: reservation.borrowerName,
            borrowerClass: reservation.borrowerClass,
            dueDate: calculatedDue,
          },
        });

        await tx.bookCopy.update({ where: { id: copy.id }, data: { status: 'BORROWED' } });
        await tx.bookResource.update({
          where: { id: reservation.resourceId },
          data: { availableCopies: { decrement: 1 } },
        });
        await tx.reservation.update({
          where: { id },
          data: { status: 'FULFILLED', fulfilledLoanId: newLoan.id },
        });

        return newLoan;
      });

      res.json({ success: true, data: loan });
    } catch (err) { next(err); }
  },
};
