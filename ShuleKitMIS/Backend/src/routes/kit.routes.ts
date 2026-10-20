import { Router } from 'express';
import { kitController } from '../controllers/kit.controller';
import { authenticate, rejectSchoolKitManagement, requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

/** Org kit management deprecated — Super Admin only (prefer /api/platform). */
router.use(authenticate, requireSuperAdmin, rejectSchoolKitManagement);

router.get('/', (req, res, next) => kitController.list(req, res, next));
router.post('/', (req, res, next) => kitController.create(req, res, next));
router.get('/:id', (req, res, next) => kitController.getById(req, res, next));
router.put('/:id', (req, res, next) => kitController.update(req, res, next));
router.delete('/:id', (req, res, next) => kitController.delete(req, res, next));

export default router;
