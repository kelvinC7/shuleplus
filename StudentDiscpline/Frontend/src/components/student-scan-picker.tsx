'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CreditCard, Loader2, QrCode, Search, X } from 'lucide-react';
import { parseScanCode } from '@/shared/scan-code';
import { toast } from 'sonner';

export type StudentScanMethod = 'QR' | 'Manual';

interface StudentScanPickerProps {
  onCodeResolved: (code: string, method: StudentScanMethod) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** QR scan + manual student card / code lookup (matches Smart Card QR format). */
export function StudentScanPicker({
  onCodeResolved,
  placeholder = 'Student code or scan Smart Card QR…',
  disabled,
}: StudentScanPickerProps) {
  const containerId = useId().replace(/:/g, '');
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const scannedRef = useRef(false);
  const [inputMode, setInputMode] = useState<'qr' | 'manual'>('manual');
  const [code, setCode] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [busy, setBusy] = useState(false);

  const resolve = useCallback(
    (raw: string, method: StudentScanMethod) => {
      const parsed = parseScanCode(raw);
      if (!parsed) {
        toast.error('Enter or scan a valid student code');
        return;
      }
      setCode(parsed);
      onCodeResolved(parsed, method);
    },
    [onCodeResolved]
  );

  const stopQrScan = useCallback(() => {
    setCameraOn(false);
    setCameraStarting(false);
    setInputMode('manual');
  }, []);

  const handleDecode = useCallback(
    (decoded: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      void navigator.vibrate?.(120);
      setCameraOn(false);
      resolve(decoded, 'QR');
    },
    [resolve]
  );

  useEffect(() => {
    if (!cameraOn || inputMode !== 'qr') return;

    let cancelled = false;
    scannedRef.current = false;
    setCameraStarting(true);

    void (async () => {
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

        if (!cancelled) setCameraStarting(false);
      } catch {
        if (!cancelled) {
          toast.error('Could not access camera. Allow camera permission or use manual lookup.');
          setCameraOn(false);
          setCameraStarting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner.stop().catch(() => {});
      }
    };
  }, [cameraOn, containerId, handleDecode, inputMode]);

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setInputMode('qr');
            setCameraOn(true);
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            inputMode === 'qr' ? 'bg-[#fcb038] text-[#000435]' : 'text-slate-600 hover:text-[#000435]'
          }`}
        >
          <QrCode size={14} /> Scan QR
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setInputMode('manual');
            setCameraOn(false);
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            inputMode === 'manual' ? 'bg-[#fcb038] text-[#000435]' : 'text-slate-600 hover:text-[#000435]'
          }`}
        >
          <CreditCard size={14} /> Lookup Card / Code
        </button>
      </div>

      {cameraOn && inputMode === 'qr' ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black">
          <button
            type="button"
            onClick={stopQrScan}
            className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/80"
            aria-label="Cancel QR scan"
          >
            <X size={14} /> Cancel
          </button>
          <div
            id={containerId}
            className="aspect-video w-full [&>video]:!h-full [&>video]:!w-full [&>video]:!object-cover"
          />
          {cameraStarting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-8 w-8 animate-spin text-[#fcb038]" />
            </div>
          ) : null}
          <p className="bg-slate-900 px-3 py-2 text-center text-xs text-white/70">
            Point at student Smart Card QR or permission QR
          </p>
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="discipline-input pl-9"
          placeholder={placeholder}
          value={code}
          disabled={disabled}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setBusy(true);
              resolve(code, 'Manual');
              setBusy(false);
            }
          }}
        />
      </div>
      <button
        type="button"
        className="btn-secondary w-full"
        disabled={disabled || busy}
        onClick={() => {
          setBusy(true);
          resolve(code, 'Manual');
          setBusy(false);
        }}
      >
        {busy ? 'Looking up…' : 'Search Student'}
      </button>
    </div>
  );
}
