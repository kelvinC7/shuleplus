import { Router } from 'express';
import { marksSubmissionController } from '../controllers/marks-submission.controller';
import { authenticate, requireModuleLicense, requireAcademicPublishAccess } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();
router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', marksSubmissionController.list);
router.post('/', marksSubmissionController.upsert);
router.post('/:id/transition', requireAcademicPublishAccess, marksSubmissionController.transition);

export default router;
