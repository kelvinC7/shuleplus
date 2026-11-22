'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Keyboard, Loader2, Square } from 'lucide-react';

export function QrScannerPanel({
  active,
  onScan,
  onStop,
  onManualFocus,
  hint = 'Point the camera at the learner card QR code',
}: {
  active: boolean;
  onScan: (code: string) => void;
  onStop?: () => void;
  onManualFocus?: () => void;
  hint?: string;
}) {
  const containerId = useId().replace(/:/g, '');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const scannedRef = useRef(false);

  const handleDecode = useCallback(
    (decoded: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      void navigator.vibrate?.(100);
      onScan(decoded.trim());
      window.setTimeout(() => {
        scannedRef.current = false;
      }, 1500);
    },
    [onScan]
  );

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        /* ignore */
      }
    }
    setStarting(false);
    setError(null);
    onStop?.();
  }, [onStop]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    setError(null);
    setStarting(true);

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
            qrbox: (w, h) => {
              const size = Math.min(w, h) * 0.75;
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
          setError('Allow camera access to scan cards.');
          setStarting(false);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) void scanner.stop().catch(() => {});
    };
  }, [active, containerId, handleDecode]);

  if (!active) return null;

  return (
    <div className="scan-panel relative overflow-hidden rounded-2xl border-2 border-[#000435]/10 bg-black shadow-inner">
      <div id={containerId} className="scan-video-host min-h-[220px] w-full sm:min-h-[280px]" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="scan-frame h-48 w-48 rounded-2xl border-2 border-primary sm:h-56 sm:w-56" />
      </div>
      {starting ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy/70 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-medium text-white/80">Starting camera</p>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy/90 p-4 text-center text-white">
          <p className="text-sm">{error}</p>
          {onManualFocus ? (
            <button type="button" className="btn-primary text-xs" onClick={onManualFocus}>
              <Keyboard size={14} /> Enter card manually
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="absolute left-0 right-0 top-0 flex justify-end gap-2 p-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-[#000435] shadow-md hover:bg-white"
          onClick={() => void stopCamera()}
        >
          <Square size={14} fill="currentColor" />
          Stop QR
        </button>
      </div>
      <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy/90 to-transparent px-3 py-3 text-center text-[11px] font-medium text-white/90">
        {hint}
      </p>
    </div>
  );
}
