import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error.middleware';
import { uploadImage, processAndSaveImage, deleteImageByUrl } from '../config/upload';

export const imageController = {
  upload: uploadImage.single('image'),

  async uploadSingle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw new AppError(400, 'No image file provided');

      const supplierId = typeof req.body.supplierId === 'string' ? req.body.supplierId : 'generic';
      const imageUrl = await processAndSaveImage(file, supplierId);

      res.json({ success: true, data: { imageUrl } });
    } catch (error) {
      next(error);
    }
  },

  uploadMultiple: uploadImage.array('images', 10),

  async uploadMultipleImages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) throw new AppError(400, 'No image files provided');

      const supplierId = typeof req.body.supplierId === 'string' ? req.body.supplierId : 'generic';
      const imageUrls: string[] = [];
      for (const file of files) {
        imageUrls.push(await processAndSaveImage(file, supplierId));
      }

      res.json({ success: true, data: { imageUrls } });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { imageUrl } = req.body as { imageUrl?: string };
      if (!imageUrl) throw new AppError(400, 'Image URL is required');
      deleteImageByUrl(imageUrl);
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
};
