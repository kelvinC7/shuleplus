import QRCode from 'qrcode';

/** High-resolution QR for reliable scanning after PDF scaling / print. */
export async function generateReportQrDataUrl(value: string, displayPx = 72): Promise<string | null> {
  const url = value?.trim();
  if (!url) return null;
  try {
    return await QRCode.toDataURL(url, {
      width: Math.max(256, displayPx * 5),
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return null;
  }
}

export function extractVerifyUrlFromReport(element: HTMLElement): string | null {
  const attr = element.querySelector('[data-verify-url]')?.getAttribute('data-verify-url')?.trim();
  if (attr) return attr;
  const meta = element.querySelector('[data-report-verify-url]')?.getAttribute('data-report-verify-url')?.trim();
  return meta || null;
}

/** QR footprint on A4 (mm) — must stay large enough to scan. */
export const REPORT_QR_PRINT_MM = 26;
