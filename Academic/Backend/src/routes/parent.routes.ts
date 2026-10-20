import { Router } from 'express';
import { parentController } from '../controllers/parent.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/search', (req, res, next) => parentController.search(req, res, next));
router.get('/', (req, res, next) => parentController.list(req, res, next));
router.post('/', (req, res, next) => parentController.create(req, res, next));
router.get('/:id', (req, res, next) => parentController.getById(req, res, next));
router.put('/:id', (req, res, next) => parentController.update(req, res, next));
router.delete('/:id', (req, res, next) => parentController.delete(req, res, next));

export default router;
