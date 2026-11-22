import { Router } from 'express';
import { z } from 'zod';
import { tenantRouter } from './tenant.routes';
import { conversationRouter } from './conversation.routes';
import { memberRouter } from './member.routes';
import { dashboardRouter } from './dashboard.routes';
import { uploadRouter } from './upload.routes';
import { parentRouter } from './parent.routes';
import { smsRouter } from './sms.routes';
import { smsInternalController } from '../controllers/sms-internal.controller';
import { parentSmsPackagesController } from '../controllers/parent-sms-packages.controller';
import { parentSmsAdminController } from '../controllers/parent-sms-admin.controller';
import { requireServiceAuth } from '../middleware/auth.middleware';
import { tenantService } from '../services/tenant.service';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'internal-chat',
    status: 'ok',
    features: { smsDeliveryReport: true },
  });
});

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
router.use('/sms', smsRouter);

router.get('/internal/sms/schools', requireServiceAuth, (req, res, next) =>
  smsInternalController.listSchools(req, res, next)
);
router.patch('/internal/sms/schools/:organizationId', requireServiceAuth, (req, res, next) =>
  smsInternalController.updateSchool(req, res, next)
);

router.get('/service/parent-sms/config', requireServiceAuth, (req, res, next) =>
  parentSmsPackagesController.config(req, res, next)
);
router.get('/service/parent-sms/summary', requireServiceAuth, (req, res, next) =>
  parentSmsPackagesController.summary(req, res, next)
);
router.get('/service/parent-sms/purchases', requireServiceAuth, (req, res, next) =>
  parentSmsPackagesController.purchases(req, res, next)
);
router.get('/service/parent-sms/messages', requireServiceAuth, (req, res, next) =>
  parentSmsPackagesController.messages(req, res, next)
);
router.post('/service/parent-sms/purchases', requireServiceAuth, (req, res, next) =>
  parentSmsPackagesController.createPurchase(req, res, next)
);
router.post('/service/parent-sms/purchases/submit-payment', requireServiceAuth, (req, res, next) =>
  parentSmsPackagesController.submitPayment(req, res, next)
);
router.get('/internal/sms/parent-purchases/stats', requireServiceAuth, (req, res, next) =>
  parentSmsAdminController.stats(req, res, next)
);
router.get('/internal/sms/parent-purchases', requireServiceAuth, (req, res, next) =>
  parentSmsAdminController.list(req, res, next)
);
router.post('/internal/sms/parent-purchases/:purchaseId/activate', requireServiceAuth, (req, res, next) =>
  parentSmsAdminController.activate(req, res, next)
);
router.post('/internal/sms/parent-purchases/:purchaseId/reject', requireServiceAuth, (req, res, next) =>
  parentSmsAdminController.reject(req, res, next)
);
