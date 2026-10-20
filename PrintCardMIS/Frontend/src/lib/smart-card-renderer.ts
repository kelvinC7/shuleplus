import jsPDF from 'jspdf';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { prepareIdPhotoForCard } from '@shuleplus/id-photo-browser';
import { ID_PHOTO_CONFIG, isProcessedIdPhotoPath } from '@shuleplus/id-photo-config';
import { deriveSmartCardEducationLevel } from '@/lib/smart-card-education-level';

export type SmartCardPayload = {
  kind: 'student' | 'staff';
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolPoBox?: string | null;
  schoolPhone?: string | null;
  schoolEmail?: string | null;
  schoolWebsite?: string | null;
  fullName: string;
  /** Given / first name(s) — shown in Name row when set */
  firstName?: string | null;
  /** Middle name — folded into primary name when set */
  middleName?: string | null;
  /** Surname — shown small below profile photo */
  lastName?: string | null;
  subtitle: string;
  academicYear?: string | null;
  code: string;
  photoUrl?: string | null;
  rfidUid?: string | null;
};

/** Print size: 55 mm wide × 87 mm tall (portrait). Canvas width unchanged at 320 px. */
export const CARD_WIDTH_MM = 55;
export const CARD_HEIGHT_MM = 87;
export const CARD_W = 320;
export const CARD_H = Math.round(CARD_W * (CARD_HEIGHT_MM / CARD_WIDTH_MM));
const SCALE = 3;

const NAVY = '#1e3a8a';
const NAVY_DARK = '#000435';
const GREEN = '#008751';
const MUTED = '#64748b';

const SHULECARD_LOGO_PATHS = [
  '/ShuleCard Brand Logo White22.png',
  '/ShuleCardLogo.png',
  '/shulecard-brand.svg',
  '/ShuleCard%20Brand%20Logo%20White22.png',
  '/shulecard-brand.png',
];

