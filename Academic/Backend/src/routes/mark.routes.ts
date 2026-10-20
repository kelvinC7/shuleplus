import { Router } from 'express';
import { markController } from '../controllers/mark.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/students', (req, res, next) => markController.getStudentsForEntry(req, res, next));
router.get('/entry', (req, res, next) => markController.getMarksForEntry(req, res, next));
router.get('/by-exam-class', (req, res, next) => markController.listByExamAndClass(req, res, next));
router.post('/bulk', (req, res, next) => markController.bulkSave(req, res, next));
router.delete('/:id', (req, res, next) => markController.delete(req, res, next));
router.delete('/entry', (req, res, next) => markController.deleteByEntry(req, res, next));

export default router;
