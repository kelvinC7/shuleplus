import { Request, Response, NextFunction } from 'express';
import { parentTransportService } from '../services/parent-transport.service';

function orgFromService(req: Request): string {
  const q = req.query.organizationId;
  const h = req.headers['x-organization-id'];
  const id = (typeof q === 'string' && q) || (typeof h === 'string' && h) || '';
  return id;
}

export class ParentTransportServiceController {
  async changeRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = orgFromService(req);
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await parentTransportService.listOrgChangeRequests(organizationId, status);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async respondChangeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = orgFromService(req);
      const data = await parentTransportService.respondChangeRequest(
        organizationId,
        String(req.params.id),
        req.body ?? {}
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async issueReports(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = orgFromService(req);
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await parentTransportService.listOrgIssueReports(organizationId, status);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateIssueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = orgFromService(req);
      const data = await parentTransportService.updateIssueReport(
        organizationId,
        String(req.params.id),
        req.body ?? {}
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const parentTransportServiceController = new ParentTransportServiceController();
