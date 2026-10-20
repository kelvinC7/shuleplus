import { Router } from 'express';
import { rootAdminController } from '../controllers/root-admin.controller';
import { moduleManagementController } from '../controllers/module-management.controller';
import { organizationRegistrationController } from '../controllers/organization-registration.controller';
import { subscriptionController } from '../controllers/subscription.controller';
import { smartAccessController } from '../controllers/smart-access.controller';
import { gateDevicesController } from '../controllers/gate-devices.controller';
import { smsBulkController } from '../controllers/sms-bulk.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../constants/roles';
import { schoolRepresentativeController } from '../controllers/school-representative.controller';
import { chiefAccountantController } from '../controllers/chief-accountant.controller';
import { seiOfficerController } from '../controllers/sei-officer.controller';
import { deoOfficerController } from '../controllers/deo-officer.controller';

const router = Router();

router.use(authenticate, requireRole(ROLES.SUPER_ADMIN));

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

router.get('/smart-access/schools', (req, res, next) =>
  smartAccessController.schools(req, res, next)
);
router.get('/smart-access/schools/:organizationId/classes', (req, res, next) =>
  smartAccessController.classes(req, res, next)
);
router.get('/smart-access/schools/:organizationId/parents', (req, res, next) =>
  smartAccessController.parents(req, res, next)
);
router.patch('/smart-access/schools/:organizationId/parents/sms-bulk', (req, res, next) =>
  smartAccessController.bulkParentSms(req, res, next)
);
router.patch('/smart-access/schools/:organizationId/parents/:parentId/sms-toggle', (req, res, next) =>
  smartAccessController.toggleParentSms(req, res, next)
);
router.get('/smart-access/schools/:organizationId/students', (req, res, next) =>
  smartAccessController.students(req, res, next)
);
router.get('/smart-access/schools/:organizationId/staff', (req, res, next) =>
  smartAccessController.staff(req, res, next)
);
router.put('/smart-access/schools/:organizationId/students/:studentId/identity', (req, res, next) =>
  smartAccessController.updateStudentIdentity(req, res, next)
);
router.put('/smart-access/schools/:organizationId/staff/:staffId/identity', (req, res, next) =>
  smartAccessController.updateStaffIdentity(req, res, next)
);

router.get('/gate-devices/schools', (req, res, next) =>
  gateDevicesController.schools(req, res, next)
);
router.get('/gate-devices/schools/:organizationId/devices', (req, res, next) =>
  gateDevicesController.listDevices(req, res, next)
);
router.post('/gate-devices/schools/:organizationId/devices', (req, res, next) =>
  gateDevicesController.createDevice(req, res, next)
);
router.post('/gate-devices/schools/:organizationId/devices/:deviceId/api-key/rotate', (req, res, next) =>
  gateDevicesController.rotateApiKey(req, res, next)
);
router.patch('/gate-devices/schools/:organizationId/devices/:deviceId', (req, res, next) =>
  gateDevicesController.updateDevice(req, res, next)
);
router.delete('/gate-devices/schools/:organizationId/devices/:deviceId', (req, res, next) =>
  gateDevicesController.deleteDevice(req, res, next)
);

router.get('/organization-registrations', (req, res, next) =>
  organizationRegistrationController.list(req, res, next)
);
router.get('/organization-registrations/:id', (req, res, next) =>
  organizationRegistrationController.getById(req, res, next)
);
router.post('/organization-registrations/draft', (req, res, next) =>
  organizationRegistrationController.saveDraft(req, res, next)
);
router.post('/organization-registrations/submit', (req, res, next) =>
  organizationRegistrationController.submit(req, res, next)
);
router.post('/organization-registrations/:id/approve', (req, res, next) =>
  organizationRegistrationController.approve(req, res, next)
);
router.post('/organization-registrations/:id/reject', (req, res, next) =>
  organizationRegistrationController.reject(req, res, next)
);

