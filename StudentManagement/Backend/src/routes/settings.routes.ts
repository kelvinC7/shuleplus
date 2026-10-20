import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/academic', (req, res, next) => settingsController.getAcademic(req, res, next));
router.put('/academic', (req, res, next) => settingsController.updateAcademic(req, res, next));

export default router;
