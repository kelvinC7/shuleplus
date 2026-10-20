import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageDataUrl } from '@/utils/asset-url';
import { generateReceiptQrDataUrl, receiptPublicUrl } from '@/utils/receipt-qr';
import type { ReceiptViewData, SchoolBranding, StatementViewData } from '@/utils/fee-documents';

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
  });
}

function imageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return 'PNG';
}

function addImageSafe(doc: jsPDF, dataUrl: string | null, x: number, y: number, w: number, h: number) {
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

async function drawSchoolBand(
  doc: jsPDF,
  branding: SchoolBranding | null,
  title: string,
  subtitle: string,
  issuedAt?: string
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentW = pageW - margin * 2;
  const centerX = pageW / 2;
  const schoolLogo = await loadImageDataUrl(branding?.logoUrl);
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(title, centerX, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(subtitle, centerX, y, { align: 'center' });
  y += 7;

  const bandH = 22;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentW, bandH, 2, 2, 'F');
  if (schoolLogo) addImageSafe(doc, schoolLogo, margin + 3, y + 4, 14, 14);
  const schoolX = schoolLogo ? margin + 20 : margin + 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('SCHOOL', schoolX, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(branding?.schoolName?.trim() || 'School', schoolX, y + 10);
  const contact = [branding?.phone, branding?.email, branding?.address, branding?.district]
    .filter(Boolean)
    .join(' · ');
  if (contact) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(doc.splitTextToSize(contact, contentW * 0.5), schoolX, y + 14.5);
  }
  if (issuedAt) {
    const dateX = margin + contentW * 0.58;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text('DATE ISSUED', dateX, y + 5);
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(formatDate(issuedAt), dateX, y + 10);
  }
  return y + bandH + 6;
}

export async function buildFeeReceiptPdf(receipt: ReceiptViewData, branding: SchoolBranding | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentW = pageW - margin * 2;
  const verifyUrl = receiptPublicUrl(receipt.receiptNumber, receipt.qrCode);
  const [stamp, signature, qr] = await Promise.all([
    loadImageDataUrl(branding?.stampUrl),
    loadImageDataUrl(branding?.signatureUrl),
    generateReceiptQrDataUrl(verifyUrl),
  ]);

  let y = await drawSchoolBand(doc, branding, 'FEE RECEIPT', receipt.receiptNumber, receipt.issuedAt);

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
  y = drawDetailRow(doc, y, 'Payment method', receipt.method, margin, contentW);
  if (receipt.reference) y = drawDetailRow(doc, y, 'Reference', receipt.reference, margin, contentW);
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
    styles: { font: 'helvetica', fontSize: 8, textColor: NAVY, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: contentW * 0.68 },
      1: { cellWidth: contentW * 0.32, halign: 'right', fontStyle: 'bold' },
    },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
    ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
    : y + 5;

  const previousBalance = receipt.amountPaid + receipt.outstanding;
  const totalsX = pageW - margin - 78;
  const totalRows: [string, string][] = [
    ['Previous balance', money(previousBalance)],
    ['Amount paid', money(receipt.amountPaid)],
    ['Balance remaining', money(receipt.outstanding)],
  ];
  doc.setFontSize(9);
  for (const [label, value] of totalRows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(label, totalsX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(value, pageW - margin, y, { align: 'right' });
    y += 4.5;
  }
  y += 1;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(totalsX - 2, y - 3.5, 82, 8.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('TOTAL PAID', totalsX, y + 1.8);
  doc.text(money(receipt.amountPaid), pageW - margin, y + 1.8, { align: 'right' });
  y += 12;

  addImageSafe(doc, qr, margin, y, 28, 28);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('SCAN TO VERIFY', margin + 32, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(verifyUrl, contentW * 0.42), margin + 32, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL FEES OFFICE', pageW - margin, y + 5, { align: 'right' });
  if (signature) addImageSafe(doc, signature, pageW - margin - 52, y + 7, 28, 10);
  if (stamp) addImageSafe(doc, stamp, pageW - margin - 17, y + 6, 13, 13);
  return doc;
}

export async function downloadReceiptAsPdf(receipt: ReceiptViewData, branding: SchoolBranding | null) {
  const doc = await buildFeeReceiptPdf(receipt, branding);
  const safe = receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '_') || 'receipt';
  doc.save(`fee-receipt-${safe}.pdf`);
}

export async function printReceiptPdf(receipt: ReceiptViewData, branding: SchoolBranding | null) {
  const doc = await buildFeeReceiptPdf(receipt, branding);
  const blobUrl = doc.output('bloburl');
  const printWin = window.open(blobUrl, '_blank', 'noopener,noreferrer');
  if (!printWin) {
    URL.revokeObjectURL(String(blobUrl));
    throw new Error('Print window blocked');
  }
  window.setTimeout(() => {
    try {
      printWin.focus();
      printWin.print();
    } catch {
      /* ignore */
    }
  }, 600);
}

export async function downloadStatementAsPdf(statement: StatementViewData, branding: SchoolBranding | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentW = pageW - margin * 2;
  const period = [statement.academicYear, statement.term].filter(Boolean).join(' · ') || 'All terms';
  let y = await drawSchoolBand(doc, branding, 'FEE STATEMENT', period, new Date().toISOString());

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('STUDENT DETAILS', margin + 2, y);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.7);
  doc.line(margin + 2, y + 1.5, margin + 48, y + 1.5);
  y += 6;
  y = drawDetailRow(doc, y, 'Student', statement.studentName, margin, contentW);
  y = drawDetailRow(doc, y, 'Class', statement.className ?? '', margin, contentW);
  y = drawDetailRow(doc, y, 'Student code', statement.studentCode ?? '', margin, contentW);
  y = drawDetailRow(doc, y, 'Period', period, margin, contentW);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 14 },
    tableWidth: contentW,
    head: [['TERM', 'FEE ITEM', 'BILLED', 'PAID', 'BALANCE']],
    body: statement.statements.map((s) => [
      s.term,
      s.description,
      amount(s.amount),
      amount(s.paid),
      amount(s.balance),
    ]),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8, textColor: NAVY, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: contentW * 0.16 },
      1: { cellWidth: contentW * 0.36 },
      2: { cellWidth: contentW * 0.16, halign: 'right' },
      3: { cellWidth: contentW * 0.16, halign: 'right' },
      4: { cellWidth: contentW * 0.16, halign: 'right', fontStyle: 'bold' },
    },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
    ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    : y + 8;

  if (statement.payments.length) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('PAYMENT HISTORY', margin + 2, y);
    doc.setDrawColor(...PRIMARY);
    doc.line(margin + 2, y + 1.5, margin + 48, y + 1.5);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 14 },
      tableWidth: contentW,
      head: [['DATE', 'DESCRIPTION', 'METHOD', 'RECEIPT', 'AMOUNT']],
      body: statement.payments.map((p) => [
        formatDate(p.date),
        p.description,
        p.method,
        p.receiptNumber || '—',
        amount(p.amount),
      ]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 8, textColor: NAVY, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      : y + 8;
  }

  const totalsX = pageW - margin - 78;
  const totals: [string, string][] = [
    ['Total billed', money(statement.totalBilled)],
    ['Total paid', money(statement.totalPaid)],
    ['Outstanding', money(statement.outstanding)],
    ['Overdue', money(statement.overdue)],
  ];
  doc.setFontSize(9);
  for (const [label, value] of totals) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(label, totalsX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(value, pageW - margin, y, { align: 'right' });
    y += 4.5;
  }
  y += 1;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(totalsX - 2, y - 3.5, 82, 8.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('BALANCE DUE', totalsX, y + 1.8);
  doc.text(money(statement.outstanding), pageW - margin, y + 1.8, { align: 'right' });

  const safe = (statement.studentCode || statement.studentName || 'statement').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`fee-statement-${safe}.pdf`);
}
