import { Router } from 'express';
import { enrollmentController } from '../controllers/enrollment.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/promotions', (req, res, next) => enrollmentController.listPromotions(req, res, next));
router.get('/promotions/:id', (req, res, next) => enrollmentController.getPromotion(req, res, next));
router.put('/promotions/:id', (req, res, next) => enrollmentController.updatePromotion(req, res, next));
router.delete('/promotions/:id', (req, res, next) => enrollmentController.revertPromotion(req, res, next));
router.get('/', (req, res, next) => enrollmentController.list(req, res, next));
router.post('/enroll', (req, res, next) => enrollmentController.enroll(req, res, next));
router.post('/promote', (req, res, next) => enrollmentController.promote(req, res, next));

export default router;
