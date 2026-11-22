import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, q, page, param } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { consoleService } from '../services/console.service';
import { AppError } from '../middleware/error.middleware';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  agenda: z.array(z.string()).optional(),
  location: z.string().optional(),
  meetingDate: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  participants: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']),
});

/** GET /meetings - leadership meetings */
router.get(
  '/meetings',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const result = await consoleService.listMeetings({
      status: q(req, 'status'),
      organizationId: q(req, 'organizationId'),
      page: page(req, 'page', 1),
      pageSize: page(req, 'pageSize', 50),
    });
    return ok(res, result, { mode: auth.mode });
  })
);

/** POST /meetings - schedule a meeting (persisted + audited) */
router.post(
  '/meetings',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid meeting payload', 'VALIDATION_ERROR');
    }
    const meeting = await consoleService.createMeeting(auth, parsed.data);
    return ok(res, meeting, { mode: auth.mode }, 201);
  })
);

/** PATCH /meetings/:id - update meeting status (persisted + audited) */
router.patch(
  '/meetings/:id',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const parsed = updateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid meeting update', 'VALIDATION_ERROR');
    }
    const meeting = await consoleService.updateMeeting(auth, param(req, 'id'), parsed.data);
    return ok(res, meeting, { mode: auth.mode });
  })
);

export default router;
