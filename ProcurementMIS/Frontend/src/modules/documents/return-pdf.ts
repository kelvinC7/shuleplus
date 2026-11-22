import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageDataUrl } from '@/lib/public-assets';
import { formatFrw } from '@/utils/currency';
import { formatPersonName, formatPreparedByName } from '@/utils/person-name';
import type { GoodsReturn } from '@/types';
import type { ProcurementReceiptSettings } from '@/types/settings';
import { RETURN_STATUS_LABELS } from '@/lib/grn-constants';
import {
  addImageSafe,
  drawSchoolHeader,
  drawVerificationFooter,
  verificationFooterTop,
  type PdfSchoolInfo,
} from './pdf-header';
import { ensureDocumentVerification } from './document-verification';

const PRIMARY: [number, number, number] = [252, 176, 56];
const NAVY: [number, number, number] = [0, 4, 53];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [248, 250, 252];

export interface ReturnPdfContext extends PdfSchoolInfo {
  schoolName: string;
  stampUrl?: string | null;
  receiptSettings?: ProcurementReceiptSettings;
}

function drawSignatureBlock(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  name: string,
  title: string,
  signature: string | null,
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PRIMARY);
  doc.text(label.toUpperCase(), x, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(name || '—', x, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(title || '—', x, y + 17.5);
  doc.text('Date: ..............................', x, y + 22.5);

  if (signature) {
    addImageSafe(doc, signature, x + w / 2 - 14, y + 24, 28, 10);
  }

  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.25);
  doc.line(x, y + 37, x + w, y + 37);
}

export async function buildReturnPdf(
  ret: GoodsReturn,
  ctx: ReturnPdfContext,
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
  const verification = await ensureDocumentVerification('GOODS_RETURN', ret.id);

  const po = ret.grn?.purchaseOrder;
  const supplierName = po?.supplier?.companyName ?? '—';
  const footerTop = verificationFooterTop(pageH, margin);

  let y = drawSchoolHeader({
    doc,
    info: ctx,
    logoDataUrl: logo,
    title: 'PURCHASE RETURN',
    pageWidth: pageW,
    margin,
    startY: margin,
  });

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(`Return No: ${ret.returnNumber}`, margin + 4, y + 5.5);
  doc.text(
    `Date: ${new Date(ret.createdAt).toLocaleDateString()}`,
    pageW - margin - 4,
    y + 5.5,
    { align: 'right' },
  );
  y += 12;

  const preparedByName = formatPreparedByName(ret.createdByName) || '—';
  const metaRows = [
    ['Supplier', supplierName],
    ['Original PO', po?.poNumber ?? '—'],
    ['Original GRN', ret.grn?.grnNumber ?? '—'],
    ['Reason', ret.reason.replace(/_/g, ' ')],
    ['Status', RETURN_STATUS_LABELS[ret.status] ?? ret.status.replace(/_/g, ' ')],
    ['Prepared By', preparedByName],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const [label, value] of metaRows) {
    doc.setTextColor(...GRAY);
    doc.text(`${label}:`, margin, y);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), margin + 32, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
  }
  y += 3;

  if (ret.reasonDescription) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text('Reason details:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    const lines = doc.splitTextToSize(ret.reasonDescription, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  const items = ret.items ?? [];
  let totalValue = 0;
  const tableBody = items.map((item, index) => {
    const unitPrice = Number(item.unitPrice ?? 0);
    const lineValue = Number(item.returnQty) * unitPrice;
    totalValue += lineValue;
    return [
      String(index + 1),
      item.itemName,
      String(Number(item.receivedQty)),
      String(Number(item.returnQty)),
      unitPrice > 0 ? formatFrw(unitPrice) : '—',
      unitPrice > 0 ? formatFrw(lineValue) : '—',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Item', 'Received Qty', 'Return Qty', 'Unit Price', 'Total']],
    body: tableBody,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    bodyStyles: { fontSize: 8, textColor: NAVY, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { halign: 'right', cellWidth: 8 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    theme: 'grid',
    styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  if (totalValue > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(`Total Return Value: ${formatFrw(totalValue)}`, pageW - margin, y, {
      align: 'right',
    });
    y += 8;
  }

  if (y + 75 > footerTop - 2) {
    doc.addPage();
    y = margin;
  }

  const settings = ctx.receiptSettings;
  const blockW = (contentW - 8) / 3;

  drawSignatureBlock(
    doc,
    margin,
    y,
    blockW,
    'Returned By',
    preparedByName,
    'Store Officer',
    null,
  );

  drawSignatureBlock(
    doc,
    margin + blockW + 4,
    y,
    blockW,
    'Verified By',
    formatPersonName(settings?.verifier.name) || '—',
    settings?.verifier.title ?? 'Verifier',
    settings?.verifier.signatureUrl
      ? await loadImageDataUrl(settings.verifier.signatureUrl)
      : null,
  );

  drawSignatureBlock(
    doc,
    margin + (blockW + 4) * 2,
    y,
    blockW,
    'Supplier',
    supplierName,
    'Authorized Representative',
    null,
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

export async function downloadReturnPdf(
  ret: GoodsReturn,
  ctx: ReturnPdfContext,
): Promise<void> {
  const doc = await buildReturnPdf(ret, ctx);
  const safe = ret.returnNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`purchase-return-${safe}.pdf`);
}

export async function printReturnPdf(
  ret: GoodsReturn,
  ctx: ReturnPdfContext,
): Promise<void> {
  const doc = await buildReturnPdf(ret, ctx);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
