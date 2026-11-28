import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { examinationInvigilatorService } from '../services/examination-invigilator.service';

function org(req: AuthenticatedRequest) {
  return req.organizationRef || req.user?.organizationId || '';
}

export class ExaminationInvigilatorController {
  async context(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationInvigilatorService.context(org(req), {
        examinationListId: typeof req.query.examinationListId === 'string' ? req.query.examinationListId : undefined,
        examinationTypeId: typeof req.query.examinationTypeId === 'string' ? req.query.examinationTypeId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const examinationListId = String(req.query.examinationListId || '');
      if (!examinationListId) throw Object.assign(new Error('examinationListId is required'), { statusCode: 400 });
      const data = await examinationInvigilatorService.dashboard(org(req), examinationListId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationInvigilatorService.generate(org(req), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const examinationListId = String(req.query.examinationListId || '');
      const data = await examinationInvigilatorService.listAssignments(org(req), examinationListId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationInvigilatorService.updateAssignment(org(req), String(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationInvigilatorService.deleteAssignment(org(req), String(req.params.id));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async availableTeachers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationInvigilatorService.availableTeachersForSlot(org(req), {
        examinationListId: String(req.query.examinationListId || ''),
        examDate: String(req.query.examDate || ''),
        session: String(req.query.session || '') as 'MORNING' | 'AFTERNOON',
        sessionCode: typeof req.query.sessionCode === 'string' ? req.query.sessionCode : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async add(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationInvigilatorService.addAssignment(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  }

  async getAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationInvigilatorService.getExamAttendance(org(req), {
        examinationListId: String(req.query.examinationListId || ''),
        roomId: String(req.query.roomId || ''),
        examDate: String(req.query.examDate || ''),
        session: String(req.query.session || '') as any,
        sessionCode: typeof req.query.sessionCode === 'string' ? req.query.sessionCode : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async listAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationInvigilatorService.listExamAttendance(org(req), req.query);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async markAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actor = { id: (req as any).user?.id || (req as any).user?.userId, name: (req as any).user?.name || (req as any).user?.email };
      const data = await examinationInvigilatorService.markExamAttendance(org(req), actor, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async clear(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationInvigilatorService.clearAssignments(org(req), {
        examinationListId: typeof req.query.examinationListId === 'string' ? req.query.examinationListId : undefined,
        examinationTypeId: typeof req.query.examinationTypeId === 'string' ? req.query.examinationTypeId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async teacherAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teacherUserId = String(req.query.teacherUserId || req.user?.sub || '');
      const data = await examinationInvigilatorService.teacherAssignments(org(req), teacherUserId, {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        examinationListId: typeof req.query.examinationListId === 'string' ? req.query.examinationListId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
}

export const examinationInvigilatorController = new ExaminationInvigilatorController();
