import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent, tryResolveActiveStudent } from './parent-context.service';
import { walletApi, WalletSummary } from './wallet-api';
import type { StudentSelector } from '../utils/student-param';

export class WalletService {
  async getSummary(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const student = await tryResolveActiveStudent(organizationId, parentId, requestedStudentId);
    if (!student) {
      return {
        balance: 0,
        currency: 'RWF',
        cardNumber: '',
        studentName: '',
        lastTopUp: null,
        lastTopUpAmount: null,
        recentTransactions: [],
      };
    }

    try {
      const remote = await walletApi.getWalletSummary(organizationId, student.shuleCode);
      return this.mapRemote(remote);
    } catch (error) {
      console.warn(
        `[wallet] Canteen module unreachable (${(error as Error).message}); falling back to local data`
      );
      return this.fallbackLocal(student.id);
    }
  }

  async topUp(
    organizationId: string,
    parentId: string,
    input: { amount: number; method?: string; reference?: string },
    requestedStudentId?: StudentSelector
  ) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    if (!input.amount || input.amount <= 0) {
      throw new AppError(400, 'Top-up amount must be greater than zero');
    }

    const method = input.method ?? 'Mobile Money';

    try {
      const result = await walletApi.topUp(organizationId, student.shuleCode, input.amount, method);
      return {
        balance: result.balance,
        transaction: {
          id: null,
          date: new Date().toISOString(),
          description: `Top-up via ${method}`,
          amount: input.amount,
          type: 'CREDIT',
          balanceAfter: result.balance,
        },
      };
    } catch (error) {
      console.warn(
        `[wallet] Canteen module top-up failed (${(error as Error).message}); falling back to local data`
      );
      return this.fallbackTopUp(organizationId, parentId, input, student.id);
    }
  }
  private mapRemote(data: WalletSummary) {
    return {
      balance: data.balance,
      currency: data.currency,
      cardNumber: data.cardNumber,
      studentName: data.studentName,
      lastTopUp: data.lastTopUp,
      lastTopUpAmount: data.lastTopUpAmount,
      recentTransactions: data.recentTransactions.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        balanceAfter: t.balanceAfter,
      })),
    };
  }

  private async fallbackLocal(studentId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { studentId },
      include: {
        student: true,
        transactions: { orderBy: { date: 'desc' }, take: 20 },
      },
    });

    if (!wallet) throw new AppError(404, 'Wallet not found for this student');

    const credits = wallet.transactions.filter((t) => t.type === 'CREDIT');
    const lastTopUp = credits[0] ?? null;

    return {
      balance: wallet.balance,
      currency: wallet.currency,
      cardNumber: wallet.cardNumber ?? wallet.student.cardNumber ?? '',
      studentName: `${wallet.student.firstName} ${wallet.student.lastName}`,
      lastTopUp: lastTopUp?.date.toISOString() ?? null,
      lastTopUpAmount: lastTopUp?.amount ?? null,
      recentTransactions: wallet.transactions.map((t) => ({
        id: t.id,
        date: t.date.toISOString(),
        description: t.description,
        amount: t.amount,
        type: t.type,
        balanceAfter: t.balanceAfter,
      })),
    };
  }

  private async fallbackTopUp(
    organizationId: string,
    parentId: string,
    input: { amount: number; method?: string; reference?: string },
    studentId: string
  ) {
    if (!input.amount || input.amount <= 0) {
      throw new AppError(400, 'Top-up amount must be greater than zero');
    }

    const wallet = await prisma.wallet.findUnique({ where: { studentId } });
    if (!wallet) throw new AppError(404, 'Wallet not found for this student');

    const balanceAfter = wallet.balance + input.amount;
    const [, tx] = await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      }),
      prisma.walletTransaction.create({
        data: {
          organizationId,
          walletId: wallet.id,
          date: new Date(),
          description: input.method ? `Top-up via ${input.method}` : 'Wallet top-up',
          amount: input.amount,
          type: 'CREDIT',
          balanceAfter,
        },
      }),
    ]);

    return {
      balance: balanceAfter,
      transaction: {
        id: tx.id,
        date: tx.date.toISOString(),
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        balanceAfter: tx.balanceAfter,
      },
    };
  }
}

export const walletService = new WalletService();
