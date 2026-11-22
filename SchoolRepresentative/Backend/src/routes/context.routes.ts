import { Router } from 'express';
import { asyncHandler, ok } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { env } from '../config/env';
import { schoolData } from '../services/school-data.service';
import { consoleService, actorOf } from '../services/console.service';

const router = Router();

/**
 * GET /context
 * Bootstraps the portal: user, authorized branches, academic periods,
 * console counts and the data mode (live | demo).
 */
router.get(
  '/context',
  asyncHandler(async (req, res) => {
    const auth = resolveAuth(req);
    if (auth.mode === 'unauthorized') {
      return res
        .status(401)
        .json({ success: false, message: 'Sign in through Shule+ IAM to open the Director Console', code: 'AUTH_REQUIRED' });
    }

    const [schools, approvals, unread, tasks, yearsTerms] = await Promise.all([
      schoolData.schools(auth, {}).catch(() => []),
      consoleService.approvalStats().catch(() => null),
      consoleService.unreadCount().catch(() => 0),
      consoleService.taskStats().catch(() => null),
      schoolData.academicContext(auth).catch(() => null),
    ]);

    const context = (yearsTerms ?? { academicYears: [], terms: [] }) as {
      academicYears?: Array<{ id: string; label: string }>;
      terms?: Array<{ id: string; label: string }>;
    };

    const actor = actorOf(auth);

    return ok(
      res,
      {
        user: {
          id: actor.id,
          name: actor.name,
          email: auth.user?.email ?? auth.demoUser.email,
          role: auth.user?.roles?.includes('organization_admin')
            ? 'Organization Admin'
            : 'Group Director',
          mode: auth.mode,
        },
        branches: schools.map((s) => ({
          id: s.id,
          name: s.name,
          organizationCode: s.organizationCode,
          district: s.district,
          sector: s.sector,
          managerName: s.managerName,
          students: s.students,
          staff: s.staff,
          performance: s.performance ?? null,
        })),
        academicYears: context.academicYears?.length
          ? context.academicYears
          : [
              { id: '2026-2027', label: '2026–2027' },
              { id: '2025-2026', label: '2025–2026' },
            ],
        terms: context.terms?.length
          ? context.terms
          : [
              { id: 'Term 3', label: 'Term 3' },
              { id: 'Term 2', label: 'Term 2' },
              { id: 'Term 1', label: 'Term 1' },
            ],
        counts: {
          pendingApprovals: approvals?.pending ?? 0,
          unreadNotifications: unread,
          openTasks: (tasks?.open ?? 0) + (tasks?.inProgress ?? 0),
          overdueTasks: tasks?.overdue ?? 0,
        },
        moduleSlug: env.MODULE_SLUG,
      },
      { mode: auth.mode, generatedAt: new Date().toISOString() }
    );
  })
);

export default router;