router.get('/module-assignments/organizations/:organizationId', (req, res, next) =>
  moduleManagementController.listOrgAssignments(req, res, next)
);
router.put('/module-assignments/organizations/:organizationId', (req, res, next) =>
  moduleManagementController.assignModules(req, res, next)
);
router.get('/module-catalog/stats', (req, res, next) =>
  moduleManagementController.catalogStats(req, res, next)
);
router.get('/module-catalog', (req, res, next) => moduleManagementController.listCatalog(req, res, next));
router.get('/module-catalog/:id', (req, res, next) => moduleManagementController.getModule(req, res, next));
router.post('/module-catalog', (req, res, next) => moduleManagementController.createModule(req, res, next));
router.patch('/module-catalog/:id', (req, res, next) => moduleManagementController.updateModule(req, res, next));
router.delete('/module-catalog/:id', (req, res, next) => moduleManagementController.deleteModule(req, res, next));
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
router.get('/audit-logs', (req, res, next) => rootAdminController.auditLogs(req, res, next));
router.get('/audit-logs/access-analytics', (req, res, next) =>
  rootAdminController.auditAccessAnalytics(req, res, next)
);

router.get('/sms/status', (req, res) => smsBulkController.status(req, res));
router.post('/sms/send', (req, res, next) => smsBulkController.send(req, res, next));
router.post('/sms/send-bulk', (req, res, next) => smsBulkController.sendBulk(req, res, next));

router.get('/representatives', (req, res, next) =>
  schoolRepresentativeController.adminList(req, res, next)
);
router.get('/representatives/assignable-schools', (req, res, next) =>
  schoolRepresentativeController.adminAssignableSchools(req, res, next)
);
router.get('/representatives/:id', (req, res, next) =>
  schoolRepresentativeController.adminGet(req, res, next)
);
router.post('/representatives', (req, res, next) =>
  schoolRepresentativeController.adminCreate(req, res, next)
);
router.patch('/representatives/:id', (req, res, next) =>
  schoolRepresentativeController.adminUpdate(req, res, next)
);
router.put('/representatives/:id/assignments', (req, res, next) =>
  schoolRepresentativeController.adminSetAssignments(req, res, next)
);
router.delete('/representatives/:id', (req, res, next) =>
  schoolRepresentativeController.adminDelete(req, res, next)
);
router.post('/representatives/:id/reset-password', (req, res, next) =>
  schoolRepresentativeController.adminResetPassword(req, res, next)
);

router.get('/chief-accountants', (req, res, next) =>
  chiefAccountantController.adminList(req, res, next)
);
router.get('/chief-accountants/assignable-schools', (req, res, next) =>
  chiefAccountantController.adminAssignableSchools(req, res, next)
);
router.get('/chief-accountants/:id', (req, res, next) =>
  chiefAccountantController.adminGet(req, res, next)
);
router.post('/chief-accountants', (req, res, next) =>
  chiefAccountantController.adminCreate(req, res, next)
);
router.patch('/chief-accountants/:id', (req, res, next) =>
  chiefAccountantController.adminUpdate(req, res, next)
);
router.put('/chief-accountants/:id/assignments', (req, res, next) =>
  chiefAccountantController.adminSetAssignments(req, res, next)
);
router.delete('/chief-accountants/:id', (req, res, next) =>
  chiefAccountantController.adminDelete(req, res, next)
);
router.post('/chief-accountants/:id/reset-password', (req, res, next) =>
  chiefAccountantController.adminResetPassword(req, res, next)
);

router.get('/sei-officers', (req, res, next) => seiOfficerController.adminList(req, res, next));
router.get('/sei-officers/:id', (req, res, next) => seiOfficerController.adminGet(req, res, next));
router.post('/sei-officers', (req, res, next) => seiOfficerController.adminCreate(req, res, next));
router.patch('/sei-officers/:id', (req, res, next) => seiOfficerController.adminUpdate(req, res, next));
router.delete('/sei-officers/:id', (req, res, next) => seiOfficerController.adminDelete(req, res, next));
router.post('/sei-officers/:id/reset-password', (req, res, next) =>
  seiOfficerController.adminResetPassword(req, res, next)
);

router.get('/deo-officers', (req, res, next) => deoOfficerController.adminList(req, res, next));
router.get('/deo-officers/:id', (req, res, next) => deoOfficerController.adminGet(req, res, next));
router.post('/deo-officers', (req, res, next) => deoOfficerController.adminCreate(req, res, next));
router.patch('/deo-officers/:id', (req, res, next) => deoOfficerController.adminUpdate(req, res, next));
router.delete('/deo-officers/:id', (req, res, next) => deoOfficerController.adminDelete(req, res, next));
router.post('/deo-officers/:id/reset-password', (req, res, next) =>
  deoOfficerController.adminResetPassword(req, res, next)
);

export default router;
