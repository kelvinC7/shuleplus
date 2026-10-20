import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function getOrgId(req: Request): string {
  const orgId = (req as AuthenticatedRequest).organizationRef;
  if (!orgId) throw new Error('Organization not resolved');
  return orgId;
}

export const reportController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

      const [
        totalBooks,
        totalCopies,
        activeLoans,
        overdueLoans,
        totalReservations,
        pendingReservations,
        totalVisits,
        totalDigitalResources,
        totalRequests,
        pendingRequests,
        finesPending,
        loansByStatus,
        topBorrowedBooks,
        topBorrowers,
        newBooksByMonth,
      ] = await Promise.all([
        prisma.bookResource.count({ where: { organizationId: orgId } }),
        prisma.bookCopy.count({ where: { organizationId: orgId } }),
        prisma.loan.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
        prisma.loan.count({ where: { organizationId: orgId, status: 'OVERDUE' } }),
        prisma.reservation.count({ where: { organizationId: orgId } }),
        prisma.reservation.count({ where: { organizationId: orgId, status: 'PENDING' } }),
        prisma.libraryVisit.count({ where: { organizationId: orgId } }),
        prisma.digitalResource.count({ where: { organizationId: orgId } }),
        prisma.bookRequest.count({ where: { organizationId: orgId } }),
        prisma.bookRequest.count({ where: { organizationId: orgId, status: 'PENDING' } }),
        prisma.fine.aggregate({ where: { organizationId: orgId, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
        prisma.loan.groupBy({ by: ['status'], where: { organizationId: orgId }, _count: true }),
        prisma.loan.groupBy({
          by: ['copyId'],
          where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
          _count: true,
          orderBy: { _count: { copyId: 'desc' } },
          take: 10,
        }),
        prisma.loan.groupBy({
          by: ['borrowerId', 'borrowerName', 'borrowerType'],
          where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
          _count: true,
          orderBy: { _count: { borrowerId: 'desc' } },
          take: 10,
        }),
        prisma.$queryRaw`
          SELECT date_trunc('month', created_at) as month, COUNT(*) as count
          FROM book_resources
          WHERE organization_id = ${orgId} AND created_at >= ${sevenDaysAgo}
          GROUP BY date_trunc('month', created_at)
          ORDER BY month DESC
          LIMIT 12
        `,
      ]);

      const topBookIds = topBorrowedBooks.map((b: any) => b.copyId);
      const topCopies = topBookIds.length
        ? await prisma.bookCopy.findMany({ where: { id: { in: topBookIds } }, include: { resource: true } })
        : [];
      const topBooksMap = new Map(topCopies.map((c: any) => [c.id, c]));
      const topBooksWithCount = topBorrowedBooks.map((b: any) => ({
        ...b,
        copy: topBooksMap.get(b.copyId),
      }));

      res.json({
        success: true,
        data: {
          overview: {
            totalBooks,
            totalCopies,
            activeLoans,
            overdueLoans,
            totalReservations,
            pendingReservations,
            totalVisits,
            totalDigitalResources,
            totalRequests,
            pendingRequests,
            pendingFinesCount: finesPending._count,
            pendingFinesAmount: finesPending._sum.amount ?? 0,
          },
          loansByStatus: loansByStatus.map((l: any) => ({ status: l.status, count: l._count })),
          topBorrowedBooks: topBooksWithCount,
          topBorrowers,
          newBooksByMonth,
        },
      });
    } catch (err) { next(err); }
  },
};
