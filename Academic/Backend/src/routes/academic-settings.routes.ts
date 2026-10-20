import { Router } from 'express';
import { academicSettingsController } from '../controllers/academic-settings.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => academicSettingsController.get(req, res, next));

export default router;
