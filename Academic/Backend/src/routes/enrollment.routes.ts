import { Router } from 'express';
import { enrollmentController } from '../controllers/enrollment.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => enrollmentController.list(req, res, next));
router.post('/enroll', (req, res, next) => enrollmentController.enroll(req, res, next));
router.post('/promote', (req, res, next) => enrollmentController.promote(req, res, next));

export default router;
