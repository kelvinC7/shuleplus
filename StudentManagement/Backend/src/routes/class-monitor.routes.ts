import { Router } from 'express';
import { classMonitorController } from '../controllers/class-monitor.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => classMonitorController.list(req, res, next));
router.post('/', (req, res, next) => classMonitorController.create(req, res, next));
router.put('/:id', (req, res, next) => classMonitorController.update(req, res, next));
router.delete('/:id', (req, res, next) => classMonitorController.remove(req, res, next));

export default router;
