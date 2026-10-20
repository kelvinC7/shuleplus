'use client';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfDownloadOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  /** Full HTML document or body fragment */
  html: string;
  /** If true, wraps fragment in a complete HTML document shell */
  wrapDocument?: boolean;
}

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
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
  if (typeof document !== 'undefined' && 'fonts' in document) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 250));
}

function pageElements(root: HTMLElement) {
  const pages = Array.from(root.querySelectorAll('.pdf-page')) as HTMLElement[];
  return pages.length > 0 ? pages : [root];
}

/**
 * Renders HTML off-screen and downloads a real PDF file (not print dialog).
 * Each `.pdf-page` element becomes one PDF page for clean pagination.
 */
export async function downloadHtmlAsPdf(options: PdfDownloadOptions): Promise<void> {
  const { filename, orientation = 'portrait', html, wrapDocument = true } = options;
  const isLandscape = orientation === 'landscape';
  const pageWidthPx = isLandscape ? 1123 : 794;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = `${pageWidthPx}px`;
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
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

    const pages = pageElements(body);
    if (pages.length === 0) {
      throw new Error('PDF has no pages to render');
    }

    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i += 1) {
      const pageEl = pages[i];
      pageEl.style.width = `${pageWidthPx}px`;

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: pageWidthPx,
        windowWidth: pageWidthPx,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('.pdf-page').forEach((node) => {
            const el = node as HTMLElement;
            el.style.overflow = 'visible';
            el.style.opacity = '1';
          });
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.94);
      const imgHeightMm = (canvas.height * pageWidthMm) / canvas.width;

      if (i > 0) pdf.addPage();

      if (imgHeightMm <= pageHeightMm + 0.5) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, imgHeightMm);
        continue;
      }

      // Tall page content: slice across multiple PDF pages
      let remaining = imgHeightMm;
      let yOffset = 0;
      let slice = 0;
      while (remaining > 0) {
        if (slice > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yOffset, pageWidthMm, imgHeightMm);
        yOffset += pageHeightMm;
        remaining -= pageHeightMm;
        slice += 1;
      }
    }

    const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeName);
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function openHtmlPreview(html: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900');
  if (!w) throw new Error('Pop-up blocked. Allow pop-ups to preview the document.');
  w.document.write(html.includes('<!DOCTYPE') ? html : buildDocumentHtml(html, true));
  w.document.close();
}
