'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Props = {
  value: string;
  size?: number;
};

/** QR image via `qrcode` (avoids qrcode.react + React 19 duplicate-React hook errors). */
export default function ReportQrCode({ value, size = 96 }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
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
