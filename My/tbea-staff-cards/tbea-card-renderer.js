/**
 * TBEA staff ID cards — same layout/size as PrintCardMIS (55×87 mm, 320×506 logical px).
 * Accent color: blue (PrintCard uses green).
 */

import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';

export const CARD_WIDTH_MM = 55;
export const DEFAULT_LOGO_URL = new URL('./assets/logo.jpeg', import.meta.url).href;
export const CARD_HEIGHT_MM = 87;
export const CARD_W = 320;
export const CARD_H = Math.round(CARD_W * (CARD_HEIGHT_MM / CARD_WIDTH_MM));
export const SCALE = 3;

const NAVY = '#1e3a8a';
const NAVY_DARK = '#000435';
/** TBEA brand blue — footer, photo ring, header arc */
const BRAND_BLUE = '#1565c0';
const MUTED = '#64748b';

const SAFE_MARGIN_MM = 7;
const SMART_CARD_PHOTO_RADIUS = 70;
const PHOTO_COVER_SCALE = 1.05;
const PHOTO_FACE_BIAS = 0.08;
const SMART_CARD_FOOTER_H = 74;
const FOOTER_LOGO_PAD_TOP_MM = 2.5;
const FOOTER_LOGO_MAX_H_PX = 24;

const HEADER_TOP_PAD = 14;
const HEADER_AFTER_LOGO_GAP = 8;
const HEADER_BEFORE_NAME_BASELINE = 4;
const HEADER_SCHOOL_LINE_H = 16;
const HEADER_AFTER_NAME_GAP = 2;
const HEADER_CONTACT_LINE_H = 8;
const HEADER_BOTTOM_PAD = 2;

const HEADER_TO_PHOTO_GAP = 14;
const PHOTO_TO_INFO_GAP = 9;
const INFO_ROW_LINE_H = 15;
const INFO_TO_QR_GAP = 2;
const QR_FOOTER_GAP = 2;
const QR_TARGET_SIZE = 118;

function mmToPx(mm) {
  return (mm / CARD_WIDTH_MM) * CARD_W;
}

const SAFE_MARGIN_PX = mmToPx(SAFE_MARGIN_MM);
const SAFE_CONTENT_W = CARD_W - SAFE_MARGIN_PX * 2;
/** TBEA logo is wide — use full safe width. */
const HEADER_LOGO_W = SAFE_CONTENT_W;
const HEADER_LOGO_H = 54;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function tryLoadImage(src) {
  if (!src) return null;
  try {
    return await loadImage(src);
  } catch {
    return null;
  }
}

async function loadQrImage(data) {
  const text = String(data ?? '').trim() || 'TBEA Co., Ltd.';
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    return loadImage(dataUrl);
  } catch {
    return createFallbackQrImage();
  }
}

function createFallbackQrImage() {
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
  }
  return loadImage(canvas.toDataURL('image/png'));
}

