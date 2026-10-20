import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { uploadController } from '../controllers/upload.controller';
import {
  authenticate,
  rejectSchoolKitManagement,
  requireModuleLicense,
  requireServiceAuth,
  requireSuperAdmin,
} from '../middleware/auth.middleware';
import { requireTenant, requireServiceTenant } from '../middleware/tenant.middleware';
import kitRoutes from './kit.routes';
import requestRoutes from './request.routes';
import publicRoutes from './public.routes';
import platformRoutes from './platform.routes';
import { parentStoreController } from '../controllers/parent-store.controller';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'shulekit-mis-service',
    module: 'shulekit-mis',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

/** Service-to-service: parent portal store (catalog + order history + custom orders). */
router.get('/service/store', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  parentStoreController.summary(req, res, next)
);
router.post('/service/store/orders', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  parentStoreController.createOrder(req, res, next)
);

/** Unauthenticated landing / parent-flow routes */
router.use('/public', publicRoutes);

/** Platform Super Admin APIs (no tenant / org license). */
router.use('/platform', platformRoutes);

/** Legacy school kit CRUD — blocked for org users; Super Admin only for backwards compat. */
router.use('/kits', kitRoutes);
router.use('/requests', requestRoutes);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireSuperAdmin);

protectedRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));
protectedRouter.post('/upload/image', (req, res, next) => uploadController.image(req, res, next));

/** Keep module-license path for any remaining org tooling, but reject school kit management. */
const legacyOrgRouter = Router();
legacyOrgRouter.use(authenticate, requireModuleLicense, requireTenant, rejectSchoolKitManagement);
legacyOrgRouter.get('/org/dashboard', (req, res, next) => dashboardController.summary(req, res, next));

router.use(protectedRouter);
router.use(legacyOrgRouter);

export default router;
