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

export const loanController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { status, borrowerType, borrowerId, search } = req.query as Record<string, string>;
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

      const where: any = { organizationId: orgId };
      if (status) where.status = status;
      if (borrowerType) where.borrowerType = borrowerType;
      if (borrowerId) where.borrowerId = borrowerId;
      if (search) {
        where.OR = [
          { borrowerName: { contains: search, mode: 'insensitive' } },
          { copy: { resource: { title: { contains: search, mode: 'insensitive' } } } },
        ];
      }

      const [loans, total] = await Promise.all([
        prisma.loan.findMany({
          where,
          include: {
            copy: { include: { resource: { include: { category: true, subject: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.loan.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          loans,
          pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        },
      });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { copyId, borrowerType, borrowerId, borrowerName, borrowerClass, dueDate, notes, issuedBy } = req.body;

      if (!copyId || !borrowerType || !borrowerId || !borrowerName) {
        throw new AppError(400, 'copyId, borrowerType, borrowerId, and borrowerName are required');
      }

      const copy = await prisma.bookCopy.findFirst({
        where: { id: copyId, organizationId: orgId },
      });
      if (!copy) throw new AppError(404, 'Book copy not found');
      if (copy.status !== 'AVAILABLE') throw new AppError(400, 'Book copy is not available');

      const settings = await prisma.librarySettings.findUnique({ where: { organizationId: orgId } });
      const loanPeriod = settings?.loanPeriodDays ?? 7;
      const calculatedDue = dueDate ? new Date(dueDate) : new Date(Date.now() + loanPeriod * 86400000);

      const loan = await prisma.$transaction(async (tx) => {
        const newLoan = await tx.loan.create({
          data: {
            organizationId: orgId,
            copyId,
            borrowerType,
            borrowerId,
            borrowerName,
            borrowerClass,
            dueDate: calculatedDue,
            issuedBy,
            notes,
          },
        });
        await tx.bookCopy.update({ where: { id: copyId }, data: { status: 'BORROWED' } });
        await tx.bookResource.update({
          where: { id: copy.resourceId },
          data: { availableCopies: { decrement: 1 } },
        });
        return newLoan;
      });

      res.status(201).json({ success: true, data: loan });
    } catch (err) { next(err); }
  },

  async returnBook(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const { condition, notes } = req.body;

      const loan = await prisma.loan.findFirst({
        where: { id, organizationId: orgId, status: { in: ['ACTIVE', 'OVERDUE'] } },
        include: { copy: true },
      });
      if (!loan) throw new AppError(404, 'Active loan not found');

      const newCondition = condition ?? 'Good';
      const copyStatus = newCondition === 'Damaged' ? 'DAMAGED' : newCondition === 'Lost' ? 'LOST' : 'AVAILABLE';

      await prisma.$transaction(async (tx) => {
        await tx.loan.update({
          where: { id },
          data: { status: 'RETURNED', returnDate: new Date(), notes: notes ?? loan.notes },
        });
        await tx.bookCopy.update({
          where: { id: loan.copyId },
          data: { status: copyStatus, condition: newCondition },
        });
        if (copyStatus === 'AVAILABLE') {
          await tx.bookResource.update({
            where: { id: loan.copy.resourceId },
            data: { availableCopies: { increment: 1 } },
          });
        }
      });

      res.json({ success: true, message: 'Book returned successfully' });
    } catch (err) { next(err); }
  },

  async renew(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);

      const loan = await prisma.loan.findFirst({
        where: { id, organizationId: orgId, status: 'ACTIVE' },
      });
      if (!loan) throw new AppError(404, 'Active loan not found');

      const settings = await prisma.librarySettings.findUnique({ where: { organizationId: orgId } });
      const maxRenewals = settings?.maxRenewals ?? 1;
      if (!settings?.renewalsAllowed || loan.renewedCount >= maxRenewals) {
        throw new AppError(400, 'Renewals not allowed or maximum renewals reached');
      }

      const loanPeriod = settings?.loanPeriodDays ?? 7;
      const newDueDate = new Date(Date.now() + loanPeriod * 86400000);

      const updated = await prisma.loan.update({
        where: { id },
        data: { dueDate: newDueDate, renewedCount: { increment: 1 } },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },

  async overdue(_req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(_req);
      const now = new Date();

      const loans = await prisma.loan.findMany({
        where: { organizationId: orgId, status: 'ACTIVE', dueDate: { lt: now } },
        include: { copy: { include: { resource: true } } },
        orderBy: { dueDate: 'asc' },
      });

      res.json({ success: true, data: loans });
    } catch (err) { next(err); }
  },
};
