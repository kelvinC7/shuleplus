import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';

export function computeFileSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** Local private storage (production: swap for R2/S3 via STORAGE_PROVIDER). */
export async function storeCurriculumPdf(originalName: string, buffer: Buffer) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
  const safeName = originalName.replace(/[^\w.\-()+ ]/g, '_');
  const storedName = `${Date.now()}-${safeName}`;
  const dest = path.join(env.UPLOAD_DIR, storedName);
  fs.writeFileSync(dest, buffer);
  return {
    provider: env.STORAGE_PROVIDER,
    fileKey: storedName,
    fileSizeBytes: buffer.length,
    sha256: computeFileSha256(buffer),
  };
}

export function resolveStoredFilePath(fileKey: string) {
  return path.join(env.UPLOAD_DIR, fileKey);
}
