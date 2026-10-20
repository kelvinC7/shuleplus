import { Router } from 'express';
import { z } from 'zod';
import { requireServiceAuth } from '../middleware/auth.middleware';
import { tenantService } from '../services/tenant.service';
import { memberService } from '../services/member.service';
import { chatEvents } from '../socket';

export const tenantRouter = Router();

const provisionSchema = z.object({
  organizationId: z.string().min(1),
  organizationCode: z.string().min(1).optional(),
  organizationName: z.string().min(1),
});

tenantRouter.post('/provision', requireServiceAuth, async (req, res) => {
  const input = provisionSchema.parse(req.body);
  const tenant = await tenantService.provision(input);
  res.status(201).json({ success: true, data: tenant });
});

tenantRouter.post('/sync', requireServiceAuth, async (req, res) => {
  const { organizationId } = z.object({ organizationId: z.string().min(1) }).parse(req.body);
  await tenantService.getByOrganization(organizationId);
  const result = await memberService.syncOrganization(organizationId);
  chatEvents.emitMemberSynced(organizationId, result);
  res.json({ success: true, data: result });
});

tenantRouter.patch('/:organizationId/status', requireServiceAuth, async (req, res) => {
  const organizationId = z.string().min(1).parse(req.params.organizationId);
  const { status } = z
    .object({ status: z.enum(['ACTIVE', 'SUSPENDED']) })
    .parse(req.body);
  await tenantService.setStatus(organizationId, status);
  res.json({ success: true, data: { organizationId, status } });
});
