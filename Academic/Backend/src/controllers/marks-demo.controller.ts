import { Request, Response, NextFunction } from 'express';
import { marksDemoService, type MarksDemoPhase } from '../services/marks-demo.service';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';

function orgIdOf(req: Request) {
  const r = req as AuthenticatedRequest;
  return r.organizationRef || r.user?.organizationId || (req as AuthenticatedRequest & { organizationId?: string }).organizationId;
}

function assertDemoEnabled() {
  if (env.ENABLE_MARKS_DEMO !== 'true') {
    throw new Error('Marks demo is disabled. Set ENABLE_MARKS_DEMO=true on the Academic backend.');
  }
}

export class MarksDemoController {
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      assertDemoEnabled();
      const orgId = orgIdOf(req);
      if (!orgId) throw new Error('Organization context required');
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
      const data = await marksDemoService.status(orgId, classId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async apply(req: Request, res: Response, next: NextFunction) {
    try {
      assertDemoEnabled();
      const orgId = orgIdOf(req);
      if (!orgId) throw new Error('Organization context required');
      const body = req.body as {
        classId?: string;
        className?: string;
        stream?: string;
        academicYear?: string;
        term?: string;
        phase?: MarksDemoPhase;
      };
      const data = await marksDemoService.apply({
        organizationId: orgId,
        classId: body.classId,
        className: body.className,
        stream: body.stream,
        academicYear: body.academicYear ?? '',
        term: body.term ?? '',
        phase: body.phase ?? 'quiz',
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      assertDemoEnabled();
      const orgId = orgIdOf(req);
      if (!orgId) throw new Error('Organization context required');
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
      const data = await marksDemoService.remove(orgId, classId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const marksDemoController = new MarksDemoController();
