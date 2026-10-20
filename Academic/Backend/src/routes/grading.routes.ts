import { Router } from 'express';
import { gradingEngineController } from '../controllers/grading-engine.controller';
import { reportCardController } from '../controllers/report-card.controller';
import { assessmentMarkController } from '../controllers/assessment-mark.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/report-card/settings', reportCardController.getSettings.bind(reportCardController));
router.get('/report-card/comments', reportCardController.getComments.bind(reportCardController));
router.put('/report-card/comments', reportCardController.upsertComments.bind(reportCardController));
router.get('/report-card/publications', reportCardController.listPublications.bind(reportCardController));
router.post('/report-card/publish', reportCardController.publishOne.bind(reportCardController));
router.post('/report-card/publish-class', reportCardController.publishClass.bind(reportCardController));

router.get('/dashboard', gradingEngineController.getAcademicDashboard);

router.get('/grading-scale', gradingEngineController.getGradingScale);
router.post('/grading-scale', gradingEngineController.upsertGradingScale);

router.get('/course-default-marks', gradingEngineController.listCourseDefaultMarks);
router.put('/course-default-marks', gradingEngineController.upsertCourseDefaultMarks);
router.put('/course-default-marks/by-subject', gradingEngineController.upsertCourseDefaultMarksBySubject);

router.get(
  '/report-card/class-summaries/:classId/:academicYear',
  gradingEngineController.getClassReportSummaries
);
router.get('/report-card/:studentId/:classId/:academicYear', gradingEngineController.getReportCard);
router.get('/growth/:studentId/:classId', gradingEngineController.getTermlyGrowth);

router.get('/calculate/:assessmentId', gradingEngineController.calculateStudentResult);
router.get('/categories/:templateId/:classId/:subjectId', gradingEngineController.calculateCategoryResults);
router.post('/calculate-final/:templateId/:classId/:subjectId', gradingEngineController.calculateFinalResults);

router.get('/corrections', assessmentMarkController.getPendingCorrections);
router.put('/corrections/:requestId', assessmentMarkController.reviewCorrection);

export default router;
