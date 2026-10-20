import { Router } from 'express';
import { publicLookupController } from '../controllers/public-lookup.controller';
import { parentAuthController } from '../controllers/parent-auth.controller';

const router = Router();

/** Public student lookup by ShuleCode or SDMS code (landing payment portal). */
router.get('/students/lookup', (req, res, next) =>
  publicLookupController.lookupStudent(req, res, next)
);

/** Public parent self-service: create/link a parent to a student by code (kit order consent). */
router.post('/parents/claim', (req, res, next) =>
  publicLookupController.claimParent(req, res, next)
);

/** Public parent authentication (Parent Portal / ParentMIS). */
router.get('/parents/auth/status', (req, res, next) =>
  parentAuthController.status(req, res, next)
);
router.post('/parents/auth/set-password', (req, res, next) =>
  parentAuthController.setPassword(req, res, next)
);
router.post('/parents/auth/login', (req, res, next) =>
  parentAuthController.login(req, res, next)
);
router.get('/parents/auth/me', (req, res, next) =>
  parentAuthController.me(req, res, next)
);

export default router;
