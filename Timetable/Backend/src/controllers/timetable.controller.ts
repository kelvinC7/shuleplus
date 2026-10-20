import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { assignmentService } from '../services/assignment.service';
import { scheduleService } from '../services/schedule.service';
import { teacherProfileService } from '../services/teacher-profile.service';
import { teacherAccountService } from '../services/teacher-account.service';
import { courseConfigService } from '../services/course-config.service';
import { timetableService } from '../services/timetable.service';
import { generatorService } from '../services/generator.service';
import { conflictService } from '../services/conflict.service';
import { extraActivityService } from '../services/extra-activity.service';
import { seedService } from '../services/seed.service';
import { dashboardService } from '../services/dashboard.service';
import { confirmClassTimetable } from '../services/timetable-publish.service';
import { classConfigService } from '../services/class-config.service';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef;
  if (!id) throw new AppError(401, 'Authentication required');
  return id;
}

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

const courseConfigBodySchema = z.object({
  subjectName: z.string().min(1).optional(),
  newSubjectName: z.string().optional(),
  courseCode: z.string().nullable().optional(),
  codeMode: z.enum(['AUTOMATIC', 'MANUAL']).optional(),
  color: z.string().nullable().optional(),
  priority: z.coerce.number().optional(),
  periodsPerWeek: z.coerce.number().optional(),
  requiresLab: z.boolean().optional(),
  prefersDoublePeriod: z.boolean().optional(),
  timePreference: z.enum(['ANY', 'MORNING', 'AFTERNOON', 'CUSTOM']).optional(),
  customWindowStart: z.string().nullable().optional(),
  customWindowEnd: z.string().nullable().optional(),
  schedulingRules: z.any().optional(),
  isCore: z.boolean().optional(),
});

const courseConfigCreateSchema = courseConfigBodySchema.extend({
  subjectName: z.string().min(1),
});

const assignmentSchema = z.object({
  teacherUserId: z.string(),
  teacherName: z.string(),
  className: z.string(),
  subjectName: z.string(),
  periodsPerWeek: z.number().int().min(1),
  defaultCourseMarks: z.number().min(1).max(1000).optional().nullable(),
  room: z.string().optional(),
  schedulingOverrides: z.record(z.unknown()).optional(),
  term: z.string(),
  academicYear: z.string(),
});

