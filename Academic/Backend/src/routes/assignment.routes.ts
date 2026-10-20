import { Router } from 'express';
import { assessmentTemplateController } from '../controllers/assessment-template.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => assessmentTemplateController.listAssignments(req, res, next));
router.post('/:assignmentId/marks', (req, res, next) => assessmentTemplateController.enterMarks(req, res, next));
router.post('/:assignmentId/calculate', (req, res, next) => assessmentTemplateController.calculateResults(req, res, next));
router.get('/:assignmentId/results', (req, res, next) => assessmentTemplateController.getClassResults(req, res, next));
router.delete('/:assignmentId', (req, res, next) => assessmentTemplateController.removeAssignment(req, res, next));

export default router;
