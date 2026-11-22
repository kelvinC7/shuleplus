import { Router } from 'express';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { schoolData } from '../services/school-data.service';
import { AppError } from '../middleware/error.middleware';
import {
  DEMO_ACADEMICS,
  DEMO_ATTENDANCE,
  DEMO_SCHOOLS,
  hash,
} from '../demo/demo-data';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

/** GET /academics - academic intelligence centre */
router.get(
  '/academics',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const [academics, schools] = await Promise.all([
      schoolData.academics(auth, q(req, 'organizationId')),
      schoolData.schools(auth, { organizationId: q(req, 'organizationId') }),
    ]);

    const levels = [
      { level: 'S1', average: 66.1 }, { level: 'S2', average: 63.4 },
      { level: 'S3', average: 58.2 }, { level: 'S4', average: 65.9 },
      { level: 'S5', average: 68.0 }, { level: 'S6', average: 67.2 },
    ];
    const subjects = [
      { subject: 'Mathematics', average: 61.4, completion: 96 },
      { subject: 'English', average: 66.8, completion: 94 },
      { subject: 'Kinyarwanda', average: 71.2, completion: 98 },
      { subject: 'Physics', average: 59.6, completion: 88 },
      { subject: 'Chemistry', average: 57.9, completion: 84 },
      { subject: 'Biology', average: 64.3, completion: 92 },
      { subject: 'Geography', average: 68.1, completion: 95 },
      { subject: 'History', average: 69.0, completion: 97 },
    ];

    const watchlist = [
      {
        id: 'w1',
        initials: 'KI',
        name: 'Kalisa Innocent',
        detail: 'S3A · Average fell 14 pts since Term 2',
        severity: 'urgent',
        action: 'Intervene',
      },
      {
        id: 'w2',
        initials: 'MU',
        name: 'Mutoni Aline',
        detail: 'S3C · 6 absences in 3 weeks',
        severity: 'warning',
        action: 'Call parent',
      },
      {
        id: 'w3',
        initials: 'NB',
        name: 'Niyonzima Brian',
        detail: 'S5 PCM · Most improved: +11 pts',
        severity: 'positive',
        action: 'Commend',
      },
    ];

    const markingCompletion = schools.map((s) => ({
      organizationId: s.id,
      name: s.name,
      pct: 84 + (hash(s.id) % 14),
    }));

    return ok(
      res,
      {
        summary: academics.summary,
        bySchool: academics.bySchool,
        levels,
        subjects,
        watchlist,
        markingCompletion,
        riskDetection: {
          active: true,
          flags: [
            {
              branch: 'Kamembe Secondary',
              klass: 'S3 · Mathematics',
              subject: 'Mathematics',
              previousAverage: 61.8,
              currentAverage: 58.2,
              affectedStudents: 42,
              teacher: 'Eric Nkurunziza',
              intervention: 'Assign remedial sessions + peer tutoring',
            },
          ],
        },
      },
      { mode: auth.mode, metricsSource: academics.metricsSource }
    );
  })
);

/** GET /attendance - attendance monitoring */
router.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const [attendance, students] = await Promise.all([
      schoolData.attendance(auth, q(req, 'organizationId')),
      schoolData.students(auth, { organizationId: q(req, 'organizationId') }).catch(() => []),
    ]);

    const byClass = (() => {
      const map = new Map<string, { total: number; present: number }>();
      for (const s of students) {
        const key = s.className ?? 'Unassigned';
        const agg = map.get(key) ?? { total: 0, present: 0 };
        agg.total += 1;
        if (s.attendanceToday === 'present' || s.attendanceToday === 'late') agg.present += 1;
        map.set(key, agg);
      }
      return [...map.entries()]
        .map(([klass, agg]) => ({ klass, ...agg, rate: Math.round((agg.present / agg.total) * 1000) / 10 }))
        .sort((a, b) => b.rate - a.rate);
    })();

    const chronic = [
      { name: 'Mutoni Aline', klass: 'S3C', absences: 6, window: '3 weeks', lastContact: 'SMS sent 2 Oct' },
      { name: 'Nkusi Shema', klass: 'S2D', absences: 5, window: '3 weeks', lastContact: 'Parent called 30 Sep' },
      { name: 'Gatete Eric', klass: 'P5B', absences: 4, window: '2 weeks', lastContact: 'Pending' },
    ];

    return ok(
      res,
      {
        summary: attendance.summary,
        bySchool: attendance.bySchool,
        weeklyTrend: attendance.weeklyTrend,
        byClass,
        chronic,
        captureSources: [
          { source: 'Gate · RFID', status: 'live', eventsToday: attendance.summary.rfidEventsToday },
          { source: 'Classroom register', status: 'live', submitted: '22 of 24 classes' },
          { source: 'Bus check-in', status: 'live', busesReporting: 6 },
        ],
      },
      { mode: auth.mode, metricsSource: attendance.metricsSource }
    );
  })
);

/** GET /discipline - conduct cases */
router.get(
  '/discipline',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const cases = [
      {
        id: 'DC-1041',
        title: 'S3A · Classroom disruption',
        branch: 'Kamembe Secondary',
        category: 'Classroom conduct',
        severity: 'medium',
        status: 'In review',
        reportedAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
        owner: 'Class teacher',
      },
      {
        id: 'DC-1040',
        title: 'S2C · Phone in class',
        branch: 'Kamembe Secondary',
        category: 'Restricted items',
        severity: 'low',
        status: 'Parent called',
        reportedAt: new Date(Date.now() - 4 * 86400_000).toISOString(),
        owner: 'Discipline master',
      },
      {
        id: 'DC-1039',
        title: 'P5 · Playground incident',
        branch: 'Gashonga',
        category: 'Playground',
        severity: 'high',
        status: 'Open',
        reportedAt: new Date(Date.now() - 6 * 86400_000).toISOString(),
        owner: 'Head teacher',
      },
    ];
    const positive = { notesThisTerm: 126, topClasses: ['S4B', 'S1A', 'P6C'] };
    return ok(
      res,
      {
        summary: {
          open: cases.filter((c) => c.status !== 'Closed').length,
          resolvedThisTerm: 18,
          serious: cases.filter((c) => c.severity === 'high').length,
          positiveNotes: 126,
        },
        cases,
        positive,
      },
      { mode: auth.mode }
    );
  })
);

/** GET /academics/marks - marks by class or course (Academic module) */
router.get(
  '/academics/marks',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const data = await schoolData.marks(auth, {
      organizationId: q(req, 'organizationId'),
      academicYear: q(req, 'academicYear'),
      term: q(req, 'term'),
      className: q(req, 'className'),
      course: q(req, 'course'),
    });
    const pageSize = Math.min(200, Math.max(10, Number(req.query.pageSize) || 50));
    const pageNo = Math.max(1, Number(req.query.page) || 1);
    const start = (pageNo - 1) * pageSize;
    return ok(
      res,
      {
        ...data,
        rows: data.rows.slice(start, start + pageSize),
        pagination: {
          page: pageNo,
          pageSize,
          total: data.rows.length,
          totalPages: Math.max(1, Math.ceil(data.rows.length / pageSize)),
        },
      },
      { mode: auth.mode, source: auth.mode === 'live' ? 'academic' : 'demo' }
    );
  })
);

export default router;
