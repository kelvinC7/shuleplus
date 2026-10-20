import { Router } from 'express';
import { requestController } from '../controllers/request.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

/** School request management deprecated — Super Admin uses /api/platform/orders. */
router.use(authenticate, requireSuperAdmin);

router.get('/', (req, res, next) => requestController.list(req, res, next));
router.post('/', (req, res, next) => requestController.create(req, res, next));
router.get('/:id', (req, res, next) => requestController.getById(req, res, next));
router.put('/:id/status', (req, res, next) => requestController.updateStatus(req, res, next));
router.post('/:id/payments', (req, res, next) => requestController.recordPayment(req, res, next));

export default router;
