import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';
import {
  getReportCardComments,
  getReportCardSettings,
  upsertReportCardComments,
  verifyReportCard,
} from '../services/report-card.service';
import { reportCardPublicationService } from '../services/report-card-publication.service';
import { nurseryService } from '../services/nursery.service';
import { normalizeReportKind, type ReportKind } from '../utils/report-kind';

function orgIdOf(req: Request) {
  const r = req as AuthenticatedRequest;
  return r.organizationRef || r.user?.organizationId || '';
}

export class ReportCardController {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const data = await getReportCardSettings(orgId!);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getComments(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const { studentId, classId, academicYear, term } = req.query as Record<string, string>;
      if (!studentId || !classId || !academicYear) {
        res.status(400).json({ message: 'studentId, classId, academicYear required' });
        return;
      }
      const data = await getReportCardComments(orgId!, {
        studentId,
        classId,
        academicYear,
        term: term?.trim() || 'All',
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async upsertComments(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const r = req as AuthenticatedRequest;
      const body = req.body as {
        studentId: string;
        classId: string;
        academicYear: string;
        term?: string;
        classTeacherComment?: string | null;
        headTeacherComment?: string | null;
        role?: 'class' | 'head' | 'both';
      };
      if (!body.studentId || !body.classId || !body.academicYear) {
        res.status(400).json({ message: 'studentId, classId, academicYear required' });
        return;
      }
      const role = body.role || 'class';
      const data = await upsertReportCardComments(
        orgId!,
        r.user?.sub,
        {
          studentId: body.studentId,
          classId: body.classId,
          academicYear: body.academicYear,
          term: body.term?.trim() || 'All',
          classTeacherComment: body.classTeacherComment,
          headTeacherComment: body.headTeacherComment,
        },
        {
          allowClass: role === 'class' || role === 'both',
          allowHead: role === 'head' || role === 'both',
        }
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listPublications(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req)!;
      const q = req.query as Record<string, string>;
      const data = await reportCardPublicationService.list(orgId, {
        academicYear: q.academicYear,
        term: q.term,
        classId: q.classId,
        className: q.className,
        search: q.search,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listPublicationBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req)!;
      const q = req.query as Record<string, string>;
      const data = await reportCardPublicationService.listBatches(orgId, {
        academicYear: q.academicYear,
        term: q.term,
        classId: q.classId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async publishOne(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req)!;
      const r = req as AuthenticatedRequest;
      const body = req.body as {
        studentId: string;
        classId: string;
        academicYear: string;
        term: string;
        reportKind?: ReportKind;
        accessPolicy?: 'PAID_ONLY' | 'ALL_PARENTS';
        notifyInApp?: boolean;
        notifyPush?: boolean;
        includeReportLink?: boolean;
        publicationType?: string;
      };
      const data = await reportCardPublicationService.publishOne(orgId, {
        ...body,
        reportKind: normalizeReportKind(body.reportKind),
        accessPolicy: body.accessPolicy,
        notifyInApp: body.notifyInApp,
        notifyPush: body.notifyPush,
        includeReportLink: body.includeReportLink,
        publishedBy: r.user?.sub ?? null,
        publishedByName: r.user?.email ?? null,
        actorRoles: r.user?.roles ?? [],
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async publishClass(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req)!;
      const r = req as AuthenticatedRequest;
      const body = req.body as {
        classId: string;
        academicYear: string;
        term: string;
        reportKind?: ReportKind;
        studentIds?: string[];
        selectedStudentIds?: string[];
        accessPolicy?: 'PAID_ONLY' | 'ALL_PARENTS';
        notifyInApp?: boolean;
        notifyPush?: boolean;
        includeReportLink?: boolean;
        publicationType?: string;
      };
      const data = await reportCardPublicationService.publishClass(orgId, {
        ...body,
        reportKind: normalizeReportKind(body.reportKind),
        accessPolicy: body.accessPolicy,
        studentIds: Array.isArray(body.studentIds) ? body.studentIds : undefined,
        selectedStudentIds: Array.isArray(body.selectedStudentIds) ? body.selectedStudentIds : undefined,
        notifyInApp: body.notifyInApp,
        notifyPush: body.notifyPush,
        includeReportLink: body.includeReportLink,
        publicationType: body.publicationType,
        publishedBy: r.user?.sub ?? null,
        publishedByName: r.user?.email ?? null,
        actorRoles: r.user?.roles ?? [],
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async verifyPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const ref = String(req.query.ref || req.params.ref || '');
      const org = typeof req.query.org === 'string' ? req.query.org : undefined;

      const accept = req.headers.accept ?? '';
      const wantsHtml =
        typeof accept === 'string' &&
        accept.includes('text/html') &&
        !accept.includes('application/json');
      if (wantsHtml && ref.trim()) {
        const fe = env.ACADEMIC_PUBLIC_FRONTEND_URL.replace(/\/$/, '');
        const q = new URLSearchParams({ ref: ref.trim() });
        if (org) q.set('org', org);
        res.redirect(302, `${fe}/verify/report?${q.toString()}`);
        return;
      }

      const data = /^NRC-/i.test(ref.trim())
        ? await nurseryService.verifyPublic(ref)
        : await verifyReportCard(ref, org);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const reportCardController = new ReportCardController();
