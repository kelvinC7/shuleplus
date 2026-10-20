import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageDataUrl } from '@/lib/public-assets';
import { formatFrw } from '@/utils/currency';
import type { PurchaseRequest } from '@/types';
import type { ProcurementReceiptSettings } from '@/types/settings';

const PRIMARY: [number, number, number] = [252, 176, 56];
const NAVY: [number, number, number] = [0, 4, 53];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [248, 250, 252];

export interface PRPdfContext {
  schoolName: string;
  logoUrl?: string | null;
  stampUrl?: string | null;
  receiptSettings?: ProcurementReceiptSettings;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  DEPARTMENT_HEAD_APPROVED: 'Dept. Head Approved',
  FINANCE_APPROVED: 'Finance Approved',
  PROCUREMENT_APPROVED: 'Procurement Approved',
  MD_APPROVED: 'Fully Approved',
  REJECTED: 'Rejected',
  CONVERTED_TO_PO: 'Converted to PO',
  CANCELLED: 'Cancelled',
};

function imageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return 'JPEG';
  }
  return 'PNG';
}

function addImageSafe(
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
    /* skip */
  }
}

function departmentDisplay(pr: PurchaseRequest): string {
  if (pr.departmentOther?.trim()) return pr.departmentOther.trim();
  return pr.department?.name ?? '—';
}

function drawSignatoryBlock(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  person: { name: string; title: string },
  signature: string | null,
  dateStr: string,
) {
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.2);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(x, y, w, 40, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PRIMARY);
  doc.text(label.toUpperCase(), x + 3, y + 6);

  if (signature) {
    addImageSafe(doc, signature, x + w / 2 - 14, y + 9, 28, 10);
  } else {
    doc.setDrawColor(...GRAY);
    doc.line(x + 4, y + 21, x + w - 4, y + 21);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(person.name || '—', x + 3, y + 29);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(person.title || '—', x + 3, y + 33.5);
  doc.text(dateStr, x + 3, y + 37.5);
}

export async function buildPurchaseRequestPdf(
  pr: PurchaseRequest,
  ctx: PRPdfContext,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const centerX = pageW / 2;

  const [logo, brandLogo, stamp] = await Promise.all([
    loadImageDataUrl(ctx.logoUrl),
    loadImageDataUrl('/logo.png'),
    loadImageDataUrl(ctx.stampUrl),
  ]);

  let y = margin;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 28, 'F');
  addImageSafe(doc, brandLogo, centerX - 20, 6, 40, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(ctx.schoolName || 'School', centerX, 22, { align: 'center' });

  y = 34;
  if (logo) {
    addImageSafe(doc, logo, margin, y - 2, 16, 16);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text('PURCHASE REQUEST', centerX, y + 4, { align: 'center' });
  y += 12;

  // PR banner
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(`PR No: ${pr.prNumber}`, margin + 4, y + 6);
  doc.text(
    `Date: ${new Date(pr.createdAt).toLocaleDateString()}`,
    pageW - margin - 4,
    y + 6,
    { align: 'right' },
  );
  y += 13;

  // Status + priority row
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Status:', margin + 4, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(STATUS_LABELS[pr.status] ?? pr.status, margin + 18, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Priority:', margin + 70, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(pr.priority, margin + 86, y + 6.5);
  y += 14;

  const details = [
    ['Department', departmentDisplay(pr)],
    ['Requested By', pr.requestedByName ?? '—'],
    ['Needed By', new Date(pr.neededDate).toLocaleDateString()],
    ['Academic Year', pr.academicYear ?? '—'],
    ['Term', pr.term ?? '—'],
    ['Request Type', pr.requestType],
    ['Purpose', pr.purpose ?? '—'],
  ];

  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.15);
  doc.roundedRect(margin, y, contentW, 38, 2, 2);

  let detailY = y + 6;
  const colMid = margin + contentW / 2;
  details.forEach(([label, value], i) => {
    const col = i % 2 === 0 ? margin + 4 : colMid + 2;
    if (i > 0 && i % 2 === 0) detailY += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`${label}:`, col, detailY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(String(value), contentW / 2 - 10);
    doc.text(lines.slice(0, 2), col, detailY + 4);
  });

  y += 44;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Item Description', 'Unit', 'Qty', 'Remarks']],
    body: (pr.items ?? []).map((item, i) => [
      String(i + 1),
      item.itemName,
      item.unit,
      String(item.quantity),
      item.description ?? '—',
    ]),
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    bodyStyles: { fontSize: 8, textColor: NAVY, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: LIGHT },
    theme: 'grid',
    styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 12;

  const settings = ctx.receiptSettings;
  const dateStr = new Date().toLocaleDateString();
  const blockW = (contentW - 8) / 3;

  drawSignatoryBlock(
    doc,
    margin,
    y,
    blockW,
    'Prepared By',
    { name: pr.requestedByName ?? '—', title: 'Requester' },
    null,
    dateStr,
  );

  drawSignatoryBlock(
    doc,
    margin + blockW + 4,
    y,
    blockW,
    'Verified By',
    {
      name: settings?.verifier.name ?? '—',
      title: settings?.verifier.title ?? 'Verifier',
    },
    settings?.verifier.signatureUrl
      ? await loadImageDataUrl(settings.verifier.signatureUrl)
      : null,
    dateStr,
  );

  drawSignatoryBlock(
    doc,
    margin + (blockW + 4) * 2,
    y,
    blockW,
    'Approved By',
    {
      name: settings?.approver.name ?? '—',
      title: settings?.approver.title ?? 'Head Teacher / Principal',
    },
    settings?.approver.signatureUrl
      ? await loadImageDataUrl(settings.approver.signatureUrl)
      : null,
    dateStr,
  );

  if (stamp) {
    addImageSafe(doc, stamp, pageW - margin - 28, y + 44, 26, 26);
  }

  doc.setFillColor(...NAVY);
  doc.rect(0, 287, pageW, 10, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Generated by Shule+ Procurement MIS', centerX, 292.5, { align: 'center' });

  return doc;
}

export async function downloadPurchaseRequestPdf(
  pr: PurchaseRequest,
  ctx: PRPdfContext,
): Promise<void> {
  const doc = await buildPurchaseRequestPdf(pr, ctx);
  const safe = pr.prNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`purchase-request-${safe}.pdf`);
}
