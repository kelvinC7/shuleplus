import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageDataUrl } from '@/lib/public-assets';
import { formatFrw } from '@/utils/currency';
import { formatPersonName, formatPreparedByName } from '@/utils/person-name';
import type { PurchaseOrder, Supplier } from '@/types';
import type { ProcurementReceiptSettings } from '@/types/settings';
import { drawSchoolHeader, drawVerificationFooter, verificationFooterTop, type PdfSchoolInfo } from './pdf-header';
import { ensureDocumentVerification } from './document-verification';

const PRIMARY: [number, number, number] = [252, 176, 56];
const NAVY: [number, number, number] = [0, 4, 53];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [248, 250, 252];

export interface POPdfContext extends PdfSchoolInfo {
  schoolName: string;
  receiptSettings?: ProcurementReceiptSettings;
  supplier?: Supplier | null;
}

function drawInfoBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  lines: { label: string; value: string }[],
) {
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), x + 4, y + 6.5);

  let lineY = y + 12.5;
  doc.setFontSize(9);
  for (const line of lines) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`${line.label}:`, x + 4, lineY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    const valueLines = doc.splitTextToSize(line.value || '—', w - 28);
    doc.text(valueLines, x + 26, lineY);
    lineY += Math.max(5.2, valueLines.length * 4.6);
  }
}

function drawManualSignBlock(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  name: string,
  title: string,
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PRIMARY);
  doc.text(label.toUpperCase(), x, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(name || '—', x, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(title || '—', x, y + 16);
  doc.text('Date: ........................', x, y + 21);

  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.25);
  doc.line(x, y + h - 2, x + w, y + h - 2);
}

export async function buildPurchaseOrderPdf(
  po: PurchaseOrder,
  ctx: POPdfContext,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const centerX = pageW / 2;
  const supplier = ctx.supplier ?? (po.supplier as Supplier | undefined);
  const settings = ctx.receiptSettings;
  const preparedByName =
    formatPreparedByName(po.createdByName) ||
    formatPreparedByName(po.purchaseRequest?.requestedByName) ||
    '—';
  const verifierName = formatPersonName(settings?.verifier.name) || '—';
  const approverName = formatPersonName(settings?.approver.name) || '—';

  const logo = await loadImageDataUrl(ctx.logoUrl);
  const verification = await ensureDocumentVerification('PURCHASE_ORDER', po.id);

  let y = drawSchoolHeader({
    doc,
    info: ctx,
    logoDataUrl: logo,
    title: 'PURCHASE ORDER',
    pageWidth: pageW,
    margin,
    startY: margin,
  });

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(`PO No: ${po.poNumber}`, margin + 4, y + 5.5);
  doc.text(
    new Date(po.orderDate).toLocaleDateString(),
    pageW - margin - 4,
    y + 5.5,
    { align: 'right' },
  );
  y += 12;

  const supplierRecord = supplier as Supplier | null | undefined;
  const supplierName = supplierRecord?.companyName ?? '—';
  const supplierContact = supplierRecord?.contactPerson ?? '—';
  const supplierPhone = supplierRecord?.phone ?? '—';
  const supplierEmail = supplierRecord?.email ?? '—';
  const supplierAddress =
    [supplierRecord?.address, supplierRecord?.city, supplierRecord?.country]
      .filter(Boolean)
      .join(', ') || '—';

  const colGap = 4;
  const colW = (contentW - colGap) / 2;
  const boxH = 43;

  drawInfoBox(doc, margin, y, colW, boxH, 'Supplier', [
    { label: 'Company', value: supplierName },
    { label: 'Contact', value: `${supplierContact}  |  Tel: ${supplierPhone}` },
    { label: 'Email', value: supplierEmail },
    { label: 'Address', value: supplierAddress },
  ]);

  drawInfoBox(doc, margin + colW + colGap, y, colW, boxH, 'Order Details', [
    { label: 'PR Reference', value: po.purchaseRequest?.prNumber ?? '—' },
    { label: 'Order Date', value: new Date(po.orderDate).toLocaleDateString() },
    { label: 'Status', value: po.status.replace(/_/g, ' ') },
    { label: 'Payment', value: po.paymentStatus.replace(/_/g, ' ') },
    { label: 'Prepared By', value: preparedByName || '—' },
  ]);

  y += boxH + 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Item', 'Unit', 'Qty', 'Unit Price', 'Total']],
    body: (po.items ?? []).map((item, i) => [
      String(i + 1),
      item.itemName,
      item.unit,
      String(item.quantity),
      formatFrw(Number(item.unitPrice)),
      formatFrw(Number(item.totalPrice)),
    ]),
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: NAVY },
    alternateRowStyles: { fillColor: LIGHT },
    theme: 'grid',
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 6;

  const totalsX = pageW - margin - 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const totals: [string, string][] = [['Subtotal', formatFrw(Number(po.subtotal))]];
  const discount = Number(po.discount ?? 0);
  const tax = Number(po.tax ?? 0);
  const shipping = Number(po.shippingCost ?? 0);
  if (discount > 0) totals.push(['Discount', formatFrw(discount)]);
  if (tax > 0) totals.push(['Tax', formatFrw(tax)]);
  if (shipping > 0) totals.push(['Shipping', formatFrw(shipping)]);
  for (const [label, val] of totals) {
    doc.text(label, totalsX, y);
    doc.text(val, pageW - margin, y, { align: 'right' });
    y += 5;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('TOTAL', totalsX, y + 2);
  doc.text(formatFrw(Number(po.totalAmount)), pageW - margin, y + 2, { align: 'right' });
  y += 16;

  const blockW = (contentW - colGap) / 2;
  const blockH = 28;
  const rowGap = 3;
  const signatureBlockHeight = blockH * 2 + rowGap;
  const footerTop = verificationFooterTop(pageH, margin);

  // Keep signatures and verification/QR together on the same page when they fit.
  if (y + signatureBlockHeight > footerTop - 2) {
    doc.addPage();
    y = margin;
  }

  drawManualSignBlock(
    doc,
    margin,
    y,
    blockW,
    blockH,
    'Prepared By',
    preparedByName,
    'Procurement Officer',
  );
  drawManualSignBlock(
    doc,
    margin + blockW + colGap,
    y,
    blockW,
    blockH,
    'Verified By',
    verifierName,
    settings?.verifier.title ?? 'Verifier',
  );

  y += blockH + rowGap;

  drawManualSignBlock(
    doc,
    margin,
    y,
    blockW,
    blockH,
    'Approved By',
    approverName,
    settings?.approver.title ?? 'Head Teacher / Principal',
  );
  drawManualSignBlock(
    doc,
    margin + blockW + colGap,
    y,
    blockW,
    blockH,
    'Supplier',
    supplierName,
    'Authorized Representative',
  );

  drawVerificationFooter({
    doc,
    verification,
    pageWidth: pageW,
    pageHeight: pageH,
    margin,
  });

  return doc;
}

export async function downloadPurchaseOrderPdf(
  po: PurchaseOrder,
  ctx: POPdfContext,
): Promise<void> {
  const doc = await buildPurchaseOrderPdf(po, ctx);
  const safe = po.poNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`purchase-order-${safe}.pdf`);
}
