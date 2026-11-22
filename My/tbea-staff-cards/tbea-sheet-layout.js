import {
  CARD_WIDTH_MM,
  CARD_HEIGHT_MM,
  CARD_W,
  CARD_H,
  SCALE,
} from './tbea-card-renderer.js';

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const PAGE_MARGIN_MM = 4;
export const ROW_GAP_MM = 3;
export const COL_GAP_MM = 3;
export const SHEET_COLS = 3;
export const SHEET_ROWS = 3;
export const CARDS_PER_SHEET = SHEET_COLS * SHEET_ROWS;

const PX_PER_MM = CARD_W / CARD_WIDTH_MM;

export function chunk(items, size) {
  const pages = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

/** Compose up to 9 card canvases onto one A4 page (PrintCardMIS 3×3 geometry). */
export function composeA4SheetCanvas(cardCanvases) {
  const gapPx = COL_GAP_MM * PX_PER_MM * SCALE;
  const marginTopPx = PAGE_MARGIN_MM * PX_PER_MM * SCALE;
  const cardWPx = CARD_W * SCALE;
  const cardHPx = CARD_H * SCALE;

  const gridWmm = SHEET_COLS * CARD_WIDTH_MM + (SHEET_COLS - 1) * COL_GAP_MM;
  const originXmm = (A4_WIDTH_MM - gridWmm) / 2;
  const originXPx = originXmm * PX_PER_MM * SCALE;

  const sheetW = Math.round(A4_WIDTH_MM * PX_PER_MM * SCALE);
  const sheetH = Math.round(A4_HEIGHT_MM * PX_PER_MM * SCALE);

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheetW, sheetH);

  for (let i = 0; i < CARDS_PER_SHEET; i += 1) {
    const col = i % SHEET_COLS;
    const row = Math.floor(i / SHEET_COLS);
    const x = originXPx + col * (cardWPx + gapPx);
    const y = marginTopPx + row * (cardHPx + gapPx);
    const src = cardCanvases[i];
    if (src) {
      ctx.drawImage(src, x, y, cardWPx, cardHPx);
    }
  }

  return canvas;
}

export function buildA4PrintHtml(title, imageDataUrls) {
  const pages = chunk(imageDataUrls, CARDS_PER_SHEET);
  const sheetsHtml = pages
    .map(
      (pageImages) => `
    <div class="sheet">
      ${pageImages.map((src) => `<div class="card-slot"><img src="${src}" alt="ID card" /></div>`).join('')}
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
    grid-template-columns: repeat(${SHEET_COLS}, ${CARD_WIDTH_MM}mm);
    grid-template-rows: repeat(${SHEET_ROWS}, ${CARD_HEIGHT_MM}mm);
    column-gap: ${COL_GAP_MM}mm;
    row-gap: ${ROW_GAP_MM}mm;
    padding: ${PAGE_MARGIN_MM}mm;
    justify-content: center;
    align-content: start;
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
</style></head><body>${sheetsHtml}</body></html>`;
}

export function openA4PrintWindow(title, imageDataUrls) {
  const html = buildA4PrintHtml(title, imageDataUrls);
  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Pop-up blocked. Allow pop-ups for this site, then try Print again.');
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
