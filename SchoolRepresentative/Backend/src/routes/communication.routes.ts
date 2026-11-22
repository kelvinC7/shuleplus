import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { consoleService } from '../services/console.service';
import { AppError } from '../middleware/error.middleware';
import {
  DEMO_PARENT_ACCOUNTS,
  DEMO_CHATS,
  DEMO_CIRCULARS,
  BROADCAST_TEMPLATES,
  AUDIENCE_OPTIONS,
} from '../demo/demo-data';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

const broadcastSchema = z.object({
  audience: z.string().min(1),
  channels: z.array(z.enum(['app', 'sms', 'email'])).min(1),
  subject: z.string().min(2),
  message: z.string().min(2),
  recipientCount: z.number().int().nonnegative(),
  smsCost: z.number().nonnegative().optional(),
  scheduledFor: z.string().optional(),
  organizationId: z.string().optional(),
});

/** GET /communication/broadcasts - history + templates + audiences */
router.get(
  '/communication/broadcasts',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const [history, templates, audiences] = await Promise.all([
      consoleService.listBroadcasts(),
      Promise.resolve(BROADCAST_TEMPLATES),
      Promise.resolve(AUDIENCE_OPTIONS),
    ]);
    const last7 = history.filter(
      (b) => Date.now() - new Date(b.createdAt).getTime() < 7 * 86400_000
    );
    return ok(
      res,
      {
        history,
        templates,
        audiences,
        stats: {
          sentThisWeek: last7.length,
          recipientsThisWeek: last7.reduce((a, b) => a + b.recipientCount, 0),
          avgReadRate: 68,
        },
      },
      { mode: auth.mode }
    );
  })
);

/** POST /communication/broadcasts - send or schedule a broadcast (persisted + audited) */
router.post(
  '/communication/broadcasts',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const parsed = broadcastSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid broadcast payload', 'VALIDATION_ERROR');
    }
    const result = await consoleService.sendBroadcast(auth, parsed.data);
    return ok(res, result, { mode: auth.mode }, 201);
  })
);

/** GET /communication/parents - Parent MIS accounts */
router.get(
  '/communication/parents',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const accounts = DEMO_PARENT_ACCOUNTS;
    return ok(
      res,
      {
        summary: {
          total: accounts.total,
          verified: accounts.verified,
          verifiedPct: Math.round((accounts.verified / accounts.total) * 100),
          linkedStudents: accounts.linkedStudents,
          activeThisWeek: accounts.activeThisWeek,
          engagementPct: Math.round((accounts.activeThisWeek / accounts.total) * 100),
        },
        enquiries: accounts.enquiries,
      },
      { mode: auth.mode }
    );
  })
);

/** GET /communication/chats - ShuleChat conversations */
router.get(
  '/communication/chats',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    return ok(
      res,
      {
        summary: {
          unread: DEMO_CHATS.filter((c) => c.unread).length,
          escalations: DEMO_CHATS.filter((c) => c.assigned === 'Director').length,
        },
        chats: DEMO_CHATS,
      },
      { mode: auth.mode }
    );
  })
);

/** GET /communication/circulars - circulars awaiting signature + published */
router.get(
  '/communication/circulars',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    // The demo dataset carries group-wide circulars; live mode filters
    // by branch server-side once IAM exposes branch-scoped circulars.
    const circulars = DEMO_CIRCULARS;
    return ok(
      res,
      {
        summary: {
          awaitingDirector: circulars.filter((c) => c.status === 'AWAITING_DIRECTOR').length,
          published: circulars.filter((c) => c.status === 'PUBLISHED').length,
        },
        items: circulars,
      },
      { mode: auth.mode }
    );
  })
);

export default router;
