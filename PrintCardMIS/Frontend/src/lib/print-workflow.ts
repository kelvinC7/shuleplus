'use client';

import { preloadIdPhotoBackgroundModel } from '@shuleplus/id-photo-browser';
import { buildPayloadFromRecord } from '@/lib/card-payload';
import { CARD_HEIGHT_MM, CARD_WIDTH_MM, renderSmartCardToCanvas } from '@/lib/smart-card-renderer';
import type { CardRecord, PersonKind, PrintBatch, PrintCardSchool } from '@/services/print-card-api';

/** A4 portrait sheet layout when printing batches. */
export type PrintSheetLayout = '1x1' | '3x3';

export const PRINT_SHEET_LAYOUTS: {
  id: PrintSheetLayout;
  label: string;
  description: string;
  cardsPerPage: number;
}[] = [
  { id: '1x1', label: '1×1', description: 'One card per A4 page', cardsPerPage: 1 },
  { id: '3x3', label: '3×3', description: 'Nine cards per A4 page (3 rows × 3 columns)', cardsPerPage: 9 },
];

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 4;
const ROW_GAP_MM = 3;
const COL_GAP_MM = 3;

const LAYOUT_GRID: Record<PrintSheetLayout, { cols: number; rows: number }> = {
  '1x1': { cols: 1, rows: 1 },
  '3x3': { cols: 3, rows: 3 },
};

function cardsPerPage(layout: PrintSheetLayout): number {
  const { cols, rows } = LAYOUT_GRID[layout];
  return cols * rows;
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

function buildA4PrintHtml(title: string, imageDataUrls: string[], layout: PrintSheetLayout): string {
  const { cols, rows } = LAYOUT_GRID[layout];
  const perPage = cardsPerPage(layout);
  const pages = chunk(imageDataUrls, perPage);
  const centerSingle = layout === '1x1';

  const sheetsHtml = pages
    .map(
      (pageImages) => `
    <div class="sheet${centerSingle ? ' sheet-single' : ''}">
      ${pageImages.map((src) => `<div class="card-slot"><img src="${src}" alt="Smart card" /></div>`).join('')}
    </div>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><title>${title}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; }
  .sheet {
    width: ${A4_WIDTH_MM}mm;
    min-height: ${A4_HEIGHT_MM}mm;
    page-break-after: always;
    display: grid;
    grid-template-columns: repeat(${cols}, ${CARD_WIDTH_MM}mm);
    grid-template-rows: repeat(${rows}, ${CARD_HEIGHT_MM}mm);
    column-gap: ${COL_GAP_MM}mm;
    row-gap: ${ROW_GAP_MM}mm;
    padding: ${PAGE_MARGIN_MM}mm;
    justify-content: center;
    align-content: start;
  }
  .sheet-single {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sheet-single .card-slot {
    flex-shrink: 0;
  }
  .sheet:last-child { page-break-after: auto; }
  .card-slot {
    width: ${CARD_WIDTH_MM}mm;
    height: ${CARD_HEIGHT_MM}mm;
    overflow: hidden;
  }
  .card-slot img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head><body>
${sheetsHtml}
<script>window.onload = () => { window.print(); };</script>
</body></html>`;
}

/** Open synchronously on click — async work after this must reuse the same window. */
export function openPrintWindowPlaceholder(): Window | null {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) {
    w.document.write(
      '<!DOCTYPE html><html><head><title>Preparing print…</title></head><body style="font-family:system-ui,sans-serif;padding:24px">Preparing cards for print…</body></html>',
    );
    w.document.close();
  }
  return w;
}

function writePrintWindow(w: Window, html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Could not open print window'));
      return;
    }
    w.onafterprint = () => {
      w.close();
      resolve();
    };
    setTimeout(() => {
      try {
        w.close();
      } catch {
        /* ignore */
      }
      resolve();
    }, 120_000);
  });
}

/** Opens browser print dialog with the chosen A4 sheet layout. */
export async function printBatchCards(
  batch: PrintBatch,
  school: PrintCardSchool,
  kind: PersonKind,
  layout: PrintSheetLayout = '3x3',
  printWindow: Window | null,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (!printWindow) {
    throw new Error('Pop-up blocked. Allow pop-ups for this site, then click Print again.');
  }

  const items = batch.items?.filter((i) => i.cardRecord) ?? [];
  if (items.length === 0) {
    throw new Error('Print batch has no card data. Close and create the batch again.');
  }

  await preloadIdPhotoBackgroundModel();

  const images: string[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const record = items[i]!.cardRecord!;
    const payload = buildPayloadFromRecord(record, kind, school);
    const canvas = await renderSmartCardToCanvas(payload);
    images.push(canvas.toDataURL('image/png'));
    onProgress?.(i + 1, items.length);
  }

  const html = buildA4PrintHtml(`Print Cards ${batch.batchNumber}`, images, layout);
  await writePrintWindow(printWindow, html);
}

export async function renderRecordPreview(
  record: CardRecord,
  kind: PersonKind,
  school: PrintCardSchool,
): Promise<string> {
  const payload = buildPayloadFromRecord(record, kind, school);
  const canvas = await renderSmartCardToCanvas(payload);
  return canvas.toDataURL('image/png');
}
