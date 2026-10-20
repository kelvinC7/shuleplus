import { Router } from 'express';
import { z } from 'zod';
import { tenantRouter } from './tenant.routes';
import { conversationRouter } from './conversation.routes';
import { memberRouter } from './member.routes';
import { dashboardRouter } from './dashboard.routes';
import { uploadRouter } from './upload.routes';
import { parentRouter } from './parent.routes';
import { requireServiceAuth } from '../middleware/auth.middleware';
import { tenantService } from '../services/tenant.service';

export const router = Router();

const provisionSchema = z.object({
  organizationId: z.string().min(1),
  organizationCode: z.string().min(1).optional(),
  organizationName: z.string().min(1),
});

router.post('/tenant/create', requireServiceAuth, async (req, res) => {
  const input = provisionSchema.parse(req.body);
  const tenant = await tenantService.provision(input);
  res.status(201).json({ success: true, data: tenant });
});

router.use('/internal', tenantRouter);
router.use('/conversations', conversationRouter);
router.use('/members', memberRouter);
router.use('/dashboard', dashboardRouter);
router.use('/uploads', uploadRouter);
router.use('/parent', parentRouter);
