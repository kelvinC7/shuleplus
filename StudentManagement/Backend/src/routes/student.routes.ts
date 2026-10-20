import { Router } from 'express';
import { studentController, excelUpload } from '../controllers/student.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.get('/', (req, res, next) => studentController.list(req, res, next));
router.get('/next-code', (req, res, next) => studentController.nextCode(req, res, next));
router.post('/import/preview', (req, res, next) => studentController.importPreview(req, res, next));
router.post(
  '/import',
  (req, res, next) => {
    if (req.is('multipart/form-data')) {
      return excelUpload.single('file')(req, res, next);
    }
    return next();
  },
  (req, res, next) => studentController.importExcel(req, res, next)
);
router.post('/', (req, res, next) => studentController.register(req, res, next));
router.get('/:id', (req, res, next) => studentController.getById(req, res, next));
router.put('/:id', (req, res, next) => studentController.update(req, res, next));
router.delete('/:id', (req, res, next) => studentController.delete(req, res, next));

export default router;
