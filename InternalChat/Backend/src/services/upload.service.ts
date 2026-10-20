import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { uploadDir } from '../config/paths';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface StoredUpload {
  url: string;
  name: string;
  mime: string;
  size: number;
}

const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/json': '.json',
};

export class UploadService {
  /** Decode a base64 data URI and persist it under /uploads. */
  async save(dataUri: string, originalName?: string): Promise<StoredUpload> {
    const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUri);
    if (!match) {
      throw new AppError(400, 'Expected a base64 data URI (data:<mime>;base64,<data>)');
    }

    const mime = match[1].toLowerCase();
    const base64 = match[2].replace(/\s+/g, '');
    const buffer = Buffer.from(base64, 'base64');

    if (buffer.length === 0) throw new AppError(400, 'Upload payload is empty');
    const maxMb = Math.floor(env.MAX_ATTACHMENT_BYTES / 1024 / 1024);
    if (buffer.length > env.MAX_ATTACHMENT_BYTES) {
      throw new AppError(413, `File exceeds the ${maxMb} MB upload limit`);
    }

    const ext = MIME_EXT[mime] ?? '.bin';
    const filename = `${randomUUID()}${ext}`;
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const cleanName = originalName?.trim().replace(/[\r\n]/g, '').slice(0, 255);
    return {
      url: `/uploads/${filename}`,
      name: cleanName || 'attachment',
      mime,
      size: buffer.length,
    };
  }
}

export const uploadService = new UploadService();
