import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageDataUrl } from '@/lib/public-assets';
import { formatFrw } from '@/utils/currency';
import type { GoodsReceiving } from '@/types';
import type { ProcurementReceiptSettings } from '@/types/settings';
import { GRN_STATUS_LABELS } from '@/lib/grn-constants';

const PRIMARY: [number, number, number] = [252, 176, 56];
const NAVY: [number, number, number] = [0, 4, 53];
const GRAY: [number, number, number] = [100, 116, 139];

export interface GrnPdfContext {
  schoolName: string;
  logoUrl?: string | null;
  stampUrl?: string | null;
  receiptSettings?: ProcurementReceiptSettings;
}

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

export async function buildGrnPdf(grn: GoodsReceiving, ctx: GrnPdfContext): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const centerX = pageW / 2;
  const po = grn.purchaseOrder;
  const supplierName = po?.supplier?.companyName ?? '—';

  const [logo, brandLogo, stamp] = await Promise.all([
    loadImageDataUrl(ctx.logoUrl),
    loadImageDataUrl('/logo.png'),
    loadImageDataUrl(ctx.stampUrl),
  ]);

  let y = margin;
  addImageSafe(doc, brandLogo, centerX - 22, y, 44, 14);
  y += 16;

  if (logo) {
    addImageSafe(doc, logo, margin, y - 14, 18, 18);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(ctx.schoolName || 'School', centerX, y, { align: 'center' });
  y += 6;
  doc.setFontSize(11);
  doc.text('GOODS RECEIVED NOTE', centerX, y, { align: 'center' });
  y += 8;

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(`GRN: ${grn.grnNumber}`, margin + 4, y + 5.5);
  doc.text(`PO: ${po?.poNumber ?? '—'}`, pageW - margin - 4, y + 5.5, { align: 'right' });
  y += 12;

  const metaRows = [
    ['Supplier', supplierName],
    ['Received Date', new Date(grn.receivedDate).toLocaleDateString()],
    ['Received By', grn.receivedByName ?? '—'],
    ['Status', GRN_STATUS_LABELS[grn.status] ?? grn.status.replace(/_/g, ' ')],
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

  const items = grn.items ?? [];
  let totalValue = 0;
  const tableBody = items.map((item) => {
    const poItem = po?.items?.find((p) => p.id === item.poItemId);
    const unitPrice = poItem ? Number(poItem.unitPrice) : 0;
    const lineValue = Number(item.acceptedQty) * unitPrice;
    totalValue += lineValue;
    return [
      item.itemName,
      String(Number(item.receivedQty)),
      String(Number(item.acceptedQty)),
      item.condition ?? '—',
      item.qualityStatus?.replace(/_/g, ' ') ?? '—',
      item.warehouseLocation ?? '—',
      formatFrw(lineValue),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Received', 'Accepted', 'Condition', 'Quality', 'Storage', 'Value']],
    body: tableBody,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: NAVY },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(`Total Received: ${formatFrw(totalValue)}`, pageW - margin, y, { align: 'right' });
  y += 10;

  if (grn.inspectionNotes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Inspection Notes:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    const lines = doc.splitTextToSize(grn.inspectionNotes, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  y = Math.max(y, 220);
  const sigW = (contentW - 8) / 3;
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.2);
  const sigLabels = ['Received By', 'Verified By', 'Supplier'];
  sigLabels.forEach((label, i) => {
    const x = margin + i * (sigW + 4);
    doc.line(x, y + 12, x + sigW, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(label, x, y + 18);
  });

  if (stamp) {
    addImageSafe(doc, stamp, pageW - margin - 28, y + 22, 26, 26);
  }

  if (grn.barcode) {
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`Tracking: ${grn.barcode}`, centerX, y + 38, { align: 'center' });
  }

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text('Generated by Shule+ Procurement MIS', centerX, 285, { align: 'center' });

  return doc;
}

export async function downloadGrnPdf(grn: GoodsReceiving, ctx: GrnPdfContext): Promise<void> {
  const doc = await buildGrnPdf(grn, ctx);
  const safe = grn.grnNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`grn-${safe}.pdf`);
}

export async function printGrnPdf(grn: GoodsReceiving, ctx: GrnPdfContext): Promise<void> {
  const doc = await buildGrnPdf(grn, ctx);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
