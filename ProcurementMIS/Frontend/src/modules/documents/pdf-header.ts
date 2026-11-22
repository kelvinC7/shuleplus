import type { jsPDF } from 'jspdf';

/**
 * Shared document header for Procurement MIS PDFs.
 *
 * Layout (from top):
 *   school logo
 *   school name
 *   registered location  -> Province, District, Sector
 *   website
 *   document title
 *
 * All values originate from Authentication → Organization Admin → Settings and
 * are exposed by the module backend via `/settings/org-profile`.
 */
export interface PdfSchoolInfo {
  schoolName?: string | null;
  logoUrl?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  website?: string | null;
}

const NAVY: [number, number, number] = [0, 4, 53];
const GRAY: [number, number, number] = [100, 116, 139];

function imageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return 'JPEG';
  }
  return 'PNG';
}

export function addImageSafe(
  doc: jsPDF,
  dataUrl: string | null,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!dataUrl) return;
  try {
    doc.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h);
  } catch {
    /* skip broken image */
  }
}

/** "Province, District, Sector" — skips any missing part. */
export function registeredLocation(info: PdfSchoolInfo): string {
  return [info.province, info.district, info.sector]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/** Website without protocol / trailing slash, e.g. "www.school.rw". */
export function cleanWebsite(value?: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  return raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

export interface DrawSchoolHeaderArgs {
  doc: jsPDF;
  info: PdfSchoolInfo;
  /** Pre-loaded logo data URL (from `loadImageDataUrl(info.logoUrl)`). */
  logoDataUrl: string | null;
  title: string;
  pageWidth: number;
  margin: number;
  startY: number;
}

/** Draws the school header and returns the Y coordinate below the title. */
export function drawSchoolHeader({
  doc,
  info,
  logoDataUrl,
  title,
  pageWidth,
  margin,
  startY,
}: DrawSchoolHeaderArgs): number {
  const centerX = pageWidth / 2;
  let y = startY;

  const logoSize = 22;
  if (logoDataUrl) {
    addImageSafe(doc, logoDataUrl, centerX - logoSize / 2, y, logoSize, logoSize);
    y += logoSize + 3;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(info.schoolName?.trim() || 'School', centerX, y, { align: 'center' });
  y += 5;

  const location = registeredLocation(info);
  if (location) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(location, centerX, y, { align: 'center' });
    y += 4;
  }

  const website = cleanWebsite(info.website);
  if (website) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(website, centerX, y, { align: 'center' });
    y += 4;
  }

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(title, centerX, y, { align: 'center' });
  y += 6;

  return y;
}

/* -------------------------------------------------------------------- */
/* Verification footer (QR)                                             */
/* -------------------------------------------------------------------- */

export interface VerificationFooterData {
  qrDataUrl?: string | null;
  reference: string;
  url?: string;
}

/**
 * Height reserved at the bottom of the final page for the verification block.
 * Layouts must keep signatures and tables above `verificationFooterTop()`.
 */
export const PDF_VERIFICATION_FOOTER_HEIGHT = 37;

export function verificationFooterTop(pageHeight: number, margin: number): number {
  return pageHeight - margin - PDF_VERIFICATION_FOOTER_HEIGHT;
}

export interface DrawVerificationFooterArgs {
  doc: jsPDF;
  verification?: VerificationFooterData | null;
  pageWidth: number;
  pageHeight: number;
  margin: number;
}

/**
 * Draws a bottom-centre verification footer on the final page only:
 * divider, QR code, caption and document reference. Existing page content is
 * left untouched — callers reserve space using `verificationFooterTop()`.
 */
export function drawVerificationFooter({
  doc,
  verification,
  pageWidth,
  pageHeight,
  margin,
}: DrawVerificationFooterArgs): void {
  if (!verification?.qrDataUrl) return;

  const finalPage = doc.getNumberOfPages();
  doc.setPage(finalPage);

  const centerX = pageWidth / 2;
  const top = verificationFooterTop(pageHeight, margin);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(margin, top, pageWidth - margin, top);

  const qrSize = 24;
  const qrY = top + 3;
  addImageSafe(doc, verification.qrDataUrl, centerX - qrSize / 2, qrY, qrSize, qrSize);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('Scan to Verify This Document', centerX, qrY + qrSize + 4, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text(`Document Ref: ${verification.reference}`, centerX, qrY + qrSize + 8, {
    align: 'center',
  });
}
