import { Router } from 'express';
import { classController } from '../controllers/class.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => classController.list(req, res, next));
router.post('/', (req, res, next) => classController.create(req, res, next));
router.get('/:id', (req, res, next) => classController.getById(req, res, next));
router.put('/:id', (req, res, next) => classController.update(req, res, next));
router.delete('/:id', (req, res, next) => classController.delete(req, res, next));

export default router;
