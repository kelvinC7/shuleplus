import { Router } from 'express';
import { iamController } from '../controllers/iam.controller';
import { organizationAdminController } from '../controllers/organization-admin.controller';
import { admissionController } from '../controllers/admission.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../constants/roles';
import schoolRepresentativeRoutes from './school-representative.routes';
import chiefAccountantRoutes from './chief-accountant.routes';

const router = Router();

router.use(authenticate);

router.get('/me/modules', (req, res, next) => iamController.myModules(req, res, next));
router.get('/me/modules/:moduleSlug/visibility', (req, res, next) =>
  organizationAdminController.moduleVisibility(req, res, next)
);

const orgAdminRouter = Router();
orgAdminRouter.use(requireRole(ROLES.ORGANIZATION_ADMIN, ROLES.ROOT_ADMIN, ROLES.SUPER_ADMIN));

orgAdminRouter.get('/modules', (req, res, next) =>
  organizationAdminController.licensedModules(req, res, next)
);
orgAdminRouter.get('/modules/catalog', (req, res, next) =>
  organizationAdminController.moduleCatalog(req, res, next)
);
orgAdminRouter.post('/modules/enroll', (req, res, next) =>
  organizationAdminController.enrollModule(req, res, next)
);
orgAdminRouter.get('/users', (req, res, next) =>
  organizationAdminController.listUsers(req, res, next)
);
orgAdminRouter.get('/departments', (req, res, next) =>
  organizationAdminController.listDepartments(req, res, next)
);
orgAdminRouter.post('/departments', (req, res, next) =>
  organizationAdminController.createDepartment(req, res, next)
);
orgAdminRouter.delete('/departments/:departmentId', (req, res, next) =>
  organizationAdminController.deleteDepartment(req, res, next)
);
orgAdminRouter.get('/users/:userId', (req, res, next) =>
  organizationAdminController.getUser(req, res, next)
);
orgAdminRouter.get('/users/:userId/photo-sources', (req, res, next) =>
  organizationAdminController.getUserPhotoSources(req, res, next)
);
orgAdminRouter.post('/users', (req, res, next) =>
  organizationAdminController.createUser(req, res, next)
);
orgAdminRouter.put('/users/:userId', (req, res, next) =>
  organizationAdminController.updateUser(req, res, next)
);
orgAdminRouter.delete('/users/:userId', (req, res, next) =>
  organizationAdminController.deleteUser(req, res, next)
);
orgAdminRouter.put('/users/:userId/modules', (req, res, next) =>
  organizationAdminController.setUserModules(req, res, next)
);
orgAdminRouter.patch('/users/:userId/status', (req, res, next) =>
  organizationAdminController.updateUserStatus(req, res, next)
);
orgAdminRouter.post('/users/:userId/reset-password', (req, res, next) =>
  organizationAdminController.resetUserPassword(req, res, next)
);
orgAdminRouter.get('/usage', (req, res, next) =>
  organizationAdminController.usageStats(req, res, next)
);
orgAdminRouter.get('/access-audit', (req, res, next) =>
  organizationAdminController.accessAudit(req, res, next)
);
orgAdminRouter.get('/academic-settings', (req, res, next) =>
  organizationAdminController.getAcademicSettings(req, res, next)
);
orgAdminRouter.put('/academic-settings', (req, res, next) =>
  organizationAdminController.updateAcademicSettings(req, res, next)
);
orgAdminRouter.get('/chief-accountants', (req, res, next) =>
  organizationAdminController.listChiefAccountants(req, res, next)
);
orgAdminRouter.patch('/chief-accountants/:userId', (req, res, next) =>
  organizationAdminController.updateChiefAccountantAssignment(req, res, next)
);
orgAdminRouter.get('/profile', (req, res, next) =>
  organizationAdminController.getOrganizationProfile(req, res, next)
);
orgAdminRouter.put('/profile', (req, res, next) =>
  organizationAdminController.updateOrganizationProfile(req, res, next)
);

orgAdminRouter.get('/admissions/settings', (req, res, next) =>
  admissionController.getSettings(req, res, next)
);
orgAdminRouter.put('/admissions/settings', (req, res, next) =>
  admissionController.updateSettings(req, res, next)
);
orgAdminRouter.get('/admissions/applications', (req, res, next) =>
  admissionController.listApplications(req, res, next)
);
orgAdminRouter.get('/admissions/applications/:applicationId', (req, res, next) =>
  admissionController.getApplication(req, res, next)
);
orgAdminRouter.patch('/admissions/applications/:applicationId/status', (req, res, next) =>
  admissionController.updateStatus(req, res, next)
);

router.use('/org', orgAdminRouter);
router.use('/representative', schoolRepresentativeRoutes);
router.use('/chief-accountant', chiefAccountantRoutes);

export default router;
