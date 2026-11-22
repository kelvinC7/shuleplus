import { Router } from 'express';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { getOverview, getBriefing } from '../services/overview.service';

const router = Router();

/** GET /overview - Executive overview dashboard aggregation */
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const auth = resolveAuth(req);
    if (auth.mode === 'unauthorized') {
      return res.status(401).json({ success: false, message: 'Sign in through Shule+ IAM', code: 'AUTH_REQUIRED' });
    }
    const data = await getOverview(auth, {
      organizationId: q(req, 'organizationId'),
      academicYear: q(req, 'academicYear'),
      term: q(req, 'term'),
    });
    return ok(res, data, {
      mode: auth.mode,
      organizationId: q(req, 'organizationId') ?? 'all',
      academicYear: q(req, 'academicYear') ?? '2026-2027',
      term: q(req, 'term') ?? 'Term 3',
      generatedAt: new Date().toISOString(),
    });
  })
);

/** GET /briefing - Director daily briefing */
router.get(
  '/briefing',
  asyncHandler(async (req, res) => {
    const auth = resolveAuth(req);
    if (auth.mode === 'unauthorized') {
      return res.status(401).json({ success: false, message: 'Sign in through Shule+ IAM', code: 'AUTH_REQUIRED' });
    }
    const data = await getBriefing(auth, {
      organizationId: q(req, 'organizationId'),
      academicYear: q(req, 'academicYear'),
      term: q(req, 'term'),
    });
    return ok(res, data, { mode: auth.mode, generatedAt: new Date().toISOString() });
  })
);

export default router;
