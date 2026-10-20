import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { env } from './env';

export const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

function ensureUploadRoot() {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

ensureUploadRoot();

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadRoot();
      cb(null, uploadRoot);
    },
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^\w.\-()+\s]/g, '_').replace(/\s+/g, '_');
      cb(null, `${randomUUID()}-${safeName}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIME_TYPES.has(file.mimetype));
  },
});

export function resolveStoredFilePath(storedPath: string) {
  const resolved = path.resolve(uploadRoot, storedPath);
  if (!resolved.startsWith(uploadRoot)) {
    throw new Error('Invalid file path');
  }
  return resolved;
}
