import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageDataUrl } from '@/lib/public-assets';
import {
  drawSchoolHeader,
  drawVerificationFooter,
  verificationFooterTop,
  PDF_VERIFICATION_FOOTER_HEIGHT,
  type PdfSchoolInfo,
} from './pdf-header';
import { ensureDocumentVerification } from './document-verification';

const NAVY: [number, number, number] = [0, 4, 53];
const GOLD: [number, number, number] = [252, 176, 56];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [248, 250, 252];
const BORDER: [number, number, number] = [226, 232, 240];

export interface ReportColumn {
  header: string;
  dataKey: string;
  align?: 'left' | 'right' | 'center';
}

export interface ReportMetaItem {
  label: string;
  value: string;
}

export interface ProcurementReportOptions {
  info: PdfSchoolInfo;
  /** Document heading, e.g. "PURCHASE REQUESTS REPORT". */
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  /** Context shown under the title (period, status, totals…). */
  meta?: ReportMetaItem[];
  summary?: ReportMetaItem[];
  /** File name without extension. */
  fileBase: string;
  emptyMessage?: string;
  /** Optional identity snapshot shown on the public verification page. */
  verification?: {
    id?: string;
    reference?: string;
    period?: string;
    generatedBy?: string;
    generatedAt?: string;
  };
}

function safeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export async function buildProcurementReport(
  options: ProcurementReportOptions,
): Promise<jsPDF> {
  const {
    info,
    title,
    subtitle,
    columns,
    rows,
    meta = [],
    summary = [],
    emptyMessage = 'No records match the selected filters.',
  } = options;

  const landscape = columns.length > 6;
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  const logo = await loadImageDataUrl(info.logoUrl);

  let y = drawSchoolHeader({
    doc,
    info,
    logoDataUrl: logo,
    title,
    pageWidth: pageW,
    margin,
    startY: 12,
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    subtitle ?? `Generated on ${new Date().toLocaleString()}`,
    pageW / 2,
    y,
    { align: 'center' },
  );
  y += 6;

  const visibleMeta = meta.filter((item) => item.value);
  const period =
    options.verification?.period ||
    (visibleMeta.length > 0
      ? visibleMeta.map((item) => `${item.label}: ${item.value}`).join(' · ')
      : 'All records');
  const verification = await ensureDocumentVerification('REPORT', options.verification?.id, {
    reference: options.verification?.reference,
    metadata: {
      title,
      period,
      generatedBy: options.verification?.generatedBy ?? 'Procurement MIS User',
      generatedDate: new Date(
        options.verification?.generatedAt ?? new Date().toISOString(),
      ).toLocaleDateString(),
    },
  });

  if (visibleMeta.length > 0) {
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    const metaRows = Math.ceil(visibleMeta.length / 3);
    const boxHeight = metaRows * 9 + 4;
    doc.roundedRect(margin, y, contentW, boxHeight, 2, 2, 'FD');

    const colWidth = contentW / 3;
    visibleMeta.forEach((item, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = margin + col * colWidth + 4;
      const top = y + 5 + row * 9;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(item.label.toUpperCase(), x, top);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...NAVY);
      const value = doc.splitTextToSize(item.value, colWidth - 8)[0] ?? item.value;
      doc.text(value, x, top + 3.6);
    });

    y += boxHeight + 6;
  }

  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text(emptyMessage, pageW / 2, y + 10, { align: 'center' });

    const emptyPageCount = doc.getNumberOfPages();
    for (let page = 1; page <= emptyPageCount; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(`Page ${page} of ${emptyPageCount}`, pageW - margin, pageH - 7, {
        align: 'right',
      });
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

  const columnStyles: Record<number, { halign: 'left' | 'right' | 'center' }> = {};
  columns.forEach((column, index) => {
    if (column.align) columnStyles[index] = { halign: column.align };
  });

  autoTable(doc, {
    startY: y,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => safeCell(row[column.dataKey]))),
    theme: 'grid',
    margin: {
      left: margin,
      right: margin,
      top: margin,
      bottom: PDF_VERIFICATION_FOOTER_HEIGHT + margin + 4,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.6,
      lineColor: BORDER,
      lineWidth: 0.1,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 3,
    },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === 'head') {
        const align = columns[data.column.index]?.align;
        if (align) data.cell.styles.halign = align;
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY;

  if (summary.length > 0 && finalY) {
    let summaryY = finalY + 6;
    if (summaryY + 16 > verificationFooterTop(pageH, margin) - 2) {
      doc.addPage();
      summaryY = margin + 10;
    }
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(margin, summaryY, margin + 28, summaryY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('SUMMARY', margin, summaryY + 4.5);

    doc.setFontSize(8.5);
    let x = margin;
    summary.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(`${item.label}:`, x, summaryY + 10);
      const labelWidth = doc.getTextWidth(`${item.label}: `);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(item.value, x + labelWidth + 1.5, summaryY + 10);
      x += labelWidth + doc.getTextWidth(item.value) + 12;
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`Page ${page} of ${pageCount}`, pageW - margin, pageH - 7, {
      align: 'right',
    });
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

export async function downloadProcurementReport(
  options: ProcurementReportOptions,
): Promise<void> {
  const doc = await buildProcurementReport(options);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`${options.fileBase}_${stamp}.pdf`);
}