function shuleCardLogoUrl(origin: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${encodeURI(normalized)}`;
}

function shuleCardBrandLogoCandidates(): string[] {
  const origins = new Set<string>();
  if (typeof window !== 'undefined') origins.add(window.location.origin);
  origins.add(publicSiteOrigin());
  const fromEnv = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '');
  if (fromEnv) origins.add(fromEnv);

  const urls: string[] = [];
  for (const origin of origins) {
    for (const path of SHULECARD_LOGO_PATHS) {
      urls.push(shuleCardLogoUrl(origin, path));
    }
  }
  return urls;
}

/** Convert physical mm on the card to logical canvas pixels (55 mm ≡ CARD_W px). */
function mmToPx(mm: number): number {
  return (mm / CARD_WIDTH_MM) * CARD_W;
}

/** Print-safe inset from left/right card edges — ShuleCard logo must stay inside this. */
const SAFE_MARGIN_MM = 7;
const SAFE_MARGIN_PX = mmToPx(SAFE_MARGIN_MM);
const SAFE_CONTENT_W = CARD_W - SAFE_MARGIN_PX * 2;

/** Portrait size — slightly reduced to leave room for a scannable QR below. */
const SMART_CARD_PHOTO_RADIUS = 68;
const PHOTO_COVER_SCALE = 0.75;

/** Green footer — full card width; taller band with Shulecard logo near the top. */
const SMART_CARD_FOOTER_H = 74;
const FOOTER_LOGO_PAD_TOP_MM = 2.5;
/** Logo height in footer (upper area; green space below for a clean look). */
const FOOTER_LOGO_MAX_H_PX = 24;

/** Header — crest sits below top edge; clear gap before school name (not stacked tight). */
const HEADER_TOP_PAD = 18;
const HEADER_LOGO_W = 86;
const HEADER_LOGO_H = 56;
const HEADER_AFTER_LOGO_GAP = 10;
const HEADER_BEFORE_NAME_BASELINE = 4;
const HEADER_SCHOOL_LINE_H = 16;
const HEADER_AFTER_NAME_GAP = 2;
const HEADER_CONTACT_LINE_H = 8;
const HEADER_BOTTOM_PAD = 2;

/** Main body — larger gaps use the previously empty space above the QR code. */
const HEADER_TO_PHOTO_GAP = 14;
const PHOTO_TO_INFO_GAP = 9;
const INFO_ROW_LINE_H = 15;
const INFO_TO_QR_GAP = 2;

function publicSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL;
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

function moduleOrigin(kind: 'iam' | 'sm' | 'hr'): string {
  const stripApi = (base: string) =>
    base.replace(/\/api(\/v1)?\/?$/, '') || base.replace(/\/$/, '');

  if (kind === 'iam') {
    const iamBase =
      process.env.NEXT_PUBLIC_IAM_API_URL ??
      process.env.NEXT_PUBLIC_IAM_URL ??
      'http://localhost:3001/api/v1';
    return stripApi(iamBase);
  }

  const map = {
    sm: process.env.NEXT_PUBLIC_STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
    hr: process.env.NEXT_PUBLIC_HR_API_URL ?? 'http://localhost:3005/api',
  };
  return stripApi(map[kind]);
}

export function resolveCardAssetUrl(
  url: string | null | undefined,
  source: 'iam' | 'sm' | 'hr' = 'iam',
): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  const origin = moduleOrigin(source);
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

/** Resolve student/staff profile URLs from IAM, Student Management, or HR storage. */
export function resolvePersonPhotoUrl(
  url: string | null | undefined,
  kind: 'student' | 'staff',
): string {
  if (!url) return '';
  if (kind === 'student') return resolveCardAssetUrl(url, 'sm');
  const trimmed = String(url).trim();
  const source =
    /\/uploads\/(users|avatars|profiles)/i.test(trimmed) ||
    /\/iam\//i.test(trimmed) ||
    trimmed.startsWith('/uploads/')
      ? 'iam'
      : 'hr';
  return resolveCardAssetUrl(trimmed, source);
}

function qrProfileUrl(kind: 'student' | 'staff', code: string): string {
  const base = publicSiteOrigin();
  const path =
    kind === 'student'
      ? `/v/${encodeURIComponent(code)}`
      : `/staff/${encodeURIComponent(code)}`;
  return `${base}${path}`;
}

function shouldUseCrossOrigin(src: string): boolean {
  if (/^(data:|blob:)/i.test(src)) return false;
  if (typeof window === 'undefined') return false;
  if (src.startsWith('/')) return false;
  try {
    const url = new URL(src, window.location.origin);
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (shouldUseCrossOrigin(src)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

const preparedPhotoCache = new Map<string, Promise<HTMLImageElement | null>>();

async function tryLoadImage(src: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!src) return null;
  const cached = preparedPhotoCache.get(src);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const img = await loadImage(src);
      if (isProcessedIdPhotoPath(src)) return img;
      if (
        img.naturalWidth === ID_PHOTO_CONFIG.outputWidth &&
        img.naturalHeight === ID_PHOTO_CONFIG.outputHeight
      ) {
        return img;
      }
      const prepared = await prepareIdPhotoForCard(img);
      return loadImage(prepared.dataUrl);
    } catch {
      return null;
    }
  })();

  preparedPhotoCache.set(src, promise);
  return promise;
}

/** Strip black/dark background from ShuleCard logo so only white marks show on green. */
async function processShuleCardBrandLogo(img: HTMLImageElement): Promise<HTMLImageElement> {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return img;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = (r + g + b) / 3;

    if (lum < 28) {
      data[i + 3] = 0;
    } else if (lum < 120) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    const out = new Image();
    out.onload = () => resolve(out);
    out.onerror = () => resolve(img);
    out.src = canvas.toDataURL('image/png');
  });
}

async function loadShuleCardBrandLogo(): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined') return null;

  const localUrls = SHULECARD_LOGO_PATHS.map((path) =>
    shuleCardLogoUrl(window.location.origin, path),
  );
  const remoteUrls = shuleCardBrandLogoCandidates().filter((url) => !localUrls.includes(url));
  const candidates = [...localUrls, ...remoteUrls];

  for (const url of candidates) {
    try {
      const img = await loadImage(url);
      if (url.includes('.svg')) return img;
      return processShuleCardBrandLogo(img);
    } catch {
      continue;
    }
  }
  return null;
}

/** Downscale large photos/logos so card renders stay sharp without memory spikes. */
function optimizeImageForCard(img: HTMLImageElement, maxPx = 480): Promise<HTMLImageElement> {
  const longest = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
  if (!longest || longest <= maxPx) return Promise.resolve(img);

  const scale = maxPx / longest;
  const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(img);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    const optimized = new Image();
    optimized.onload = () => resolve(optimized);
    optimized.onerror = () => resolve(img);
    optimized.src = canvas.toDataURL('image/jpeg', 0.9);
  });
}

async function loadQrImage(profileUrl: string): Promise<HTMLImageElement> {
  try {
    const dataUrl = await QRCode.toDataURL(profileUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 512,
      color: { dark: '#000000', light: '#ffffff' },
    });
    return loadImage(dataUrl);
  } catch {
    return createFallbackQrImage();
  }
}

function createFallbackQrImage(): Promise<HTMLImageElement> {
  const size = 400;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, size - 48, size - 48);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QR', size / 2, size / 2);
  }
  return loadImage(canvas.toDataURL('image/png'));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** Rounded top corners only — square bottom edge for the green footer strip. */
function roundRectTopOnly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(/\s+/);
  let line = '';
  let cursorY = y;
  for (let i = 0; i < words.length; i += 1) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, centerX, cursorY);
      line = words[i];
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, centerX, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

function drawLinesCentered(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centerX: number,
  y: number,
  lineHeight: number,
): number {
  let cursorY = y;
  for (const line of lines) {
    ctx.fillText(line, centerX, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

function drawCircleImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  r: number,
  faceBias = 0,
  coverScale = 1,
) {
  const size = r * 2;
  const scale = Math.max(size / img.width, size / img.height) * coverScale;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - w / 2, cy - h / 2 - h * faceBias, w, h);
  ctx.restore();
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Fit the full logo — no border box, image only. */
function drawSchoolLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  drawImageContain(ctx, img, x, y, w, h);
}

function drawPersonSilhouette(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.22, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.38, r * 0.42, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSchoolLogoPlaceholder(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${Math.round(r * 0.85)}px Montserrat, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', cx, cy + 1);
}

function normalizePostalLine(value: string): string {
  return value.replace(/^postal\s+addres[s]?\s*:\s*/i, '').trim();
}

function schoolContactLines(payload: SmartCardPayload): string[] {
  const lines: string[] = [];
  const poBox = payload.schoolPoBox?.trim();
  if (poBox) {
    const postal = normalizePostalLine(poBox);
    if (postal) lines.push(postal);
  }

  const phone = payload.schoolPhone?.trim();
  if (phone) lines.push(phone);

  const email = payload.schoolEmail?.trim();
  if (email) lines.push(email);

  const website = payload.schoolWebsite?.trim();
  if (website) lines.push(website.replace(/^https?:\/\//i, ''));

  return lines;
}

/** Primary name on card; small line below photo only for a single-word Christian name. */
function resolvePersonNames(payload: Pick<SmartCardPayload, 'fullName' | 'firstName' | 'middleName' | 'lastName'>) {
  const first = payload.firstName?.trim();
  const middle = payload.middleName?.trim();
  const last = payload.lastName?.trim();

  const fullFromParts = [first, middle, last].filter(Boolean).join(' ').trim();

  if (first && last) {
    const firstParts = first.split(/\s+/).filter(Boolean);
    const lastParts = last.split(/\s+/).filter(Boolean);

    // Christian name only: firstName "DORCAS", lastName "DUKUNDIMANA JOYEUSE"
    if (firstParts.length === 1 && lastParts.length >= 2) {
      return { primaryName: [last, middle].filter(Boolean).join(' ').trim(), secondName: first };
    }

    return { primaryName: fullFromParts || payload.fullName.trim(), secondName: null };
  }

  if (first) {
    return { primaryName: fullFromParts || payload.fullName.trim(), secondName: null };
  }

  return { primaryName: payload.fullName.trim(), secondName: null };
}

function drawSecondNameBelowPhoto(
  ctx: CanvasRenderingContext2D,
  cx: number,
  photoCy: number,
  photoR: number,
  secondName: string | null,
): number {
  const afterPhoto = photoCy + photoR + 8;
  if (!secondName) return afterPhoto;
  ctx.fillStyle = MUTED;
  ctx.font = '500 7px Montserrat, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(secondName.toUpperCase(), cx, afterPhoto + 6);
  return afterPhoto + 12;
}

function formatIdDisplay(code: string): string {
  const trimmed = code.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return trimmed;
}

function drawStudentFullArc(ctx: CanvasRenderingContext2D, photoCy: number) {
  ctx.save();
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const baselineY = photoCy + 20;
  const peakY = photoCy - 26;
  ctx.moveTo(-10, baselineY);
  ctx.quadraticCurveTo(CARD_W / 2, peakY, CARD_W + 10, baselineY);
  ctx.stroke();
  ctx.restore();
}

function drawStudentPhoto(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  photoImage: HTMLImageElement | null,
  standardized = false,
) {
  const borderW = 3;

  ctx.beginPath();
  ctx.arc(cx, cy, r + borderW + 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r + borderW, 0, Math.PI * 2);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = borderW;
  ctx.stroke();

  if (photoImage) {
    drawCircleImageCover(ctx, photoImage, cx, cy, r, standardized ? 0 : 0.05, PHOTO_COVER_SCALE);
  } else {
    drawPersonSilhouette(ctx, cx, cy, r);
  }
}

function drawStudentInfoFields(
  ctx: CanvasRenderingContext2D,
  y: number,
  rows: Array<{ label: string; value: string }>,
): number {
  const cx = CARD_W / 2;
  const maxRowW = SAFE_CONTENT_W;
  const lineH = INFO_ROW_LINE_H;
  const fontLabel = '500 9px Montserrat, system-ui, sans-serif';
  const fontValue = '700 11px Montserrat, system-ui, sans-serif';
  const labelColor = '#475569';
  const valueColor = NAVY_DARK;

  let maxW = 0;
  const lineData = rows.map((row) => {
    ctx.font = fontLabel;
    const labelPart = `${row.label} : `;
    const labelW = ctx.measureText(labelPart).width;
    ctx.font = fontValue;
    const value = row.value.toUpperCase();
    const valueW = ctx.measureText(value).width;
    maxW = Math.max(maxW, labelW + valueW);
    return { labelPart, value, labelW };
  });

  const startX = cx - Math.min(maxW, maxRowW) / 2;
  let cy = y;

  for (const row of lineData) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = fontLabel;
    ctx.fillStyle = labelColor;
    ctx.fillText(row.labelPart, startX, cy);
    ctx.font = fontValue;
    ctx.fillStyle = valueColor;
    ctx.fillText(row.value, startX + row.labelW, cy);
    cy += lineH;
  }

  return cy;
}

function drawPlainQr(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  qrImage: HTMLImageElement,
  size = 112,
  quiet = 6,
): number {
  const maxTotal = SAFE_CONTENT_W;
  const total = Math.min(size + quiet * 2, maxTotal);
  const qrSize = total - quiet * 2;
  const left = Math.max(SAFE_MARGIN_PX, cx - total / 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(left, y, total, total);
  ctx.drawImage(qrImage, left + quiet, y + quiet, qrSize, qrSize);

  return y + total;
}

type PersonQrLayout = { qrY: number; qrSize: number; quiet: number };

/** Minimum clear space between QR bottom edge and the green footer bar. */
const QR_FOOTER_GAP = 2;
/** Target QR module size (px) — uses all safe width/height available below info fields. */
const QR_TARGET_SIZE = 118;

function drawPersonCardBody(
  ctx: CanvasRenderingContext2D,
  payload: SmartCardPayload,
  photoImage: HTMLImageElement | null,
  headerBottom: number,
  maxContentBottom: number,
  thirdFieldLabel: 'Education Level' | 'Role',
  photoStandardized: boolean,
): PersonQrLayout {
  const cx = CARD_W / 2;
  const photoR = SMART_CARD_PHOTO_RADIUS;
  const photoCy = headerBottom + HEADER_TO_PHOTO_GAP + photoR;
  const gapBeforeInfoFields = PHOTO_TO_INFO_GAP;

  drawStudentFullArc(ctx, photoCy);
  drawStudentPhoto(ctx, cx, photoCy, photoR, photoImage, photoStandardized);

  const { primaryName, secondName } = resolvePersonNames(payload);
  let y = drawSecondNameBelowPhoto(ctx, cx, photoCy, photoR, secondName);
  y += gapBeforeInfoFields;
  y = drawStudentInfoFields(ctx, y, [
    { label: 'Name', value: primaryName },
    { label: 'ID Number', value: formatIdDisplay(payload.code) },
    { label: thirdFieldLabel, value: payload.subtitle },
  ]);

  const quiet = 4;
  const maxByWidth = SAFE_CONTENT_W - quiet * 2;
  const qrBottomLimit = maxContentBottom - QR_FOOTER_GAP;
  const minQrY = y + INFO_TO_QR_GAP;
  const maxByHeight = Math.max(0, qrBottomLimit - minQrY - quiet * 2);
  let qrSize = Math.min(QR_TARGET_SIZE, maxByWidth, maxByHeight);
  let qrY = minQrY;

  // Guarantee the QR never overlaps the green footer: if it doesn't fit at
  // minQrY (e.g. a two-line school name pushed everything else down), pull
  // the QR up rather than letting the footer paint over its bottom edge.
  if (qrY + quiet * 2 + qrSize > qrBottomLimit) {
    qrY = qrBottomLimit - quiet * 2 - qrSize;
  }

  return { qrY, qrSize, quiet };
}

function drawCardHeader(
  ctx: CanvasRenderingContext2D,
  payload: SmartCardPayload,
  logoImage: HTMLImageElement | null,
): number {
  const cx = CARD_W / 2;
  let y = HEADER_TOP_PAD;

  const logoW = Math.min(HEADER_LOGO_W, SAFE_CONTENT_W);
  const logoH = HEADER_LOGO_H;
  const logoX = cx - logoW / 2;

  if (logoImage) {
    drawSchoolLogo(ctx, logoImage, logoX, y, logoW, logoH);
  } else {
    drawSchoolLogoPlaceholder(ctx, cx, y + logoH / 2, 20);
  }
  y += logoH + HEADER_AFTER_LOGO_GAP;

  ctx.fillStyle = NAVY;
  ctx.font = '700 15px Montserrat, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  y = wrapTextCentered(
    ctx,
    payload.schoolName,
    cx,
    y + HEADER_BEFORE_NAME_BASELINE,
    SAFE_CONTENT_W,
    HEADER_SCHOOL_LINE_H,
  );

  const contacts = schoolContactLines(payload);
  if (contacts.length > 0) {
    y += HEADER_AFTER_NAME_GAP;
    ctx.fillStyle = '#475569';
    ctx.font = '500 8px Montserrat, system-ui, sans-serif';
    y = drawLinesCentered(ctx, contacts, cx, y + 2, HEADER_CONTACT_LINE_H);
  }

  return y + HEADER_BOTTOM_PAD;
}

function drawCardFooter(
  ctx: CanvasRenderingContext2D,
  brandLogo: HTMLImageElement | null,
  footerH: number,
) {
  const footerY = CARD_H - footerH;
  const cx = CARD_W / 2;

  // Green footer spans full card width; logo/content stays inside 7 mm safe margins.
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, footerY, CARD_W, footerH);

  const logoY = footerY + mmToPx(FOOTER_LOGO_PAD_TOP_MM);
  const logoDrawH = Math.min(
    FOOTER_LOGO_MAX_H_PX,
    footerH - mmToPx(FOOTER_LOGO_PAD_TOP_MM) - 8,
  );

  if (brandLogo) {
    drawImageContain(ctx, brandLogo, SAFE_MARGIN_PX, logoY, SAFE_CONTENT_W, logoDrawH);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px Montserrat, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('shulecard', cx, logoY + logoDrawH * 0.72);
  }
}

export async function renderSmartCardToCanvas(payload: SmartCardPayload): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.scale(SCALE, SCALE);

  const profileUrl = qrProfileUrl(payload.kind, payload.code);
  const [qrImage, logoImage, photoImage, brandLogo] = await Promise.all([
    loadQrImage(profileUrl),
    tryLoadImage(resolveCardAssetUrl(payload.schoolLogoUrl, 'iam')),
    tryLoadImage(
      resolvePersonPhotoUrl(payload.photoUrl, payload.kind),
    ),
    loadShuleCardBrandLogo(),
  ]);

  const footerH = SMART_CARD_FOOTER_H;
  const cardR = 18;
  const cx = CARD_W / 2;

  ctx.fillStyle = '#ffffff';
  roundRectTopOnly(ctx, 0, 0, CARD_W, CARD_H, cardR);
  ctx.fill();

  ctx.save();
  roundRectTopOnly(ctx, 0, 0, CARD_W, CARD_H - footerH, cardR);
  ctx.clip();

  let y = drawCardHeader(ctx, payload, logoImage);
  const maxContentBottom = CARD_H - footerH - 4;
  const photoStandardized =
    isProcessedIdPhotoPath(payload.photoUrl) ||
    (photoImage != null &&
      photoImage.width === ID_PHOTO_CONFIG.outputWidth &&
      photoImage.height === ID_PHOTO_CONFIG.outputHeight);
  const personQr = drawPersonCardBody(
    ctx,
    payload,
    photoImage,
    y,
    maxContentBottom,
    payload.kind === 'student' ? 'Education Level' : 'Role',
    photoStandardized,
  );

  ctx.restore();

  drawPlainQr(ctx, cx, personQr.qrY, qrImage, personQr.qrSize, personQr.quiet);

  drawCardFooter(ctx, brandLogo, footerH);

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))),
      type,
      type === 'image/jpeg' ? 0.92 : undefined,
    );
  });
}

export function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
  });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM);
  return pdf.output('blob');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);
}

export function cardFilename(payload: SmartCardPayload): string {
  const prefix = payload.kind === 'staff' ? 'staff' : 'student';
  return `${prefix}-${safeFilename(payload.code || payload.fullName)}.png`;
}

export async function bulkDownloadZip(
  items: Array<{ filename: string; canvas: HTMLCanvasElement }>,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const zip = new JSZip();
  const total = items.length;
  let done = 0;

  for (const item of items) {
    const blob = await canvasToBlob(item.canvas, 'image/png');
    zip.file(item.filename, blob);
    done += 1;
    onProgress?.(done, total);
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export async function exportZip(items: Array<{ filename: string; canvas: HTMLCanvasElement }>, zipName: string) {
  const blob = await bulkDownloadZip(items);
  downloadBlob(blob, zipName);
}

export function buildCardPayload(
  kind: CardKind,
  school: {
    name: string;
    logoUrl?: string | null;
    email?: string | null;
    phone?: string | null;
    poBox?: string | null;
    website?: string | null;
  },
  person: SmartAccessPerson,
): SmartCardPayload {
  const isStudent = kind === 'student';
  const personNames = person as SmartAccessPerson & {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
  };
  return {
    kind,
    schoolName: school.name,
    schoolLogoUrl: school.logoUrl ?? null,
    schoolPoBox: school.poBox ?? null,
    schoolPhone: school.phone ?? null,
    schoolEmail: school.email ?? null,
    schoolWebsite: school.website ?? null,
    fullName: person.fullName,
    firstName: personNames.firstName ?? null,
    middleName: personNames.middleName ?? null,
    lastName: personNames.lastName ?? null,
    subtitle: isStudent
      ? deriveSmartCardEducationLevel(
          (person as SmartAccessStudent).className,
          (person as SmartAccessStudent).educationLevel,
        )
      : (person as SmartAccessStaff).position,
    academicYear: isStudent ? (person as SmartAccessStudent).academicYear ?? null : null,
    code: isStudent
      ? (person as SmartAccessStudent).studentCode
      : (person as SmartAccessStaff).employeeNumber,
    photoUrl: person.photoUrl ?? null,
    rfidUid: person.rfidUid,
  };
}

export type CardKind = 'student' | 'staff';

export type SmartAccessPerson = {
  id: string;
  fullName: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
};

export type SmartAccessStudent = SmartAccessPerson & {
  studentCode: string;
  className?: string | null;
  educationLevel?: string | null;
  academicYear?: string | null;
};

export type SmartAccessStaff = SmartAccessPerson & {
  employeeNumber: string;
  position: string;
};