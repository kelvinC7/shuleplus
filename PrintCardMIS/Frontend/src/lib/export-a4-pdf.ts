import jsPDF from 'jspdf';
import { CARD_HEIGHT_MM, CARD_WIDTH_MM } from '@/lib/smart-card-renderer';
import type { PrintSheetLayout } from '@/lib/print-workflow';
import { A4_HEIGHT_MM, A4_WIDTH_MM } from '@/lib/print-workflow';

const PAGE_MARGIN_MM = 4;
const ROW_GAP_MM = 3;
const COL_GAP_MM = 3;

const LAYOUT_GRID: Record<PrintSheetLayout, { cols: number; rows: number }> = {
  '1x1': { cols: 1, rows: 1 },
  '3x3': { cols: 3, rows: 3 },
};

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

/** Same 3×3 / 1×1 A4 geometry as browser print in print-workflow.ts, output as one PDF file. */
export function buildA4PdfFromCardImages(
  pngDataUrls: string[],
  layout: PrintSheetLayout = '3x3',
): jsPDF {
  const { cols, rows } = LAYOUT_GRID[layout];
  const perPage = cols * rows;
  const pages = chunk(pngDataUrls, perPage);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [A4_WIDTH_MM, A4_HEIGHT_MM],
  });

  const gridW = cols * CARD_WIDTH_MM + (cols - 1) * COL_GAP_MM;
  const originX = (A4_WIDTH_MM - gridW) / 2;

  pages.forEach((pageImages, pageIndex) => {
    if (pageIndex > 0) {
      pdf.addPage([A4_WIDTH_MM, A4_HEIGHT_MM], 'portrait');
    }

    for (let i = 0; i < pageImages.length; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = originX + col * (CARD_WIDTH_MM + COL_GAP_MM);
      const y = PAGE_MARGIN_MM + row * (CARD_HEIGHT_MM + ROW_GAP_MM);
      pdf.addImage(pageImages[i]!, 'PNG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    }
  });

  return pdf;
}

export function downloadA4PdfFromCardImages(
  filename: string,
  pngDataUrls: string[],
  layout: PrintSheetLayout = '3x3',
): void {
  const pdf = buildA4PdfFromCardImages(pngDataUrls, layout);
  pdf.save(filename);
}
