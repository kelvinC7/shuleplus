import { Router, Request, Response } from 'express';
import path from 'node:path';
import { tenantController } from '../controllers/tenant.controller';
import { babyeyiController } from '../controllers/babyeyi.controller';
import { nesaReviewController } from '../controllers/nesa-review.controller';
import { documentUpload, uploadRoot } from '../config/upload';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'babyeyi-wizard-service',
    module: 'babyeyi',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

/** National NESA review APIs (service-to-service from NesaDashboard). */
const nesaRouter = Router();
nesaRouter.use(requireServiceAuth);
nesaRouter.get('/circulars', (req, res, next) => nesaReviewController.list(req, res, next));
nesaRouter.get('/circulars/:id', (req, res, next) => nesaReviewController.get(req, res, next));
nesaRouter.post('/circulars/:id/comments', (req, res, next) =>
  nesaReviewController.comment(req, res, next)
);
nesaRouter.post('/circulars/:id/reject', (req, res, next) =>
  nesaReviewController.reject(req, res, next)
);
nesaRouter.post('/circulars/:id/unpublish', (req, res, next) =>
  nesaReviewController.unpublish(req, res, next)
);
nesaRouter.post('/circulars/:id/approve', (req, res, next) =>
  nesaReviewController.approve(req, res, next)
);
nesaRouter.get('/circulars/:id/print', (req, res, next) =>
  nesaReviewController.print(req, res, next)
);
router.use('/nesa', nesaRouter);

router.get('/babyeyi/verify/:docId', (req, res, next) => babyeyiController.verify(req, res, next));
router.post('/babyeyi/verify/:docId/report', (req, res, next) => babyeyiController.reportVerify(req, res, next));

/** Public landing / payment-portal circular lookup (no auth). */
router.get('/public/circulars/options', (req, res, next) =>
  babyeyiController.publicCircularOptions(req, res, next)
);
router.get('/public/circulars/list', (req, res, next) =>
  babyeyiController.publicCircularList(req, res, next)
);
router.get('/public/circulars/:id/print', (req, res, next) =>
  babyeyiController.publicCircularPrint(req, res, next)
);
router.get('/public/circulars', (req, res, next) => babyeyiController.publicCircular(req, res, next));

router.use('/uploads', (req, res, next) => {
  const file = path.basename(req.path);
  res.sendFile(path.join(uploadRoot, file), (err) => {
    if (err) next();
  });
});

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => babyeyiController.dashboard(req, res, next));

protectedRouter.get('/babyeyi/school-info', (req, res, next) => babyeyiController.schoolInfo(req, res, next));
protectedRouter.get('/babyeyi/nesa-limit', (req, res, next) => babyeyiController.nesaLimit(req, res, next));
protectedRouter.get('/babyeyi/academic-classes', (req, res, next) =>
  babyeyiController.academicClasses(req, res, next)
);
protectedRouter.get('/babyeyi/student-requirements-catalog', (req, res, next) =>
  babyeyiController.requirementsCatalog(req, res, next)
);
protectedRouter.get('/babyeyi/stats', (req, res, next) => babyeyiController.dashboard(req, res, next));

protectedRouter.get('/babyeyi', (req, res, next) => babyeyiController.list(req, res, next));
protectedRouter.get('/babyeyi/:id', (req, res, next) => babyeyiController.get(req, res, next));
protectedRouter.post(
  '/babyeyi',
  documentUpload.any(),
  (req, res, next) => babyeyiController.create(req, res, next)
);
protectedRouter.put(
  '/babyeyi/:id',
  documentUpload.any(),
  (req, res, next) => babyeyiController.update(req, res, next)
);
protectedRouter.delete('/babyeyi/:id', (req, res, next) => babyeyiController.remove(req, res, next));
protectedRouter.post('/babyeyi/:id/duplicate', (req, res, next) => babyeyiController.duplicate(req, res, next));
protectedRouter.post('/babyeyi/:id/publish', (req, res, next) => babyeyiController.publish(req, res, next));
protectedRouter.get('/babyeyi/:id/qrcode', (req, res, next) => babyeyiController.qrcode(req, res, next));
protectedRouter.get('/babyeyi/:id/pdf', (req, res, next) => babyeyiController.download(req, res, next));
protectedRouter.get('/babyeyi/:id/print', (req, res, next) => babyeyiController.print(req, res, next));
protectedRouter.post('/babyeyi/:id/comments', (req, res, next) => babyeyiController.addComment(req, res, next));
protectedRouter.post('/babyeyi/bulk', (req, res, next) => babyeyiController.bulkAction(req, res, next));

protectedRouter.patch('/babyeyi/:id/content-i18n/rw', (req, res, next) =>
  babyeyiController.patchContentI18nRw(req, res, next)
);
protectedRouter.post('/babyeyi/:id/regenerate-translations', (req, res, next) =>
  babyeyiController.regenerateTranslations(req, res, next)
);

protectedRouter.get('/approvals', (req, res, next) => babyeyiController.approvals(req, res, next));
protectedRouter.post('/babyeyi/:id/approve', (req, res, next) => babyeyiController.approve(req, res, next));

protectedRouter.get('/analytics', (req, res, next) => babyeyiController.analytics(req, res, next));
protectedRouter.get('/templates', (req, res, next) => babyeyiController.templates(req, res, next));

protectedRouter.get('/assets', (req, res, next) => babyeyiController.assets(req, res, next));
protectedRouter.post('/babyeyi/upload-asset', documentUpload.single('file'), (req, res, next) =>
  babyeyiController.uploadAsset(req, res, next)
);

protectedRouter.get('/notifications', (req, res, next) => babyeyiController.notifications(req, res, next));
protectedRouter.patch('/notifications/read-all', (req, res, next) =>
  babyeyiController.markAllNotificationsRead(req, res, next)
);
protectedRouter.patch('/notifications/:id/read', (req, res, next) =>
  babyeyiController.markNotificationRead(req, res, next)
);

protectedRouter.get('/babyeyi/:id/versions', (req, res, next) => babyeyiController.versions(req, res, next));
protectedRouter.post('/babyeyi/:id/versions/:versionId/restore', (req, res, next) =>
  babyeyiController.restoreVersion(req, res, next)
);

protectedRouter.get('/collaboration', (req, res, next) => babyeyiController.collaboration(req, res, next));
protectedRouter.get('/academic-settings', (req, res, next) => babyeyiController.academicSettings(req, res, next));
protectedRouter.put('/academic-settings', (req, res, next) => babyeyiController.academicSettings(req, res, next));
protectedRouter.get('/settings', (req, res, next) => babyeyiController.settings(req, res, next));
protectedRouter.put('/settings', (req, res, next) => babyeyiController.settings(req, res, next));

router.use(protectedRouter);

export default router;
