import { ModernQrCard } from '@/components/qr-code';
import { tripVerifyUrl } from '@/shared/trip-qr';

/** One QR per trip · links to the public verification page. */
export function TripPassQr({ reference, size = 112 }: { reference: string; size?: number }) {
  if (!reference.trim()) return null;
  return (
    <ModernQrCard
      value={tripVerifyUrl(reference)}
      label="Scan to verify"
      caption={reference}
      size={size}
    />
  );
}
