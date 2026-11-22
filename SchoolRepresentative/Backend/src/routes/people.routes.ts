import { Router } from 'express';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { schoolData } from '../services/school-data.service';
import { AppError } from '../middleware/error.middleware';
import { DEMO_STUDENTS } from '../demo/demo-data';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

/** GET /students - directory (server-filtered) */
router.get(
  '/students',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const allRows = await schoolData.students(auth, { organizationId: q(req, 'organizationId') });
    const rows = schoolData.filterStudents(allRows, {
      search: q(req, 'search'),
      className: q(req, 'className'),
      academicYear: q(req, 'academicYear'),
      gender: q(req, 'gender'),
      status: q(req, 'status'),
    });

    const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 25));
    const pageNo = Math.max(1, Number(req.query.page) || 1);
    const start = (pageNo - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);

    const classes = [...new Set(allRows.map((r) => r.className).filter(Boolean))].sort() as string[];
    const academicYears = [...new Set(allRows.map((r) => r.academicYear).filter(Boolean))]
      .sort()
      .reverse() as string[];

    const byClassMap = new Map<string, { className: string; boys: number; girls: number; total: number }>();
    for (const r of rows) {
      const className = r.className ?? 'Unassigned';
      const entry = byClassMap.get(className) ?? { className, boys: 0, girls: 0, total: 0 };
      if (r.gender === 'M') entry.boys += 1;
      if (r.gender === 'F') entry.girls += 1;
      entry.total += 1;
      byClassMap.set(className, entry);
    }
    const byClass = [...byClassMap.values()].sort((a, b) =>
      a.className.localeCompare(b.className, undefined, { numeric: true })
    );

    return ok(
      res,
      {
        items: paged,
        pagination: {
          page: pageNo,
          pageSize,
          total: rows.length,
          totalPages: Math.ceil(rows.length / pageSize),
        },
        filterOptions: { classes, academicYears, genders: ['M', 'F'] },
        summary: {
          total: rows.length,
          boys: rows.filter((r) => r.gender === 'M').length,
          girls: rows.filter((r) => r.gender === 'F').length,
          present: rows.filter((r) => r.attendanceToday === 'present').length,
          late: rows.filter((r) => r.attendanceToday === 'late').length,
          absent: rows.filter((r) => r.attendanceToday === 'absent').length,
        },
        byClass,
      },
      { mode: auth.mode, source: auth.mode === 'live' ? 'student-management' : 'demo' }
    );
  })
);

/** GET /students/:id - student profile (scoped read) */
router.get(
  '/students/:id',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const { id } = req.params;
    if (auth.mode === 'demo') {
      const student = DEMO_STUDENTS.find((s) => s.id === id);
      if (!student) throw new AppError(404, 'Student not found');
      const r = ((n) => ((Math.abs(Math.sin(n)) * 10000) % 100) / 100)(id.length);
      return ok(
        res,
        {
          ...student,
          parent: 'Mrs. ' + student.fullName.split(' ')[1],
          guardianPhone: '+250 788 ' + String(100000 + Math.floor(r * 899999)).slice(0, 6),
          residence: r > 0.7 ? 'Boarding' : 'Day scholar',
          feesStatus: r > 0.55 ? 'paid' : r > 0.25 ? 'partial' : 'outstanding',
          attendanceRate: student.attendanceRate,
        },
        { mode: 'demo' }
      );
    }
    // live mode: IAM directory rows carry the same fields
    const rows = await schoolData.students(auth, { organizationId: q(req, 'organizationId') });
    const student = rows.find((s) => s.id === id);
    if (!student) throw new AppError(404, 'Student not found or not in your assigned schools');
    return ok(res, student, { mode: 'live' });
  })
);

/** GET /staff - staff directory (server-filtered) */
router.get(
  '/staff',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const rows = await schoolData.staff(auth, {
      organizationId: q(req, 'organizationId'),
      search: q(req, 'search'),
      department: q(req, 'department'),
      status: q(req, 'status'),
    });

    const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 25));
    const pageNo = Math.max(1, Number(req.query.page) || 1);
    const start = (pageNo - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);

    const departments = [...new Set(rows.map((r) => r.department))].sort();

    return ok(
      res,
      {
        items: paged,
        pagination: {
          page: pageNo,
          pageSize,
          total: rows.length,
          totalPages: Math.ceil(rows.length / pageSize),
        },
        filterOptions: { departments },
        summary: {
          total: rows.length,
          present: rows.filter((r) => r.attendanceToday === 'present').length,
          late: rows.filter((r) => r.attendanceToday === 'late').length,
          absent: rows.filter((r) => r.attendanceToday === 'absent').length,
        },
      },
      { mode: auth.mode }
    );
  })
);

/** GET /hr - HR & payroll summary */
router.get(
  '/hr',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const [schools, payroll, staff] = await Promise.all([
      schoolData.schools(auth, { organizationId: q(req, 'organizationId') }),
      schoolData.financePayroll(auth, q(req, 'organizationId')).catch(() => null),
      schoolData.staff(auth, { organizationId: q(req, 'organizationId') }).catch(() => []),
    ]);

    const teaching = staff.filter((s) => s.role.startsWith('Teacher')).length;
    const support = staff.length - teaching;
    const onLeave = Math.round(staff.length * 0.04);
    const absent = staff.filter((s) => s.attendanceToday === 'absent').length;

    return ok(
      res,
      {
        summary: {
          totalEmployees: schools.reduce((a, s) => a + s.staff, 0),
          teachingStaff: Math.round(schools.reduce((a, s) => a + s.staff, 0) * 0.82),
          supportStaff: Math.round(schools.reduce((a, s) => a + s.staff, 0) * 0.18),
          directorySample: staff.length,
          teaching,
          support,
          absentToday: absent,
          onLeave,
          staffAttendanceRate: payroll ? Math.round((staff.filter((s) => s.attendanceToday === 'present').length / (staff.length || 1)) * 100) : 0,
          payrollTotal: payroll?.totals.payrollTotal ?? 0,
        },
        bySchool: payroll?.bySchool ?? [],
        leaves: [
          { name: 'Alice Uwase', role: 'PE & Sports · S1–S4', dates: '28–29 Oct', cover: 'Mr. Habiyaremye', status: 'approved' },
          { name: 'Mr. Kabera', role: 'Mathematics', dates: 'Today', cover: 'Olivier Hakizimana', status: 'sick leave' },
        ],
        payroll: payroll
          ? {
              visibility: payroll.payrollVisibility,
              total: payroll.totals.payrollTotal,
              nextRun: '25 Oct',
              staffCount: schools.reduce((a, s) => a + s.staff, 0),
            }
          : null,
      },
      { mode: auth.mode, generatedAt: new Date().toISOString() }
    );
  })
);

export default router;
