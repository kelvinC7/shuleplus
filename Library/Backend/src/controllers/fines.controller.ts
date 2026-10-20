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
  if (!id) throw new AppError(400, 'Missing fine id');
  return Array.isArray(id) ? id[0] : id;
}

export const finesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { status, borrowerId, search } = req.query as Record<string, string>;
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

      const where: Record<string, unknown> = { organizationId: orgId };
      if (status) where.status = status;
      if (borrowerId) where.borrowerId = borrowerId;
      if (search) {
        where.OR = [
          { borrowerId: { contains: search, mode: 'insensitive' } },
          { loan: { borrowerName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [fines, total, stats] = await Promise.all([
        prisma.fine.findMany({
          where,
          include: {
            loan: {
              include: {
                copy: { include: { resource: { select: { title: true } } } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.fine.count({ where }),
        Promise.all([
          prisma.fine.aggregate({
            where: { organizationId: orgId, status: 'PENDING' },
            _sum: { amount: true },
            _count: true,
          }),
          prisma.fine.aggregate({
            where: { organizationId: orgId, status: 'PAID' },
            _sum: { amount: true },
          }),
        ]),
      ]);

      const [pendingAgg, paidAgg] = stats;

      res.json({
        success: true,
        data: {
          fines,
          pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
          stats: {
            pendingCount: pendingAgg._count,
            pendingAmount: Number(pendingAgg._sum.amount ?? 0),
            paidAmount: Number(paidAgg._sum.amount ?? 0),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { loanId, amount, reason, notes } = req.body;
      if (!loanId || amount == null || !reason) {
        throw new AppError(400, 'loanId, amount, and reason are required');
      }

      const loan = await prisma.loan.findFirst({
        where: { id: loanId, organizationId: orgId },
      });
      if (!loan) throw new AppError(404, 'Loan not found');

      const fine = await prisma.fine.create({
        data: {
          organizationId: orgId,
          loanId,
          borrowerType: loan.borrowerType,
          borrowerId: loan.borrowerId,
          amount: Number(amount),
          reason,
          notes,
        },
        include: {
          loan: { include: { copy: { include: { resource: true } } } },
        },
      });

      res.status(201).json({ success: true, data: fine });
    } catch (err) {
      next(err);
    }
  },

  async markPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);

      const existing = await prisma.fine.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Fine not found');
      if (existing.status === 'PAID') throw new AppError(400, 'Fine already paid');

      const fine = await prisma.fine.update({
        where: { id },
        data: { status: 'PAID', paidAt: new Date(), notes: req.body.notes ?? existing.notes },
        include: {
          loan: { include: { copy: { include: { resource: true } } } },
        },
      });

      res.json({ success: true, data: fine });
    } catch (err) {
      next(err);
    }
  },

  async waive(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);

      const existing = await prisma.fine.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Fine not found');

      const fine = await prisma.fine.update({
        where: { id },
        data: { status: 'WAIVED', notes: req.body.notes ?? existing.notes },
        include: {
          loan: { include: { copy: { include: { resource: true } } } },
        },
      });

      res.json({ success: true, data: fine });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);

      const existing = await prisma.fine.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Fine not found');

      await prisma.fine.delete({ where: { id } });
      res.json({ success: true, message: 'Fine deleted' });
    } catch (err) {
      next(err);
    }
  },
};
