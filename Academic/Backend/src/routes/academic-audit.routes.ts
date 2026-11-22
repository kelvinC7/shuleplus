import { Router } from 'express';
import { academicAuditController } from '../controllers/academic-audit.controller';
import { authenticate, requireModuleLicense, requireAcademicPublishAccess } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();
router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', requireAcademicPublishAccess, academicAuditController.list);
router.get('/notification-outbox', requireAcademicPublishAccess, academicAuditController.listOutbox);

export default router;
