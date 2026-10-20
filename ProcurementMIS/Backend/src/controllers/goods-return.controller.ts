import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { goodsReturnService, ReturnListFilters } from '../services/goods-return.service';

function parseFilters(req: AuthenticatedRequest): ReturnListFilters {
  const q = req.query;
  return {
    status: q.status as string | undefined,
    supplierId: q.supplierId as string | undefined,
    reason: q.reason as string | undefined,
    departmentId: q.departmentId as string | undefined,
    dateFrom: q.dateFrom as string | undefined,
    dateTo: q.dateTo as string | undefined,
    academicYear: q.academicYear as string | undefined,
    term: q.term as string | undefined,
  };
}

export class GoodsReturnController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReturnService.list(req.organizationRef!, parseFilters(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReturnService.getSummary(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReturnService.getById(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async grnContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReturnService.getGrnReturnContext(
        req.organizationRef!,
        String(req.params.grnId),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReturnService.create(
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

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await goodsReturnService.updateStatus(
        req.organizationRef!,
        String(req.params.id),
        req.body.status,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const goodsReturnController = new GoodsReturnController();
