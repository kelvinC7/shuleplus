import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { env } from '../config/env';

const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const orgId = (req as { organizationRef?: string }).organizationRef ?? 'unknown';
    const planId = String(req.params.actionPlanId ?? req.params.id ?? 'general');
    const dir = path.join(UPLOAD_ROOT, orgId, planId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\-()+ ]/g, '_').slice(0, 120);
    cb(null, `${Date.now()}-${safe}`);
  },
});

export const evidenceUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed =
      /^(image\/(jpeg|png|gif|webp)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|text\/plain)/i;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed. Use images, PDF, Word, or text.'));
  },
});

export function publicUploadPath(orgId: string, planId: string, filename: string) {
  return `/uploads/${orgId}/${planId}/${filename}`;
}
