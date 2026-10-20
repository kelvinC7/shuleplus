import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { sectorController } from '../controllers/sector.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'sector-mis-module-service',
    module: 'sector-mis',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));
protectedRouter.get('/sei/search', (req, res, next) => sectorController.search(req, res, next));
protectedRouter.get('/sei/settings', (req, res, next) => sectorController.settingsGet(req, res, next));
protectedRouter.patch('/sei/settings', (req, res, next) => sectorController.settingsPatch(req, res, next));
protectedRouter.get('/sei/morning', (req, res, next) => sectorController.morning(req, res, next));
protectedRouter.get('/sei/schools', (req, res, next) => sectorController.schools(req, res, next));
protectedRouter.get('/sei/schools/:schoolId', (req, res, next) => sectorController.schoolById(req, res, next));
protectedRouter.get('/sei/attention', (req, res, next) => sectorController.attention(req, res, next));
protectedRouter.get('/sei/devices', (req, res, next) => sectorController.devices(req, res, next));
protectedRouter.get('/sei/data-quality', (req, res, next) => sectorController.dataQuality(req, res, next));
protectedRouter.get('/sei/analytics', (req, res, next) => sectorController.analytics(req, res, next));
protectedRouter.get('/sei/students', (req, res, next) => sectorController.students(req, res, next));
protectedRouter.get('/sei/staff', (req, res, next) => sectorController.staff(req, res, next));
protectedRouter.get('/sei/map', (req, res, next) => sectorController.map(req, res, next));
protectedRouter.get('/sei/integrity', (req, res, next) => sectorController.integrity(req, res, next));
protectedRouter.get('/sei/reports/daily', (req, res, next) => sectorController.report(req, res, next));
protectedRouter.get('/sei/reports/daily.pdf', (req, res, next) => sectorController.reportPdf(req, res, next));
protectedRouter.post('/sei/notifications/critical', (req, res, next) => sectorController.notifyCritical(req, res, next));
protectedRouter.get('/sei/follow-up', (req, res, next) => sectorController.followUpList(req, res, next));
protectedRouter.post('/sei/follow-up', (req, res, next) => sectorController.followUpCreate(req, res, next));
protectedRouter.patch('/sei/follow-up/:caseId', (req, res, next) => sectorController.followUpUpdate(req, res, next));
protectedRouter.get('/sei/visits', (req, res, next) => sectorController.visitsList(req, res, next));
protectedRouter.post('/sei/visits', (req, res, next) => sectorController.visitStart(req, res, next));
protectedRouter.patch('/sei/visits/:visitId', (req, res, next) => sectorController.visitUpdate(req, res, next));

router.use(protectedRouter);

export default router;
