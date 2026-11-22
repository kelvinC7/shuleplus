import { Router } from 'express';
import { asyncHandler, ok, q, param } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { schoolData } from '../services/school-data.service';
import { DEMO_FEES } from '../demo/demo-data';

const router = Router();

/** GET /branches - authorized branches with live performance */
router.get(
  '/branches',
  asyncHandler(async (req, res) => {
    const auth = resolveAuth(req);
    if (auth.mode === 'unauthorized') {
      return res.status(401).json({ success: false, message: 'Sign in through Shule+ IAM', code: 'AUTH_REQUIRED' });
    }
    const schools = await schoolData.schools(auth, {
      organizationId: q(req, 'organizationId'),
      academicYear: q(req, 'academicYear'),
      term: q(req, 'term'),
    });
    const feesBySchool = new Map(
      (DEMO_FEES.bySchool ?? []).map((f) => [f.organizationId, f])
    );

    const branches = schools.map((s) => {
      const fees = feesBySchool.get(s.id);
      const attendance = s.performance?.attendance ?? 0;
      const academic = s.performance?.academic ?? 0;
      const feesRate = s.performance?.schoolFees ?? 0;
      const status = attendance < 94 || feesRate < 65 ? 'attention' : attendance < 95.5 || feesRate < 75 ? 'review' : 'good';
      return {
        ...s,
        status,
        issues:
          status === 'attention'
            ? ['Attendance or fee collection below group threshold']
            : status === 'review'
              ? ['Monitor attendance and collections this week']
              : [],
        fees: fees ? { collected: fees.collected, outstanding: fees.outstanding, rate: fees.rate } : null,
      };
    });

    return ok(
      res,
      {
        branches,
        comparison: {
          students: branches.reduce((a, b) => a + b.students, 0),
          staff: branches.reduce((a, b) => a + b.staff, 0),
          averageAttendance:
            Math.round((branches.reduce((a, b) => a + (b.performance?.attendance ?? 0), 0) / (branches.length || 1)) * 10) / 10,
          averageFees:
            Math.round((branches.reduce((a, b) => a + (b.performance?.schoolFees ?? 0), 0) / (branches.length || 1)) * 10) / 10,
          averageAcademic:
            Math.round((branches.reduce((a, b) => a + (b.performance?.academic ?? 0), 0) / (branches.length || 1)) * 10) / 10,
        },
      },
      { mode: auth.mode, generatedAt: new Date().toISOString() }
    );
  })
);

/** GET /branches/:id - branch detail */
router.get(
  '/branches/:id',
  asyncHandler(async (req, res) => {
    const auth = resolveAuth(req);
    if (auth.mode === 'unauthorized') {
      return res.status(401).json({ success: false, message: 'Sign in through Shule+ IAM', code: 'AUTH_REQUIRED' });
    }
    const id = param(req, 'id');
    const schools = await schoolData.schools(auth, {});
    const branch = schools.find((s) => s.id === id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not assigned to this representative', code: 'NOT_FOUND' });
    }
    const [attendance, academics, payroll] = await Promise.all([
      schoolData.attendance(auth, id).catch(() => null),
      schoolData.academics(auth, id).catch(() => null),
      schoolData.financePayroll(auth, id).catch(() => null),
    ]);
    return ok(
      res,
      {
        branch,
        attendance,
        academics,
        finance: payroll,
      },
      { mode: auth.mode, generatedAt: new Date().toISOString() }
    );
  })
);

export default router;
