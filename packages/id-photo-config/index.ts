/**
 * Central ID photo output specification — used by upload processors and card renderer.
 * Portrait aspect ratio (width × height in mm: 55 × 87).
 */
export const ID_PHOTO_CONFIG = {
  /** Processed output width in pixels */
  outputWidth: 600,
  /** Processed output height in pixels */
  outputHeight: 750,
  outputFormat: 'jpeg' as const,
  jpegQuality: 90,
  /** Professional ID background (white) */
  backgroundColor: '#ffffff',
  /** Target face height as a fraction of output height (consistent head size) */
  targetFaceHeightRatio: 0.36,
  /** Space above face box for hair/forehead (× face height) */
  headPaddingRatio: 0.55,
  /** Space below face box for chin + shoulders (× face height) */
  shoulderPaddingRatio: 1.15,
  /** Horizontal padding around face (× face width) */
  horizontalPaddingRatio: 0.35,
  /** BlazeFace / MediaPipe minimum score */
  minFaceScore: 0.55,
  /** Max upload size before processing (bytes) */
  maxInputBytes: 15 * 1024 * 1024,
  /** Max edge length when decoding for face detection (performance) */
  faceDetectMaxEdge: 640,
  /** Filename prefix for processed uploads */
  processedFilenamePrefix: 'id-photo-',
  /** Card circular photo radius in canvas logical px (smart-card-renderer) */
  cardPhotoRadius: 54,
} as const;

export type IdPhotoConfig = typeof ID_PHOTO_CONFIG;

export function isProcessedIdPhotoPath(urlOrPath: string | null | undefined): boolean {
  if (!urlOrPath) return false;
  return urlOrPath.includes(ID_PHOTO_CONFIG.processedFilenamePrefix);
}
