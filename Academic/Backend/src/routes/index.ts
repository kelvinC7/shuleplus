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
import { attachAcademicScope, requireAcademicOrgWideForWrites, scopeSummary } from '../middleware/academic-scope';
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
import examinationTimetableRoutes from './examination-timetable.routes';
import examinationListRoutes from './examination-list.routes';
import examinationInvigilatorManagementRoutes from './examination-invigilator-management.routes';
import { examinationInvigilatorService } from '../services/examination-invigilator.service';
import teacherPermissionRoutes from './teacher-permission.routes';
import roundRollCallRoutes from './round-roll-call.routes';
import marksDemoRoutes from './marks-demo.routes';
import marksSubmissionRoutes from './marks-submission.routes';
import academicAuditRoutes from './academic-audit.routes';
import nurseryRoutes from './nursery.routes';

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
router.get('/service/marks-overview', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.marksOverview(req, res, next)
);
router.get('/service/examination-invigilator-assignments', requireServiceAuth, requireServiceTenant, async (req, res, next) => {
  try {
    const organizationId = (req as any).organizationRef || String(req.query.organizationId || '');
    const teacherUserId = String(req.query.teacherUserId || '');
    if (!organizationId || !teacherUserId) {
      res.status(400).json({ success: false, message: 'organizationId and teacherUserId are required' });
      return;
    }
    const data = await examinationInvigilatorService.teacherAssignments(organizationId, teacherUserId, {
      date: typeof req.query.date === 'string' ? req.query.date : undefined,
      examinationListId: typeof req.query.examinationListId === 'string' ? req.query.examinationListId : undefined,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});
router.get('/service/examination-attendance', requireServiceAuth, requireServiceTenant, async (req, res, next) => {
  try {
    const organizationId = (req as any).organizationRef || String(req.query.organizationId || '');
    const data = await examinationInvigilatorService.getExamAttendance(organizationId, {
      examinationListId: String(req.query.examinationListId || ''),
      roomId: String(req.query.roomId || ''),
      examDate: String(req.query.examDate || ''),
      session: String(req.query.session || '') as any,
      sessionCode: typeof req.query.sessionCode === 'string' ? req.query.sessionCode : undefined,
    });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});
router.post('/service/examination-attendance', requireServiceAuth, requireServiceTenant, async (req, res, next) => {
  try {
    const organizationId = (req as any).organizationRef || String(req.query.organizationId || '');
    const actor = { id: String(req.body?.markedByUserId || ''), name: String(req.body?.markedByName || '') };
    const data = await examinationInvigilatorService.markExamAttendance(organizationId, actor, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});
router.get('/service/parents', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.listParents(req, res, next)
);
router.get('/service/parent-academics', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.parentAcademics(req, res, next)
);
router.get('/service/parent-course-performance', requireServiceAuth, requireServiceTenant, (req, res, next) =>
  serviceController.parentCoursePerformance(req, res, next)
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

/**
 * Part-1 IAM data isolation: resolve HEAD/USER access for Academic once per
 * request and expose it through AsyncLocalStorage to every service query.
 */
const academicScopeRouter = Router();
academicScopeRouter.use(authenticate, requireModuleLicense, requireTenant, attachAcademicScope);
router.use(academicScopeRouter);

/** Current caller's Academic access, used by the UI to label own vs organization data. */
router.get('/me/scope', (req, res) => {
  const scope = (req as any).academicScope;
  if (!scope) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  res.json({ success: true, data: scopeSummary(scope) });
});

router.use('/students', studentRoutes);
router.use('/classes', requireAcademicOrgWideForWrites, classRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/parents', parentRoutes);
router.use('/combinations', requireAcademicOrgWideForWrites, combinationRoutes);
router.use('/grades', requireAcademicOrgWideForWrites, gradeRoutes);
router.use('/subjects', requireAcademicOrgWideForWrites, subjectRoutes);
router.use('/exams', examRoutes);
router.use('/marks', markRoutes);
router.use('/upload', uploadRoutes);
router.use('/assessment-templates', assessmentTemplateRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/results', resultsRoutes);
router.use('/academic-settings', requireAcademicOrgWideForWrites, academicSettingsRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/grading/grading-scale', requireAcademicOrgWideForWrites);
router.use('/grading/course-default-marks', requireAcademicOrgWideForWrites);
router.use('/results/grading-scales', requireAcademicOrgWideForWrites);
router.use('/grading', gradingRoutes);
router.use('/competency', competencyRoutes);
router.use('/sm', studentManagementRoutes);
router.use('/timetable', timetableRoutes);
router.use('/exam-sessions', examPlanningRoutes);
router.use('/exam-invigilator', examInvigilatorRoutes);
router.use('/examination-timetables', examinationTimetableRoutes);
router.use('/examination-lists', examinationListRoutes);
router.use('/examination-invigilators', examinationInvigilatorManagementRoutes);
router.use('/marks-submissions', marksSubmissionRoutes);
router.use('/academic-audit', academicAuditRoutes);
router.use('/nursery', nurseryRoutes);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => dashboardController.summary(req, res, next));
protectedRouter.use('/teacher-permissions', teacherPermissionRoutes);
protectedRouter.use('/round-roll-call', roundRollCallRoutes);
protectedRouter.use('/dev/marks-demo', marksDemoRoutes);

router.use(protectedRouter);

export default router;
