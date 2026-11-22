import { Router } from 'express';
import multer from 'multer';
import { platformController } from '../controllers/platform.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
});

const router = Router();
router.use(authenticate, requireSuperAdmin);

router.get('/overview', (req, res, next) => platformController.overview(req, res, next));
router.get('/config/education-levels', (req, res, next) =>
  platformController.educationLevels(req, res, next)
);
router.get('/jobs', (req, res, next) => platformController.listJobs(req, res, next));
router.post('/jobs/:jobId/cancel', (req, res, next) => platformController.cancelJob(req, res, next));
router.post('/jobs/:jobId/retry', (req, res, next) => platformController.retryJob(req, res, next));

router.get('/books', (req, res, next) => platformController.listBooks(req, res, next));
router.post(
  '/books/upload',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'companionFile', maxCount: 1 },
  ]),
  (req, res, next) => platformController.uploadBook(req, res, next)
);
router.get('/books/:id', (req, res, next) => platformController.getBook(req, res, next));
router.patch('/books/:id/status', (req, res, next) => platformController.setBookStatus(req, res, next));
router.get('/books/:id/tree', (req, res, next) => platformController.getBookTree(req, res, next));
router.get('/books/:id/pages/:pageNumber', (req, res, next) => platformController.getPage(req, res, next));
router.get('/books/:id/file', (req, res, next) => platformController.streamFile(req, res, next));
router.get('/books/:id/validation', (req, res, next) => platformController.validationReport(req, res, next));
router.post('/books/:id/apply-structure', (req, res, next) => platformController.applyStructure(req, res, next));
router.post('/books/:id/reprocess', (req, res, next) => platformController.reprocess(req, res, next));
router.post(
  '/books/:id/curriculum-pair',
  upload.fields([
    { name: 'teachersGuideFile', maxCount: 1 },
    { name: 'pupilsBookFile', maxCount: 1 },
  ]),
  (req, res, next) => platformController.uploadCurriculumPair(req, res, next)
);
router.patch('/books/:bookId/units/:unitId', (req, res, next) => platformController.updateUnit(req, res, next));
router.patch('/books/:bookId/lessons/:lessonId', (req, res, next) =>
  platformController.updateLesson(req, res, next)
);

export default router;
