import { Router } from 'express';
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

/** GET /notifications - notification panel feed with category filters */
router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const [items, unread] = await Promise.all([
      consoleService.listNotifications({
        category: q(req, 'category'),
        unreadOnly: q(req, 'unread') === 'true',
      }),
      consoleService.unreadCount(),
    ]);
    return ok(
      res,
      {
        items,
        unread,
        categories: [
          { id: 'SECURITY', label: 'Security' },
          { id: 'FINANCE', label: 'Finance' },
          { id: 'ACADEMIC', label: 'Academic' },
          { id: 'STAFF', label: 'Staff' },
          { id: 'APPROVAL', label: 'Approvals' },
          { id: 'SYSTEM', label: 'System' },
        ],
      },
      { mode: auth.mode }
    );
  })
);

/** POST /notifications/:id/read - mark one as read */
router.post(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    requireAuth(req);
    const result = await consoleService.markRead(param(req, 'id'));
    return ok(res, result);
  })
);

/** POST /notifications/read-all - mark all as read */
router.post(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    requireAuth(req);
    const result = await consoleService.markAllRead();
    return ok(res, result);
  })
);

export default router;
