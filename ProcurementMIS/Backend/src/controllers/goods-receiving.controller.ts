import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { goodsReceivingService, GrnListFilters } from '../services/goods-receiving.service';

function parseFilters(req: AuthenticatedRequest): GrnListFilters {
  const q = req.query;
  return {
    status: q.status as string | undefined,
    supplierId: q.supplierId as string | undefined,
    poId: q.poId as string | undefined,
    departmentId: q.departmentId as string | undefined,
    dateFrom: q.dateFrom as string | undefined,
    dateTo: q.dateTo as string | undefined,
    receivedBy: q.receivedBy as string | undefined,
    academicYear: q.academicYear as string | undefined,
    term: q.term as string | undefined,
  };
}

export class GoodsReceivingController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReceivingService.list(req.organizationRef!, parseFilters(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReceivingService.getSummary(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReceivingService.getById(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async poContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReceivingService.getPoReceivingContext(
        req.organizationRef!,
        String(req.params.poId),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReceivingService.create(
        req.organizationRef!,
        req.user!.sub,
        req.user!.email ?? 'User',
        req.body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getByPoId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReceivingService.getByPoId(
        req.organizationRef!,
        String(req.params.poId),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const goodsReceivingController = new GoodsReceivingController();
