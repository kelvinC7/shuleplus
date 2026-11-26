import { Router } from 'express';
import { academicSettingsController } from '../controllers/academic-settings.controller';
import { authenticate, requireAcademicPublishAccess, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => academicSettingsController.get(req, res, next));
router.get('/report-footer/staff', requireAcademicPublishAccess, (req, res, next) =>
  academicSettingsController.listReportFooterStaff(req, res, next)
);
router.put('/report-footer', requireAcademicPublishAccess, (req, res, next) =>
  academicSettingsController.saveReportFooter(req, res, next)
);
router.get('/report-analysis', (req, res, next) =>
  academicSettingsController.getReportAnalysisSettings(req, res, next)
);
router.put('/report-analysis', requireAcademicPublishAccess, (req, res, next) =>
  academicSettingsController.saveReportAnalysisSettings(req, res, next)
);

export default router;
