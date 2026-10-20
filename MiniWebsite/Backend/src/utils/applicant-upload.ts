import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { uploadDir } from '../config/paths';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export function saveApplicantUpload(input: {
  fileName?: string;
  contentBase64?: string;
  mimeType?: string;
}): string {
  const { fileName, contentBase64, mimeType } = input;
  if (!contentBase64?.trim()) throw new AppError(400, 'File content is required');

  const mime = mimeType ?? 'application/octet-stream';
  const buffer = Buffer.from(contentBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
  if (buffer.length === 0) throw new AppError(400, 'Empty file');
  if (buffer.length > 5 * 1024 * 1024) throw new AppError(400, 'File too large (max 5MB)');

  const ext =
    mime.includes('pdf')
      ? 'pdf'
      : mime.includes('jpeg') || mime.includes('jpg')
        ? 'jpg'
        : mime.includes('webp')
          ? 'webp'
          : mime.includes('png')
            ? 'png'
            : 'bin';
  const safeName = (fileName ?? `upload.${ext}`).replace(/[^\w.\-()+]/g, '_');
  const stored = `${randomUUID()}-${safeName}`;

  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, stored), buffer);

  return `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/uploads/${stored}`;
}

export function normalizeApplicantFormData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'contentBase64' in (value as object)) {
      out[key] = saveApplicantUpload(value as { fileName?: string; contentBase64?: string; mimeType?: string });
      continue;
    }
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}
