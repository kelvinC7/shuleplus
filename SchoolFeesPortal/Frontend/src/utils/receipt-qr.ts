import QRCode from 'qrcode';

/** Public modern-receipt page opened when a parent scans the QR. */
export function receiptPublicUrl(receiptNumber: string, _stored?: string | null) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/r/${encodeURIComponent(receiptNumber)}`;
  }
  return _stored && /^https?:\/\//i.test(_stored) ? _stored : '';
}

export function receiptQrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=168x168&margin=8&data=${encodeURIComponent(data)}`;
}

export async function generateReceiptQrDataUrl(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000435', light: '#ffffff' },
    });
  } catch {
    return receiptQrImageUrl(data);
  }
}
