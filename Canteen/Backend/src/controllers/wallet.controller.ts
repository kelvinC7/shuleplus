import { Response, NextFunction, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, orgScope, param } from '../types';
import { AppError } from '../middleware/error.middleware';

const topupSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
});

export const walletController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const className = typeof req.query.className === 'string' ? req.query.className : undefined;

      const wallets = await prisma.studentWallet.findMany({
        where: {
          ...(org ? { organizationId: org } : {}),
          ...(className ? { className } : {}),
          ...(search
            ? {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { studentCode: { contains: search, mode: 'insensitive' } },
                  { cardCode: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { fullName: 'asc' },
      });

      res.json({ success: true, data: wallets });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const wallet = await prisma.studentWallet.findUnique({
        where: { id: param(req, 'id') },
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
      });
      if (!wallet) throw new AppError(404, 'Wallet not found');
      res.json({ success: true, data: wallet });
    } catch (error) {
      next(error);
    }
  },

  /** POS lookup by card QR/RFID value. */
  async getByCard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const cardCode = (param(req, 'cardCode') || '').toUpperCase();
      const wallet = await prisma.studentWallet.findUnique({
        where: { cardCode: cardCode.startsWith('CARD-') ? cardCode : `CARD-${cardCode}` },
      });
      if (!wallet) throw new AppError(404, 'Card not found');
      res.json({ success: true, data: wallet });
    } catch (error) {
      next(error);
    }
  },

  async getByStudentCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const wallet = await prisma.studentWallet.findFirst({
        where: { studentCode: param(req, 'studentCode') },
      });
      if (!wallet) throw new AppError(404, 'Student not found');
      res.json({ success: true, data: wallet });
    } catch (error) {
      next(error);
    }
  },

  /** Top up a student card wallet (credit). */
  async topup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { amount, note } = topupSchema.parse(req.body);
      const wallet = await prisma.studentWallet.findUnique({ where: { id: param(req, 'id') } });
      if (!wallet) throw new AppError(404, 'Wallet not found');
      if (wallet.status !== 'ACTIVE') throw new AppError(400, 'Wallet is blocked');

      const updated = await prisma.$transaction(async (tx) => {
        const nextWallet = await tx.studentWallet.update({
          where: { id: wallet.id },
          data: { balanceRwf: { increment: amount } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            organizationId: wallet.organizationId,
            type: 'CREDIT',
            status: 'SUCCESS',
            amount,
            balanceAfter: nextWallet.balanceRwf,
            reference: `TOPUP-${Date.now()}`,
            note: note ?? 'Wallet top-up',
            createdById: req.user?.sub ?? null,
          },
        });
        return nextWallet;
      });

      await prisma.activityLog.create({
        data: {
          organizationId: wallet.organizationId,
          userId: req.user?.sub ?? null,
          action: 'WALLET_TOPUP',
          metadata: { walletId: wallet.id, amount },
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  async transactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const transactions = await prisma.walletTransaction.findMany({
        where: { walletId: param(req, 'id') },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  },

  async setStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = req.body.status === 'ACTIVE' ? 'ACTIVE' : 'BLOCKED';
      const wallet = await prisma.studentWallet.update({
        where: { id: param(req, 'id') },
        data: { status },
      });
      res.json({ success: true, data: wallet });
    } catch (error) {
      next(error);
    }
  },

  /** Org-wide transaction ledger. */
  async ledger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const transactions = await prisma.walletTransaction.findMany({
        where: org ? { organizationId: org } : {},
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { wallet: { select: { fullName: true, studentCode: true, className: true } } },
      });
      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: parent wallet summary for a student code. */
  async parentSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId
      );
      const studentCode = String(req.query.studentCode ?? '');
      if (!studentCode) {
        res.status(400).json({ success: false, message: 'studentCode is required' });
        return;
      }

      const wallet = await prisma.studentWallet.findFirst({
        where: { organizationId, studentCode },
        include: {
          transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      });
      if (!wallet) throw new AppError(404, 'Wallet not found for this student');

      const credits = wallet.transactions.filter((t) => t.type === 'CREDIT');
      const lastTopUp = credits[0] ?? null;

      res.json({
        success: true,
        data: {
          id: wallet.id,
          balance: Number(wallet.balanceRwf),
          currency: 'RWF',
          cardNumber: wallet.cardCode,
          studentName: wallet.fullName,
          className: wallet.className,
          status: wallet.status,
          lastTopUp: lastTopUp ? lastTopUp.createdAt.toISOString() : null,
          lastTopUpAmount: lastTopUp ? Number(lastTopUp.amount) : null,
          recentTransactions: wallet.transactions.map((t) => ({
            id: t.id,
            date: t.createdAt.toISOString(),
            description: t.note ?? t.reference ?? 'Wallet transaction',
            amount: Number(t.amount),
            type: t.type,
            balanceAfter: Number(t.balanceAfter),
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: parent top-up for a student code. */
  async parentTopUp(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.body.organizationId
      );
      const studentCode = String(req.body.studentCode ?? '');
      const amount = Number(req.body.amount ?? 0);
      const method = String(req.body.method ?? 'Mobile Money');

      if (!studentCode) {
        res.status(400).json({ success: false, message: 'studentCode is required' });
        return;
      }
      if (!amount || amount <= 0) {
        res.status(400).json({ success: false, message: 'amount must be greater than zero' });
        return;
      }

      const wallet = await prisma.studentWallet.findFirst({
        where: { organizationId, studentCode },
      });
      if (!wallet) throw new AppError(404, 'Wallet not found for this student');
      if (wallet.status !== 'ACTIVE') throw new AppError(400, 'Wallet is blocked');

      const updated = await prisma.$transaction(async (tx) => {
        const nextWallet = await tx.studentWallet.update({
          where: { id: wallet.id },
          data: { balanceRwf: { increment: amount } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            organizationId,
            type: 'CREDIT',
            status: 'SUCCESS',
            amount,
            balanceAfter: nextWallet.balanceRwf,
            reference: `TOPUP-PARENT-${Date.now()}`,
            note: `Top-up via ${method}`,
            createdById: null,
          },
        });
        return nextWallet;
      });

      res.json({
        success: true,
        data: {
          id: updated.id,
          balance: Number(updated.balanceRwf),
          currency: 'RWF',
          cardNumber: updated.cardCode,
          studentName: updated.fullName,
          className: updated.className,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
