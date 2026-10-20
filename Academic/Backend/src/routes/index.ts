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
import assessmentTemplateRoutes from './assessment-template.routes';
import assignmentRoutes from './assignment.routes';
import resultsRoutes from './results.routes';
import academicSettingsRoutes from './academic-settings.routes';
import assessmentRoutes from './assessment.routes';
import gradingRoutes from './grading.routes';
import { gradingEngineController } from '../controllers/grading-engine.controller';
import competencyRoutes from './competency.routes';
import studentManagementRoutes from './student-management.routes';
import timetableRoutes from './timetable.routes';
import examPlanningRoutes from './exam-planning.routes';
import examInvigilatorRoutes from './exam-invigilator.routes';
import teacherPermissionRoutes from './teacher-permission.routes';
import roundRollCallRoutes from './round-roll-call.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'academic-module-service',
    module: 'academic',
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
router.get('/service/parents', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.listParents(req, res, next)
);
router.get('/service/parent-academics', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.parentAcademics(req, res, next)
);
router.put('/service/course-default-marks', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  gradingEngineController.upsertCourseDefaultMarksService(req, res, next)
);
router.get('/service/report-card/publications', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.listReportPublications(req, res, next)
);
router.get('/service/report-card/parent', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.parentReportCard(req, res, next)
);

/** Unauthenticated landing / payment-portal routes */
router.use('/public', publicRoutes);

router.use('/students', studentRoutes);
router.use('/classes', classRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/parents', parentRoutes);
router.use('/combinations', combinationRoutes);
router.use('/grades', gradeRoutes);
router.use('/subjects', subjectRoutes);
router.use('/exams', examRoutes);
router.use('/marks', markRoutes);
router.use('/upload', uploadRoutes);
router.use('/assessment-templates', assessmentTemplateRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/results', resultsRoutes);
router.use('/academic-settings', academicSettingsRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/grading', gradingRoutes);
router.use('/competency', competencyRoutes);
router.use('/sm', studentManagementRoutes);
router.use('/timetable', timetableRoutes);
router.use('/exam-sessions', examPlanningRoutes);
router.use('/exam-invigilator', examInvigilatorRoutes);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));
protectedRouter.use('/teacher-permissions', teacherPermissionRoutes);
protectedRouter.use('/round-roll-call', roundRollCallRoutes);

router.use(protectedRouter);

export default router;
