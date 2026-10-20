import { Router } from 'express';
import { assessmentTemplateController } from '../controllers/assessment-template.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/student', (req, res, next) => assessmentTemplateController.getStudentResults(req, res, next));
router.get('/report-card', (req, res, next) => assessmentTemplateController.getReportCard(req, res, next));
router.get('/growth', (req, res, next) => assessmentTemplateController.getGrowthData(req, res, next));

router.post('/grading-scales', (req, res, next) => assessmentTemplateController.createGradingScale(req, res, next));
router.get('/grading-scales', (req, res, next) => assessmentTemplateController.getGradingScales(req, res, next));

export default router;
