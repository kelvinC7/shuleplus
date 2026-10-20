import { Router } from 'express';
import { examPlanningController } from '../controllers/exam-planning.controller';
import { authenticate, requireExamDeskAccess } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();
router.use(authenticate, requireExamDeskAccess, requireTenant);

router.get('/me', (req, res, next) => examPlanningController.myDesk(req, res, next));
router.get('/room', (req, res, next) => examPlanningController.roomRoster(req, res, next));
router.get('/lists', (req, res, next) => examPlanningController.deskLists(req, res, next));
router.post('/entry', (req, res, next) => examPlanningController.deskEntry(req, res, next));
router.post('/eligibility', (req, res, next) => examPlanningController.deskEligibility(req, res, next));
router.post('/exit', (req, res, next) => examPlanningController.deskExit(req, res, next));

export default router;
