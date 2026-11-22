import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/shared/cn';

export function QrImage({ value, size = 96, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000435', light: '#ffffff' },
    })
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

  if (!src) {
    return (
      <div
        className={cn('animate-pulse rounded-xl bg-slate-100', className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn('rounded-xl ring-1 ring-line', className)}
    />
  );
}

/** Branded QR tile for lists and headers. */
export function ModernQrCard({
  value,
  label,
  caption,
  size = 92,
}: {
  value: string;
  label: string;
  caption?: string;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-gradient-to-b from-white to-slate-50 p-3 shadow-sm">
      <QrImage value={value} size={size} />
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {caption ? <p className="mt-0.5 max-w-[120px] truncate text-center text-xs font-semibold text-navy">{caption}</p> : null}
    </div>
  );
}
