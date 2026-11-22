import { Router } from 'express';
import { teacherController } from '../controllers/teacher.controller';
import { authenticate, requireTeacherAccess } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate, requireTeacherAccess);

router.get('/ai/status', (req, res, next) => teacherController.aiStatus(req, res, next));
router.get('/catalog', (req, res, next) => teacherController.catalog(req, res, next));
router.get('/books/:bookId/tree', (req, res, next) => teacherController.bookTree(req, res, next));
router.post('/lesson-plans/generate', (req, res, next) => teacherController.generate(req, res, next));
router.get('/lesson-plans/performance', (req, res, next) => teacherController.performance(req, res, next));
router.get('/lesson-plans', (req, res, next) => teacherController.listPlans(req, res, next));
router.post('/lesson-plans/:id/duplicate', (req, res, next) => teacherController.duplicatePlan(req, res, next));
router.post('/lesson-plans/:id/archive', (req, res, next) => teacherController.archivePlan(req, res, next));
router.delete('/lesson-plans/:id', (req, res, next) => teacherController.deletePlan(req, res, next));
router.post('/lesson-plans/:id/mark-taught', (req, res, next) => teacherController.markTaught(req, res, next));
router.get('/lesson-plans/:id', (req, res, next) => teacherController.getPlan(req, res, next));
router.put('/lesson-plans/:id', (req, res, next) => teacherController.updatePlan(req, res, next));
router.post('/lesson-plans/:id/regenerate-section', (req, res, next) =>
  teacherController.regenerateSection(req, res, next)
);
router.get('/lesson-plans/:id/export/pdf', (req, res, next) => teacherController.exportPdf(req, res, next));
router.get('/lesson-plans/:id/export/docx', (req, res, next) => teacherController.exportDocx(req, res, next));

export default router;
