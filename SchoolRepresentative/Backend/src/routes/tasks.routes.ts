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
  owner: z.string().min(2),
  ownerRole: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  category: z.string().optional(),
  dueDate: z.string().optional(),
  organizationId: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

/** GET /tasks - executive action plan */
router.get(
  '/tasks',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const [result, stats] = await Promise.all([
      consoleService.listTasks({
        status: q(req, 'status'),
        organizationId: q(req, 'organizationId'),
        page: page(req, 'page', 1),
        pageSize: page(req, 'pageSize', 25),
      }),
      consoleService.taskStats(),
    ]);
    return ok(res, { ...result, stats }, { mode: auth.mode });
  })
);

/** POST /tasks - create an action item (persisted + audited) */
router.post(
  '/tasks',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid task payload', 'VALIDATION_ERROR');
    }
    const task = await consoleService.createTask(auth, parsed.data);
    return ok(res, task, { mode: auth.mode }, 201);
  })
);

/** PATCH /tasks/:id - update progress/status (persisted + audited) */
router.patch(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const parsed = updateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid task update', 'VALIDATION_ERROR');
    }
    const task = await consoleService.updateTask(auth, param(req, 'id'), parsed.data);
    return ok(res, task, { mode: auth.mode });
  })
);

export default router;
