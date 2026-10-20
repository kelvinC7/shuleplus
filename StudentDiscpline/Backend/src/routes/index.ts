import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController, recordController } from '../controllers/dashboard.controller';
import { disciplineCaseController } from '../controllers/discipline-case.controller';
import {
  disciplineMarkController,
  integrationController,
} from '../controllers/discipline-mark.controller';
import { settingsController } from '../controllers/settings.controller';
import { permissionController } from '../controllers/permission.controller';
import { gateController } from '../controllers/gate.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant, requireServiceTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'student-discipline-service',
    module: 'student-discipline',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

router.get('/internal/gate-officer/check', requireServiceAuth, (req, res, next) =>
  gateController.checkOfficerInternal(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));
protectedRouter.get('/settings/academic', (req, res, next) => settingsController.getAcademic(req, res, next));
protectedRouter.get('/settings/discipline', (req, res, next) => settingsController.getDiscipline(req, res, next));
protectedRouter.patch('/settings/discipline', (req, res, next) => settingsController.updateDiscipline(req, res, next));
protectedRouter.post('/settings/discipline/seed-default-marks', (req, res, next) => settingsController.seedDefaultMarks(req, res, next));
protectedRouter.post('/settings/discipline/initialize-students', (req, res, next) => settingsController.initializeStudents(req, res, next));
protectedRouter.post('/settings/discipline/apply-starting-score', (req, res, next) => settingsController.applyStartingScore(req, res, next));

protectedRouter.get('/discipline/marks/stats', (req, res, next) => disciplineMarkController.stats(req, res, next));
protectedRouter.get('/discipline/marks', (req, res, next) => disciplineMarkController.list(req, res, next));
protectedRouter.post('/discipline/marks/seed-defaults', (req, res, next) => disciplineMarkController.seedDefaults(req, res, next));
protectedRouter.post('/discipline/marks', (req, res, next) => disciplineMarkController.create(req, res, next));
protectedRouter.patch('/discipline/marks/:id', (req, res, next) => disciplineMarkController.update(req, res, next));
protectedRouter.delete('/discipline/marks/:id', (req, res, next) => disciplineMarkController.remove(req, res, next));

protectedRouter.get('/integration/classes', (req, res, next) => integrationController.classes(req, res, next));
protectedRouter.get('/integration/students', (req, res, next) => integrationController.students(req, res, next));
protectedRouter.get('/integration/students/:studentId/profile', (req, res, next) => integrationController.studentProfile(req, res, next));
protectedRouter.get('/integration/students/:studentId/parents', (req, res, next) => integrationController.studentParents(req, res, next));
protectedRouter.post('/integration/preview-score', (req, res, next) => integrationController.previewScore(req, res, next));

protectedRouter.get('/discipline/cases/stats', (req, res, next) => disciplineCaseController.stats(req, res, next));
protectedRouter.get('/discipline/cases', (req, res, next) => disciplineCaseController.list(req, res, next));
protectedRouter.post('/discipline/cases', (req, res, next) => disciplineCaseController.create(req, res, next));
protectedRouter.patch('/discipline/cases/:id', (req, res, next) => disciplineCaseController.update(req, res, next));
protectedRouter.post('/discipline/cases/:id/notify', (req, res, next) => disciplineCaseController.notify(req, res, next));
protectedRouter.delete('/discipline/cases/:id', (req, res, next) => disciplineCaseController.remove(req, res, next));
protectedRouter.post('/discipline/seed-samples', (req, res, next) =>
  disciplineCaseController.seedSamples(req, res, next)
);

protectedRouter.get('/permissions/stats', (req, res, next) => permissionController.stats(req, res, next));
protectedRouter.get('/permissions', (req, res, next) => permissionController.list(req, res, next));
protectedRouter.get('/permissions/:id', (req, res, next) => permissionController.getById(req, res, next));
protectedRouter.post('/permissions', (req, res, next) => permissionController.create(req, res, next));
protectedRouter.post('/permissions/:id/:action', (req, res, next) => permissionController.action(req, res, next));

protectedRouter.get('/gate/dashboard', (req, res, next) => gateController.dashboard(req, res, next));
protectedRouter.get('/gate/me', (req, res, next) => gateController.me(req, res, next));
protectedRouter.get('/gate/gates', (req, res, next) => gateController.gates(req, res, next));
protectedRouter.post('/gate/gates', (req, res, next) => gateController.createGate(req, res, next));
protectedRouter.patch('/gate/gates/:id', (req, res, next) => gateController.updateGate(req, res, next));
protectedRouter.get('/gate/officers', (req, res, next) => gateController.officers(req, res, next));
protectedRouter.post('/gate/officers', (req, res, next) => gateController.createOfficer(req, res, next));
protectedRouter.patch('/gate/officers/:id', (req, res, next) => gateController.updateOfficer(req, res, next));
protectedRouter.delete('/gate/officers/:id', (req, res, next) => gateController.deleteOfficer(req, res, next));
protectedRouter.get('/gate/scan', (req, res, next) => gateController.scan(req, res, next));
protectedRouter.post('/gate/scan', (req, res, next) => gateController.scan(req, res, next));
protectedRouter.get('/gate/permissions/today', (req, res, next) => gateController.todayPermissions(req, res, next));
protectedRouter.get('/gate/outside', (req, res, next) => gateController.outside(req, res, next));
protectedRouter.get('/gate/overdue', (req, res, next) => gateController.overdue(req, res, next));
protectedRouter.get('/gate/logs', (req, res, next) => gateController.logs(req, res, next));
protectedRouter.post('/gate/overdue/notify', (req, res, next) => gateController.processOverdue(req, res, next));
protectedRouter.get('/gate/permissions/:permissionId/verify', (req, res, next) => gateController.verifyExit(req, res, next));
protectedRouter.post('/gate/permissions/:permissionId/checkout', (req, res, next) => gateController.checkout(req, res, next));
protectedRouter.post('/gate/permissions/:permissionId/checkin', (req, res, next) => gateController.checkin(req, res, next));
protectedRouter.post('/gate/emergency-exit', (req, res, next) => gateController.emergencyExit(req, res, next));

router.get('/service/discipline/cases', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  disciplineCaseController.listService(req, res, next)
);

router.post('/service/discipline/cases', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  disciplineCaseController.createService(req, res, next)
);

router.get('/service/discipline/marks', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  disciplineMarkController.listService(req, res, next)
);

router.get('/service/permissions', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  permissionController.listService(req, res, next)
);

router.use(protectedRouter);

export default router;
