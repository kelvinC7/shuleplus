import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const NAVY: [number, number, number] = [0, 4, 53];
const GOLD: [number, number, number] = [252, 176, 56];

export type TransportReportMeta = {
  organizationName: string;
  reportTitle: string;
  subtitle?: string;
  generatedAt?: Date;
  filterSummary?: string;
};

async function loadLogoDataUrl(): Promise<string | null> {
  const paths = ['/logo_white.png', '/yellow-icon.png'];
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(blob);
      });
      return dataUrl;
    } catch {
      /* try next */
    }
  }
  return null;
}

function formatGeneratedAt(d: Date) {
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function drawReportHeader(doc: jsPDF, meta: TransportReportMeta, startY = 0) {
  const pageW = doc.internal.pageSize.getWidth();
  const headerH = 36;
  doc.setFillColor(...NAVY);
  doc.rect(0, startY, pageW, headerH, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, startY + headerH, pageW, 1.2, 'F');

  const logo = await loadLogoDataUrl();
  let textX = 14;
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, startY + 6, 28, 10);
      textX = 46;
    } catch {
      textX = 14;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(meta.organizationName || 'School', textX, startY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text('Shule+ Smart Transport', textX, startY + 20);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const titleW = doc.getTextWidth(meta.reportTitle);
  doc.text(meta.reportTitle, pageW - 14 - titleW, startY + 14);

  if (meta.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(230, 230, 230);
    const subW = doc.getTextWidth(meta.subtitle);
    doc.text(meta.subtitle, pageW - 14 - subW, startY + 21);
  }

  const gen = meta.generatedAt ?? new Date();
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  const genLine = `Generated ${formatGeneratedAt(gen)}`;
  doc.text(genLine, pageW - 14 - doc.getTextWidth(genLine), startY + 30);

  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');

  let bodyY = startY + headerH + 8;
  if (meta.filterSummary) {
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(meta.filterSummary, 14, bodyY);
    bodyY += 6;
  }
  return bodyY;
}

type PdfRow = string[];

export async function downloadTransportReportPdf(options: {
  meta: TransportReportMeta;
  filename: string;
  orientation?: 'portrait' | 'landscape';
  head: string[];
  body: PdfRow[];
  columnStyles?: Record<number, { cellWidth?: number | 'auto' }>;
}) {
  const { meta, filename, orientation = 'landscape', head, body, columnStyles } = options;
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const startY = await drawReportHeader(doc, meta);

  autoTable(doc, {
    startY,
    head: [head],
    body,
    styles: { fontSize: 8, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 12, right: 12, top: 12 },
    columnStyles,
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    const footer = `Page ${i} of ${totalPages}  ·  Shule+ Transport`;
    doc.text(footer, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 6, {
      align: 'center',
    });
  }

  const safe = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(safe);
}

export async function fetchAllAttendanceHistory(
  fetchPage: (page: number, limit: number) => Promise<{ rows: unknown[]; total: number }>
) {
  const limit = 100;
  const first = await fetchPage(1, limit);
  const all = [...first.rows];
  const totalPages = Math.ceil(first.total / limit);
  for (let p = 2; p <= totalPages; p++) {
    const next = await fetchPage(p, limit);
    all.push(...next.rows);
  }
  return all;
}
