import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { BABYEYI_PDF_A4_HEIGHT_PX, BABYEYI_PDF_WIDTH_PX } from '@/lib/official-doc/types';

/** Capture #babyeyi-pdf-doc → A4 PDF (≤2 pages preferred). */
export async function downloadBabyeyiClientPdf(opts: {
  rootEl: HTMLElement;
  fileName: string;
}): Promise<void> {
  const { rootEl, fileName } = opts;

  const canvas = await html2canvas(rootEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (doc) => {
      doc.querySelectorAll('button').forEach((btn) => {
        (btn as HTMLElement).style.display = 'none';
      });
      const root = doc.getElementById('babyeyi-pdf-doc') as HTMLElement | null;
      if (root) {
        root.style.fontFamily = "var(--font-montserrat), 'Montserrat', system-ui, sans-serif";
      }
      doc.body.style.fontFamily = "var(--font-montserrat), 'Montserrat', system-ui, sans-serif";
    },
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [BABYEYI_PDF_WIDTH_PX, BABYEYI_PDF_A4_HEIGHT_PX] });
  const pageW = BABYEYI_PDF_WIDTH_PX;
  const pageH = BABYEYI_PDF_A4_HEIGHT_PX;
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  const pageCount = Math.min(2, Math.max(1, Math.ceil(imgH / pageH)));
  for (let page = 0; page < pageCount; page++) {
    if (page > 0) pdf.addPage([pageW, pageH], 'portrait');
    const srcY = (page * pageH * canvas.width) / imgW;
    const srcH = Math.min(canvas.height - srcY, (pageH * canvas.width) / imgW);

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.max(1, Math.floor(srcH));
    const ctx = slice.getContext('2d');
    if (!ctx) throw new Error('Canvas unsupported');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

    const sliceH = (slice.height * imgW) / slice.width;
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgW, sliceH);
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
