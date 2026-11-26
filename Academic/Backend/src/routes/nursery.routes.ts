import { Router } from 'express';
import { nurseryController } from '../controllers/nursery.controller';
import { authenticate, requireModuleLicense, requireAcademicPublishAccess } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/settings', (req, res, next) => nurseryController.getSettings(req, res, next));
router.put('/settings/performance', (req, res, next) => nurseryController.savePerformance(req, res, next));
router.put('/settings/template', (req, res, next) => nurseryController.saveTemplate(req, res, next));

router.get('/classes', (req, res, next) => nurseryController.listClasses(req, res, next));
router.post('/classes', (req, res, next) => nurseryController.saveClassConfig(req, res, next));
router.delete('/classes/:id', (req, res, next) => nurseryController.deleteClassConfig(req, res, next));

router.get('/subjects', (req, res, next) => nurseryController.listSubjects(req, res, next));
router.put('/subjects', (req, res, next) => nurseryController.saveSubjects(req, res, next));

router.get('/reports', (req, res, next) => nurseryController.listReports(req, res, next));
router.post('/reports/generate', (req, res, next) => nurseryController.generateOne(req, res, next));
router.post('/reports/generate-class', (req, res, next) => nurseryController.generateClass(req, res, next));
router.post('/reports/publish', requireAcademicPublishAccess, (req, res, next) =>
  nurseryController.publish(req, res, next)
);
router.get('/reports/:id', (req, res, next) => nurseryController.getReport(req, res, next));
router.put('/reports/:id/comments', (req, res, next) => nurseryController.updateComments(req, res, next));

export default router;
