/**
 * ID photo processor for browser — portrait crop, white background, optional ML background removal.
 */
import { ID_PHOTO_CONFIG as CFG, isProcessedIdPhotoPath } from '../id-photo-config';

export type PreparedIdPhoto = {
  dataUrl: string;
  width: number;
  height: number;
  originalName: string;
  faceDetected: boolean;
  backgroundRemoved: boolean;
};

export { isProcessedIdPhotoPath };

/** CDN assets for @imgly/background-removal (cached by browser after first use). */
const BG_REMOVAL_PUBLIC_PATH =
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.4.5/dist/';

export function cardBackgroundRemovalEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CARD_REMOVE_PHOTO_BG === 'false') {
    return false;
  }
  return true;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image file.'));
    };
    img.src = url;
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load processed image.'));
    img.src = url;
  });
}

/** Portrait-biased crop — favors upper-center where faces usually are. */
function portraitCrop(imgW: number, imgH: number) {
  const aspect = CFG.outputWidth / CFG.outputHeight;
  const landscape = imgW > imgH;
  if (landscape) {
    const h = imgH * 0.92;
    const w = h * aspect;
    return { left: (imgW - w) / 2, top: imgH * 0.04, width: w, height: h };
  }
  const w = imgW * 0.9;
  const h = w / aspect;
  const top = Math.max(0, imgH * 0.06);
  return { left: (imgW - w) / 2, top: Math.min(top, imgH - h), width: w, height: h };
}

function drawPortraitOnWhite(
  img: HTMLImageElement,
  opts?: { backgroundRemoved?: boolean },
): PreparedIdPhoto {
  const crop = portraitCrop(img.naturalWidth, img.naturalHeight);

  const out = document.createElement('canvas');
  out.width = CFG.outputWidth;
  out.height = CFG.outputHeight;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Could not process image in this browser.');

  ctx.fillStyle = CFG.backgroundColor;
  ctx.fillRect(0, 0, CFG.outputWidth, CFG.outputHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    img,
    crop.left,
    crop.top,
    crop.width,
    crop.height,
    0,
    0,
    CFG.outputWidth,
    CFG.outputHeight,
  );

  const dataUrl = out.toDataURL('image/jpeg', CFG.jpegQuality / 100);
  return {
    dataUrl,
    width: CFG.outputWidth,
    height: CFG.outputHeight,
    originalName: 'photo',
    faceDetected: false,
    backgroundRemoved: opts?.backgroundRemoved ?? false,
  };
}

type BgRemovalModule = {
  preload: (config: { publicPath: string; model: string }) => Promise<void>;
  removeBackground: (
    image: HTMLImageElement,
    config: {
      publicPath: string;
      model: string;
      output: { format: string; quality: number };
    },
  ) => Promise<Blob>;
};

const BG_REMOVAL_ESM =
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.6.0/dist/index.mjs';

let bgRemovalModule: BgRemovalModule | null = null;
let preloadPromise: Promise<void> | null = null;

async function loadBgRemovalModule(): Promise<BgRemovalModule> {
  if (bgRemovalModule) return bgRemovalModule;
  bgRemovalModule = (await import(/* webpackIgnore: true */ BG_REMOVAL_ESM)) as BgRemovalModule;
  return bgRemovalModule;
}

/** Preload background-removal model (call before batch card printing). */
export function preloadIdPhotoBackgroundModel(): Promise<void> {
  if (!cardBackgroundRemovalEnabled()) return Promise.resolve();
  if (typeof window === 'undefined') return Promise.resolve();
  if (!preloadPromise) {
    preloadPromise = (async () => {
      const { preload } = await loadBgRemovalModule();
      await preload({
        publicPath: BG_REMOVAL_PUBLIC_PATH,
        model: 'small',
      });
    })().catch(() => {
      preloadPromise = null;
    });
  }
  return preloadPromise;
}

async function removePortraitBackground(img: HTMLImageElement): Promise<HTMLImageElement> {
  await preloadIdPhotoBackgroundModel();
  const { removeBackground } = await loadBgRemovalModule();
  const blob = await removeBackground(img, {
    publicPath: BG_REMOVAL_PUBLIC_PATH,
    model: 'small',
    output: { format: 'image/png', quality: 1 },
  });
  const url = URL.createObjectURL(blob);
  try {
    return await loadImageFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Standardize a profile photo for smart cards — removes busy backgrounds when enabled,
 * then crops to ID portrait on white.
 */
export async function prepareIdPhotoForCard(img: HTMLImageElement): Promise<PreparedIdPhoto> {
  if (!cardBackgroundRemovalEnabled()) {
    return drawPortraitOnWhite(img, { backgroundRemoved: false });
  }

  try {
    const cutout = await removePortraitBackground(img);
    return drawPortraitOnWhite(cutout, { backgroundRemoved: true });
  } catch {
    return drawPortraitOnWhite(img, { backgroundRemoved: false });
  }
}

/** Fast client-side standardization for staff avatars (~instant when ML disabled). */
export async function processIdPhotoFile(file: File): Promise<PreparedIdPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a JPG, PNG, or WEBP image.');
  }
  if (file.size > CFG.maxInputBytes) {
    throw new Error(
      `Image is too large. Please use a file under ${Math.round(CFG.maxInputBytes / (1024 * 1024))} MB.`,
    );
  }

  const img = await loadImageFromFile(file);
  return prepareIdPhotoForCard(img);
}

export function idPhotoDataUrlToFile(dataUrl: string, originalName: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
  const safeName = originalName.replace(/\.[^.]+$/, '') || 'photo';
  return new File([buffer], `${safeName}-id.jpg`, { type: mime });
}
