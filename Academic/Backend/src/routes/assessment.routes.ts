import { Router } from 'express';
import { assessmentController } from '../controllers/assessment.controller';
import { assessmentMarkController } from '../controllers/assessment-mark.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.post('/', assessmentController.create);
router.get('/', assessmentController.list);
router.get('/preview-code', assessmentController.previewCode);
router.get('/teacher-dashboard', assessmentController.getTeacherDashboard);
router.put('/:id', assessmentController.update);
router.get('/:id', assessmentController.getById);
router.post('/:id/approve', assessmentController.approve);
router.post('/:id/reject', assessmentController.reject);
router.put('/:id/status', assessmentController.updateStatus);
router.get('/:id/statistics', assessmentController.getStatistics);
router.delete('/:id', assessmentController.delete);

router.get('/:assessmentId/marks', assessmentMarkController.getMarks);
router.post('/:assessmentId/marks', assessmentMarkController.enterMarks);
router.post('/:assessmentId/corrections', assessmentMarkController.requestCorrection);

export default router;
