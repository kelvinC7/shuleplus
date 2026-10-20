import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { shuleAvanceController } from '../controllers/shule-avance.controller';
import { internalController } from '../controllers/internal.controller';
import { rollCallController } from '../controllers/roll-call.controller';
import { accountController } from '../controllers/account.controller';
import { teacherWorkController } from '../controllers/teacher-work.controller';
import { timetableController } from '../controllers/timetable.controller';
import {
  assessmentController,
  gradingController,
  assessmentTemplateController,
} from '../controllers/assessment.controller';
import { myClassesController } from '../controllers/my-classes.controller';
import { myCoursesController } from '../controllers/my-courses.controller';
import { examInvigilatorController } from '../controllers/exam-invigilator.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
  requireFinanceAccess,
  requireManagerAccess,
  requireOrgAdmin,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'teacher-portal-service',
    module: 'teacher-portal',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

router.post('/internal/staff-payroll-sync', requireServiceAuth, (req, res, next) =>
  internalController.syncPayroll(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireTenant, requireModuleLicense);

protectedRouter.get('/dashboard', (req, res, next) =>
  dashboardController.summary(req, res, next)
);

protectedRouter.get('/account/me', (req, res, next) =>
  accountController.me(req, res, next)
);

protectedRouter.get('/staff/payroll/my', (req, res, next) =>
  shuleAvanceController.myPayroll(req, res, next)
);

protectedRouter.get('/timetable/academic-settings', (req, res, next) =>
  timetableController.academicSettings(req, res, next)
);
protectedRouter.get('/timetable/teacher/today', (req, res, next) =>
  timetableController.teacherToday(req, res, next)
);
protectedRouter.get('/timetable/teacher/attendance-history', (req, res, next) =>
  timetableController.attendanceHistory(req, res, next)
);
protectedRouter.get('/timetable/teacher/check-in-history', (req, res, next) =>
  timetableController.checkInHistory(req, res, next)
);
protectedRouter.get('/timetable/teacher/schedule', (req, res, next) =>
  timetableController.teacherSchedule(req, res, next)
);
protectedRouter.post('/timetable/lessons/start', (req, res, next) =>
  timetableController.startLesson(req, res, next)
);
protectedRouter.post('/timetable/lessons/scan-qr', (req, res, next) =>
  timetableController.scanQr(req, res, next)
);
protectedRouter.get('/timetable/lessons/:sessionId/attendance', (req, res, next) =>
  timetableController.attendanceGet(req, res, next)
);
protectedRouter.post('/timetable/lessons/:sessionId/attendance', (req, res, next) =>
  timetableController.attendanceSave(req, res, next)
);
protectedRouter.post('/timetable/lessons/:sessionId/complete', (req, res, next) =>
  timetableController.completeLesson(req, res, next)
);

protectedRouter.get('/roll-call/academic-context', (req, res, next) =>
  rollCallController.academicContext(req, res, next)
);
protectedRouter.get('/roll-call/classes', (req, res, next) =>
  rollCallController.classes(req, res, next)
);
protectedRouter.get('/roll-call/templates', (req, res, next) =>
  rollCallController.templates(req, res, next)
);
protectedRouter.post('/roll-call/templates', (req, res, next) =>
  rollCallController.saveTemplate(req, res, next)
);
protectedRouter.get('/roll-call/dashboard', (req, res, next) =>
  rollCallController.dashboard(req, res, next)
);
protectedRouter.get('/roll-call/sessions', (req, res, next) =>
  rollCallController.list(req, res, next)
);
protectedRouter.post('/roll-call/sessions', (req, res, next) =>
  rollCallController.create(req, res, next)
);
protectedRouter.get('/roll-call/sessions/:sessionId', (req, res, next) =>
  rollCallController.get(req, res, next)
);
protectedRouter.patch('/roll-call/sessions/:sessionId', (req, res, next) =>
  rollCallController.saveDraft(req, res, next)
);
protectedRouter.post('/roll-call/sessions/:sessionId/complete', (req, res, next) =>
  rollCallController.complete(req, res, next)
);

protectedRouter.get('/my-attendance/summary', (req, res, next) =>
  teacherWorkController.attendanceSummary(req, res, next)
);
protectedRouter.get('/my-attendance/today', (req, res, next) =>
  teacherWorkController.attendanceToday(req, res, next)
);
protectedRouter.get('/my-attendance/history', (req, res, next) =>
  teacherWorkController.attendanceHistory(req, res, next)
);
protectedRouter.get('/my-attendance/corrections', (req, res, next) =>
  teacherWorkController.listCorrections(req, res, next)
);
protectedRouter.post('/my-attendance/corrections', (req, res, next) =>
  teacherWorkController.createCorrection(req, res, next)
);

protectedRouter.get('/permissions/summary', (req, res, next) =>
  teacherWorkController.permissionSummary(req, res, next)
);
protectedRouter.get('/permissions/types', (req, res, next) =>
  teacherWorkController.permissionTypes(req, res, next)
);
protectedRouter.get('/permissions', (req, res, next) =>
  teacherWorkController.listPermissions(req, res, next)
);
protectedRouter.post('/permissions', (req, res, next) =>
  teacherWorkController.createPermission(req, res, next)
);

protectedRouter.get('/calendar/events', (req, res, next) =>
  teacherWorkController.calendarEvents(req, res, next)
);
protectedRouter.get('/calendar/events/:eventId', (req, res, next) =>
  teacherWorkController.calendarEventGet(req, res, next)
);

protectedRouter.get('/my-classes/academic-context', (req, res, next) =>
  myClassesController.academicContext(req, res, next)
);
protectedRouter.get('/my-classes', (req, res, next) => myClassesController.list(req, res, next));
protectedRouter.get('/my-classes/:classId/students', (req, res, next) =>
  myClassesController.students(req, res, next)
);
protectedRouter.get('/my-classes/:classId/gate-attendance', (req, res, next) =>
  myClassesController.gateAttendance(req, res, next)
);
protectedRouter.get('/my-classes/:classId/discipline', (req, res, next) =>
  myClassesController.discipline(req, res, next)
);
protectedRouter.get('/my-classes/:classId/class-attendance/history', (req, res, next) =>
  myClassesController.classAttendanceHistory(req, res, next)
);
protectedRouter.get('/my-classes/:classId/class-attendance', (req, res, next) =>
  myClassesController.classAttendanceGet(req, res, next)
);
protectedRouter.patch('/my-classes/class-attendance/:sessionId', (req, res, next) =>
  myClassesController.classAttendanceSave(req, res, next)
);
protectedRouter.post('/my-classes/class-attendance/:sessionId/complete', (req, res, next) =>
  myClassesController.classAttendanceComplete(req, res, next)
);

protectedRouter.get('/my-courses/academic-context', (req, res, next) =>
  myCoursesController.academicContext(req, res, next)
);
protectedRouter.get('/my-courses', (req, res, next) => myCoursesController.list(req, res, next));

protectedRouter.get('/examinations/me', (req, res, next) =>
  examInvigilatorController.me(req, res, next)
);
protectedRouter.get('/examinations/lists', (req, res, next) =>
  examInvigilatorController.lists(req, res, next)
);
protectedRouter.get('/examinations/room', (req, res, next) =>
  examInvigilatorController.room(req, res, next)
);
protectedRouter.post('/examinations/entry', (req, res, next) =>
  examInvigilatorController.entry(req, res, next)
);
protectedRouter.post('/examinations/eligibility', (req, res, next) =>
  examInvigilatorController.eligibility(req, res, next)
);
protectedRouter.post('/examinations/exit', (req, res, next) =>
  examInvigilatorController.exit(req, res, next)
);

// ── Assessments ──────────────────────────────────────────
protectedRouter.get('/assessments/teacher-dashboard', (req, res, next) =>
  assessmentController.getTeacherDashboard(req, res, next)
);
protectedRouter.get('/assessments', (req, res, next) =>
  assessmentController.list(req, res, next)
);
protectedRouter.get('/assessments/:id', (req, res, next) =>
  assessmentController.getById(req, res, next)
);
protectedRouter.post('/assessments', (req, res, next) =>
  assessmentController.create(req, res, next)
);
protectedRouter.put('/assessments/:id/status', (req, res, next) =>
  assessmentController.updateStatus(req, res, next)
);
protectedRouter.get('/assessments/:id/statistics', (req, res, next) =>
  assessmentController.getStatistics(req, res, next)
);
protectedRouter.get('/assessments/:id/marks', (req, res, next) =>
  assessmentController.getMarks(req, res, next)
);
protectedRouter.post('/assessments/:id/marks', (req, res, next) =>
  assessmentController.enterMarks(req, res, next)
);
protectedRouter.post('/assessments/:id/corrections', (req, res, next) =>
  assessmentController.requestCorrection(req, res, next)
);

// ── Assessment Templates ─────────────────────────────────
protectedRouter.get('/assessment-templates', (req, res, next) =>
  assessmentTemplateController.list(req, res, next)
);
protectedRouter.get('/assessment-templates/:id', (req, res, next) =>
  assessmentTemplateController.getById(req, res, next)
);
protectedRouter.post('/assessment-templates', (req, res, next) =>
  assessmentTemplateController.create(req, res, next)
);

// ── Grading ──────────────────────────────────────────────
protectedRouter.get('/grading/dashboard', (req, res, next) =>
  gradingController.dashboard(req, res, next)
);
protectedRouter.get('/grading/grading-scale', (req, res, next) =>
  gradingController.getGradingScale(req, res, next)
);
protectedRouter.get('/grading/report-card/:studentId/:classId/:academicYear', (req, res, next) =>
  gradingController.getReportCard(req, res, next)
);
protectedRouter.get('/grading/calculate/:assessmentId', (req, res, next) =>
  gradingController.calculate(req, res, next)
);
protectedRouter.post('/grading/calculate-final/:templateId/:classId/:subjectId', (req, res, next) =>
  gradingController.calculateFinal(req, res, next)
);
protectedRouter.get('/grading/corrections', (req, res, next) =>
  gradingController.getPendingCorrections(req, res, next)
);
protectedRouter.put('/grading/corrections/:requestId', (req, res, next) =>
  gradingController.reviewCorrection(req, res, next)
);

const avanceRouter = Router();
avanceRouter.get('/catalog', (req, res, next) => shuleAvanceController.catalog(req, res, next));
avanceRouter.get('/applicant/eligibility', (req, res, next) =>
  shuleAvanceController.eligibility(req, res, next)
);
avanceRouter.get('/me/access', (req, res, next) =>
  shuleAvanceController.myAccess(req, res, next)
);
avanceRouter.get('/applicant/my-requests', (req, res, next) =>
  shuleAvanceController.myRequests(req, res, next)
);
avanceRouter.post('/applicant/requests', (req, res, next) =>
  shuleAvanceController.createRequest(req, res, next)
);
avanceRouter.put('/applicant/requests/:id', (req, res, next) =>
  shuleAvanceController.updateRequest(req, res, next)
);
avanceRouter.delete('/applicant/requests/:id', (req, res, next) =>
  shuleAvanceController.cancelRequest(req, res, next)
);

avanceRouter.get('/finance/requests', requireFinanceAccess, (req, res, next) =>
  shuleAvanceController.financeRequests(req, res, next)
);
avanceRouter.patch('/finance/requests/:id/send-to-manager', requireFinanceAccess, (req, res, next) =>
  shuleAvanceController.financeSendToManager(req, res, next)
);
avanceRouter.patch('/finance/requests/:id/reject', requireFinanceAccess, (req, res, next) =>
  shuleAvanceController.financeReject(req, res, next)
);

avanceRouter.get('/manager/pending-requests', requireManagerAccess, (req, res, next) =>
  shuleAvanceController.managerPending(req, res, next)
);
avanceRouter.patch('/manager/requests/:id/decision', requireManagerAccess, (req, res, next) =>
  shuleAvanceController.managerDecision(req, res, next)
);

avanceRouter.get('/approvers', requireOrgAdmin, (req, res, next) =>
  shuleAvanceController.listApprovers(req, res, next)
);
avanceRouter.post('/approvers', requireOrgAdmin, (req, res, next) =>
  shuleAvanceController.addApprover(req, res, next)
);
avanceRouter.delete('/approvers/:id', requireOrgAdmin, (req, res, next) =>
  shuleAvanceController.removeApprover(req, res, next)
);

protectedRouter.use('/salary-advance', avanceRouter);
protectedRouter.use('/shule-avance', avanceRouter); // legacy alias

router.use(protectedRouter);

export default router;