export class TimetableController {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.summary(orgId(req), {
        term: req.query.term as string | undefined,
        academicYear: (req.query.academic_year as string | undefined) || (req.query.academicYear as string | undefined),
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async dashboardOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = req.query.term as string | undefined;
      const academicYear = req.query.academic_year as string | undefined;
      const date = req.query.date as string | undefined;
      const data = await dashboardService.overview(orgId(req), { term, academicYear, date });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listTimetable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await timetableService.list(orgId(req), {
        term: req.query.term as string | undefined,
        academicYear: req.query.academic_year as string | undefined,
        className: req.query.class as string | undefined,
        teacherUserId: req.query.teacher as string | undefined,
        dayOfWeek: req.query.day as string | undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createTimetable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          className: z.string(),
          subjectName: z.string(),
          teacherUserId: z.string(),
          teacherName: z.string(),
          dayOfWeek: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          room: z.string().nullish(),
          term: z.string(),
          academicYear: z.string(),
        })
        .parse(req.body);
      const data = await timetableService.create(orgId(req), body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateTimetable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await timetableService.update(orgId(req), paramId(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async swapTimetable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({ sourceId: z.string(), targetId: z.string() }).parse(req.body);
      const data = await timetableService.swap(orgId(req), body.sourceId, body.targetId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteTimetable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await timetableService.remove(orgId(req), paramId(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async todayTimetable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await timetableService.todaySummary(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = (req.query.term as string) ?? 'Term 1';
      const academicYear = (req.query.academic_year as string) ?? String(new Date().getFullYear());
      const data = await scheduleService.get(orgId(req), term, academicYear);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          term: z.string(),
          academicYear: z.string(),
          dayStart: z.string().optional(),
          dayEnd: z.string().optional(),
          periodDurationMinutes: z.number().optional(),
          periodCount: z.number().int().min(1).max(16).optional(),
          transitionMinutes: z.number().int().min(0).max(30).optional(),
          durationMode: z.enum(['UNIFORM', 'CUSTOM']).optional(),
          periodSlots: z
            .array(
              z.object({
                id: z.string(),
                name: z.string(),
                startTime: z.string(),
                endTime: z.string(),
                durationMinutes: z.number(),
                slotType: z.string(),
                isBreak: z.boolean(),
              })
            )
            .optional(),
          activeDays: z.array(z.string()).optional(),
          breaks: z.array(z.record(z.unknown())).optional(),
        })
        .parse(req.body);
      const data = await scheduleService.upsert(orgId(req), body.term, body.academicYear, {
        dayStart: body.dayStart,
        dayEnd: body.dayEnd,
        periodDurationMinutes: body.periodDurationMinutes,
        periodCount: body.periodCount,
        transitionMinutes: body.transitionMinutes,
        durationMode: body.durationMode,
        periodSlots: body.periodSlots as Parameters<typeof scheduleService.upsert>[3]['periodSlots'],
        activeDays: body.activeDays,
        breaks: body.breaks as Parameters<typeof scheduleService.upsert>[3]['breaks'],
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listTeacherProfiles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profiles = await teacherProfileService.list(orgId(req));
      const data = await teacherAccountService.enrichProfiles(orgId(req), profiles);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async upsertTeacherProfiles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          profiles: z.array(
            z.object({
              teacherUserId: z.string(),
              teacherName: z.string(),
              maxPeriodsPerDay: z.number().optional(),
              availableDays: z.array(z.string()).optional(),
              preferredSlots: z.array(z.unknown()).optional(),
              unavailableSlots: z.array(z.unknown()).optional(),
            })
          ),
        })
        .parse(req.body);
      const data = await teacherProfileService.bulkUpsert(
        orgId(req),
        body.profiles as Parameters<typeof teacherProfileService.bulkUpsert>[1]
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listCourseConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await courseConfigService.list(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createCourseConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = courseConfigCreateSchema.parse(req.body);
      const data = await courseConfigService.create(orgId(req), body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateCourseConfigById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = decodeURIComponent(paramId(req.params.id));
      const body = courseConfigBodySchema.parse(req.body);

      const org = orgId(req);
      const existing = await courseConfigService.getById(org, id);
      const nextName = body.newSubjectName?.trim() || body.subjectName?.trim() || existing.subjectName;
      const { newSubjectName: _n, subjectName: _s, ...data } = body;
      const renamed =
        nextName !== existing.subjectName
          ? await courseConfigService.rename(org, existing.subjectName, nextName, { ...data, id })
          : await courseConfigService.updateById(org, id, { ...data, subjectName: nextName, id });

      res.json({ success: true, data: renamed });
    } catch (e) {
      next(e);
    }
  }

  async deleteCourseConfigById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = decodeURIComponent(paramId(req.params.id));
      const data = await courseConfigService.removeCompleteById(orgId(req), id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async upsertCourseConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const subjectName = decodeURIComponent(paramId(req.params.subjectName));
      const body = courseConfigBodySchema
        .extend({ id: z.string().uuid().optional() })
        .parse(req.body);

      const { newSubjectName, ...data } = body;
      const renamed =
        newSubjectName && newSubjectName.trim() !== subjectName
          ? await courseConfigService.rename(orgId(req), subjectName, newSubjectName.trim(), data)
          : await courseConfigService.upsert(orgId(req), subjectName, data);

      res.json({ success: true, data: renamed });
    } catch (e) {
      next(e);
    }
  }

  async deleteCourseConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const subjectName = decodeURIComponent(paramId(req.params.subjectName));
      const data = await courseConfigService.removeComplete(orgId(req), subjectName);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteTeacherProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teacherUserId = decodeURIComponent(paramId(req.params.teacherUserId));
      const data = await teacherProfileService.remove(orgId(req), teacherUserId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assignmentService.list(orgId(req), {
        term: req.query.term as string | undefined,
        academicYear: req.query.academic_year as string | undefined,
        className: req.query.class as string | undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async assignmentsOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = (req.query.term as string) ?? 'Term 1';
      const academicYear = (req.query.academic_year as string) ?? String(new Date().getFullYear());
      const data = await assignmentService.overview(orgId(req), term, academicYear);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = assignmentSchema.parse(req.body);
      const data = await assignmentService.create(orgId(req), body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async bulkAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({ rows: z.array(assignmentSchema) }).parse(req.body);
      const data = await assignmentService.bulkCreate(orgId(req), body.rows);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = assignmentSchema.partial().parse(req.body);
      const data = await assignmentService.update(orgId(req), paramId(req.params.id), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async archiveAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assignmentService.archive(orgId(req), paramId(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assignmentService.remove(orgId(req), paramId(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async workload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = (req.query.term as string) ?? 'Term 1';
      const academicYear = (req.query.academic_year as string) ?? String(new Date().getFullYear());
      const data = await generatorService.workload(orgId(req), term, academicYear);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async classCoverage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = (req.query.term as string) ?? 'Term 1';
      const academicYear = (req.query.academic_year as string) ?? String(new Date().getFullYear());
      const data = await generatorService.classCoverage(
        orgId(req),
        term,
        academicYear,
        req.query.class as string | undefined
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          classes: z.array(z.string()).min(1),
          term: z.string(),
          academicYear: z.string(),
        })
        .parse(req.body);
      const data = await generatorService.generate(orgId(req), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async apply(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          classes: z.array(z.string()).min(1),
          term: z.string(),
          academicYear: z.string(),
          placements: z.array(z.unknown()).optional(),
        })
        .parse(req.body);
      const data = await generatorService.apply(orgId(req), {
        ...body,
        placements: body.placements as never,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async regenerate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          classes: z.array(z.string()).min(1),
          term: z.string(),
          academicYear: z.string(),
        })
        .parse(req.body);
      const data = await generatorService.regenerate(orgId(req), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async autoComplete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          classes: z.array(z.string()).min(1),
          term: z.string(),
          academicYear: z.string(),
        })
        .parse(req.body);
      const data = await generatorService.autoComplete(orgId(req), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async fillGaps(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          classes: z.array(z.string()).min(1),
          term: z.string(),
          academicYear: z.string(),
        })
        .parse(req.body);
      const data = await generatorService.fillGaps(orgId(req), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async clearTimetables(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          term: z.string(),
          academicYear: z.string(),
          classes: z.array(z.string()).optional(),
        })
        .parse(req.body);
      const data = await timetableService.clear(orgId(req), body.term, body.academicYear, body.classes);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async confirmClassTimetable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          className: z.string().min(1),
          term: z.string(),
          academicYear: z.string(),
        })
        .parse(req.body);
      const userId = req.user?.sub ?? null;
      const data = await confirmClassTimetable(orgId(req), {
        ...body,
        confirmedByUserId: userId,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async conflictCenter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = (req.query.term as string) ?? 'Term 1';
      const academicYear = (req.query.academic_year as string) ?? String(new Date().getFullYear());
      const data = await conflictService.scan(orgId(req), term, academicYear);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async autoFix(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({ term: z.string(), academicYear: z.string() }).parse(req.body);
      const data = await conflictService.autoFix(orgId(req), body.term, body.academicYear);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async checkConflicts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          className: z.string(),
          subjectName: z.string(),
          teacherUserId: z.string(),
          teacherName: z.string(),
          dayOfWeek: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          term: z.string(),
          academicYear: z.string(),
          excludeId: z.string().optional(),
        })
        .parse(req.body);
      const { excludeId, ...row } = body;
      const data = await conflictService.checkRowConflicts(orgId(req), row, excludeId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async suggestPlacementSlots(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          className: z.string(),
          subjectName: z.string(),
          teacherUserId: z.string(),
          teacherName: z.string(),
          term: z.string(),
          academicYear: z.string(),
          room: z.string().nullish(),
          dayOfWeek: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          limit: z.number().int().min(1).max(24).optional(),
        })
        .parse(req.body);
      const data = await conflictService.suggestFreeSlots(orgId(req), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listExtraActivities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = (req.query.term as string) ?? 'Term 1';
      const academicYear = (req.query.academic_year as string) ?? String(new Date().getFullYear());
      const data = await extraActivityService.list(orgId(req), term, academicYear);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async validateExtraActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await extraActivityService.validate(orgId(req), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async validateExtraActivityBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await extraActivityService.validateBatch(orgId(req), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createExtraActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as { days?: string[]; classNames?: string[] | null };
      if (Array.isArray(body.days) && body.days.length) {
        const data = await extraActivityService.createBatch(orgId(req), req.body);
        res.status(201).json({ success: true, data });
        return;
      }
      const data = await extraActivityService.create(orgId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateExtraActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await extraActivityService.update(orgId(req), paramId(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteExtraActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await extraActivityService.remove(orgId(req), paramId(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async syncExtraActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await extraActivityService.syncToTimetable(orgId(req), paramId(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async seedDemo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await seedService.seedDemo(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listClassConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = (req.query.term as string) ?? 'Term 1';
      const academicYear = (req.query.academic_year as string) ?? String(new Date().getFullYear());
      const data = await classConfigService.list(orgId(req), term, academicYear, {
        section: req.query.section as string | undefined,
        level: req.query.level as string | undefined,
        stream: req.query.stream as string | undefined,
        status: req.query.status as 'ready' | 'incomplete' | 'missing' | undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getClassConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const className = decodeURIComponent(paramId(req.params.className));
      const term = (req.query.term as string) ?? 'Term 1';
      const academicYear = (req.query.academic_year as string) ?? String(new Date().getFullYear());
      const data = await classConfigService.detail(orgId(req), className, term, academicYear);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async copyClassConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          fromClass: z.string(),
          toClasses: z.array(z.string()).min(1),
          term: z.string(),
          academicYear: z.string(),
        })
        .parse(req.body);
      const data = await classConfigService.copyConfiguration(
        orgId(req),
        body.fromClass,
        body.toClasses,
        body.term,
        body.academicYear
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async classConfigTeachers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const term = (req.query.term as string) ?? 'Term 1';
      const academicYear = (req.query.academic_year as string) ?? String(new Date().getFullYear());
      const subjectName =
        typeof req.query.subject === 'string' ? req.query.subject : undefined;
      const data = await classConfigService.teacherOptions(orgId(req), term, academicYear, subjectName);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const timetableController = new TimetableController();
