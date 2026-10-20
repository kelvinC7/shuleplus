import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, orgScope } from '../types';
import { AppError } from '../middleware/error.middleware';

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export const reportController = {
  async sales(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const from = parseDate(req.query.from);
      const to = parseDate(req.query.to);
      const className = typeof req.query.className === 'string' ? req.query.className : undefined;

      const sales = await prisma.sale.findMany({
        where: {
          ...(org ? { organizationId: org } : {}),
          ...(from || to
            ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
            : {}),
          ...(className ? { className } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      const total = sales.reduce((sum, s) => sum + Number(s.amount), 0);
      res.json({ success: true, data: { count: sales.length, total, sales } });
    } catch (error) {
      next(error);
    }
  },

  async topMenuItems(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const sales = await prisma.sale.findMany({
        where: org ? { organizationId: org } : {},
        select: { items: true },
        take: 1000,
      });

      const counts: Record<string, { quantity: number; revenue: number }> = {};
      for (const sale of sales) {
        if (Array.isArray(sale.items)) {
          for (const item of sale.items as Array<{ name: string; quantity: number; unitPrice?: number }>) {
            const key = item.name;
            counts[key] = counts[key] ?? { quantity: 0, revenue: 0 };
            counts[key].quantity += item.quantity;
            counts[key].revenue += item.quantity * (item.unitPrice ?? 0);
          }
        }
      }

      const items = Object.entries(counts)
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20);

      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  },

  async cashouts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const cashouts = await prisma.cashoutRequest.findMany({
        where: org ? { organizationId: org } : {},
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      const total = cashouts.reduce((sum, c) => sum + Number(c.amount), 0);
      res.json({ success: true, data: { count: cashouts.length, total, cashouts } });
    } catch (error) {
      next(error);
    }
  },

  async wallets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const wallets = await prisma.studentWallet.findMany({
        where: org ? { organizationId: org } : {},
        orderBy: { balanceRwf: 'desc' },
        take: 200,
      });
      const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balanceRwf), 0);
      res.json({ success: true, data: { count: wallets.length, totalBalance, wallets } });
    } catch (error) {
      next(error);
    }
  },
};
