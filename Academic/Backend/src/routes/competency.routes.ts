import { Router } from 'express';
import { competencyController } from '../controllers/competency.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.post('/templates', competencyController.createTemplate);
router.get('/templates', competencyController.getTemplates);
router.get('/templates/:id', competencyController.getTemplateById);
router.put('/templates/:id', competencyController.updateTemplate);
router.delete('/templates/:id', competencyController.deleteTemplate);

router.post('/records', competencyController.recordStudentCompetency);
router.get('/records/student/:studentId', competencyController.getStudentCompetencies);
router.get('/records/class', competencyController.getClassCompetencies);

export default router;
