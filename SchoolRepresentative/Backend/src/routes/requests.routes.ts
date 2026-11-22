import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, param, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { decideRequest, listRequests } from '../services/requests.service';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

function organizationIdOf(req: import('express').Request, auth: ReturnType<typeof requireAuth>): string {
  const fromQuery = q(req, 'organizationId');
  if (fromQuery) return fromQuery;
  if (auth.user?.organizationId) return auth.user.organizationId;
  throw new AppError(400, 'organizationId is required');
}

const decisionSchema = z.object({
  source: z.enum(['transport', 'procurement']),
  kind: z.enum(['change', 'issue', 'purchase']),
  action: z.enum(['APPROVE', 'REJECT', 'RESOLVE', 'IN_REVIEW']),
  comment: z.string().optional(),
  reason: z.string().optional(),
  organizationId: z.string().optional(),
});

/** GET /requests - unified transport + procurement requests */
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    if (auth.mode === 'demo') {
      return ok(res, { items: [], summary: { total: 0, pending: 0, transport: 0, procurement: 0 } }, { mode: 'demo', source: 'demo' });
    }
    const organizationId = organizationIdOf(req, auth);
    const data = await listRequests({
      organizationId,
      source: q(req, 'source'),
      status: q(req, 'status'),
    });
    return ok(res, data, { mode: auth.mode });
  })
);

/** POST /requests/:id/decision - approve/reject/resolve in source module */
router.post(
  '/requests/:id/decision',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    if (auth.mode === 'demo') {
      throw new AppError(403, 'Decisions are not available in demo mode');
    }
    const parsed = decisionSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new AppError(400, 'Invalid decision payload');
    const organizationId =
      parsed.data.organizationId || q(req, 'organizationId') || auth.user?.organizationId;
    if (!organizationId) throw new AppError(400, 'organizationId is required');
    const result = await decideRequest(auth, {
      organizationId,
      id: param(req, 'id'),
      ...parsed.data,
    });
    return ok(res, result, { mode: auth.mode, decidedAt: new Date().toISOString() });
  })
);

export default router;
