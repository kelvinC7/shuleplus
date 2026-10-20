import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { ensureMember } from '../middleware/self.middleware';
import { dashboardService } from '../services/dashboard.service';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requireTenant, ensureMember);

dashboardRouter.get('/overview', async (req: AuthenticatedRequest, res) => {
  const data = await dashboardService.overview(
    req.organizationRef ?? req.user!.organizationId,
    req.user!.sub
  );
  res.json({ success: true, data });
});
