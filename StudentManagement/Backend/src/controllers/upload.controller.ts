import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import {
  processIdPhotoUpload,
  processedPhotoFilename,
} from '../services/id-photo-processor.service';

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

export class UploadController {
  async photo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file?.buffer) {
        res.status(400).json({ success: false, message: 'No file provided' });
        return;
      }

      await fs.mkdir(UPLOAD_DIR, { recursive: true });

      const processed = await processIdPhotoUpload(req.file.buffer);
      const filename = processedPhotoFilename(req.file.originalname);
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(filePath, processed.buffer);

      res.json({
        success: true,
        data: {
          url: `/uploads/${filename}`,
          filename,
          width: processed.width,
          height: processed.height,
          faceDetected: processed.faceDetected,
          backgroundRemoved: processed.backgroundRemoved,
          processed: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
