import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { parentTransportService } from '../services/parent-transport.service';
import { getRequestedStudent } from '../utils/student-param';

export class ParentTransportController {
  async portal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await parentTransportService.portal(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async changeRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await parentTransportService.listChangeRequests(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async submitChangeRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await parentTransportService.submitChangeRequest(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req),
        req.body ?? {}
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async notifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const scopeAll = req.query.scope === 'all';
      const data = await parentTransportService.listTransportNotifications(
        req.organizationRef!,
        req.user!.sub,
        scopeAll ? undefined : getRequestedStudent(req),
        scopeAll
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async markAllTransportNotificationsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await parentTransportService.markAllTransportNotificationsRead(req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async submitIssue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await parentTransportService.submitIssueReport(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req),
        req.body ?? {}
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async issueReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await parentTransportService.listIssueReports(
        req.organizationRef!,
        req.user!.sub,
        getRequestedStudent(req)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const parentTransportController = new ParentTransportController();
