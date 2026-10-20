import { Router } from 'express';
import { rootAdminController } from '../controllers/root-admin.controller';
import { moduleManagementController } from '../controllers/module-management.controller';
import { organizationRegistrationController } from '../controllers/organization-registration.controller';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../constants/roles';

const router = Router();

// Public invitation endpoints (invitee is not authenticated yet)
router.get('/invitations/verify', (req, res, next) =>
  rootAdminController.verifyInvitation(req, res, next)
);
router.post('/invitations/accept', (req, res, next) =>
  rootAdminController.acceptInvitation(req, res, next)
);

router.use(authenticate, requireRole(ROLES.ROOT_ADMIN));

router.get('/locations/provinces', (req, res, next) =>
  organizationRegistrationController.listProvinces(req, res, next)
);
router.get('/locations/provinces/:provinceId/districts', (req, res, next) =>
  organizationRegistrationController.listDistricts(req, res, next)
);
router.get('/locations/districts/:districtId/sectors', (req, res, next) =>
  organizationRegistrationController.listSectors(req, res, next)
);
router.get('/locations/sectors/:sectorId/cells', (req, res, next) =>
  organizationRegistrationController.listCells(req, res, next)
);
router.get('/locations/cells/:cellId/villages', (req, res, next) =>
  organizationRegistrationController.listVillages(req, res, next)
);
router.get('/locations/districts/:districtId/preview-code', (req, res, next) =>
  organizationRegistrationController.previewCode(req, res, next)
);

router.get('/dashboard', (req, res, next) => rootAdminController.dashboard(req, res, next));
router.get('/organizations', (req, res, next) => rootAdminController.organizations(req, res, next));
router.post('/organizations', (req, res, next) =>
  rootAdminController.createOrganization(req, res, next)
);
router.get('/organizations/:id/module-control', (req, res, next) =>
  moduleManagementController.getModuleControl(req, res, next)
);
router.get('/organizations/:id/provision-logs', (req, res, next) =>
  moduleManagementController.listProvisionLogs(req, res, next)
);
router.patch('/organizations/:id/modules/:moduleId', (req, res, next) =>
  moduleManagementController.patchOrgModule(req, res, next)
);
router.post('/organizations/:id/modules/:moduleId/provision', (req, res, next) =>
  moduleManagementController.provisionOrgModule(req, res, next)
);
router.get('/organizations/:id', (req, res, next) =>
  rootAdminController.organizationDetails(req, res, next)
);
router.get('/organizations/:id/users', (req, res, next) =>
  rootAdminController.listOrganizationUsers(req, res, next)
);
router.get('/organizations/:id/licensed-modules', (req, res, next) =>
  rootAdminController.listOrganizationLicensedModules(req, res, next)
);
router.post('/organizations/:id/users', (req, res, next) =>
  rootAdminController.createOrganizationUser(req, res, next)
);
router.get('/platform-users', (req, res, next) =>
  rootAdminController.listPlatformUsers(req, res, next)
);
router.get('/platform-users/modules', (req, res, next) =>
  rootAdminController.listPlatformUserModules(req, res, next)
);
router.post('/platform-users', (req, res, next) =>
  rootAdminController.createPlatformUser(req, res, next)
);
router.get('/print-card/users', (req, res, next) =>
  rootAdminController.listPrintCardUsers(req, res, next)
);
router.post('/print-card/users', (req, res, next) =>
  rootAdminController.createPrintCardUser(req, res, next)
);
router.get('/nesa-dashboard/users', (req, res, next) =>
  rootAdminController.listNesaDashboardUsers(req, res, next)
);
router.post('/nesa-dashboard/users', (req, res, next) =>
  rootAdminController.createNesaDashboardUser(req, res, next)
);
router.patch('/platform-users/:id', (req, res, next) =>
  rootAdminController.updatePlatformUser(req, res, next)
);
router.delete('/platform-users/:id', (req, res, next) =>
  rootAdminController.deletePlatformUser(req, res, next)
);
router.post('/platform-users/:id/reset-password', (req, res, next) =>
  rootAdminController.resetPlatformUserPassword(req, res, next)
);
router.patch('/organizations/:id', (req, res, next) =>
  rootAdminController.updateOrganization(req, res, next)
);
router.put('/organizations/:id/profile', (req, res, next) =>
  rootAdminController.updateOrganizationProfile(req, res, next)
);
router.delete('/organizations/:id', (req, res, next) =>
  rootAdminController.deleteOrganization(req, res, next)
);
router.post('/organizations/:id/transfer', (req, res, next) =>
  rootAdminController.transferOwnership(req, res, next)
);
router.put('/organizations/:id/admin-credentials', (req, res, next) =>
  rootAdminController.updateOrganizationAdminCredentials(req, res, next)
);
router.get('/modules', (req, res, next) => rootAdminController.modules(req, res, next));
router.patch('/modules/:id', (req, res, next) =>
  rootAdminController.toggleModule(req, res, next)
);

