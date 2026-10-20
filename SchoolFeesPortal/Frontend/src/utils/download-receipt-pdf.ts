import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageDataUrl } from '@/utils/asset-url';
import { generateReceiptQrDataUrl, receiptPublicUrl } from '@/utils/receipt-qr';
import type { ReceiptViewData, SchoolBranding } from '@/modules/collections/modern-receipt-card';

const PRIMARY: [number, number, number] = [252, 176, 56];
const NAVY: [number, number, number] = [0, 4, 53];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [241, 245, 249];
const WHITE: [number, number, number] = [255, 255, 255];

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function amount(n: number) {
  return Math.round(n).toLocaleString();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function methodLabel(method: string) {
  return method.replace(/_/g, ' ');
}

function imageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return 'PNG';
}

function addImageSafe(
  doc: jsPDF,
  dataUrl: string | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (!dataUrl) return;
  try {
    doc.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h);
  } catch {
    /* skip broken image */
  }
}

function drawDetailRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  margin: number,
  contentW: number
) {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(label, margin + 2, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  const lines = doc.splitTextToSize(value || '—', contentW * 0.62);
  doc.text(lines, margin + contentW * 0.32, y);
  return y + Math.max(4.5, lines.length * 4);
}

function receiptFileName(receiptNumber: string) {
  const safeNo = receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '_') || 'receipt';
  return `fee-receipt-${safeNo}.pdf`;
}

export async function buildFeeReceiptPdf(
  receipt: ReceiptViewData,
  branding: SchoolBranding | null
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentW = pageW - margin * 2;
  const centerX = pageW / 2;
  const verifyUrl = receiptPublicUrl(receipt.receiptNumber, receipt.qrCode);

  const [schoolLogo, brandLogo, signature, stamp, qr] = await Promise.all([
    loadImageDataUrl(branding?.logoUrl),
    loadImageDataUrl('/logo.png'),
    loadImageDataUrl(branding?.signatureUrl),
    loadImageDataUrl(branding?.stampUrl),
    generateReceiptQrDataUrl(verifyUrl),
  ]);

  let y = margin;

  const brandW = 16;
  addImageSafe(doc, brandLogo, centerX - brandW / 2, y, brandW, 16);
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text('FEE RECEIPT', centerX, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(receipt.receiptNumber, centerX, y, { align: 'center' });
  y += 7;

  const bandH = 22;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentW, bandH, 2, 2, 'F');

  if (schoolLogo) {
    addImageSafe(doc, schoolLogo, margin + 3, y + 4, 14, 14);
  }

  const schoolX = schoolLogo ? margin + 20 : margin + 4;
  const schoolColW = contentW * 0.52 - (schoolLogo ? 14 : 0);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('SCHOOL', schoolX, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(branding?.schoolName?.trim() || 'School', schoolX, y + 10);

  const contactParts = [
    branding?.phone,
    branding?.email,
    branding?.address,
    branding?.district,
  ].filter(Boolean);
  if (contactParts.length) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const contactLines = doc.splitTextToSize(contactParts.join(' · '), schoolColW);
    doc.text(contactLines, schoolX, y + 14.5);
  }

  const dateX = margin + contentW * 0.58;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('DATE ISSUED', dateX, y + 5);
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(receipt.issuedAt), dateX, y + 10);
  if (receipt.voided) {
    doc.setTextColor(185, 28, 28);
    doc.text('VOIDED', dateX, y + 15);
  }

  y += bandH + 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('STUDENT DETAILS', margin + 2, y);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.7);
  doc.line(margin + 2, y + 1.5, margin + 48, y + 1.5);
  y += 6;

  y = drawDetailRow(doc, y, 'Student', receipt.studentName, margin, contentW);
  y = drawDetailRow(doc, y, 'Class', receipt.className ?? '', margin, contentW);
  y = drawDetailRow(doc, y, 'Student code', receipt.studentCode ?? '', margin, contentW);
  if (receipt.academicYear || receipt.term) {
    y = drawDetailRow(
      doc,
      y,
      'Period',
      [receipt.academicYear, receipt.term].filter(Boolean).join(' · '),
      margin,
      contentW
    );
  }
  y = drawDetailRow(doc, y, 'Payment method', methodLabel(receipt.method), margin, contentW);
  if (receipt.reference) {
    y = drawDetailRow(doc, y, 'Reference', receipt.reference, margin, contentW);
  }
  y += 2;

  const lines = receipt.lineItems?.length
    ? receipt.lineItems
    : [{ description: 'School fees', amount: receipt.amountPaid }];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 14 },
    tableWidth: contentW,
    head: [['FEE ITEM', 'AMOUNT']],
    body: lines.map((item) => [item.description, amount(item.amount)]),
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: NAVY,
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.68 },
      1: { cellWidth: contentW * 0.32, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: WHITE },
    showHead: 'firstPage',
    rowPageBreak: 'avoid',
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
    ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
    : y + 5;

  const previousBalance = receipt.amountPaid + receipt.outstanding;
  const totalsW = 78;
  const totalsX = pageW - margin - totalsW;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);

  const totalRows: [string, string][] = [
    ['Previous balance', money(previousBalance)],
    ['Amount paid', money(receipt.amountPaid)],
    ['Balance remaining', money(receipt.outstanding)],
  ];

  for (const [label, value] of totalRows) {
    doc.text(label, totalsX, y);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text(value, pageW - margin, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    y += 4.5;
  }

  y += 1;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(totalsX - 2, y - 3.5, totalsW + 4, 8.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('TOTAL PAID', totalsX, y + 1.8);
  doc.setFontSize(11);
  doc.text(money(receipt.amountPaid), pageW - margin, y + 1.8, { align: 'right' });
  y += 12;

  addImageSafe(doc, qr.startsWith('data:') ? qr : await loadImageDataUrl(qr), margin, y, 28, 28);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('SCAN TO VERIFY', margin + 32, y + 10);
  doc.setFont('helvetica', 'normal');
  const urlLines = doc.splitTextToSize(verifyUrl, contentW * 0.42);
  doc.text(urlLines, margin + 32, y + 14);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin + contentW * 0.55, y, pageW - margin, y);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('SCHOOL FEES OFFICE', pageW - margin, y + 5, { align: 'right' });

  const sigY = y + 7;
  if (signature) {
    addImageSafe(doc, signature, pageW - margin - 52, sigY, 28, 10);
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.line(pageW - margin - 40, sigY + 8, pageW - margin - 8, sigY + 8);
  }
  if (stamp) {
    addImageSafe(doc, stamp, pageW - margin - 17, sigY - 1, 13, 13);
  }

  return doc;
}

export async function downloadReceiptAsPdf(
  receipt: ReceiptViewData,
  branding: SchoolBranding | null
): Promise<void> {
  const doc = await buildFeeReceiptPdf(receipt, branding);
  doc.save(receiptFileName(receipt.receiptNumber));
}

export async function printReceiptPdf(
  receipt: ReceiptViewData,
  branding: SchoolBranding | null
): Promise<void> {
  const doc = await buildFeeReceiptPdf(receipt, branding);
  const blobUrl = doc.output('bloburl').toString();
  const printWin = window.open(blobUrl, '_blank', 'noopener,noreferrer');
  if (!printWin) {
    URL.revokeObjectURL(blobUrl);
    throw new Error('Print window blocked');
  }
  const triggerPrint = () => {
    try {
      printWin.focus();
      printWin.print();
    } catch {
      /* viewer may not be ready yet */
    }
  };
  printWin.addEventListener('load', triggerPrint);
  window.setTimeout(triggerPrint, 600);
}
