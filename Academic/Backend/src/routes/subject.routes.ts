import { Router } from 'express';
import { subjectController } from '../controllers/subject.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/categories', (req, res, next) => subjectController.listCategories(req, res, next));
router.get('/', (req, res, next) => subjectController.list(req, res, next));
router.get('/:id', (req, res, next) => subjectController.getById(req, res, next));
router.post('/', (req, res, next) => subjectController.create(req, res, next));
router.put('/:id', (req, res, next) => subjectController.update(req, res, next));
router.delete('/:id', (req, res, next) => subjectController.delete(req, res, next));

export default router;
