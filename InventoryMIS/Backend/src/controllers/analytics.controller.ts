import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { analyticsService } from '../services/analytics.service';
import { productService } from '../services/product.service';
import { prisma } from '../config/database';

export class AnalyticsController {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDashboard(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async categoryConsumption(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const categories = await prisma.productCategory.findMany({
        where: { organizationId: orgId },
        include: {
          products: {
            include: {
              issueItems: {
                where: { issue: { organizationId: orgId } },
                select: { quantity: true },
              },
            },
          },
        },
      });

      const data = categories.map(cat => {
        const total = cat.products.reduce(
          (sum, p) => sum + p.issueItems.reduce((s, i) => s + Number(i.quantity), 0),
          0
        );
        return { categoryId: cat.id, categoryName: cat.name, totalConsumed: total, productCount: cat.products.length };
      });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async stockMovement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const [receivings, issues, transfers, adjustments] = await Promise.all([
        prisma.stockReceiving.findMany({ where: { organizationId: orgId }, orderBy: { receivedDate: 'desc' }, take: 50 }),
        prisma.stockIssue.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.stockTransfer.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.stockAdjustment.findMany({ where: { organizationId: orgId }, orderBy: { adjustmentDate: 'desc' }, take: 50 }),
      ]);

      res.json({
        success: true,
        data: { receivings, issues, transfers, adjustments },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
