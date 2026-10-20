import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { rollCallService } from '../services/roll-call.service';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

const createSchema = z.object({
  name: z.string().min(2),
  classId: z.string(),
  className: z.string(),
  classLabel: z.string().optional(),
  sessionDate: z.string(),
  startTime: z.string().optional(),
  attendanceType: z.string().optional(),
  academicYear: z.string().optional(),
  term: z.string().optional(),
  repeatRule: z.string().optional(),
  sessionNotes: z.string().optional(),
});

export const rollCallController = {
  async academicContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.academicContext(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async classes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.listClasses(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async templates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.listTemplates(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async saveTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          name: z.string(),
          defaultTime: z.string().optional(),
          attendanceType: z.string().optional(),
          sortOrder: z.number().optional(),
        })
        .parse(req.body);
      const data = await rollCallService.saveTemplate(orgId(req), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.dashboard(orgId(req), req.user!.sub, {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const data = await rollCallService.listSessions(orgId(req), req.user!.sub, {
        className: typeof q.className === 'string' ? q.className : undefined,
        attendanceType: typeof q.attendanceType === 'string' ? q.attendanceType : undefined,
        status: typeof q.status === 'string' ? q.status : undefined,
        from: typeof q.from === 'string' ? q.from : undefined,
        to: typeof q.to === 'string' ? q.to : undefined,
        search: typeof q.search === 'string' ? q.search : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.getSession(
        orgId(req),
        String(req.params.sessionId),
        req.user!.sub
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const user = req.user!;
      const data = await rollCallService.createSession(orgId(req), user.sub, user.email?.split('@')[0] ?? 'Teacher', body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async saveDraft(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.saveDraft(
        orgId(req),
        String(req.params.sessionId),
        req.user!.sub,
        req.body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.complete(
        orgId(req),
        String(req.params.sessionId),
        req.user!.sub,
        {
          allowIncomplete: Boolean(req.body.allowIncomplete),
          rows: req.body.rows,
        }
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
