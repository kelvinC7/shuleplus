'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PermissionQrCodeProps {
  scanCode: string;
  referenceNumber?: string;
  size?: number;
  className?: string;
}

export function permissionQrPayload(scanCode: string) {
  return `shuleplus://permission/${scanCode}`;
}

export function PermissionQrCode({ scanCode, referenceNumber, size = 160, className = '' }: PermissionQrCodeProps) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    void QRCode.toDataURL(permissionQrPayload(scanCode), {
      width: size,
      margin: 1,
      color: { dark: '#000435', light: '#ffffff' },
    }).then(setDataUrl);
  }, [scanCode, size]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-slate-400">Generating QR…</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <img
        src={dataUrl}
        alt={`Permission QR ${scanCode}`}
        width={size}
        height={size}
        className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
      />
      <p className="font-mono text-sm font-bold tracking-wide text-[#000435]">{scanCode}</p>
      {referenceNumber ? <p className="text-[11px] text-slate-400">{referenceNumber}</p> : null}
    </div>
  );
}
