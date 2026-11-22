import { Router } from 'express';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

const REPORT_CATEGORIES = [
  { id: 'students', label: 'Student enrolment', href: '/director/students' },
  { id: 'academics', label: 'Academic performance', href: '/director/academics' },
  { id: 'attendance', label: 'Attendance', href: '/director/attendance' },
  { id: 'fees', label: 'Fees collection', href: '/director/fees' },
  { id: 'budget', label: 'Budget vs actual', href: '/director/budget' },
  { id: 'hr', label: 'HR & payroll', href: '/director/hr' },
  { id: 'transport', label: 'Transport', href: '/director/transport' },
  { id: 'discipline', label: 'Discipline', href: '/director/discipline' },
  { id: 'branches', label: 'Branch comparison', href: '/director/schools' },
];

/** GET /reports - report builder metadata + available reports */
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    return ok(
      res,
      {
        categories: REPORT_CATEGORIES,
        formats: ['PDF', 'Excel', 'Print'],
        recent: [
          {
            id: 'rep-1',
            name: 'Term 3 mid-term academic summary',
            category: 'Academic performance',
            generatedAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
            format: 'PDF',
          },
          {
            id: 'rep-2',
            name: 'October fees collection report',
            category: 'Fees collection',
            generatedAt: new Date(Date.now() - 12 * 86400_000).toISOString(),
            format: 'Excel',
          },
        ],
        note: 'Exports honour the selected branch, year and term filters and your permissions.',
      },
      { mode: auth.mode }
    );
  })
);

/**
 * POST /reports/generate - register a report export request.
 * Returns a descriptor the frontend prints/exports from the filtered page data.
 */
router.post(
  '/reports/generate',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const category = String(body.category ?? 'students');
    const meta = REPORT_CATEGORIES.find((c) => c.id === category);
    if (!meta) throw new AppError(400, 'Unknown report category', 'VALIDATION_ERROR');
    return ok(
      res,
      {
        id: `rep-${Date.now()}`,
        category: meta.id,
        label: meta.label,
        format: String(body.format ?? 'PDF'),
        filters: {
          organizationId: body.organizationId ?? 'all',
          academicYear: body.academicYear ?? '2026-2027',
          term: body.term ?? 'Term 3',
        },
        generatedAt: new Date().toISOString(),
        status: 'READY',
      },
      { mode: auth.mode }
    );
  })
);

export default router;
