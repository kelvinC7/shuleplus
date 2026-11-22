import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { consoleService } from '../services/console.service';
import { AppError } from '../middleware/error.middleware';
import { DEMO_TEACHING_NOW, FREE_TEACHERS, PERIODS, CURRENT_PERIOD } from '../demo/demo-data';
import { schoolData } from '../services/school-data.service';
import * as liveOps from '../services/live-operations.service';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

const coverSchema = z.object({
  classId: z.string().min(1),
  subject: z.string().min(1),
  period: z.string().min(1),
  absentTeacher: z.string().optional(),
  coverTeacher: z.string().min(1),
  organizationId: z.string().optional(),
});

/** GET /teaching-now - live lesson status board */
router.get(
  '/teaching-now',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);

    if (auth.mode === 'live') {
      const live = await liveOps.teachingNow(auth, q(req, 'organizationId'));
      const covers = await consoleService.listCovers(q(req, 'organizationId')).catch(() => []);
      return ok(
        res,
        {
          currentPeriod: live.currentPeriod,
          periods: live.periods,
          summary: live.summary,
          sessions: live.sessions,
          freeTeachers: [],
          recentCovers: covers,
        },
        { mode: 'live', source: 'timetable+attendance' }
      );
    }

    let sessions = DEMO_TEACHING_NOW;
    const orgId = q(req, 'organizationId');
    if (orgId && orgId.startsWith('demo-')) {
      // demo schools share one secondary timetable; scope applies to summary only
    }

    const status = q(req, 'status');
    const search = q(req, 'search');
    if (status) sessions = sessions.filter((s) => s.status === status);
    if (search) {
      const needle = search.toLowerCase();
      sessions = sessions.filter((s) =>
        `${s.className} ${s.subject} ${s.teacher} ${s.room}`.toLowerCase().includes(needle)
      );
    }

    const [recentCovers] = await Promise.all([
      consoleService.listCovers(orgId).catch(() => []),
    ]);

    return ok(
      res,
      {
        currentPeriod: {
          id: CURRENT_PERIOD,
          label: PERIODS.find((p) => p.id === CURRENT_PERIOD)?.label ?? 'P4',
          time: PERIODS.find((p) => p.id === CURRENT_PERIOD)?.time ?? '10:00–10:40',
        },
        periods: PERIODS,
        summary: {
          total: sessions.length,
          teaching: sessions.filter((s) => s.status === 'teaching').length,
          cover: sessions.filter((s) => s.status === 'cover').length,
          gap: sessions.filter((s) => s.status === 'gap').length,
          late: sessions.filter((s) => s.status === 'late').length,
          exam: sessions.filter((s) => s.status === 'exam').length,
        },
        sessions,
        freeTeachers: FREE_TEACHERS,
        recentCovers,
      },
      { mode: auth.mode }
    );
  })
);

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** GET /timetable - timetable rows from the Timetable module, filterable by class / teacher */
router.get(
  '/timetable',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const data = await schoolData.timetable(auth, {
      organizationId: q(req, 'organizationId'),
      academicYear: q(req, 'academicYear'),
      term: q(req, 'term'),
      className: q(req, 'className'),
      teacherId: q(req, 'teacherId'),
    });

    const present = new Set(data.entries.map((e) => e.day));
    const days = WEEK_DAYS.filter((d, i) => i < 5 || present.has(d));

    const slotMap = new Map<string, { start: string; end: string }>();
    for (const e of data.entries) {
      slotMap.set(`${e.startTime}-${e.endTime}`, { start: e.startTime, end: e.endTime });
    }
    const slots = [...slotMap.values()].sort((a, b) => a.start.localeCompare(b.start));

    const load = new Map<string, { id: string; name: string; periods: number; classes: Set<string> }>();
    for (const e of data.entries) {
      const item = load.get(e.teacherId) ?? { id: e.teacherId, name: e.teacher, periods: 0, classes: new Set<string>() };
      item.periods += 1;
      item.classes.add(e.className);
      load.set(e.teacherId, item);
    }
    const teacherLoad = [...load.values()]
      .map((t) => ({ id: t.id, name: t.name, periods: t.periods, classes: t.classes.size }))
      .sort((a, b) => b.periods - a.periods);

    return ok(
      res,
      {
        days,
        slots,
        entries: data.entries,
        filterOptions: data.filterOptions,
        teacherLoad,
        summary: {
          entries: data.entries.length,
          classes: new Set(data.entries.map((e) => e.className)).size,
          teachers: new Set(data.entries.map((e) => e.teacherId)).size,
          subjects: new Set(data.entries.map((e) => e.subject)).size,
        },
      },
      { mode: auth.mode, source: auth.mode === 'live' ? 'timetable' : 'demo' }
    );
  })
);

/** POST /teaching-now/cover - assign a substitute teacher (persisted + audited) */
router.post(
  '/teaching-now/cover',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const parsed = coverSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid cover assignment', 'VALIDATION_ERROR');
    }
    const cover = await consoleService.assignCover(auth, parsed.data);
    return ok(res, cover, { mode: auth.mode }, 201);
  })
);

export default router;
