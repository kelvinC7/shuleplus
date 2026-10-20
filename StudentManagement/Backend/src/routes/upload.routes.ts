import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadController } from '../controllers/upload.controller';
import { authenticate, requireModuleLicense } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'));
    }
  },
});

const router = Router();

router.use(authenticate, requireModuleLicense, requireTenant);

router.post('/photo', upload.single('photo'), (req, res, next) => uploadController.photo(req, res, next));

export default router;
