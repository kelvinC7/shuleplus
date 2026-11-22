import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok, q, param } from '../utils/http';
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
  type: z.enum(['SECURITY', 'SAFETY', 'MAINTENANCE', 'TRANSPORT', 'CAMERA']),
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  organizationId: z.string().optional(),
  assignedTo: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED']).optional(),
  assignedTo: z.string().optional(),
});

/** GET /incidents - incident management list */
router.get(
  '/incidents',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const items = await consoleService.listIncidents({
      status: q(req, 'status'),
      type: q(req, 'type'),
    });
    return ok(
      res,
      {
        items,
        summary: {
          open: items.filter((i) => i.status === 'OPEN').length,
          investigating: items.filter((i) => i.status === 'INVESTIGATING').length,
          resolved: items.filter((i) => i.status === 'RESOLVED').length,
          urgent: items.filter((i) => i.priority === 'URGENT' || i.priority === 'HIGH').length,
        },
      },
      { mode: auth.mode }
    );
  })
);

/** POST /incidents - record an incident (persisted + audited) */
router.post(
  '/incidents',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid incident payload', 'VALIDATION_ERROR');
    }
    const incident = await consoleService.createIncident(auth, parsed.data);
    return ok(res, incident, { mode: auth.mode }, 201);
  })
);

/** PATCH /incidents/:id - update status / assignment (persisted + audited) */
router.patch(
  '/incidents/:id',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const parsed = updateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid incident update', 'VALIDATION_ERROR');
    }
    const incident = await consoleService.updateIncident(auth, param(req, 'id'), parsed.data);
    return ok(res, incident, { mode: auth.mode });
  })
);

export default router;
