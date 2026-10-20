import QRCode from 'qrcode';

/** Opens the action plan in ShulePlus with document reference for verification. */
export function planVerificationUrl(planId: string, docRef: string, section?: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({ docRef });
  if (section) params.set('section', section);
  return `${origin}/plans/${encodeURIComponent(planId)}?${params.toString()}`;
}

function planQrFallbackImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=8&data=${encodeURIComponent(data)}`;
}

export async function generatePlanQrDataUrl(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000435', light: '#ffffff' },
    });
  } catch {
    return planQrFallbackImageUrl(data);
  }
}
