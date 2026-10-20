import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { serviceController } from '../controllers/service.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant, requireServiceTenant } from '../middleware/tenant.middleware';
import studentRoutes from './student.routes';
import classRoutes from './class.routes';
import enrollmentRoutes from './enrollment.routes';
import parentRoutes from './parent.routes';
import combinationRoutes from './combination.routes';
import gradeRoutes from './grade.routes';
import subjectRoutes from './subject.routes';
import examRoutes from './exam.routes';
import markRoutes from './mark.routes';
import uploadRoutes from './upload.routes';
import publicRoutes from './public.routes';
import settingsRoutes from './settings.routes';
import classMonitorRoutes from './class-monitor.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'student-management-module-service',
    module: 'student-management',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

/** Service-to-service: Timetable / Teacher Portal roster sync */
router.get('/service/classes', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.listClasses(req, res, next)
);
router.get('/service/students', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.listStudents(req, res, next)
);
router.get('/service/dashboard-summary', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.dashboardSummary(req, res, next)
);
router.post('/service/sector/batch-dashboard-summary', requireServiceAuth, (req, res, next) =>
  serviceController.batchDashboardSummary(req, res, next)
);
router.get('/service/rfid-lookup', requireServiceAuth, (req, res, next) =>
  serviceController.lookupRfidOwner(req, res, next)
);
router.put('/service/students/:studentId/identity', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.updateStudentIdentity(req, res, next)
);
router.post('/service/students/photos/apply', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.applyStudentPhotos(req, res, next)
);
router.patch('/service/students/:studentId/status', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.updateStudentStatus(req, res, next)
);
router.get('/service/parents', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.listParents(req, res, next)
);
router.patch('/service/parents/sms-bulk', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.bulkParentSms(req, res, next)
);
router.patch('/service/parents/:parentId/sms-toggle', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.toggleParentSms(req, res, next)
);
router.get('/service/academics', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.listAcademics(req, res, next)
);
router.get('/service/student-profile', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.studentProfile(req, res, next)
);
router.get('/service/subjects', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.listSubjects(req, res, next)
);
router.get('/service/tenant-profile', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.tenantProfile(req, res, next)
);
router.get('/service/class-monitors/lookup', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.lookupClassMonitor(req, res, next)
);

/** Unauthenticated landing / payment-portal routes */
router.use('/public', publicRoutes);

router.use('/students', studentRoutes);
router.use('/classes', classRoutes);
router.use('/class-monitors', classMonitorRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/parents', parentRoutes);
router.use('/combinations', combinationRoutes);
router.use('/grades', gradeRoutes);
router.use('/subjects', subjectRoutes);
router.use('/exams', examRoutes);
router.use('/marks', markRoutes);
router.use('/upload', uploadRoutes);
router.use('/settings', settingsRoutes);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));

router.use(protectedRouter);

export default router;
