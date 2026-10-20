'use client';

export type ClassQrPrintLayout = '1x1' | '3x3';

export const CLASS_QR_PRINT_LAYOUTS: {
  id: ClassQrPrintLayout;
  label: string;
  description: string;
  perPage: number;
}[] = [
  { id: '1x1', label: '1 × 1', description: 'One QR per A4 page', perPage: 1 },
  { id: '3x3', label: '3 × 3', description: 'Nine QR codes per A4 (same as Print Card)', perPage: 9 },
];

/**
 * Same 3×3 A4 grid as PrintCardMIS (55×87mm base), with extra width so the
 * class QR tile reads larger while still fitting nine per page.
 */
export const QR_TILE_WIDTH_MM = 62;
export const QR_TILE_HEIGHT_MM = 87;
/** Full-page classroom poster (1 per A4). */
export const QR_TILE_SINGLE_WIDTH_MM = 160;
export const QR_TILE_SINGLE_HEIGHT_MM = 230;

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

const PAGE_MARGIN_MM = 4;
const ROW_GAP_MM = 3;
const COL_GAP_MM = 3;

export type ClassQrPrintItem = {
  id: string;
  schoolName: string;
  classLabel: string;
  qrCode: string;
};

/** Public poster URL encoded inside the QR (phone camera opens school/class info). */
export function classQrPublicUrl(code: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_CLASS_QR_PUBLIC_ORIGIN?.replace(/\/$/, '');
  const origin =
    fromEnv ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://timetable.shuleplus.rw');
  return `${origin}/c/${encodeURIComponent(code)}`;
}

/** QR image encodes the public URL so non-teachers see school info. */
export function classQrImageUrl(code: string, size: number) {
  const data = classQrPublicUrl(code);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tileHtml(item: ClassQrPrintItem, qrSize: number) {
  const school = escapeHtml(item.schoolName);
  const cls = escapeHtml(item.classLabel);
  const code = escapeHtml(item.qrCode);
  const src = classQrImageUrl(item.qrCode, qrSize);
  return `
    <div class="tile">
      <div class="tile-head">
        <p class="school">${school}</p>
        <p class="class-name">${cls}</p>
        <p class="code">${code}</p>
      </div>
      <div class="qr-wrap">
        <img src="${src}" alt="QR ${code}" />
      </div>
      <p class="hint">Teachers: scan in Ticha Portal</p>
    </div>`;
}

export function buildClassQrPrintHtml(
  title: string,
  items: ClassQrPrintItem[],
  layout: ClassQrPrintLayout
): string {
  const perPage = layout === '1x1' ? 1 : 9;
  const pages = chunk(items, perPage);
  const qrPx = layout === '1x1' ? 720 : 420;
  const tileW = layout === '1x1' ? QR_TILE_SINGLE_WIDTH_MM : QR_TILE_WIDTH_MM;
  const tileH = layout === '1x1' ? QR_TILE_SINGLE_HEIGHT_MM : QR_TILE_HEIGHT_MM;
  const cols = layout === '1x1' ? 1 : 3;
  const rows = layout === '1x1' ? 1 : 3;

  const sheets = pages
    .map(
      (page) => `
    <div class="sheet${layout === '1x1' ? ' sheet-single' : ''}">
      ${page.map((item) => tileHtml(item, qrPx)).join('')}
    </div>`
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; font-family: "Segoe UI", system-ui, sans-serif; color: #000435; }
  .sheet {
    width: ${A4_WIDTH_MM}mm;
    min-height: ${A4_HEIGHT_MM}mm;
    page-break-after: always;
    display: grid;
    grid-template-columns: repeat(${cols}, ${tileW}mm);
    grid-template-rows: repeat(${rows}, ${tileH}mm);
    column-gap: ${COL_GAP_MM}mm;
    row-gap: ${ROW_GAP_MM}mm;
    padding: ${PAGE_MARGIN_MM}mm;
    justify-content: center;
    align-content: ${layout === '1x1' ? 'center' : 'start'};
  }
  .sheet-single {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sheet:last-child { page-break-after: auto; }
  .tile {
    width: ${tileW}mm;
    height: ${tileH}mm;
    border: 0.45mm solid #000435;
    border-radius: 2.5mm;
    padding: ${layout === '1x1' ? '6mm' : '2.8mm'};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 35%, #ffffff 100%);
    overflow: hidden;
  }
  .tile-head { width: 100%; text-align: center; }
  .school {
    font-size: ${layout === '1x1' ? '4.2mm' : '2.4mm'};
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #475569;
    line-height: 1.2;
  }
  .class-name {
    margin-top: ${layout === '1x1' ? '2.5mm' : '1.2mm'};
    font-size: ${layout === '1x1' ? '9mm' : '4.2mm'};
    font-weight: 800;
    line-height: 1.1;
    color: #000435;
  }
  .code {
    margin-top: ${layout === '1x1' ? '2mm' : '1mm'};
    display: inline-block;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: ${layout === '1x1' ? '3.2mm' : '1.85mm'};
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #000435;
    background: rgba(0,4,53,0.06);
    border-radius: 1.2mm;
    padding: 0.6mm 1.4mm;
  }
  .qr-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin: ${layout === '1x1' ? '4mm 0' : '1.5mm 0'};
  }
  .qr-wrap img {
    width: ${layout === '1x1' ? '118mm' : '42mm'};
    height: ${layout === '1x1' ? '118mm' : '42mm'};
    object-fit: contain;
    image-rendering: pixelated;
  }
  .hint {
    font-size: ${layout === '1x1' ? '3.2mm' : '1.8mm'};
    font-weight: 600;
    color: #64748b;
    text-align: center;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head><body>
${sheets}
<script>
  window.onload = function () {
    var imgs = Array.prototype.slice.call(document.images || []);
    if (!imgs.length) { window.print(); return; }
    var left = imgs.length;
    function done() {
      left -= 1;
      if (left <= 0) window.print();
    }
    imgs.forEach(function (img) {
      if (img.complete) done();
      else {
        img.onload = done;
        img.onerror = done;
      }
    });
  };
</script>
</body></html>`;
}

export function openPrintWindowPlaceholder(): Window | null {
  const w = window.open('', '_blank', 'width=920,height=720');
  if (w) {
    w.document.write(
      '<!DOCTYPE html><html><head><title>Preparing print…</title></head><body style="font-family:system-ui,sans-serif;padding:24px;color:#000435">Preparing class QR codes for print…</body></html>'
    );
    w.document.close();
  }
  return w;
}

export async function printClassQrSheets(
  items: ClassQrPrintItem[],
  layout: ClassQrPrintLayout,
  printWindow: Window | null,
  title = 'Class QR Codes'
): Promise<void> {
  if (!printWindow) {
    throw new Error('Pop-up blocked. Allow pop-ups for this site, then print again.');
  }
  if (!items.length) throw new Error('No class QR codes to print.');

  const html = buildClassQrPrintHtml(title, items, layout);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
