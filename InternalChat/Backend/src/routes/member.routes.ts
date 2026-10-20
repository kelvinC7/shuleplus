import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { ensureMember } from '../middleware/self.middleware';
import { memberService } from '../services/member.service';
import { presence } from '../socket/presence';

export const memberRouter = Router();

memberRouter.use(authenticate, requireTenant, ensureMember);

memberRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const search = req.query.search as string | undefined;
  const kind = req.query.kind === 'parent' ? 'PARENT' : req.query.kind === 'staff' ? 'STAFF' : undefined;
  const members = await memberService.list(req.organizationRef ?? req.user!.organizationId, search, kind);
  const organizationId = req.organizationRef ?? req.user!.organizationId;
  const online = new Set(presence.onlineUserIds(organizationId));
  const data = members.map((m) => ({ ...m, online: online.has(m.userId) }));
  res.json({ success: true, data });
});

memberRouter.get('/departments', async (req: AuthenticatedRequest, res) => {
  const data = await memberService.listDepartments(req.organizationRef ?? req.user!.organizationId);
  res.json({ success: true, data });
});
