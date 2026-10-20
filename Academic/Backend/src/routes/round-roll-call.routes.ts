import { Router } from 'express';
import { roundRollCallController } from '../controllers/round-roll-call.controller';

const router = Router();

router.get('/', (req, res, next) => roundRollCallController.list(req, res, next));
router.get('/analytics', (req, res, next) => roundRollCallController.analytics(req, res, next));
router.get('/sessions/:sessionId', (req, res, next) => roundRollCallController.session(req, res, next));

export default router;
