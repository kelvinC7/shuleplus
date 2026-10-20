import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Keyboard, Loader2, X } from 'lucide-react';

export default function QrScanModal({
  onScan,
  onClose,
  onManual,
  title = 'Scan QR',
  hint = 'Align the code inside the frame',
}) {
  const containerId = `qr-${useId().replace(/:/g, '')}`;
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);

  const handleDecode = useCallback(
    (decoded) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      void navigator.vibrate?.(80);
      onScan(String(decoded).trim());
    },
    [onScan]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new Html5Qrcode(containerId, false);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          handleDecode
        );
        if (!cancelled) setStarting(false);
      } catch (err) {
        if (!cancelled) {
          setStarting(false);
          setError(err?.message || 'Camera could not start. Use manual entry.');
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) scanner.stop().catch(() => {});
    };
  }, [containerId, handleDecode]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#000435]/60 p-4 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#000435]">{title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="relative bg-black">
          <div id={containerId} className="min-h-[240px] w-full overflow-hidden" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-sm text-white">
              <Loader2 className="h-4 w-4 animate-spin" /> Starting camera…
            </div>
          )}
        </div>
        {error && <p className="px-4 py-2 text-xs text-rose-700">{error}</p>}
        {onManual && (
          <button
            type="button"
            onClick={onManual}
            className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-medium text-[#000435]"
          >
            <Keyboard size={16} /> Enter code instead
          </button>
        )}
      </div>
    </div>
  );
}
