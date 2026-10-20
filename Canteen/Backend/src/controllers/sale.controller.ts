import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, orgScope, param } from '../types';
import { AppError } from '../middleware/error.middleware';

const processSchema = z.object({
  walletId: z.string().min(1).optional(),
  cardCode: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  studentCode: z.string().optional(),
  amount: z.number().positive(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative().optional(),
      })
    )
    .default([]),
  operatorName: z.string().optional(),
  schoolCode: z.string().optional(),
  saleNumber: z.string().optional(),
});

export const saleController = {
  /** Process a POS sale: debit the card wallet + record the sale + ledger transaction (atomic). */
  async process(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = processSchema.parse(req.body);
      const org = req.organizationRef!;

      let wallet;
      if (body.walletId) {
        wallet = await prisma.studentWallet.findUnique({ where: { id: body.walletId } });
      } else if (body.cardCode) {
        const code = body.cardCode.toUpperCase();
        wallet = await prisma.studentWallet.findUnique({
          where: { cardCode: code.startsWith('CARD-') ? code : `CARD-${code}` },
        });
      } else if (body.studentCode) {
        wallet = await prisma.studentWallet.findFirst({ where: { studentCode: body.studentCode } });
      }

      if (!wallet) throw new AppError(404, 'Student card not found');
      if (wallet.status !== 'ACTIVE') throw new AppError(400, 'Wallet is blocked');

      const amount = Math.round(body.amount * 100) / 100;

      const result = await prisma.$transaction(async (tx) => {
        const debit = await tx.studentWallet.updateMany({
          where: { id: wallet!.id, balanceRwf: { gte: amount } },
          data: { balanceRwf: { decrement: amount } },
        });

        if (debit.count === 0) {
          throw new AppError(400, 'Insufficient balance');
        }

        const after = await tx.studentWallet.findUniqueOrThrow({ where: { id: wallet!.id } });

        const sale = await tx.sale.create({
          data: {
            organizationId: org,
            saleNumber: body.saleNumber ?? `SALE-${Date.now()}`,
            walletId: wallet!.id,
            studentId: wallet!.studentId,
            studentName: wallet!.fullName,
            studentCode: wallet!.studentCode,
            className: wallet!.className,
            amount,
            items: body.items.length ? (body.items as unknown as object) : undefined,
            operatorId: req.user?.sub ?? null,
            operatorName: body.operatorName ?? null,
            schoolCode: body.schoolCode ?? null,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet!.id,
            organizationId: org,
            type: 'DEBIT',
            status: 'SUCCESS',
            amount,
            balanceAfter: after.balanceRwf,
            reference: sale.saleNumber ?? sale.id,
            note: body.items.length ? body.items.map((i) => `${i.name} x${i.quantity}`).join(', ') : 'Canteen sale',
            createdById: req.user?.sub ?? null,
          },
        });

        return { sale, newBalance: after.balanceRwf };
      });

      res.json({
        success: true,
        data: { ...result, message: 'Sale processed successfully' },
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);

      const sales = await prisma.sale.findMany({
        where: org ? { organizationId: org } : {},
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      res.json({ success: true, data: sales });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const sale = await prisma.sale.findUnique({ where: { id: param(req, 'id') } });
      if (!sale) throw new AppError(404, 'Sale not found');
      res.json({ success: true, data: sale });
    } catch (error) {
      next(error);
    }
  },
};
