import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID as uuidv4 } from 'node:crypto';
import { env } from './env';

const publicDir = env.UPLOAD_DIR;
const productsDir = path.join(publicDir, 'products');

if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

export const UPLOAD_PUBLIC_DIR = publicDir;
export const UPLOAD_PRODUCTS_DIR = productsDir;

const storage = multer.memoryStorage();

const allowedImageTypes = /jpeg|jpg|png|webp|jfif/;

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedImageTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

/** Process a single buffer into a webp thumbnail in /uploads/products and return the public URL. */
export async function processAndSaveImage(file: Express.Multer.File, prefix: string): Promise<string> {
  const uniqueId = uuidv4();
  const filename = `${prefix.replace(/[^a-zA-Z0-9_-]/g, '')}_${uniqueId}.webp`;
  const outputPath = path.join(productsDir, filename);

  await sharp(file.buffer)
    .resize(800, 800, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toFile(outputPath);

  return `/uploads/products/${filename}`;
}

export function deleteImageByUrl(imageUrl: string): void {
  const filename = path.basename(imageUrl);
  const filePath = path.join(productsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
