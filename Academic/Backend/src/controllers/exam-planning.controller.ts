import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { examPlanningService } from '../services/exam-planning.service';
import { examInvigilatorDeskService } from '../services/exam-invigilator-desk.service';

function org(req: AuthenticatedRequest) {
  return req.organizationRef || req.user?.organizationId || '';
}

export class ExamPlanningController {
  async catalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.catalog(org(req), {
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.dashboard(org(req), {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.listSessions(org(req), {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.createSession(org(req), req.user?.sub, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  }

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.getSession(req.params.id as string, org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async setup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.saveSetup(req.params.id as string, org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.generateTimetable(req.params.id as string, org(req), req.user?.sub);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async seating(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.generateSeating(req.params.id as string, org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async moveSeat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.moveSeat(req.params.id as string, org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async invigilators(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.generateInvigilators(req.params.id as string, org(req), req.user?.sub);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async setRoomInvigilators(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.setRoomInvigilators(req.params.id as string, org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async resolveAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.resolveAllConflicts(req.params.id as string, org(req), req.user?.sub);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async overrideInvigilator(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.overrideInvigilator(req.params.id as string, org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async move(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.moveSchedule(req.params.id as string, org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async publish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.publish(req.params.id as string, org(req), req.user?.sub);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async status(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.updateStatus(req.params.id as string, org(req), req.body.status, req.user?.sub);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async live(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.liveBoard(req.params.id as string, org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async reports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.reports(req.params.id as string, org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async start(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.startExam(req.params.scheduleId as string, org(req), req.user?.sub);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async checkIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.checkIn(org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.submit(org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async directory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.directory(req.params.id as string, org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async checkInInvigilator(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.checkInInvigilator(req.params.id as string, org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async replaceInvigilator(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.replaceInvigilator(req.params.id as string, org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async reschedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.reschedule(req.params.id as string, org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async exit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.markExit(org(req), req.user?.sub, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async resolve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.resolveConflict(req.params.id as string, req.params.conflictId as string, org(req), req.user?.sub);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examPlanningService.deleteSession(req.params.id as string, org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async listStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examInvigilatorDeskService.listStaff(org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async addStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examInvigilatorDeskService.addStaff(org(req), req.user?.sub, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  }

  async orgUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examInvigilatorDeskService.listOrgUsers(org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async myDesk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examInvigilatorDeskService.myDesk(org(req), {
        sub: req.user?.sub || '',
        email: req.user?.email,
        roles: req.user?.roles,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async roomRoster(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examInvigilatorDeskService.roomRoster(org(req), {
        sub: req.user?.sub || '',
        email: req.user?.email,
        roles: req.user?.roles,
      }, {
        sessionId: typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined,
        roomName: typeof req.query.roomName === 'string' ? req.query.roomName : String(req.params.roomName || ''),
        examDate: typeof req.query.examDate === 'string' ? req.query.examDate : undefined,
        slotCode: typeof req.query.slotCode === 'string' ? req.query.slotCode : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async deskEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examInvigilatorDeskService.markEntry(org(req), {
        sub: req.user?.sub || '',
        email: req.user?.email,
        roles: req.user?.roles,
      }, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async deskLists(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examInvigilatorDeskService.allocatedLists(org(req), {
        sub: req.user?.sub || '',
        email: req.user?.email,
        roles: req.user?.roles,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async deskEligibility(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examInvigilatorDeskService.checkCardEligibility(org(req), {
        sub: req.user?.sub || '',
        email: req.user?.email,
        roles: req.user?.roles,
      }, {
        studentCode: req.body.studentCode ? String(req.body.studentCode) : undefined,
        academicYear: req.body.academicYear ? String(req.body.academicYear) : undefined,
        term: req.body.term ? String(req.body.term) : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async deskExit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examInvigilatorDeskService.markExit(org(req), {
        sub: req.user?.sub || '',
        email: req.user?.email,
        roles: req.user?.roles,
      }, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
}

export const examPlanningController = new ExamPlanningController();
