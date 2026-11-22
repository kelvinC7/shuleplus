import { Router } from 'express';
import { asyncHandler, ok } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { DEMO_SERVICES } from '../demo/demo-data';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

/** GET /services - school services overview (ShuleKit, ShuleMart, uniforms, dining, ShuleTrip) */
router.get(
  '/services',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const s = DEMO_SERVICES;
    return ok(
      res,
      {
        overview: {
          shuleKitEnrolledPct: s.shuleKit.enrolledPct,
          shuleKitDeadline: s.shuleKit.deadline,
          shuleMartUsed: s.shuleMart.used,
          shuleMartLimit: s.shuleMart.creditLimit,
          uniformsOpenOrders: s.uniforms.openOrders,
          diningMealsToday: s.dining.mealsToday,
          tripsPending: s.shuleTrip.pending,
        },
        shuleKit: s.shuleKit,
        shuleMart: s.shuleMart,
        uniforms: s.uniforms,
        dining: s.dining,
        shuleTrip: s.shuleTrip,
      },
      { mode: auth.mode }
    );
  })
);

export default router;
