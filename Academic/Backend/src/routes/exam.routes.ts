import { Router } from 'express';
import { examController } from '../controllers/exam.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/academic-years', (req, res, next) => examController.listAcademicYears(req, res, next));
router.get('/', (req, res, next) => examController.list(req, res, next));
router.get('/:id', (req, res, next) => examController.getById(req, res, next));
router.post('/', (req, res, next) => examController.create(req, res, next));
router.put('/:id', (req, res, next) => examController.update(req, res, next));
router.delete('/:id', (req, res, next) => examController.delete(req, res, next));

export default router;
