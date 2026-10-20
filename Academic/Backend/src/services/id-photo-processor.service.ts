import sharp from 'sharp';
import { ID_PHOTO_CONFIG as CFG } from '../config/id-photo.config';

export type ProcessedIdPhoto = {
  buffer: Buffer;
  width: number;
  height: number;
  faceDetected: boolean;
  backgroundRemoved: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampCrop(
  left: number,
  top: number,
  width: number,
  height: number,
  imgW: number,
  imgH: number,
) {
  let w = Math.min(width, imgW);
  let h = Math.min(height, imgH);
  let l = clamp(left, 0, Math.max(0, imgW - w));
  let t = clamp(top, 0, Math.max(0, imgH - h));
  if (l + w > imgW) w = imgW - l;
  if (t + h > imgH) h = imgH - t;
  return {
    left: Math.round(l),
    top: Math.round(t),
    width: Math.max(1, Math.round(w)),
    height: Math.max(1, Math.round(h)),
  };
}

function heuristicCrop(imgW: number, imgH: number) {
  const aspect = CFG.outputWidth / CFG.outputHeight;
  const isLandscape = imgW > imgH;
  if (isLandscape) {
    const cropH = imgH * 0.92;
    const cropW = cropH * aspect;
    return clampCrop((imgW - cropW) / 2, imgH * 0.04, cropW, cropH, imgW, imgH);
  }
  const cropW = imgW * 0.88;
  const cropH = cropW / aspect;
  const top = imgH * 0.08;
  return clampCrop((imgW - cropW) / 2, top, cropW, cropH, imgW, imgH);
}

async function normalizeBuffer(input: Buffer): Promise<ProcessedIdPhoto> {
  const rotated = await sharp(input).rotate().toBuffer();
  const meta = await sharp(rotated).metadata();
  const imgW = meta.width ?? 0;
  const imgH = meta.height ?? 0;
  if (!imgW || !imgH) throw new Error('Could not read image dimensions');

  const alreadyStandard =
    imgW === CFG.outputWidth &&
    imgH === CFG.outputHeight &&
    meta.format === CFG.outputFormat;

  if (alreadyStandard) {
    return {
      buffer: await sharp(rotated).jpeg({ quality: CFG.jpegQuality, mozjpeg: true }).toBuffer(),
      width: CFG.outputWidth,
      height: CFG.outputHeight,
      faceDetected: true,
      backgroundRemoved: true,
    };
  }

  const crop = heuristicCrop(imgW, imgH);
  const cropped = await sharp(rotated).extract(crop).toBuffer();

  const output = await sharp({
    create: {
      width: CFG.outputWidth,
      height: CFG.outputHeight,
      channels: 3,
      background: CFG.backgroundColor,
    },
  })
    .composite([
      {
        input: await sharp(cropped)
          .resize(CFG.outputWidth, CFG.outputHeight, {
            fit: 'cover',
            position: 'north',
            kernel: sharp.kernel.lanczos3,
          })
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .flatten({ background: CFG.backgroundColor })
    .jpeg({ quality: CFG.jpegQuality, mozjpeg: true })
    .toBuffer();

  return {
    buffer: output,
    width: CFG.outputWidth,
    height: CFG.outputHeight,
    faceDetected: false,
    backgroundRemoved: false,
  };
}

export function processedPhotoFilename(originalName?: string): string {
  const ext = '.jpg';
  const stem = (originalName ?? 'photo')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w.-]/g, '')
    .slice(0, 40);
  return `${CFG.processedFilenamePrefix}${Date.now()}-${stem}${ext}`;
}

export function isProcessedIdPhotoPath(urlOrPath: string | null | undefined): boolean {
  if (!urlOrPath) return false;
  return urlOrPath.includes(CFG.processedFilenamePrefix);
}

export async function processIdPhotoUpload(input: Buffer): Promise<ProcessedIdPhoto> {
  if (input.length > CFG.maxInputBytes) {
    throw new Error(`Image exceeds ${Math.round(CFG.maxInputBytes / (1024 * 1024))} MB limit`);
  }
  return normalizeBuffer(input);
}
