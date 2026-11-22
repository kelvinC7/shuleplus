import { Router } from 'express';
import { asyncHandler, ok, q, page } from '../utils/http';
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

/** GET /audit - immutable audit trail (read-only, filterable) */
router.get(
  '/audit',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const result = await consoleService.listAudit({
      module: q(req, 'module'),
      action: q(req, 'action'),
      actor: q(req, 'actor'),
      page: page(req, 'page', 1),
      pageSize: page(req, 'pageSize', 25),
    });
    const modules = [
      'Approvals',
      'Action Plan',
      'Teaching Now',
      'Communication',
      'Live Campus',
      'Reports',
    ];
    return ok(res, { ...result, modules }, { mode: auth.mode });
  })
);

export default router;
