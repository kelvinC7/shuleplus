import { Router } from 'express';
import { publicLookupController } from '../controllers/public-lookup.controller';
import { reportCardController } from '../controllers/report-card.controller';

const router = Router();

router.get('/report-card/verify', (req, res, next) =>
  reportCardController.verifyPublic(req, res, next)
);

/** Public student lookup by ShuleCode or SDMS code (landing payment portal). */
router.get('/students/lookup', (req, res, next) =>
  publicLookupController.lookupStudent(req, res, next)
);

/** Public parent self-service: create/link a parent to a student by code (kit order consent). */
router.post('/parents/claim', (req, res, next) =>
  publicLookupController.claimParent(req, res, next)
);

export default router;
