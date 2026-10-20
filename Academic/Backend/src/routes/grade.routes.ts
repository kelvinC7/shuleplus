import { Router } from 'express';
import { gradeController } from '../controllers/grade.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => gradeController.list(req, res, next));
router.get('/:id', (req, res, next) => gradeController.getById(req, res, next));
router.post('/', (req, res, next) => gradeController.create(req, res, next));
router.put('/:id', (req, res, next) => gradeController.update(req, res, next));
router.delete('/:id', (req, res, next) => gradeController.delete(req, res, next));

export default router;
