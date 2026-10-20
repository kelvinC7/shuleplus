/** ID photo pipeline settings (mirrors packages/id-photo-config). */
export type IdPhotoConfig = {
  outputWidth: number;
  outputHeight: number;
  outputFormat: string;
  jpegQuality: number;
  backgroundColor: string;
  targetFaceHeightRatio: number;
  headPaddingRatio: number;
  shoulderPaddingRatio: number;
  horizontalPaddingRatio: number;
  minFaceScore: number;
  maxInputBytes: number;
  faceDetectMaxEdge: number;
  processedFilenamePrefix: string;
  cardPhotoRadius: number;
};

export const ID_PHOTO_CONFIG: IdPhotoConfig = {
  outputWidth: 600,
  outputHeight: 750,
  outputFormat: 'jpeg',
  jpegQuality: 90,
  backgroundColor: '#ffffff',
  targetFaceHeightRatio: 0.36,
  headPaddingRatio: 0.55,
  shoulderPaddingRatio: 1.15,
  horizontalPaddingRatio: 0.35,
  minFaceScore: 0.55,
  maxInputBytes: 15 * 1024 * 1024,
  faceDetectMaxEdge: 640,
  processedFilenamePrefix: 'id-photo-',
  cardPhotoRadius: 54,
};

export function isProcessedIdPhotoPath(urlOrPath: string | null | undefined): boolean {
  if (!urlOrPath) return false;
  return urlOrPath.includes(ID_PHOTO_CONFIG.processedFilenamePrefix);
}
