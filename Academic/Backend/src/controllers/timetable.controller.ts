import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { fetchTimetableClassCatalog, fetchTimetableCourseCatalog } from '../clients/timetable.client';

export class TimetableProxyController {
  async classCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef || req.user?.organizationId;
      if (!organizationId) {
        res.status(401).json({ message: 'Missing organization context' });
        return;
      }
      const data = await fetchTimetableClassCatalog(organizationId, {
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async courseCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationRef || req.user?.organizationId;
      if (!organizationId) {
        res.status(401).json({ message: 'Missing organization context' });
        return;
      }
      const data = await fetchTimetableCourseCatalog(organizationId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const timetableProxyController = new TimetableProxyController();
