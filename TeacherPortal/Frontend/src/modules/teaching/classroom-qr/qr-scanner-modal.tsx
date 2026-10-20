'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Keyboard, Loader2 } from 'lucide-react';

export function QrScannerModal({
  onScan,
  onClose,
  onManual,
  title = 'Scan class monitor QRCode',
  hint = 'Align the classroom QR inside the frame',
}: {
  onScan: (code: string) => void;
  onClose: () => void;
  onManual: () => void;
  title?: string;
  hint?: string;
}) {
  const containerId = useId().replace(/:/g, '');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const scannedRef = useRef(false);

  const handleDecode = useCallback(
    (decoded: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      void navigator.vibrate?.(120);
      onScan(decoded.trim());
    },
    [onScan]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          handleDecode,
          () => {}
        );
        if (!cancelled) setStarting(false);
      } catch {
        if (!cancelled) {
          setError('Allow camera access to scan the classroom QR code on the wall.');
          setStarting(false);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner.stop().catch(() => {});
      }
    };
  }, [containerId, handleDecode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="text-sm font-bold">{title}</p>
        <span className="w-12" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6">
        <div className="relative flex-1 overflow-hidden rounded-3xl border-2 border-white/20 bg-black">
          <div id={containerId} className="h-full w-full [&>video]:!h-full [&>video]:!object-cover" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-56 rounded-3xl border-2 border-primary shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] sm:h-64 sm:w-64" />
          </div>
          {starting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-navy/60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-center text-sm text-white/90">{hint}</p>

        {error ? (
          <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onManual}
          className="btn-secondary mx-auto mt-5 inline-flex items-center gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20"
        >
          <Keyboard className="h-4 w-4" /> Enter code manually
        </button>
      </div>
    </div>
  );
}
