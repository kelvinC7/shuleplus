import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const dashboardController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = (req as AuthenticatedRequest).organizationRef;

      const [
        totalBooks,
        availableBooks,
        borrowedBooks,
        overdueBooks,
        lostBooks,
        damagedBooks,
        activeLoansToday,
        pendingReservations,
        libraryVisitsToday,
      ] = await Promise.all([
        prisma.bookResource.count({ where: { organizationId: orgId } }),
        prisma.bookResource.aggregate({
          where: { organizationId: orgId, status: 'AVAILABLE' },
          _sum: { availableCopies: true },
        }),
        prisma.bookCopy.count({ where: { organizationId: orgId, status: 'BORROWED' } }),
        prisma.bookCopy.count({ where: { organizationId: orgId, status: 'OVERDUE' } }),
        prisma.bookCopy.count({ where: { organizationId: orgId, status: 'LOST' } }),
        prisma.bookCopy.count({ where: { organizationId: orgId, status: 'DAMAGED' } }),
        prisma.loan.count({
          where: {
            organizationId: orgId,
            status: 'ACTIVE',
            loanDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        prisma.reservation.count({ where: { organizationId: orgId, status: 'PENDING' } }),
        prisma.libraryVisit.count({
          where: {
            organizationId: orgId,
            checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
      ]);

      const totalFines = await prisma.fine.aggregate({
        where: { organizationId: orgId, status: 'PENDING' },
        _sum: { amount: true },
      });

      const recentLoans = await prisma.loan.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { copy: { include: { resource: true } } },
      });

      const uniqueBorrowers = await prisma.loan.groupBy({
        by: ['borrowerId', 'borrowerType'],
        where: { organizationId: orgId, status: 'ACTIVE' },
      });
      const studentsWithLoans = uniqueBorrowers.filter(
        (b) => b.borrowerType === 'STUDENT'
      ).length;
      const teachersWithLoans = uniqueBorrowers.filter(
        (b) => b.borrowerType === 'TEACHER'
      ).length;

      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const booksReturnedToday = await prisma.loan.count({
        where: {
          organizationId: orgId,
          status: 'RETURNED',
          returnDate: { gte: todayStart },
        },
      });

      res.json({
        success: true,
        data: {
          totalBooks,
          availableBooks: availableBooks._sum.availableCopies ?? 0,
          borrowedBooks,
          overdueBooks,
          lostBooks,
          damagedBooks,
          studentsWithLoans,
          teachersWithLoans,
          booksBorrowedToday: activeLoansToday,
          booksReturnedToday,
          pendingReservations,
          libraryVisitsToday,
          totalFines: totalFines._sum.amount ?? 0,
          recentLoans,
          topBooks: [],
          topReaders: [],
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
