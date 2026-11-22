import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageDataUrl } from '@/lib/public-assets';
import { formatFrw } from '@/utils/currency';
import { formatPersonName, formatPreparedByName } from '@/utils/person-name';
import type { PurchaseRequest } from '@/types';
import type { ProcurementReceiptSettings } from '@/types/settings';
import {
  getRequisitionOrder,
  requisitionLines,
  requisitionTotal,
} from '@/lib/requisition';
import { addImageSafe, drawSchoolHeader, drawVerificationFooter, verificationFooterTop, type PdfSchoolInfo } from './pdf-header';
import { ensureDocumentVerification } from './document-verification';

const PRIMARY: [number, number, number] = [252, 176, 56];
const NAVY: [number, number, number] = [0, 4, 53];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [248, 250, 252];

export interface RequisitionPdfContext extends PdfSchoolInfo {
  schoolName: string;
  stampUrl?: string | null;
  receiptSettings?: ProcurementReceiptSettings;
}

function departmentDisplay(pr: PurchaseRequest): string {
  if (pr.departmentOther?.trim()) return pr.departmentOther.trim();
  return pr.department?.name ?? '—';
}

function money(value: number | null): string {
  return value == null ? '—' : formatFrw(value);
}

function drawSignatoryBlock(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  person: { name: string; title: string },
  signature: string | null,
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PRIMARY);
  doc.text(label.toUpperCase(), x, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(person.name || '—', x, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(person.title || '—', x, y + 17.5);
  doc.text('Date: ..............................', x, y + 22.5);

  if (signature) {
    addImageSafe(doc, signature, x + w / 2 - 14, y + 24, 28, 10);
  }

  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.25);
  doc.line(x, y + 37, x + w, y + 37);
}

export async function buildRequisitionPdf(
  pr: PurchaseRequest,
  ctx: RequisitionPdfContext,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  const [logo, stamp] = await Promise.all([
    loadImageDataUrl(ctx.logoUrl),
    loadImageDataUrl(ctx.stampUrl),
  ]);
  const verification = await ensureDocumentVerification('REQUISITION', pr.id);

  let y = drawSchoolHeader({
    doc,
    info: ctx,
    logoDataUrl: logo,
    title: 'REQUISITION FORM',
    pageWidth: pageW,
    margin,
    startY: margin,
  });

  const order = getRequisitionOrder(pr);
  const lines = requisitionLines(pr);
  const total = requisitionTotal(pr);
  const hasAnyPrice = lines.some((line) => line.hasPrice) || Boolean(order);

  // Requisition banner
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(`Requisition No: ${pr.prNumber}`, margin + 4, y + 6);
  doc.text(
    `Date: ${new Date(pr.createdAt).toLocaleDateString()}`,
    pageW - margin - 4,
    y + 6,
    { align: 'right' },
  );
  y += 13;

  const preparedByName = formatPreparedByName(pr.requestedByName) || '—';

  const details: [string, string][] = [
    ['Academic Year', pr.academicYear ?? '—'],
    ['Term', pr.term ?? '—'],
  ];
  if (order?.poNumber) details.push(['Purchase Order', order.poNumber]);

  const detailColMid = margin + contentW / 2;
  const detailRowH = 12;
  let detailY = y + 4;
  details.forEach(([label, value], index) => {
    const col = index % 2 === 0 ? margin : detailColMid;
    if (index > 0 && index % 2 === 0) detailY += detailRowH;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(label.toUpperCase(), col, detailY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    const valueLines = doc.splitTextToSize(String(value), contentW / 2 - 12);
    doc.text(valueLines.slice(0, 2), col, detailY + 4.5);
  });

  y += Math.ceil(details.length / 2) * detailRowH + 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Item Description', 'Unit', 'Qty', 'Unit Price', 'Total Price']],
    body: lines.map((line, index) => [
      String(index + 1),
      line.item.itemName,
      line.item.unit,
      String(line.item.quantity),
      money(line.unitPrice),
      money(line.totalPrice),
    ]),
    foot: [['', '', '', '', 'TOTAL', hasAnyPrice ? formatFrw(total) : '—']],
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    bodyStyles: { fontSize: 8, textColor: NAVY, cellPadding: 2.5 },
    footStyles: {
      fillColor: PRIMARY,
      textColor: NAVY,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { halign: 'right', cellWidth: 8 },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    theme: 'grid',
    styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  if (!hasAnyPrice) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(
      'Pricing has not been set for this requisition yet. Use Set Order to capture unit prices.',
      margin,
      y,
    );
    y += 6;
  }

  const settings = ctx.receiptSettings;
  const blockW = (contentW - 8) / 3;

  if (y + 75 > verificationFooterTop(pageH, margin) - 2) {
    doc.addPage();
    y = margin;
  }

  drawSignatoryBlock(
    doc,
    margin,
    y,
    blockW,
    'Prepared By',
    { name: preparedByName, title: 'Requester' },
    null,
  );

  drawSignatoryBlock(
    doc,
    margin + blockW + 4,
    y,
    blockW,
    'Reviewed By',
    {
      name: formatPersonName(settings?.verifier.name) || '—',
      title: settings?.verifier.title ?? 'Verifier',
    },
    settings?.verifier.signatureUrl
      ? await loadImageDataUrl(settings.verifier.signatureUrl)
      : null,
  );

  drawSignatoryBlock(
    doc,
    margin + (blockW + 4) * 2,
    y,
    blockW,
    'Approved By',
    {
      name: formatPersonName(settings?.approver.name) || '—',
      title: settings?.approver.title ?? 'Head Teacher / Principal',
    },
    settings?.approver.signatureUrl
      ? await loadImageDataUrl(settings.approver.signatureUrl)
      : null,
  );

  if (stamp) {
    addImageSafe(doc, stamp, pageW - margin - 28, y + 47, 26, 26);
  }

  drawVerificationFooter({
    doc,
    verification,
    pageWidth: pageW,
    pageHeight: pageH,
    margin,
  });

  return doc;
}

export async function downloadRequisitionPdf(
  pr: PurchaseRequest,
  ctx: RequisitionPdfContext,
): Promise<void> {
  const doc = await buildRequisitionPdf(pr, ctx);
  const safe = pr.prNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`requisition-${safe}.pdf`);
}
