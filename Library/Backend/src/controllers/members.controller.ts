import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { resolveLibraryTeachers, mergeLoanHistoryTeachers } from '../services/teachers.service';

function getOrgId(req: Request): string {
  const orgId = (req as AuthenticatedRequest).organizationRef;
  if (!orgId) throw new AppError(401, 'Organization not resolved');
  return orgId;
}

export const membersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { type } = req.query as { type?: string };

      const where: { organizationId: string; borrowerType?: 'STUDENT' | 'TEACHER' } = { organizationId: orgId };
      if (type === 'STUDENT' || type === 'TEACHER') {
        where.borrowerType = type;
      }

      if (type === 'TEACHER') {
        const integrated = await mergeLoanHistoryTeachers(orgId, await resolveLibraryTeachers(orgId));
        const members = integrated.map((t) => ({
          id: t.id,
          name: t.name,
          type: 'TEACHER',
          class: t.department ?? undefined,
          activeLoans: 0,
          totalLoans: 0,
        }));

        const ids = members.map((m) => m.id);
        if (ids.length) {
          const loanStats = await prisma.loan.findMany({
            where: { organizationId: orgId, borrowerType: 'TEACHER', borrowerId: { in: ids } },
            select: { borrowerId: true, status: true, loanDate: true },
            orderBy: { loanDate: 'desc' },
          });
          const stats = new Map<string, { activeLoans: number; totalLoans: number; lastLoanDate?: string }>();
          for (const loan of loanStats) {
            const row = stats.get(loan.borrowerId) ?? { activeLoans: 0, totalLoans: 0 };
            row.totalLoans++;
            if (loan.status === 'ACTIVE') row.activeLoans++;
            row.lastLoanDate ??= loan.loanDate.toISOString();
            stats.set(loan.borrowerId, row);
          }
          for (const member of members) {
            const s = stats.get(member.id);
            if (s) {
              member.activeLoans = s.activeLoans;
              member.totalLoans = s.totalLoans;
              Object.assign(member, { lastLoanDate: s.lastLoanDate });
            }
          }
        }

        res.json({ success: true, data: { members } });
        return;
      }

      const loans = await prisma.loan.findMany({
        where,
        select: {
          borrowerId: true,
          borrowerName: true,
          borrowerType: true,
          borrowerClass: true,
          status: true,
          loanDate: true,
        },
        orderBy: { loanDate: 'desc' },
      });

      const map = new Map<string, {
        id: string;
        name: string;
        type: string;
        class?: string;
        activeLoans: number;
        totalLoans: number;
        lastLoanDate?: string;
      }>();

      for (const loan of loans) {
        const existing = map.get(loan.borrowerId);
        if (existing) {
          existing.totalLoans++;
          if (loan.status === 'ACTIVE') existing.activeLoans++;
        } else {
          map.set(loan.borrowerId, {
            id: loan.borrowerId,
            name: loan.borrowerName,
            type: loan.borrowerType,
            class: loan.borrowerClass ?? undefined,
            activeLoans: loan.status === 'ACTIVE' ? 1 : 0,
            totalLoans: 1,
            lastLoanDate: loan.loanDate.toISOString(),
          });
        }
      }

      res.json({
        success: true,
        data: { members: Array.from(map.values()) },
      });
    } catch (err) {
      next(err);
    }
  },
};
