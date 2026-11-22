import { Router } from 'express';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { DEMO_BUSES, DEMO_CAMERAS, DEMO_GUARDS } from '../demo/demo-data';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

/** GET /transport - buses, routes and delays */
router.get(
  '/transport',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const buses = DEMO_BUSES;
    return ok(
      res,
      {
        summary: {
          registered: buses.length,
          onRoute: buses.filter((b) => b.status === 'on_route').length,
          delayed: buses.filter((b) => b.status === 'late').length,
          parked: buses.filter((b) => b.status === 'parked').length,
          studentsOnBoard: buses.reduce((a, b) => a + b.studentsOnBoard, 0),
        },
        buses,
        mapCenter: { lat: -2.4711, lng: 28.8569 }, // Kamembe, Rusizi
        maintenance: [
          { bus: 'Bus 7', item: 'Brake pads replacement', due: 'in 2 weeks', status: 'scheduled' },
          { bus: 'Bus 3', item: 'Oil change', due: 'in 5 weeks', status: 'ok' },
        ],
      },
      { mode: auth.mode }
    );
  })
);

/** GET /live-campus - cameras, zones and security */
router.get(
  '/live-campus',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const branchId = q(req, 'organizationId');
    const cameras = branchId
      ? DEMO_CAMERAS.map((c) => ({ ...c, branchId }))
      : DEMO_CAMERAS;

    const zones = [...new Set(cameras.map((c) => c.zone))].map((zone) => ({
      zone,
      total: cameras.filter((c) => c.zone === zone).length,
      online: cameras.filter((c) => c.zone === zone && c.online).length,
    }));

    return ok(
      res,
      {
        summary: {
          total: cameras.length,
          online: cameras.filter((c) => c.online).length,
          offline: cameras.filter((c) => !c.online).length,
        },
        cameras,
        zones,
        guards: DEMO_GUARDS,
        accessNote:
          'Camera streams are permission-controlled. Access to live feeds is logged in the audit trail.',
      },
      { mode: auth.mode }
    );
  })
);

export default router;
