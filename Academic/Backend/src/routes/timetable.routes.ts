import { Router } from 'express';
import { timetableProxyController } from '../controllers/timetable.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/class-config', (req, res, next) => timetableProxyController.classCatalog(req, res, next));
router.get('/course-config', (req, res, next) => timetableProxyController.courseCatalog(req, res, next));

export default router;
