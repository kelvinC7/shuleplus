import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { REPORT_A4_WIDTH_PX } from '@/lib/report-a4';

/** A4 printable area with 4mm margin on each side. */
const A4 = { pageW: 210, pageH: 297, margin: 4 };

function printableMm() {
  return {
    w: A4.pageW - A4.margin * 2,
    h: A4.pageH - A4.margin * 2,
  };
}

function enhanceCloneForCapture(clone: HTMLElement) {
  clone.classList.add('report-pdf-capture');
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.width = `${REPORT_A4_WIDTH_PX}px`;
  clone.style.maxWidth = `${REPORT_A4_WIDTH_PX}px`;
  clone.querySelectorAll('img').forEach((img) => {
    img.crossOrigin = 'anonymous';
  });
}

function syncImagesFromSource(source: HTMLElement, clone: HTMLElement) {
  const sourceImgs = Array.from(source.querySelectorAll('img'));
  const cloneImgs = Array.from(clone.querySelectorAll('img'));
  cloneImgs.forEach((img, index) => {
    const from = sourceImgs[index];
    if (from?.src) {
      img.src = from.src;
      img.crossOrigin = 'anonymous';
    }
  });
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        })
    )
  );
}

/** Capture report DOM at fixed A4 width (same as on-screen report viewer at 100% zoom). */
async function renderReportCanvas(element: HTMLElement) {
  const widthPx = REPORT_A4_WIDTH_PX;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.className = 'report-pdf-capture-host';
  host.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${widthPx}px`,
    'background:#fff',
    'z-index:-1',
  ].join(';');

  await waitForImages(element);
  const clone = element.cloneNode(true) as HTMLElement;
  enhanceCloneForCapture(clone);
  syncImagesFromSource(element, clone);
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await waitForImages(clone);
    const heightPx = Math.max(clone.scrollHeight, clone.offsetHeight, 1);
    return await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      width: widthPx,
      height: heightPx,
      windowWidth: widthPx,
      windowHeight: heightPx,
      onclone: (doc) => {
        const root = doc.querySelector('.report-pdf-capture') as HTMLElement | null;
        if (root) enhanceCloneForCapture(root);
      },
    });
  } finally {
    host.remove();
  }
}

type PageSlice = { dataUrl: string; wMm: number; hMm: number; xMm: number; yMm: number };

/** Fit report on one A4 page when possible (scale down); otherwise paginate. */
function canvasToA4PageSlices(canvas: HTMLCanvasElement, preferSinglePage = true): PageSlice[] {
  const { w: maxW, h: maxH } = printableMm();
  const imgData = canvas.toDataURL('image/png');
  let drawW = maxW;
  let drawH = (canvas.height / canvas.width) * drawW;

  if (preferSinglePage && drawH > maxH) {
    const scale = Math.min(maxW / drawW, maxH / drawH);
    drawW *= scale;
    drawH *= scale;
    const xMm = A4.margin + (maxW - drawW) / 2;
    const yMm = A4.margin + (maxH - drawH) / 2;
    return [{ dataUrl: imgData, wMm: drawW, hMm: drawH, xMm, yMm }];
  }

  if (drawH <= maxH + 0.5) {
    const xMm = A4.margin + (maxW - drawW) / 2;
    const yMm = A4.margin + (maxH - drawH) / 2;
    return [{ dataUrl: imgData, wMm: drawW, hMm: drawH, xMm, yMm }];
  }

  const sliceCanvas = document.createElement('canvas');
  const sliceCtx = sliceCanvas.getContext('2d');
  if (!sliceCtx) {
    return [{ dataUrl: imgData, wMm: drawW, hMm: drawH, xMm: A4.margin, yMm: A4.margin }];
  }

  const sliceHeightPx = Math.floor((maxH / drawH) * canvas.height);
  const slices: PageSlice[] = [];
  let offsetY = 0;

  while (offsetY < canvas.height) {
    const sliceH = Math.min(sliceHeightPx, canvas.height - offsetY);
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceH;
    sliceCtx.fillStyle = '#ffffff';
    sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    sliceCtx.drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    const hMm = (sliceH / canvas.height) * drawH;
    slices.push({
      dataUrl: sliceCanvas.toDataURL('image/png'),
      wMm: drawW,
      hMm,
      xMm: A4.margin,
      yMm: A4.margin,
    });
    offsetY += sliceH;
  }

  return slices;
}

function buildPdfFromSlices(slices: PageSlice[]) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  slices.forEach((slice, index) => {
    if (index > 0) pdf.addPage();
    pdf.addImage(slice.dataUrl, 'PNG', slice.xMm, slice.yMm, slice.wMm, slice.hMm);
  });

  return pdf;
}

function buildPrintHtmlFromSlices(slices: PageSlice[]) {
  const pages = slices
    .map(
      (s) =>
        `<div class="sheet"><img class="page" src="${s.dataUrl}" alt="" style="width:${s.wMm}mm;height:${s.hMm}mm;display:block;margin:${s.yMm}mm auto 0;" /></div>`
    )
    .join('');

  return `<!DOCTYPE html><html><head><title>Report card</title>
<style>
  @page { size: A4 portrait; margin: ${A4.margin}mm; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .sheet {
    position: relative;
    width: ${A4.pageW}mm;
    min-height: ${A4.pageH}mm;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head>
<body>${pages}</body></html>`;
}

/** Render report DOM into A4 PDF (same layout as viewer; multi-page when needed). */
export async function downloadReportPdf(element: HTMLElement, fileName: string) {
  const canvas = await renderReportCanvas(element);
  const slices = canvasToA4PageSlices(canvas);
  const pdf = buildPdfFromSlices(slices);
  pdf.save(fileName);
}

/** Print using the same capture pipeline as PDF download. */
export async function printReportPdf(element: HTMLElement) {
  const canvas = await renderReportCanvas(element);
  const slices = canvasToA4PageSlices(canvas);
  const html = buildPrintHtmlFromSlices(slices);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!win || !doc) {
    iframe.remove();
    throw new Error('Print is not available in this browser.');
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 1200);

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  };

  setTimeout(triggerPrint, 250);
}
