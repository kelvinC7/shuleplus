import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, isPlatformAdmin } from '../types';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const dashboardController = {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const admin = isPlatformAdmin(user);
      const org = req.organizationRef!;

      if (admin) {
        const [tenantCount, supplierCount, pendingCount, walletCount, saleCount, recentSales, canteens] =
          await Promise.all([
            prisma.tenant.count({ where: { status: 'ACTIVE' } }),
            prisma.supplier.count(),
            prisma.supplier.count({ where: { status: 'PENDING' } }),
            prisma.studentWallet.count(),
            prisma.sale.count(),
            prisma.sale.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
            prisma.tenant.findMany({
              orderBy: { createdAt: 'desc' },
              take: 8,
              select: {
                id: true,
                organizationId: true,
                organizationName: true,
                schoolCode: true,
                status: true,
                createdAt: true,
              },
            }),
          ]);
        res.json({
          success: true,
          data: {
            scope: 'platform',
            counts: { canteens: tenantCount, suppliers: supplierCount, pendingSuppliers: pendingCount, wallets: walletCount, sales: saleCount },
            recentSales,
            canteens,
          },
        });
        return;
      }

      const [saleCount, salesToday, walletCount, totalBalance, menuCount, inventoryCount, pendingOrders, recentSales, recentTransactions, notifications] =
        await Promise.all([
          prisma.sale.count({ where: { organizationId: org } }),
          prisma.sale.count({ where: { organizationId: org, createdAt: { gte: startOfToday() } } }),
          prisma.studentWallet.count({ where: { organizationId: org } }),
          prisma.studentWallet.aggregate({ where: { organizationId: org }, _sum: { balanceRwf: true } }),
          prisma.menuItem.count({ where: { organizationId: org } }),
          prisma.inventoryItem.count({ where: { organizationId: org } }),
          prisma.purchaseOrder.count({ where: { organizationId: org, status: 'PENDING' } }),
          prisma.sale.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: 8 }),
          prisma.walletTransaction.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: 8 }),
          prisma.canteenNotification.findMany({ where: { organizationId: org, isRead: false }, orderBy: { createdAt: 'desc' }, take: 5 }),
        ]);

      res.json({
        success: true,
        data: {
          scope: 'organization',
          counts: {
            sales: saleCount,
            salesToday,
            wallets: walletCount,
            totalBalance: totalBalance._sum.balanceRwf ?? 0,
            menuItems: menuCount,
            inventoryItems: inventoryCount,
            pendingOrders,
            unreadNotifications: notifications.length,
          },
          recentSales,
          recentTransactions,
          notifications,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
