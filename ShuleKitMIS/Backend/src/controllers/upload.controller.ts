import { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';
import { uploadDir } from '../config/paths';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const uploadRoot = uploadDir;

/**
 * Image upload using the same base64 / data-URL contract as the platform
 * (Authentication /internal/branding/upload): the client sends { contentBase64,
 * fileName, mimeType } and receives { url, path, fileName } back.
 */
export const uploadController = {
  async image(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { contentBase64, fileName, mimeType } = req.body as {
        contentBase64?: string;
        fileName?: string;
        mimeType?: string;
      };

      if (!contentBase64) {
        throw new AppError(400, 'contentBase64 is required');
      }

      const mime = mimeType ?? 'image/png';
      if (!mime.startsWith('image/')) {
        throw new AppError(400, 'Only image uploads are allowed');
      }

      const buffer = Buffer.from(contentBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

      if (buffer.length === 0) {
        throw new AppError(400, 'Empty file');
      }
      if (buffer.length > 5 * 1024 * 1024) {
        throw new AppError(400, 'File too large (max 5MB)');
      }

      const ext =
        mime.includes('jpeg') || mime.includes('jpg')
          ? 'jpg'
          : mime.includes('webp')
            ? 'webp'
            : 'png';
      const safeName = (fileName ?? `image.${ext}`).replace(/[^\w.\-()+]/g, '_');
      const stored = `${randomUUID()}-${safeName}`;

      fs.mkdirSync(uploadRoot, { recursive: true });
      fs.writeFileSync(path.join(uploadRoot, stored), buffer);

      const relative = `/uploads/${stored}`;
      res.json({
        success: true,
        data: {
          url: `${env.PUBLIC_BASE_URL}${relative}`,
          path: relative,
          fileName: stored,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
