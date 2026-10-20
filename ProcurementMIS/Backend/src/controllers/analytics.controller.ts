import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { analyticsService, AnalyticsFilters } from '../services/analytics.service';

function parseFilters(req: AuthenticatedRequest): AnalyticsFilters {
  const q = req.query;
  return {
    academicYear: q.academicYear as string | undefined,
    term: q.term as string | undefined,
    dateFrom: q.dateFrom as string | undefined,
    dateTo: q.dateTo as string | undefined,
    status: q.status as string | undefined,
    categoryId: q.categoryId as string | undefined,
    departmentId: q.departmentId as string | undefined,
    requesterId: q.requesterId as string | undefined,
  };
}

export class AnalyticsController {
  async procurement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getProcurementAnalytics(
        req.organizationRef!,
        parseFilters(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async departmentSpending(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDepartmentSpending(
        req.organizationRef!,
        parseFilters(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async departmentDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDepartmentDetail(
        req.organizationRef!,
        String(req.params.departmentId),
        parseFilters(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async requesterAnalysis(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getRequesterAnalysis(
        req.organizationRef!,
        parseFilters(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async requesterProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getRequesterProfile(
        req.organizationRef!,
        String(req.params.requesterId),
        parseFilters(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
