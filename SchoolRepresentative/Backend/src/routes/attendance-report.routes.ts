import { Router } from 'express';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { attendanceReport, classAttendanceToday, daysBetween } from '../services/live-operations.service';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateParam(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!DATE.test(value)) throw new AppError(400, 'Dates must use YYYY-MM-DD', 'VALIDATION_ERROR');
  return value;
}

/** GET /attendance/report - students and staff attendance from Attendance tap cards (entry / exit) */
router.get(
  '/attendance/report',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const today = new Date().toISOString().slice(0, 10);
    const date = dateParam(q(req, 'date'), today);
    const from = dateParam(q(req, 'from'), date);
    const to = dateParam(q(req, 'to'), date);
    if (daysBetween(from, to).length === 0) throw new AppError(400, 'Range end must be after start', 'VALIDATION_ERROR');

    const data = await attendanceReport(auth, {
      organizationId: q(req, 'organizationId'),
      from,
      to,
      className: q(req, 'className'),
      search: q(req, 'search'),
    });
    return ok(res, data, { mode: auth.mode, source: auth.mode === 'live' ? 'attendance' : 'demo' });
  })
);

/** GET /teaching-now/class-attendance - students of one class with today's gate status */
router.get(
  '/teaching-now/class-attendance',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const organizationId = q(req, 'organizationId');
    const className = q(req, 'className');
    if (!organizationId || !className) {
      throw new AppError(400, 'organizationId and className are required', 'VALIDATION_ERROR');
    }
    const data = await classAttendanceToday(auth, organizationId, className);
    return ok(res, data, { mode: auth.mode });
  })
);

export default router;
