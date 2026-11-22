'use client';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export type PdfDownloadOptions = {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  html: string;
  wrapDocument?: boolean;
};

function buildDocumentHtml(html: string, wrapDocument: boolean) {
  if (!wrapDocument || html.includes('<!DOCTYPE')) return html;
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${html}</body></html>`;
}

async function waitForRender(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  );
  if (typeof document !== 'undefined' && 'fonts' in document) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
}

/** Renders HTML off-screen and downloads a PDF file (no print dialog). */
export async function downloadHtmlAsPdf(options: PdfDownloadOptions): Promise<void> {
  const { filename, orientation = 'portrait', html, wrapDocument = true } = options;
  const isLandscape = orientation === 'landscape';
  const pageWidthPx = isLandscape ? 1123 : 794;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:0;top:0;border:none;opacity:0.01;pointer-events:none;z-index:-9999;' +
    `width:${pageWidthPx}px;height:1200px`;
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Could not create PDF render frame');
  }

  doc.open();
  doc.write(buildDocumentHtml(html, wrapDocument));
  doc.close();

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    setTimeout(resolve, 400);
  });

  const body = doc.body;
  if (!body) {
    document.body.removeChild(iframe);
    throw new Error('PDF content is empty');
  }

  try {
    await waitForRender(body);
    const scrollHeight = Math.max(body.scrollHeight, doc.documentElement?.scrollHeight ?? 0);
    iframe.style.height = `${Math.max(scrollHeight, 1200)}px`;

    body.style.width = `${pageWidthPx}px`;

    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();

    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: pageWidthPx,
      windowWidth: pageWidthPx,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgHeightMm = (canvas.height * pageWidthMm) / canvas.width;

    let yOffset = 0;
    let pageIndex = 0;
    while (yOffset < imgHeightMm) {
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -yOffset, pageWidthMm, imgHeightMm);
      yOffset += pageHeightMm;
      pageIndex += 1;
    }

    const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeName);
  } finally {
    document.body.removeChild(iframe);
  }
}
