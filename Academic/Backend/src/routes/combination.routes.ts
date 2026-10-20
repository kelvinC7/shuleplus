import { Router } from 'express';
import { combinationController } from '../controllers/combination.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => combinationController.list(req, res, next));
router.get('/:id', (req, res, next) => combinationController.getById(req, res, next));

export default router;
