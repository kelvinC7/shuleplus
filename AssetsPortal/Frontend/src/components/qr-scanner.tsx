'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

interface QrScannerProps {
  onScan: (value: string) => void;
  disabled?: boolean;
}

export function QrScanner({ onScan, disabled }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    if (disabled || !supported) return;
    setError(null);
    try {
      detectorRef.current = new window.BarcodeDetector!({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
      });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setActive(true);

      const tick = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          const value = codes.find((c) => c.rawValue)?.rawValue?.trim();
          if (value) {
            stop();
            onScan(value);
            return;
          }
        } catch {
          // ignore frame errors
        }
        rafRef.current = requestAnimationFrame(() => {
          void tick();
        });
      };
      rafRef.current = requestAnimationFrame(() => {
        void tick();
      });
    } catch {
      setError('Camera access was denied or is unavailable.');
      stop();
    }
  }

  function stop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }

  if (supported === false) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-3 text-sm text-muted">
        Camera scanning is not supported in this browser. Use manual code entry below.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border bg-black/90">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (active ? stop() : void start())}
        className="btn-secondary w-full"
      >
        {active ? <CameraOff size={16} /> : <Camera size={16} />}
        {active ? 'Stop camera' : 'Scan with camera'}
      </button>
    </div>
  );
}
