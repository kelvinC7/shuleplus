import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { examinationListService } from '../services/examination-list.service';

function org(req: AuthenticatedRequest) {
  return req.organizationRef || req.user?.organizationId || '';
}

export class ExaminationListController {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.dashboard(org(req), {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        examinationTypeId: typeof req.query.examinationTypeId === 'string' ? req.query.examinationTypeId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async context(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.context(org(req), {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        examinationTimetableId: typeof req.query.examinationTimetableId === 'string' ? req.query.examinationTimetableId : undefined,
        examinationTypeId: typeof req.query.examinationTypeId === 'string' ? req.query.examinationTypeId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.list(org(req), {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        examinationTimetableId: typeof req.query.examinationTimetableId === 'string' ? req.query.examinationTimetableId : undefined,
        examinationTypeId: typeof req.query.examinationTypeId === 'string' ? req.query.examinationTypeId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.getById(String(req.params.id), org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async impact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.impact(String(req.params.id), org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async publish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.publish(String(req.params.id), org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async unpublish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.unpublish(String(req.params.id), org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.generate(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const confirmImpact = String(req.query.confirmImpact || req.body?.confirmImpact || '') === 'true';
      const data = await examinationListService.remove(String(req.params.id), org(req), { confirmImpact });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async moveStudent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.moveStudent(String(req.params.id), org(req), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async addStudent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.addStudentToRoom(String(req.params.id), org(req), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async addStudents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.addStudentsToRoom(String(req.params.id), org(req), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async addManualRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.addManualRoom(String(req.params.id), org(req), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async updateRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.updateRoom(String(req.params.id), org(req), String(req.params.roomId), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async removeAllocation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.removeAllocation(String(req.params.id), org(req), String(req.params.allocationId));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async availableStudents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.availableStudents(String(req.params.id), org(req), typeof req.query.q === 'string' ? req.query.q : undefined, { fresh: req.query.fresh === '1' });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async searchStudents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.searchStudents(String(req.params.id), org(req), typeof req.query.q === 'string' ? req.query.q : undefined, { fresh: req.query.fresh === '1' });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async publicRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await examinationListService.getPublicRoom(String(req.params.id), String(req.params.roomId));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
}

export const examinationListController = new ExaminationListController();
