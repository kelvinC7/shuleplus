import { Router, Request, Response } from 'express';
import { timetableController } from '../controllers/timetable.controller';
import { tenantController } from '../controllers/tenant.controller';
import {
  authenticate,
  requireModuleLicense,
  requireSmartAccess,
  requireServiceAuth,
} from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { smartController } from '../controllers/smart.controller';
import { settingsController } from '../controllers/settings.controller';
import { teacherAccountController } from '../controllers/teacher-account.controller';
import { internalSmartController } from '../controllers/internal-smart.controller';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'timetable-service',
    module: 'timetable',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/** Public class QR poster page — no auth (phone camera opens this URL). */
router.get('/public/class-qr/:code', (req, res, next) =>
  smartController.publicClassQr(req, res, next)
);

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

/** Teacher Portal service-to-service — no JWT module license required */
router.get('/internal/teacher/today', requireServiceAuth, (req, res, next) =>
  internalSmartController.teacherToday(req, res, next)
);
router.get('/internal/teacher/schedule', requireServiceAuth, (req, res, next) =>
  internalSmartController.teacherSchedule(req, res, next)
);
router.get('/internal/teacher/attendance-history', requireServiceAuth, (req, res, next) =>
  internalSmartController.attendanceHistory(req, res, next)
);
router.get('/internal/teacher/check-in-history', requireServiceAuth, (req, res, next) =>
  internalSmartController.checkInHistory(req, res, next)
);
router.get('/internal/teacher/account-profile', requireServiceAuth, (req, res, next) =>
  internalSmartController.teacherAccountProfile(req, res, next)
);
router.get('/internal/teacher-profiles', requireServiceAuth, (req, res, next) =>
  internalSmartController.teacherProfiles(req, res, next)
);
router.post('/internal/teacher-profiles/from-iam', requireServiceAuth, (req, res, next) =>
  internalSmartController.upsertTeacherFromIam(req, res, next)
);
router.get('/internal/staff', requireServiceAuth, (req, res, next) =>
  internalSmartController.listStaffForSmartAccess(req, res, next)
);
router.get('/internal/staff/rfid-lookup', requireServiceAuth, (req, res, next) =>
  internalSmartController.lookupRfidOwner(req, res, next)
);
router.put('/internal/staff/:id/identity', requireServiceAuth, (req, res, next) =>
  internalSmartController.updateStaffIdentity(req, res, next)
);
router.get('/internal/teacher/assignments', requireServiceAuth, (req, res, next) =>
  internalSmartController.teacherAssignments(req, res, next)
);
router.get('/internal/class-config', requireServiceAuth, (req, res, next) =>
  internalSmartController.classConfigCatalog(req, res, next)
);
router.get('/internal/course-config-flags', requireServiceAuth, (req, res, next) =>
  internalSmartController.courseConfigFlags(req, res, next)
);
router.get('/internal/course-config', requireServiceAuth, (req, res, next) =>
  internalSmartController.courseConfigCatalog(req, res, next)
);
router.get('/internal/parent/student-week', requireServiceAuth, (req, res, next) =>
  internalSmartController.parentStudentWeek(req, res, next)
);
router.get('/internal/class/teachers', requireServiceAuth, (req, res, next) =>
  internalSmartController.classTeachers(req, res, next)
);
router.post('/internal/lessons/start', requireServiceAuth, (req, res, next) =>
  internalSmartController.startLesson(req, res, next)
);
router.post('/internal/lessons/scan-qr', requireServiceAuth, (req, res, next) =>
  internalSmartController.scanQr(req, res, next)
);
router.get('/internal/lessons/:sessionId/attendance', requireServiceAuth, (req, res, next) =>
  internalSmartController.attendanceGet(req, res, next)
);
router.post('/internal/lessons/:sessionId/attendance', requireServiceAuth, (req, res, next) =>
  internalSmartController.attendanceSave(req, res, next)
);
router.post('/internal/lessons/:sessionId/complete', requireServiceAuth, (req, res, next) =>
  internalSmartController.completeLesson(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense, requireTenant);

protectedRouter.get('/dashboard', (req, res, next) => timetableController.dashboard(req, res, next));
protectedRouter.get('/dashboard/overview', (req, res, next) =>
  timetableController.dashboardOverview(req, res, next)
);
protectedRouter.get('/dashboard/today-timetable', (req, res, next) =>
  timetableController.todayTimetable(req, res, next)
);

protectedRouter.get('/timetable', (req, res, next) => timetableController.listTimetable(req, res, next));
protectedRouter.post('/timetable', (req, res, next) => timetableController.createTimetable(req, res, next));
protectedRouter.put('/timetable/:id', (req, res, next) => timetableController.updateTimetable(req, res, next));
protectedRouter.post('/timetable/swap', (req, res, next) => timetableController.swapTimetable(req, res, next));
protectedRouter.delete('/timetable/:id', (req, res, next) => timetableController.deleteTimetable(req, res, next));

protectedRouter.get('/timetable-system/schedule', (req, res, next) =>
  timetableController.getSchedule(req, res, next)
);
protectedRouter.put('/timetable-system/schedule', (req, res, next) =>
  timetableController.updateSchedule(req, res, next)
);

protectedRouter.get('/timetable-system/teacher-profiles', (req, res, next) =>
  timetableController.listTeacherProfiles(req, res, next)
);
protectedRouter.put('/timetable-system/teacher-profiles', (req, res, next) =>
  timetableController.upsertTeacherProfiles(req, res, next)
);
protectedRouter.delete('/timetable-system/teacher-profiles/:teacherUserId', (req, res, next) =>
  timetableController.deleteTeacherProfile(req, res, next)
);
protectedRouter.post('/timetable-system/teacher-profiles/save', (req, res, next) =>
  teacherAccountController.saveProfileWithAccount(req, res, next)
);
protectedRouter.post('/timetable-system/teacher-profiles/check-identifier', (req, res, next) =>
  teacherAccountController.checkIdentifier(req, res, next)
);
protectedRouter.post('/timetable-system/teacher-profiles/:teacherUserId/reset-password', (req, res, next) =>
  teacherAccountController.resetPassword(req, res, next)
);
protectedRouter.post('/timetable-system/teacher-profiles/:teacherUserId/disable-account', (req, res, next) =>
  teacherAccountController.disableAccount(req, res, next)
);
protectedRouter.post('/timetable-system/teacher-profiles/:teacherUserId/enable-account', (req, res, next) =>
  teacherAccountController.enableAccount(req, res, next)
);

protectedRouter.get('/timetable-system/course-config', (req, res, next) =>
  timetableController.listCourseConfig(req, res, next)
);
protectedRouter.post('/timetable-system/course-config', (req, res, next) =>
  timetableController.createCourseConfig(req, res, next)
);
protectedRouter.put('/timetable-system/course-config/id/:id', (req, res, next) =>
  timetableController.updateCourseConfigById(req, res, next)
);
protectedRouter.delete('/timetable-system/course-config/id/:id', (req, res, next) =>
  timetableController.deleteCourseConfigById(req, res, next)
);
protectedRouter.put('/timetable-system/course-config/:subjectName', (req, res, next) =>
  timetableController.upsertCourseConfig(req, res, next)
);
protectedRouter.delete('/timetable-system/course-config/:subjectName', (req, res, next) =>
  timetableController.deleteCourseConfig(req, res, next)
);

protectedRouter.get('/timetable-system/assignments', (req, res, next) =>
  timetableController.listAssignments(req, res, next)
);
protectedRouter.post('/timetable-system/assignments', (req, res, next) =>
  timetableController.createAssignment(req, res, next)
);
protectedRouter.post('/timetable-system/assignments/bulk', (req, res, next) =>
  timetableController.bulkAssignments(req, res, next)
);
protectedRouter.put('/timetable-system/assignments/:id', (req, res, next) =>
  timetableController.updateAssignment(req, res, next)
);
protectedRouter.delete('/timetable-system/assignments/:id', (req, res, next) =>
  timetableController.deleteAssignment(req, res, next)
);

protectedRouter.get('/teacher-assignments/overview', (req, res, next) =>
  timetableController.assignmentsOverview(req, res, next)
);
protectedRouter.get('/teacher-assignments', (req, res, next) =>
  timetableController.listAssignments(req, res, next)
);
protectedRouter.post('/teacher-assignments', (req, res, next) =>
  timetableController.createAssignment(req, res, next)
);
protectedRouter.post('/teacher-assignments/bulk', (req, res, next) =>
  timetableController.bulkAssignments(req, res, next)
);
protectedRouter.put('/teacher-assignments/:id', (req, res, next) =>
  timetableController.updateAssignment(req, res, next)
);
protectedRouter.post('/teacher-assignments/:id/archive', (req, res, next) =>
  timetableController.archiveAssignment(req, res, next)
);
protectedRouter.delete('/teacher-assignments/:id', (req, res, next) =>
  timetableController.deleteAssignment(req, res, next)
);

protectedRouter.get('/timetable-system/workload', (req, res, next) =>
  timetableController.workload(req, res, next)
);
protectedRouter.get('/timetable-system/class-coverage', (req, res, next) =>
  timetableController.classCoverage(req, res, next)
);
protectedRouter.post('/timetable-system/generate', (req, res, next) =>
  timetableController.generate(req, res, next)
);
protectedRouter.post('/timetable-system/apply', (req, res, next) =>
  timetableController.apply(req, res, next)
);
protectedRouter.post('/timetable-system/regenerate', (req, res, next) =>
  timetableController.regenerate(req, res, next)
);
protectedRouter.post('/timetable-system/fill-gaps', (req, res, next) =>
  timetableController.fillGaps(req, res, next)
);
protectedRouter.post('/timetable-system/auto-complete', (req, res, next) =>
  timetableController.autoComplete(req, res, next)
);
protectedRouter.post('/timetable-system/clear-timetables', (req, res, next) =>
  timetableController.clearTimetables(req, res, next)
);
protectedRouter.post('/timetable-system/confirm-class', (req, res, next) =>
  timetableController.confirmClassTimetable(req, res, next)
);

protectedRouter.get('/timetable-system/conflict-center', (req, res, next) =>
  timetableController.conflictCenter(req, res, next)
);
protectedRouter.post('/timetable-system/auto-fix', (req, res, next) =>
  timetableController.autoFix(req, res, next)
);
protectedRouter.post('/timetable-system/check-conflicts', (req, res, next) =>
  timetableController.checkConflicts(req, res, next)
);
protectedRouter.post('/timetable-system/suggest-slots', (req, res, next) =>
  timetableController.suggestPlacementSlots(req, res, next)
);

protectedRouter.get('/timetable-system/extra-activities', (req, res, next) =>
  timetableController.listExtraActivities(req, res, next)
);
protectedRouter.post('/timetable-system/extra-activities/validate', (req, res, next) =>
  timetableController.validateExtraActivity(req, res, next)
);
protectedRouter.post('/timetable-system/extra-activities/validate-batch', (req, res, next) =>
  timetableController.validateExtraActivityBatch(req, res, next)
);
protectedRouter.post('/timetable-system/extra-activities', (req, res, next) =>
  timetableController.createExtraActivity(req, res, next)
);
protectedRouter.put('/timetable-system/extra-activities/:id', (req, res, next) =>
  timetableController.updateExtraActivity(req, res, next)
);
protectedRouter.delete('/timetable-system/extra-activities/:id', (req, res, next) =>
  timetableController.deleteExtraActivity(req, res, next)
);
protectedRouter.post('/timetable-system/extra-activities/:id/sync', (req, res, next) =>
  timetableController.syncExtraActivity(req, res, next)
);

protectedRouter.post('/timetable-system/seed-demo', (req, res, next) =>
  timetableController.seedDemo(req, res, next)
);

protectedRouter.get('/class-config', (req, res, next) =>
  timetableController.listClassConfig(req, res, next)
);
protectedRouter.get('/class-config/teachers', (req, res, next) =>
  timetableController.classConfigTeachers(req, res, next)
);
protectedRouter.get('/class-config/:className', (req, res, next) =>
  timetableController.getClassConfig(req, res, next)
);
protectedRouter.post('/class-config/copy', (req, res, next) =>
  timetableController.copyClassConfig(req, res, next)
);

protectedRouter.get('/settings/academic', (req, res, next) =>
  settingsController.academicGet(req, res, next)
);
protectedRouter.put('/settings/academic', (req, res, next) =>
  settingsController.academicPut(req, res, next)
);

router.use(protectedRouter);

/** Smart Timetable — accessible with timetable OR teacher-portal license */
const smartRouter = Router();
smartRouter.use(authenticate, requireTenant, requireSmartAccess);

smartRouter.get('/smart/academic/settings', (req, res, next) =>
  settingsController.academicGet(req, res, next)
);
smartRouter.get('/smart/settings', (req, res, next) => smartController.settingsGet(req, res, next));
smartRouter.put('/smart/settings', (req, res, next) => smartController.settingsPut(req, res, next));
smartRouter.get('/smart/classrooms', (req, res, next) => smartController.classrooms(req, res, next));
smartRouter.post('/smart/classrooms', (req, res, next) =>
  smartController.classroomUpsert(req, res, next)
);
smartRouter.get('/smart/teacher/today', (req, res, next) =>
  smartController.teacherToday(req, res, next)
);
smartRouter.get('/smart/teacher/schedule', (req, res, next) =>
  smartController.teacherSchedule(req, res, next)
);
smartRouter.post('/smart/lessons/start', (req, res, next) =>
  smartController.startLesson(req, res, next)
);
smartRouter.post('/smart/lessons/:timetableId/start', (req, res, next) =>
  smartController.startLesson(req, res, next)
);
smartRouter.post('/smart/lessons/scan-qr', (req, res, next) =>
  smartController.scanQr(req, res, next)
);
smartRouter.get('/smart/lessons/:sessionId/attendance', (req, res, next) =>
  smartController.attendanceGet(req, res, next)
);
smartRouter.post('/smart/lessons/:sessionId/attendance', (req, res, next) =>
  smartController.attendanceSave(req, res, next)
);
smartRouter.post('/smart/lessons/:sessionId/complete', (req, res, next) =>
  smartController.completeLesson(req, res, next)
);
smartRouter.get('/smart/live/monitor', (req, res, next) =>
  smartController.liveMonitor(req, res, next)
);
smartRouter.get('/smart/live/history', (req, res, next) =>
  smartController.liveHistory(req, res, next)
);
smartRouter.get('/smart/live/replay', (req, res, next) =>
  smartController.livePeriodReplay(req, res, next)
);
smartRouter.get('/smart/analytics', (req, res, next) => smartController.analytics(req, res, next));
smartRouter.get('/smart/notifications', (req, res, next) =>
  smartController.notifications(req, res, next)
);
smartRouter.get('/smart/academic/classes', (req, res, next) =>
  smartController.academicClasses(req, res, next)
);
smartRouter.get('/smart/academic/students', (req, res, next) =>
  smartController.academicStudents(req, res, next)
);
smartRouter.get('/smart/class-qr', (req, res, next) => smartController.classQrList(req, res, next));
smartRouter.post('/smart/class-qr/sync', (req, res, next) =>
  smartController.classQrSync(req, res, next)
);

router.use(smartRouter);

export default router;
