import { Chip } from '@mui/material';
import { jsPDF } from 'jspdf';

export function statusChip(status: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    PENDING: { bg: '#fef3c7', fg: '#92400e' },
    APPROVED: { bg: '#dbeafe', fg: '#1e40af' },
    PAID: { bg: '#dcfce7', fg: '#166534' },
    DELIVERED: { bg: '#e0e7ff', fg: '#3730a3' },
    CANCELLED: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const s = map[status] ?? map.PENDING;
  return <Chip label={status} size="small" sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 600 }} />;
}

export interface ReceiptItem {
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptData {
  schoolName?: string | null;
  requestNumber: string;
  status: string;
  createdAt: string;
  studentName: string;
  className?: string | null;
  studentCode?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  kitName?: string | null;
  district?: string | null;
  subtotal: number | string;
  homeFee: number | string;
  deliveryMethod: string;
  paymentLabel?: string;
  total: number | string;
  notes?: string | null;
  items: ReceiptItem[];
}

const NAVY: [number, number, number] = [0, 4, 53];
const PRIMARY: [number, number, number] = [252, 176, 56];
const SLATE: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const SOFT: [number, number, number] = [248, 250, 252];

function pdfSafe(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/×/g, 'x')
    .replace(/’/g, "'")
    .replace(/‘/g, "'")
    .replace(/…/g, '...')
    .trim();
}

/** Load the exact brand mark from `public/logo.png`. */
async function loadShulePlusLogoPng(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('logo read failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadReceiptPdf(data: ReceiptData) {
  const logoPng = await loadShulePlusLogoPng();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const right = pageW - margin;
  const contentW = right - margin;
  let y = 0;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - 28) {
      doc.addPage();
      y = 18;
    }
  };

  // Header — exact `public/logo.png` on light band so the lockup stays readable
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, 38, 'F');
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(0, 38, pageW, 2.4, 'F');

  if (logoPng) {
    // Full brand image (owl + shule+ + manage smarter) — no redrawn text
    const logoH = 26;
    const logoW = 86;
    doc.addImage(logoPng, 'PNG', margin - 2, 6, logoW, logoH);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text('shule+', margin, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    doc.text('manage smarter', margin, 23.5);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('KIT RECEIPT', right, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text(pdfSafe(data.requestNumber), right, 21.5, { align: 'right' });
  doc.text(pdfSafe(data.status), right, 27, { align: 'right' });

  y = 48;

  // Meta strip
  doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text('School', margin + 4, y + 5.5);
  doc.text('Date', margin + contentW * 0.48, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(pdfSafe(data.schoolName || 'ShuleKit'), margin + 4, y + 11);
  doc.text(
    new Date(data.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    margin + contentW * 0.48,
    y + 11
  );
  y += 22;

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('ORDER DETAILS', margin, y);
  y += 2;
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.7);
  doc.line(margin, y, margin + 28, y);
  doc.setLineWidth(0.2);
  y += 7;

  const detailRows: Array<[string, string]> = [
    ['Student', pdfSafe(data.studentName)],
    ['Class', pdfSafe(data.className || '—')],
    ['ShuleCode', pdfSafe(data.studentCode || '—')],
    ['District', pdfSafe(data.district || '—')],
    ['Parent / guardian', pdfSafe(data.parentName || '—')],
    ['Phone', pdfSafe(data.parentPhone || '—')],
    ['Kit', pdfSafe(data.kitName || '—')],
    ['Delivery', data.deliveryMethod === 'AT_HOME' ? 'Home delivery' : 'Pickup at school'],
    ['Payment', pdfSafe(data.paymentLabel || '—')],
  ];

  for (const [label, value] of detailRows) {
    ensureSpace(8);
    doc.setFillColor(y % 2 === 0 ? 255 : SOFT[0], y % 2 === 0 ? 255 : SOFT[1], y % 2 === 0 ? 255 : SOFT[2]);
    // subtle row bg using soft only on alternating via simple approach
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    const lines = doc.splitTextToSize(value, contentW * 0.55);
    doc.text(lines, right, y, { align: 'right' });
    y += 5.5 + (lines.length - 1) * 3.8;
  }

  y += 4;
  ensureSpace(20);

  // Items table header
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const qtyX = right - 55;
  const unitX = right - 30;
  doc.text('ITEM', margin + 3, y + 5.2);
  doc.text('QTY', qtyX, y + 5.2, { align: 'right' });
  doc.text('UNIT', unitX, y + 5.2, { align: 'right' });
  doc.text('TOTAL', right - 3, y + 5.2, { align: 'right' });
  y += 11;

  if (data.items.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    doc.text('No items on this receipt.', margin + 2, y);
    y += 8;
  }

  data.items.forEach((it, idx) => {
    ensureSpace(10);
    if (idx % 2 === 0) {
      doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      doc.rect(margin, y - 3.5, contentW, 7.5, 'F');
    }
    const titleLines = doc.splitTextToSize(pdfSafe(it.title), qtyX - margin - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(titleLines, margin + 2, y);
    doc.text(String(it.quantity), qtyX, y, { align: 'right' });
    doc.text(`${Number(it.unitPrice).toLocaleString()}`, unitX, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${Number(it.lineTotal).toLocaleString()}`, right - 2, y, { align: 'right' });
    y += 6 + (titleLines.length - 1) * 3.8;
  });

  y += 3;
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(margin, y, right, y);
  y += 7;

  const moneyRows: Array<[string, string, boolean]> = [
    ['Subtotal', `${Number(data.subtotal).toLocaleString()} RWF`, false],
    [
      `Delivery (${data.deliveryMethod === 'AT_HOME' ? 'Home' : 'School'})`,
      data.deliveryMethod === 'AT_HOME' ? `${Number(data.homeFee).toLocaleString()} RWF` : 'Free',
      false,
    ],
  ];

  for (const [label, value] of moneyRows) {
    ensureSpace(7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    doc.text(label, margin, y);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(value, right, y, { align: 'right' });
    y += 5.5;
  }

  y += 2;
  ensureSpace(14);
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.roundedRect(margin, y, contentW, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('TOTAL PAID', margin + 4, y + 7.5);
  doc.setFontSize(13);
  doc.text(`${Number(data.total).toLocaleString()} RWF`, right - 4, y + 7.5, { align: 'right' });
  y += 18;

  if (data.notes) {
    ensureSpace(16);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    const noteLines = doc.splitTextToSize(`Notes: ${pdfSafe(data.notes)}`, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 3.8 + 4;
  }

  // Footer
  const footerY = pageH - 18;
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(margin, footerY - 4, right, footerY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text('Keep this receipt. Track your order online with the request number.', pageW / 2, footerY, {
    align: 'center',
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('Generated by ShulePlus under Edupoto', pageW / 2, footerY + 5, { align: 'center' });

  doc.save(`shulekit-receipt-${pdfSafe(data.requestNumber) || 'order'}.pdf`);
}
