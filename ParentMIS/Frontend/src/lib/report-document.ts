import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4 = { pageW: 210, pageH: 297, margin: 4 };

function fitOnA4(canvasWidth: number, canvasHeight: number) {
  const maxW = A4.pageW - A4.margin * 2;
  const maxH = A4.pageH - A4.margin * 2;
  const imgRatio = canvasWidth / canvasHeight;
  let drawW = maxW;
  let drawH = drawW / imgRatio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * imgRatio;
  }
  const x = (A4.pageW - drawW) / 2;
  const y = A4.margin;
  return { drawW, drawH, x, y };
}

async function renderReportCanvas(element: HTMLElement) {
  const widthPx = element.offsetWidth || 794;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${widthPx}px;background:#fff;z-index:-1`;
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.maxWidth = `${widthPx}px`;
  clone.style.width = `${widthPx}px`;
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    return await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: widthPx,
      windowWidth: widthPx,
    });
  } finally {
    host.remove();
  }
}

function fitImageToA4Pdf(canvas: HTMLCanvasElement) {
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { drawW, drawH, x, y } = fitOnA4(canvas.width, canvas.height);
  pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
  return pdf;
}

export async function downloadReportPdf(element: HTMLElement, fileName: string) {
  const canvas = await renderReportCanvas(element);
  fitImageToA4Pdf(canvas).save(fileName);
}

export async function printReportPdf(element: HTMLElement) {
  const canvas = await renderReportCanvas(element);
  const imgData = canvas.toDataURL('image/png');
  const { drawW, drawH, x, y } = fitOnA4(canvas.width, canvas.height);

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
  doc.write(`<!DOCTYPE html><html><head><title>Report card</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; width: ${A4.pageW}mm; height: ${A4.pageH}mm; overflow: hidden; background: #fff; }
  .sheet { position: relative; width: ${A4.pageW}mm; height: ${A4.pageH}mm; overflow: hidden; page-break-inside: avoid; }
  img { position: absolute; left: ${x}mm; top: ${y}mm; width: ${drawW}mm; height: ${drawH}mm; display: block; }
</style></head>
<body><div class="sheet"><img id="report-print-img" src="${imgData}" alt="Report card" /></div></body></html>`);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 800);
  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  };

  const img = doc.getElementById('report-print-img') as HTMLImageElement | null;
  if (!img) {
    triggerPrint();
    return;
  }
  if (img.complete && img.naturalWidth > 0) {
    triggerPrint();
    return;
  }
  img.onload = () => triggerPrint();
  img.onerror = () => {
    iframe.remove();
    throw new Error('Could not load report image for printing.');
  };
}
