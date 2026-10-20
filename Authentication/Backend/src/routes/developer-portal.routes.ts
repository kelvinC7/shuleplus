import { Router } from 'express';
import { developerPortalController } from '../controllers/developer-portal.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { authenticateDeveloper, requireDeveloperAccess } from '../middleware/developer-auth.middleware';
import { authenticateGateway } from '../middleware/developer-gateway.middleware';
import { DeveloperAccessLevels } from '../constants/developer-access';
import { ROLES } from '../constants/roles';

const router = Router();

// Public developer auth
router.post('/auth/login', (req, res, next) => developerPortalController.login(req, res, next));
router.post('/auth/mfa/verify', (req, res, next) => developerPortalController.completeMfa(req, res, next));
router.post('/auth/refresh', (req, res, next) => developerPortalController.refresh(req, res, next));
router.get('/auth/activate/validate', (req, res, next) =>
  developerPortalController.validateActivation(req, res, next)
);
router.post('/auth/activate', (req, res, next) => developerPortalController.activate(req, res, next));

// OAuth client credentials (API clients)
router.post('/oauth/token', (req, res, next) => developerPortalController.oauthToken(req, res, next));

// API Gateway — developer session JWT or OAuth API client token
router.post('/gateway/proxy', authenticateGateway, (req, res, next) =>
  developerPortalController.gatewayProxyPost(req, res, next)
);

const gatewayRouter = Router({ mergeParams: true });
for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
  gatewayRouter[method]('/*path', (req, res, next) =>
    developerPortalController.gatewayProxy(req, res, next)
  );
}
router.use('/gateway/:moduleSlug', authenticateGateway, gatewayRouter);

// OpenAPI specs (developer auth)
router.get('/docs/openapi.json', authenticateDeveloper, (req, res, next) =>
  developerPortalController.openApiSpec(req, res, next)
);
router.get('/docs/openapi/:moduleSlug.json', authenticateDeveloper, (req, res, next) =>
  developerPortalController.openApiSpec(req, res, next)
);

// Authenticated developer portal
router.use(authenticateDeveloper);

router.get('/me', (req, res, next) => developerPortalController.me(req, res, next));
router.get('/dashboard', (req, res, next) => developerPortalController.dashboard(req, res, next));
router.get('/analytics/endpoints', (req, res, next) => developerPortalController.endpointStats(req, res, next));
router.get('/notifications', (req, res, next) => developerPortalController.developerNotifications(req, res, next));

router.post('/mfa/setup', (req, res, next) => developerPortalController.setupMfa(req, res, next));
router.post('/mfa/verify-setup', (req, res, next) => developerPortalController.verifyMfaSetup(req, res, next));

router.get('/applications', (req, res, next) => developerPortalController.listApplications(req, res, next));
router.post(
  '/applications',
  requireDeveloperAccess(DeveloperAccessLevels.DEVELOPER, DeveloperAccessLevels.TECHNICAL_ADMIN),
  (req, res, next) => developerPortalController.createApplication(req, res, next)
);
router.post(
  '/applications/:applicationId/rotate-secret',
  requireDeveloperAccess(DeveloperAccessLevels.DEVELOPER, DeveloperAccessLevels.TECHNICAL_ADMIN),
  (req, res, next) => developerPortalController.rotateSecret(req, res, next)
);

router.get('/docs/catalog', (req, res, next) => developerPortalController.apiCatalog(req, res, next));
router.get('/sandbox', (req, res, next) => developerPortalController.sandboxOverview(req, res, next));
router.post('/sandbox/production-request', (req, res, next) =>
  developerPortalController.requestProduction(req, res, next)
);
router.get('/docs/postman', (req, res, next) => developerPortalController.postmanExport(req, res, next));
router.get('/logs', (req, res, next) => developerPortalController.apiLogs(req, res, next));

router.get('/webhooks', (req, res, next) => developerPortalController.listWebhooks(req, res, next));
router.post(
  '/webhooks',
  requireDeveloperAccess(DeveloperAccessLevels.DEVELOPER, DeveloperAccessLevels.TECHNICAL_ADMIN),
  (req, res, next) => developerPortalController.createWebhook(req, res, next)
);

router.get('/security', (req, res, next) => developerPortalController.securityOverview(req, res, next));
router.get('/security/sessions', (req, res, next) => developerPortalController.sessions(req, res, next));
router.post('/security/sessions/revoke-others', (req, res, next) =>
  developerPortalController.revokeSessions(req, res, next)
);

export default router;

// Super Admin routes — mounted separately
export const developerAdminRouter = Router();
developerAdminRouter.use(authenticate, requireRole(ROLES.SUPER_ADMIN));

developerAdminRouter.get('/partners', (req, res, next) =>
  developerPortalController.adminListPartners(req, res, next)
);
developerAdminRouter.post('/partners', (req, res, next) =>
  developerPortalController.adminCreatePartner(req, res, next)
);
developerAdminRouter.post('/partners/:id/link-sandbox', (req, res, next) =>
  developerPortalController.adminLinkPartnerSandbox(req, res, next)
);
developerAdminRouter.get('/developers', (req, res, next) =>
  developerPortalController.adminListDevelopers(req, res, next)
);
developerAdminRouter.get('/developers/:id', (req, res, next) =>
  developerPortalController.adminGetDeveloper(req, res, next)
);
developerAdminRouter.post('/developers', (req, res, next) =>
  developerPortalController.adminCreateDeveloper(req, res, next)
);
developerAdminRouter.post('/developers/:id/suspend', (req, res, next) =>
  developerPortalController.adminSuspendDeveloper(req, res, next)
);
developerAdminRouter.post('/developers/:id/activate', (req, res, next) =>
  developerPortalController.adminActivateDeveloper(req, res, next)
);
developerAdminRouter.patch('/developers/:id', (req, res, next) =>
  developerPortalController.adminUpdateDeveloper(req, res, next)
);
developerAdminRouter.post('/developers/:id/resend-activation', (req, res, next) =>
  developerPortalController.adminResendDeveloperActivation(req, res, next)
);
developerAdminRouter.delete('/developers/:id', (req, res, next) =>
  developerPortalController.adminDeleteDeveloper(req, res, next)
);
developerAdminRouter.get('/partners/:id/bank-onboarding-email', (req, res, next) =>
  developerPortalController.adminBankOnboardingEmail(req, res, next)
);
developerAdminRouter.get('/permission-config', (req, res, next) =>
  developerPortalController.adminPermissionConfig(req, res, next)
);
developerAdminRouter.get('/portal-settings', (req, res, next) =>
  developerPortalController.adminGetPortalSettings(req, res, next)
);
developerAdminRouter.patch('/portal-settings', (req, res, next) =>
  developerPortalController.adminUpdatePortalSettings(req, res, next)
);
developerAdminRouter.get('/production-requests', (req, res, next) =>
  developerPortalController.adminListProductionRequests(req, res, next)
);
developerAdminRouter.post('/production-requests/:id/approve', (req, res, next) =>
  developerPortalController.adminApproveProduction(req, res, next)
);
developerAdminRouter.post('/production-requests/:id/reject', (req, res, next) =>
  developerPortalController.adminRejectProduction(req, res, next)
);