function roundRect(ctx, x, y, w, h, r) {
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

function roundRectTopOnly(ctx, x, y, w, h, r) {
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

function wrapTextCentered(ctx, text, centerX, y, maxWidth, lineHeight) {
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

function drawLinesCentered(ctx, lines, centerX, y, lineHeight) {
  let cursorY = y;
  for (const line of lines) {
    ctx.fillText(line, centerX, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

function drawCircleImageCover(ctx, img, cx, cy, r, faceBias = 0.05, coverScale = 1) {
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

function drawImageContain(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawPersonSilhouette(ctx, cx, cy, r) {
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

function contactLines(payload) {
  const lines = [];
  if (payload.poBox?.trim()) lines.push(payload.poBox.trim());
  if (payload.phone?.trim()) lines.push(payload.phone.trim());
  if (payload.email?.trim()) lines.push(payload.email.trim());
  if (payload.website?.trim()) lines.push(payload.website.replace(/^https?:\/\//i, ''));
  return lines;
}

function drawPhoto(ctx, cx, cy, r, photoImage) {
  const borderW = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r + borderW + 1, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r + borderW, 0, Math.PI * 2);
  ctx.strokeStyle = BRAND_BLUE;
  ctx.lineWidth = borderW;
  ctx.stroke();
  if (photoImage) {
    drawCircleImageCover(ctx, photoImage, cx, cy, r, PHOTO_FACE_BIAS, PHOTO_COVER_SCALE);
  } else {
    drawPersonSilhouette(ctx, cx, cy, r);
  }
}

function drawInfoFields(ctx, y, rows, lineH = INFO_ROW_LINE_H) {
  const cx = CARD_W / 2;
  const maxRowW = SAFE_CONTENT_W;
  const fontLabel = '500 9px Montserrat, system-ui, sans-serif';
  const fontValue = '700 11px Montserrat, system-ui, sans-serif';

  let maxW = 0;
  const lineData = rows.map((row) => {
    ctx.font = fontLabel;
    const labelPart = `${row.label} : `;
    const labelW = ctx.measureText(labelPart).width;
    ctx.font = fontValue;
    const raw = String(row.value ?? '').trim() || '—';
    const value = row.uppercase === false ? raw : raw.toUpperCase();
    const valueW = ctx.measureText(value).width;
    maxW = Math.max(maxW, labelW + valueW);
    return { labelPart, value, labelW, small: row.small === true };
  });

  const startX = cx - Math.min(maxW, maxRowW) / 2;
  let cy = y;

  for (const row of lineData) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = fontLabel;
    ctx.fillStyle = '#475569';
    ctx.fillText(row.labelPart, startX, cy);
    ctx.font = row.small ? '700 9px Montserrat, system-ui, sans-serif' : fontValue;
    ctx.fillStyle = NAVY_DARK;
    ctx.fillText(row.value, startX + row.labelW, cy);
    cy += lineH;
  }
  return cy;
}

function drawPlainQr(ctx, cx, y, qrImage, size = 112, quiet = 6) {
  const maxTotal = SAFE_CONTENT_W;
  const total = Math.min(size + quiet * 2, maxTotal);
  const qrSize = total - quiet * 2;
  const left = Math.max(SAFE_MARGIN_PX, cx - total / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(left, y, total, total);
  ctx.drawImage(qrImage, left + quiet, y + quiet, qrSize, qrSize);
  return y + total;
}

function drawCardHeader(ctx, payload, logoImage) {
  const cx = CARD_W / 2;
  let y = HEADER_TOP_PAD;
  const logoW = HEADER_LOGO_W;
  const logoH = HEADER_LOGO_H;
  const logoX = cx - logoW / 2;

  if (logoImage) {
    drawImageContain(ctx, logoImage, logoX, y, logoW, logoH);
    y += logoH + HEADER_AFTER_LOGO_GAP;
  } else {
    ctx.fillStyle = BRAND_BLUE;
    ctx.font = '700 14px Montserrat, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('TBEA', cx, y + 20);
    y += 28 + HEADER_AFTER_LOGO_GAP;
  }

  ctx.fillStyle = NAVY;
  ctx.font = '700 15px Montserrat, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  y = wrapTextCentered(
    ctx,
    payload.companyName,
    cx,
    y + HEADER_BEFORE_NAME_BASELINE,
    SAFE_CONTENT_W,
    HEADER_SCHOOL_LINE_H,
  );

  const contacts = contactLines(payload);
  if (contacts.length > 0) {
    y += HEADER_AFTER_NAME_GAP;
    ctx.fillStyle = '#475569';
    ctx.font = '500 8px Montserrat, system-ui, sans-serif';
    y = drawLinesCentered(ctx, contacts, cx, y + 2, HEADER_CONTACT_LINE_H);
  }
  return y + HEADER_BOTTOM_PAD;
}

function drawCardFooter(ctx, footerH) {
  const footerY = CARD_H - footerH;
  const cx = CARD_W / 2;
  ctx.fillStyle = BRAND_BLUE;
  ctx.fillRect(0, footerY, CARD_W, footerH);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 11px Montserrat, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const midY = footerY + footerH / 2 - 4;
  ctx.fillText('TBEA Co., Ltd.', cx, midY);
  ctx.font = '500 8px Montserrat, system-ui, sans-serif';
  ctx.fillText('Always Reliable · 全球信赖', cx, midY + 14);
}

function drawPersonCardBody(ctx, payload, photoImage, headerBottom, maxContentBottom) {
  const cx = CARD_W / 2;
  const photoR = SMART_CARD_PHOTO_RADIUS;
  const photoCy = headerBottom + HEADER_TO_PHOTO_GAP + photoR;

  drawPhoto(ctx, cx, photoCy, photoR, photoImage);

  let y = photoCy + photoR + 8 + PHOTO_TO_INFO_GAP;
  const infoRows = [
    { label: 'Name', value: payload.fullName || '—' },
    {
      label: 'Staff Phone Number',
      value: payload.staffPhone || '—',
      uppercase: false,
    },
    {
      label: 'Email',
      value: payload.staffEmail || '—',
      uppercase: false,
      small: Boolean(payload.staffEmail && payload.staffEmail.length > 22),
    },
    { label: 'Role', value: payload.role || 'Staff' },
  ];
  const lineH = infoRows.length > 3 ? 13 : INFO_ROW_LINE_H;
  y = drawInfoFields(ctx, y, infoRows, lineH);

  const quiet = 4;
  const maxByWidth = SAFE_CONTENT_W - quiet * 2;
  const qrBottomLimit = maxContentBottom - QR_FOOTER_GAP;
  const minQrY = y + INFO_TO_QR_GAP;
  const maxByHeight = Math.max(0, qrBottomLimit - minQrY - quiet * 2);
  const qrCap = infoRows.length > 3 ? 102 : QR_TARGET_SIZE;
  let qrSize = Math.min(qrCap, maxByWidth, maxByHeight);
  let qrY = minQrY;
  if (qrY + quiet * 2 + qrSize > qrBottomLimit) {
    qrY = qrBottomLimit - quiet * 2 - qrSize;
  }
  return { qrY, qrSize, quiet };
}

/**
 * @typedef {Object} TbeaStaffCardPayload
 * @property {string} companyName
 * @property {string} fullName
 * @property {string} [staffPhone]
 * @property {string} [staffEmail]
 * @property {string} [role]
 * @property {string} [photoUrl]
 * @property {string} [logoUrl]
 * @property {string} [poBox]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [website]
 * @property {string} [qrPayload] — encoded in QR (defaults to staff contact vCard snippet)
 */

function buildStaffQrPayload(payload) {
  const name = String(payload.fullName || '').trim();
  const phone = String(payload.staffPhone || '').trim();
  const email = String(payload.staffEmail || '').trim();

  if (email) {
    const params = new URLSearchParams();
    if (name) params.set('subject', `TBEA — ${name}`);
    const qs = params.toString();
    return qs ? `mailto:${email}?${qs}` : `mailto:${email}`;
  }
  if (phone) {
    const tel = phone.replace(/\s+/g, '');
    return tel.startsWith('tel:') ? tel : `tel:${tel}`;
  }
  if (name) return `TBEA Staff: ${name}`;

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'ORG:TBEA Co., Ltd.',
    'END:VCARD',
  ];
  return lines.join('\n');
}

/** @param {TbeaStaffCardPayload} payload */
export async function renderTbeaStaffCardToCanvas(payload, options = {}) {
  const logoSrc = options.logoUrl ?? payload.logoUrl ?? DEFAULT_LOGO_URL;
  const qrText = payload.qrPayload?.trim() || buildStaffQrPayload(payload);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.scale(SCALE, SCALE);

  const [qrImage, logoImage, photoImage] = await Promise.all([
    loadQrImage(qrText),
    tryLoadImage(logoSrc),
    tryLoadImage(payload.photoUrl),
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

  const headerBottom = drawCardHeader(ctx, payload, logoImage);
  const maxContentBottom = CARD_H - footerH - 4;
  const personQr = drawPersonCardBody(ctx, payload, photoImage, headerBottom, maxContentBottom);
  ctx.restore();

  drawPlainQr(ctx, cx, personQr.qrY, qrImage, personQr.qrSize, personQr.quiet);
  drawCardFooter(ctx, footerH);

  return canvas;
}

function drawBackGradient(ctx) {
  const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  g.addColorStop(0, '#0d47a1');
  g.addColorStop(0.55, '#1565c0');
  g.addColorStop(1, '#1976d2');
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 18);
  ctx.fill();
}

function drawBackPattern(ctx) {
  ctx.save();
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 18);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = -CARD_H; x < CARD_W + CARD_H; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + CARD_H, CARD_H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackLogoMark(ctx, logoImage, cx, y, maxW, maxH) {
  if (logoImage) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    drawImageContain(ctx, logoImage, cx - maxW / 2, y, maxW, maxH);
    ctx.restore();
    return y + maxH;
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px Montserrat, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('TBEA', cx, y + 22);
  return y + 32;
}

/** @param {TbeaStaffCardPayload} payload */
export async function renderTbeaStaffCardBackToCanvas(payload, options = {}) {
  const logoSrc = options.logoUrl ?? payload.logoUrl ?? DEFAULT_LOGO_URL;
  const websiteQr = payload.website?.trim()
    ? payload.website.replace(/^https?:\/\//i, '').startsWith('www.')
      ? `https://${payload.website.replace(/^https?:\/\//i, '')}`
      : payload.website.startsWith('http')
        ? payload.website
        : `https://${payload.website}`
    : 'https://www.tbea.com';

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.scale(SCALE, SCALE);

  const [qrImage, logoImage] = await Promise.all([
    loadQrImage(websiteQr),
    tryLoadImage(logoSrc),
  ]);

  const cx = CARD_W / 2;

  drawBackGradient(ctx);
  drawBackPattern(ctx);

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, SAFE_MARGIN_PX + 2, 14, SAFE_CONTENT_W - 4, 52, 8);
  ctx.fill();

  let y = drawBackLogoMark(ctx, logoImage, cx, 18, SAFE_CONTENT_W - 20, 40);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 7px Montserrat, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  y = drawLinesCentered(ctx, ['OFFICIAL STAFF IDENTIFICATION'], cx, y + 14, 10);

  const infoY = y + 18;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, SAFE_MARGIN_PX, infoY, SAFE_CONTENT_W, 132, 8);
  ctx.fill();

  const lines = [
    payload.companyName || 'TBEA Co., Ltd.',
    payload.phone?.trim() ? `Tel: ${payload.phone.trim()}` : '',
    payload.email?.trim() ? payload.email.trim() : '',
    payload.website?.trim() ? payload.website.replace(/^https?:\/\//i, '') : '',
  ].filter(Boolean);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 8px Montserrat, system-ui, sans-serif';
  let ty = infoY + 16;
  for (const line of lines.slice(0, 4)) {
    ty = wrapTextCentered(ctx, line, cx, ty, SAFE_CONTENT_W - 12, 11);
    ty += 4;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '500 6.5px Montserrat, system-ui, sans-serif';
  wrapTextCentered(
    ctx,
    'This card remains property of TBEA Co., Ltd. If found, please return to the company office.',
    cx,
    infoY + 88,
    SAFE_CONTENT_W - 16,
    9,
  );

  const qrSize = 72;
  const qrY = CARD_H - SMART_CARD_FOOTER_H - qrSize - 18;
  drawPlainQr(ctx, cx, qrY, qrImage, qrSize, 4);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '500 6px Montserrat, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Scan for company website', cx, qrY + qrSize + 12);

  const footerY = CARD_H - SMART_CARD_FOOTER_H;
  ctx.fillStyle = '#0a3d7a';
  ctx.fillRect(0, footerY, CARD_W, SMART_CARD_FOOTER_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 10px Montserrat, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Always Reliable · 全球信赖', cx, footerY + SMART_CARD_FOOTER_H / 2);

  return canvas;
}

export function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))),
      type,
      type === 'image/jpeg' ? 0.92 : undefined,
    );
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function safeFilename(name) {
  return String(name).replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);
}
