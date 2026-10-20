import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, orgScope, param } from '../types';
import { AppError } from '../middleware/error.middleware';

const requestSchema = z.object({
  amount: z.number().positive(),
  method: z.string().min(1),
  canteenId: z.string().optional(),
  schoolCode: z.string().optional(),
  note: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED']),
  note: z.string().optional(),
});

export const cashoutController = {
  async request(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = requestSchema.parse(req.body);
      const org = req.organizationRef!;

      const cashout = await prisma.cashoutRequest.create({
        data: {
          organizationId: org,
          canteenId: body.canteenId ?? null,
          schoolCode: body.schoolCode ?? null,
          amount: body.amount,
          method: body.method,
          status: 'PENDING',
          operatorId: req.user?.sub ?? null,
          operatorName: body.note ?? null,
          note: body.note ?? null,
        },
      });

      res.status(201).json({ success: true, data: cashout });
    } catch (error) {
      next(error);
    }
  },

  /** Available balance = sum(sales) - sum(pending + completed cashouts) for this canteen. */
  async balance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const where = org ? { organizationId: org } : {};

      const [salesAgg, cashoutAgg] = await Promise.all([
        prisma.sale.aggregate({ where, _sum: { amount: true } }),
        prisma.cashoutRequest.aggregate({
          where: { ...where, status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] } },
          _sum: { amount: true },
        }),
      ]);

      const totalSales = salesAgg._sum.amount ?? 0;
      const totalCashouts = cashoutAgg._sum.amount ?? 0;

      res.json({ success: true, data: { totalSales, totalCashouts, availableBalance: Number(totalSales) - Number(totalCashouts) } });
    } catch (error) {
      next(error);
    }
  },

  async history(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const cashouts = await prisma.cashoutRequest.findMany({
        where: org ? { organizationId: org } : {},
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: cashouts });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const cashouts = await prisma.cashoutRequest.findMany({
        where: org ? { organizationId: org } : {},
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json({ success: true, data: cashouts });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, note } = statusSchema.parse(req.body);
      const cashout = await prisma.cashoutRequest.findUnique({ where: { id: param(req, 'id') } });
      if (!cashout) throw new AppError(404, 'Cashout request not found');

      const updated = await prisma.cashoutRequest.update({
        where: { id: cashout.id },
        data: {
          status,
          processedById: req.user?.sub ?? null,
          processedAt: status === 'COMPLETED' || status === 'REJECTED' ? new Date() : null,
          note: note ?? cashout.note,
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
};
