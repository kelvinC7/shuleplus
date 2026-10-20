import { Router } from 'express';
import { smsBulkController } from '../controllers/sms-bulk.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate, requireRole(ROLES.SUPER_ADMIN));

router.post('/sms/send', (req, res, next) => smsBulkController.send(req, res, next));
router.post('/sms/send-bulk', (req, res, next) => smsBulkController.sendBulk(req, res, next));

export default router;
