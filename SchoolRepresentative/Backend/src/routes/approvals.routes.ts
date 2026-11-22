import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, q, page, param } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { consoleService, approvalCategories } from '../services/console.service';
import { AppError } from '../middleware/error.middleware';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

const decisionSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  reason: z.string().optional(),
  comment: z.string().optional(),
});

/** GET /approvals - paginated approvals inbox */
router.get(
  '/approvals',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const result = await consoleService.listApprovals({
      status: q(req, 'status'),
      category: q(req, 'category'),
      organizationId: q(req, 'organizationId'),
      search: q(req, 'search'),
      page: page(req, 'page', 1),
      pageSize: page(req, 'pageSize', 25),
    });
    const stats = await consoleService.approvalStats(q(req, 'organizationId'));
    return ok(res, { ...result, stats, categories: approvalCategories }, { mode: auth.mode });
  })
);

/** GET /approvals/history - decided requests */
router.get(
  '/approvals/history',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const result = await consoleService.listApprovals({
      page: page(req, 'page', 1),
      pageSize: page(req, 'pageSize', 25),
      ...(q(req, 'status') ? { status: q(req, 'status') } : {}),
    });
    return ok(res, result, { mode: auth.mode });
  })
);

/** GET /approvals/:id - single approval (by id or reference) */
router.get(
  '/approvals/:id',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const item = await consoleService.getApproval(param(req, 'id'));
    return ok(res, item, { mode: auth.mode });
  })
);

/** POST /approvals/:id/decision - approve / reject / request changes (persisted + audited) */
router.post(
  '/approvals/:id/decision',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const parsed = decisionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid decision payload', 'VALIDATION_ERROR');
    }
    const result = await consoleService.decide(auth, param(req, 'id'), parsed.data);
    return ok(res, result, { mode: auth.mode, decidedAt: new Date().toISOString() });
  })
);

export default router;
