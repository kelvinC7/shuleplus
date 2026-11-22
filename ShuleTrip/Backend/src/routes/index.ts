import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import {
  authenticate,
  requireModuleLicense,
  requireGovernmentAccess,
  requireServiceAuth,
  requireSuperAdmin,
} from '../middleware/auth.middleware';
import { publicPortalController } from '../controllers/public-portal.controller';
import { superadminRegistrationsController } from '../controllers/superadmin-registrations.controller';
import { requireTenant } from '../middleware/tenant.middleware';
import tripRoutes from './trip.routes';
import governmentRoutes from './government.routes';
import { studentsController } from '../controllers/students.controller';
import { publicTripController } from '../controllers/public-trip.controller';
import { parentConsentController } from '../controllers/parent-consent.controller';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'shule-trip-module-service',
    module: 'shule-trip',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

/** Public trip verification (QR scan — no auth). */
router.get('/public/trips/:reference', (req, res, next) =>
  publicTripController.verifyByReference(req, res, next)
);

router.post('/public/auth/login', (req, res, next) => publicPortalController.login(req, res, next));
router.post('/public/school-registrations', (req, res, next) =>
  publicPortalController.registerSchool(req, res, next)
);

router.post('/service/trips/:tripId/guardian-consent', requireServiceAuth, (req, res, next) =>
  parentConsentController.recordFromParentPortal(req, res, next)
);

const superadmin = Router();
superadmin.use(authenticate, requireModuleLicense, requireSuperAdmin);
superadmin.get('/school-registrations', (req, res, next) =>
  superadminRegistrationsController.list(req, res, next)
);
superadmin.patch('/school-registrations/:id', (req, res, next) =>
  superadminRegistrationsController.review(req, res, next)
);
router.use('/superadmin', superadmin);

/** Government routes must be registered before the school router. The school stack uses
 *  router-level auth + tenant middleware; mounting it at `/` first caused every path
 *  (including `/government/*`) to hit `requireTenant` and fail for platform-org officials. */
const government = Router();
government.use(authenticate, requireModuleLicense, requireGovernmentAccess);
government.use(governmentRoutes);

router.use('/government', government);

const school = Router();
school.use(authenticate, requireModuleLicense, requireTenant);
school.get('/dashboard', (req, res, next) => dashboardController.schoolSummary(req, res, next));
school.get('/students', (req, res, next) => studentsController.list(req, res, next));
school.get('/classes', (req, res, next) => studentsController.classes(req, res, next));
school.use('/trips', tripRoutes);

router.use(school);

export default router;
