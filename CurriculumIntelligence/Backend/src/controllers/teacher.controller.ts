import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import * as treeService from '../services/curriculum-tree.service';
import * as lessonPlanService from '../services/lesson-plan.service';
import { regenerateLessonPlanSection, type RegenerateTarget } from '../services/ai.service';
import {
  assertPlanContent,
  exportFilename,
  exportLessonPlanDocx,
  exportLessonPlanPdf,
} from '../services/export.service';
import { paramString } from '../utils/params';
import { getAiStatusPublic, probeOllama } from '../services/ai-provider.service';
import { getTeacherAiPolicyPublic } from '../services/ai-policy.service';

export const teacherController = {
  async aiStatus(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = getAiStatusPublic();
      const ollamaAvailable = await probeOllama();
      res.json({
        success: true,
        data: {
          ...status,
          ollamaAvailable,
          ready:
            status.configured ||
            status.provider === 'local' ||
            (status.mode === 'auto' && ollamaAvailable && status.teacherAiEnabled),
          policy: getTeacherAiPolicyPublic(),
        },
      });
    } catch (e) {
      next(e);
    }
  },

  async catalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await treeService.listPublishedCatalog({
        subject: req.query.subject as string | undefined,
        grade: req.query.grade as string | undefined,
        language: req.query.language as string | undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async bookTree(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tree = await treeService.getBookTree(paramString(req.params.bookId), true);
      res.json({ success: true, data: tree });
    } catch (e) {
      next(e);
    }
  },

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');

      const body = z
        .object({
          curriculumLessonId: z.string().uuid(),
          durationMinutes: z.coerce.number().min(20).max(120),
          classSize: z.coerce.number().optional(),
          language: z.string().optional(),
          lessonDate: z.string().optional(),
          termLabel: z.string().optional(),
          academicYear: z.string().optional(),
          subjectLabel: z.string().optional(),
          gradeLabel: z.string().optional(),
          className: z.string().optional(),
          maleLearners: z.coerce.number().optional(),
          femaleLearners: z.coerce.number().optional(),
          specialEducationalNeeds: z.string().optional(),
          availableMaterials: z.string().optional(),
          teacherNotes: z.string().optional(),
          schoolName: z.string().optional(),
          teacherName: z.string().optional(),
          variant: z.enum(['standard', 'practical', 'simplified', 'inclusive']).optional(),
        })
        .parse(req.body);

      const u = user as { name?: string; firstName?: string; lastName?: string; email: string };
      const resolvedTeacherName =
        body.teacherName?.trim() ||
        u.name?.trim() ||
        [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
        u.email;

      const result = await lessonPlanService.generateLessonPlanDraft({
        organizationId: user.organizationId,
        teacherId: user.sub,
        teacherEmail: user.email,
        teacherName: resolvedTeacherName,
        ...body,
      });

      res.status(201).json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async listPlans(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      if (req.query.page || req.query.pageSize) {
        const page = parseInt(String(req.query.page ?? '1'), 10);
        const pageSize = parseInt(String(req.query.pageSize ?? '10'), 10);
        const data = await lessonPlanService.listTeacherLessonPlansPaginated(
          user.organizationId,
          user.sub,
          {
            page: Number.isFinite(page) ? page : 1,
            pageSize: Number.isFinite(pageSize) ? pageSize : 10,
            filters: {
              search: req.query.search as string | undefined,
              status: req.query.status as string | undefined,
              subject: req.query.subject as string | undefined,
              className: req.query.className as string | undefined,
              term: req.query.term as string | undefined,
              academicYear: req.query.academicYear as string | undefined,
              unit: req.query.unit as string | undefined,
            },
          }
        );
        return res.json({ success: true, data });
      }
      const plans = await lessonPlanService.listTeacherLessonPlans(user.organizationId, user.sub);
      res.json({ success: true, data: plans });
    } catch (e) {
      next(e);
    }
  },

  async duplicatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      const plan = await lessonPlanService.duplicateLessonPlan(
        paramString(req.params.id),
        user.organizationId,
        user.sub
      );
      res.status(201).json({ success: true, data: plan });
    } catch (e) {
      next(e);
    }
  },

  async archivePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      await lessonPlanService.archiveLessonPlan(paramString(req.params.id), user.organizationId, user.sub);
      res.json({ success: true, data: { archived: true } });
    } catch (e) {
      next(e);
    }
  },

  async deletePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      await lessonPlanService.softDeleteLessonPlan(paramString(req.params.id), user.organizationId, user.sub);
      res.json({ success: true, data: { deleted: true } });
    } catch (e) {
      next(e);
    }
  },

  async markTaught(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      const body = z.object({ taughtAt: z.string().optional() }).parse(req.body ?? {});
      const plan = await lessonPlanService.markLessonPlanTaught(
        paramString(req.params.id),
        user.organizationId,
        user.sub,
        body.taughtAt
      );
      res.json({ success: true, data: plan });
    } catch (e) {
      next(e);
    }
  },

  async performance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      const data = await lessonPlanService.getTeacherCoursePerformance(user.organizationId, user.sub, {
        academicYear: req.query.academicYear as string | undefined,
        term: req.query.term as string | undefined,
        subject: req.query.subject as string | undefined,
        className: req.query.className as string | undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      const plan = await lessonPlanService.getTeacherLessonPlan(
        paramString(req.params.id),
        user.organizationId,
        user.sub
      );
      res.json({ success: true, data: plan });
    } catch (e) {
      next(e);
    }
  },

  async regenerateSection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      const body = z
        .object({
          target: z.string().min(3),
          variant: z.string().optional(),
        })
        .parse(req.body);

      const existing = await lessonPlanService.getTeacherLessonPlan(
        paramString(req.params.id),
        user.organizationId,
        user.sub
      );

      const planContent = await regenerateLessonPlanSection({
        lessonPlanId: existing.id,
        organizationId: user.organizationId,
        teacherId: user.sub,
        target: body.target as RegenerateTarget,
        durationMinutes: existing.durationMinutes,
        variant: body.variant,
      });

      const updated = await lessonPlanService.updateLessonPlanContent({
        planId: existing.id,
        organizationId: user.organizationId,
        teacherId: user.sub,
        planContent,
        changeNote: `Regenerated ${body.target}`,
      });
      res.json({ success: true, data: updated });
    } catch (e) {
      next(e);
    }
  },

  async exportPdf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      const plan = await lessonPlanService.getTeacherLessonPlan(
        paramString(req.params.id),
        user.organizationId,
        user.sub
      );
      const content = assertPlanContent(plan.planContent);
      const title = String((content.preparation as { lessonTitle?: { value?: string } })?.lessonTitle?.value ?? 'Lesson plan');
      const buffer = await exportLessonPlanPdf(content, title);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(title, 'pdf')}"`);
      res.send(buffer);
    } catch (e) {
      next(e);
    }
  },

  async exportDocx(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      const plan = await lessonPlanService.getTeacherLessonPlan(
        paramString(req.params.id),
        user.organizationId,
        user.sub
      );
      const content = assertPlanContent(plan.planContent);
      const title = String((content.preparation as { lessonTitle?: { value?: string } })?.lessonTitle?.value ?? 'Lesson plan');
      const buffer = await exportLessonPlanDocx(content, title);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(title, 'docx')}"`);
      res.send(buffer);
    } catch (e) {
      next(e);
    }
  },

  async updatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.organizationId) throw new AppError(403, 'Organization context required');
      const body = z
        .object({
          planContent: z.record(z.unknown()),
          changeNote: z.string().optional(),
        })
        .parse(req.body);

      const updated = await lessonPlanService.updateLessonPlanContent({
        planId: paramString(req.params.id),
        organizationId: user.organizationId,
        teacherId: user.sub,
        planContent: body.planContent,
        changeNote: body.changeNote,
      });
      res.json({ success: true, data: updated });
    } catch (e) {
      next(e);
    }
  },
};
