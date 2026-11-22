import { useEffect, useState } from 'react';
import { generateReportQrDataUrl } from '@/lib/report-qr';

type Props = {
  value: string;
  size?: number;
};

/** QR image via `qrcode` (avoids qrcode.react + React 19 duplicate-React hook errors). */
export default function ReportQrCode({ value, size = 72 }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    void generateReportQrDataUrl(value, size).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt="Verify report"
      width={size}
      height={size}
      style={{ display: 'block', margin: '0 auto' }}
    />
  );
}
