import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { websiteController } from '../controllers/website.controller';
import { uploadController } from '../controllers/upload.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { publicController } from '../controllers/public.controller';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'mini-website-service',
    module: 'mini-website',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

/** Unauthenticated endpoints used by public school websites (applications). */
const publicRouter = Router();
publicRouter.get('/schools', (req, res, next) => publicController.listSchools(req, res, next));
publicRouter.get('/schools/lookup', (req, res, next) =>
  publicController.lookupSchoolByOrganization(req, res, next)
);
publicRouter.post('/:slug/apply', (req, res, next) => publicController.apply(req, res, next));
publicRouter.get('/:slug/circulars/options', (req, res, next) => publicController.circularOptions(req, res, next));
publicRouter.get('/:slug/circulars/:id/print', (req, res, next) => publicController.circularPrint(req, res, next));
publicRouter.get('/:slug/circulars', (req, res, next) => publicController.circularList(req, res, next));
router.use('/public', publicRouter);

/** School-admin endpoints — the Mini-Website module is managed by each school. */
const orgRouter = Router();
orgRouter.use(authenticate, requireModuleLicense, requireTenant);

orgRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));
orgRouter.post('/upload/image', (req, res, next) => uploadController.image(req, res, next));

orgRouter.get('/websites/me', (req, res, next) => websiteController.get(req, res, next));
orgRouter.put('/websites/me', (req, res, next) => websiteController.update(req, res, next));
orgRouter.put('/websites/me/slug', (req, res, next) => websiteController.updateSlug(req, res, next));
orgRouter.post('/websites/me/publish', (req, res, next) => websiteController.publish(req, res, next));
orgRouter.post('/websites/me/unpublish', (req, res, next) => websiteController.unpublish(req, res, next));
orgRouter.post('/websites/me/regenerate', (req, res, next) => websiteController.regenerate(req, res, next));
orgRouter.post('/websites/me/preview', (req, res, next) => websiteController.preview(req, res, next));

orgRouter.get('/websites/me/pages', (req, res, next) => websiteController.listPages(req, res, next));
orgRouter.post('/websites/me/pages', (req, res, next) => websiteController.createPage(req, res, next));
orgRouter.put('/websites/me/pages/:id', (req, res, next) => websiteController.updatePage(req, res, next));
orgRouter.delete('/websites/me/pages/:id', (req, res, next) => websiteController.deletePage(req, res, next));

orgRouter.get('/websites/me/applicants', (req, res, next) =>
  websiteController.listApplicants(req, res, next)
);
orgRouter.put('/websites/me/applicants/:id/status', (req, res, next) =>
  websiteController.updateApplicantStatus(req, res, next)
);

router.use(orgRouter);

export default router;