router.get('/module-catalog/stats', (req, res, next) =>
  moduleManagementController.catalogStats(req, res, next)
);
router.get('/module-catalog', (req, res, next) => moduleManagementController.listCatalog(req, res, next));
router.get('/module-catalog/:id', (req, res, next) => moduleManagementController.getModule(req, res, next));
router.post('/module-catalog', (req, res, next) => moduleManagementController.createModule(req, res, next));
router.patch('/module-catalog/:id', (req, res, next) => moduleManagementController.updateModule(req, res, next));
router.delete('/module-catalog/:id', (req, res, next) => moduleManagementController.deleteModule(req, res, next));
router.get('/module-assignments/organizations/:organizationId', (req, res, next) =>
  moduleManagementController.listOrgAssignments(req, res, next)
);
router.put('/module-assignments/organizations/:organizationId', (req, res, next) =>
  moduleManagementController.assignModules(req, res, next)
);
router.get('/module-provisioning/queue', (req, res, next) =>
  moduleManagementController.provisioningQueue(req, res, next)
);
router.post('/module-provisioning/provision-all', (req, res, next) =>
  moduleManagementController.provisionAll(req, res, next)
);
router.post('/module-provisioning/:id/provision', (req, res, next) =>
  moduleManagementController.provisionTenant(req, res, next)
);
router.get('/module-provisioning/organizations/:organizationId/licensed', (req, res, next) =>
  moduleManagementController.licensedModules(req, res, next)
);
router.get('/subscription-plans', (req, res, next) => subscriptionController.listPlans(req, res, next));
router.post('/subscription-plans', (req, res, next) => subscriptionController.createPlan(req, res, next));
router.patch('/subscription-plans/:id', (req, res, next) =>
  subscriptionController.updatePlan(req, res, next)
);
router.get('/subscriptions', (req, res, next) =>
  subscriptionController.listOrgSubscriptions(req, res, next)
);
router.get('/subscriptions/:orgId', (req, res, next) =>
  subscriptionController.getOrgSubscription(req, res, next)
);
router.put('/subscriptions/:orgId', (req, res, next) =>
  subscriptionController.assignPlan(req, res, next)
);
router.post('/subscriptions/:orgId/actions', (req, res, next) =>
  subscriptionController.subscriptionAction(req, res, next)
);
router.get('/audit-logs', (req, res, next) => rootAdminController.auditLogs(req, res, next));
router.get('/audit-logs/access-analytics', (req, res, next) =>
  rootAdminController.auditAccessAnalytics(req, res, next)
);
router.get('/emergency-controls', (req, res, next) =>
  rootAdminController.emergencyControls(req, res, next)
);
router.patch('/emergency-controls', (req, res, next) =>
  rootAdminController.emergencyControls(req, res, next)
);
router.get('/super-admins', (req, res, next) => rootAdminController.superAdmins(req, res, next));
router.post('/super-admins', (req, res, next) =>
  rootAdminController.createSuperAdmin(req, res, next)
);
router.patch('/super-admins/:id', (req, res, next) =>
  rootAdminController.updateSuperAdmin(req, res, next)
);
router.post('/super-admins/:id/reset-password', (req, res, next) =>
  rootAdminController.resetSuperAdminPassword(req, res, next)
);
router.delete('/super-admins/:id', (req, res, next) =>
  rootAdminController.deleteSuperAdmin(req, res, next)
);
router.get('/platform-administrators/stats', (req, res, next) =>
  rootAdminController.platformAdminStats(req, res, next)
);
router.get('/platform-administrators', (req, res, next) =>
  rootAdminController.platformAdmins(req, res, next)
);
router.post('/platform-administrators', (req, res, next) =>
  rootAdminController.createPlatformAdmin(req, res, next)
);
router.get('/platform-administrators/:id', (req, res, next) =>
  rootAdminController.platformAdminDetails(req, res, next)
);
router.delete('/platform-administrators/:id', (req, res, next) =>
  rootAdminController.deletePlatformAdmin(req, res, next)
);
router.post('/platform-administrators/:id/sessions/:sessionId/terminate', (req, res, next) =>
  rootAdminController.terminateAdminSession(req, res, next)
);
router.post('/platform-administrators/:id/sessions/terminate-all', (req, res, next) =>
  rootAdminController.terminateAllAdminSessions(req, res, next)
);
router.get('/system-health', (req, res, next) =>
  rootAdminController.systemHealth(req, res, next)
);
router.post('/users/:id/suspend', (req, res, next) =>
  rootAdminController.suspendUser(req, res, next)
);
router.patch('/users/:id/status', (req, res, next) =>
  rootAdminController.updateUserStatus(req, res, next)
);

export default router;
