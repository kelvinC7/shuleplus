export function feesPortalOrigin() {
  return (process.env.NEXT_PUBLIC_FEES_PORTAL_URL ?? 'http://localhost:3015').replace(/\/$/, '');
}

export function receiptPublicUrl(receiptNumber: string, stored?: string | null) {
  if (stored && /^https?:\/\//i.test(stored)) return stored;
  return `${feesPortalOrigin()}/r/${encodeURIComponent(receiptNumber)}`;
}

export async function generateReceiptQrDataUrl(data: string): Promise<string> {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(data)}`;
}
