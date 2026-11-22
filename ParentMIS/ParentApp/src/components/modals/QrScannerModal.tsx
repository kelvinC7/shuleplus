import React, { useEffect, useState } from 'react';
import { Child } from '../../types';
import { useApp } from '../../context/AppContext';
import { QrCode, CheckCircle, Camera } from 'lucide-react';

interface QrScannerModalProps {
  targetChild: Child;
  onSuccess: (child: Child) => void;
  title?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  targetChild,
  onSuccess,
  title = 'Scan ShuleCard QR',
}) => {
  const { closeSheet, t } = useApp();
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    // Realistic 1.6s scanner simulation with laser line
    const timer = setTimeout(() => {
      setScanning(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = () => {
    onSuccess(targetChild);
    closeSheet();
  };

  return (
    <div className="py-2 text-center space-y-4">
      <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#13213D]">
        <Camera className="w-4 h-4 text-[#F5A623]" />
        <span>{t(title)}</span>
      </div>

      {scanning ? (
        <div className="relative w-64 h-64 mx-auto bg-black rounded-3xl overflow-hidden border-4 border-[#13213D] shadow-2xl flex items-center justify-center">
          {/* Animated red laser scan line */}
          <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_12px_#ff0000] animate-bounce top-1/2 -translate-y-1/2 z-20" />

          {/* Viewfinder corner brackets */}
          <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none" />

          {/* Background simulated card */}
          <div className="opacity-40 p-4 text-white text-center">
            <QrCode className="w-32 h-32 mx-auto text-white/80" />
            <span className="text-[10px] text-white/60 tracking-wider font-mono block mt-2">
              {t('Align ShuleCard inside frame')}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-card border border-[#E5E8EF] text-left">
            <span className="text-[10px] font-bold uppercase text-[#1FA971] tracking-wider block">
              {t('Card Verified')} ✓
            </span>
            <b className="text-base font-extrabold text-[#13213D] block mt-0.5">
              {targetChild.n}
            </b>
            <div className="flex items-center justify-between text-xs text-[#6B7385] mt-2">
              <span>{targetChild.cls} · {targetChild.code}</span>
              <span className="font-mono text-[#13213D] font-bold">{targetChild.cardno}</span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3.5 bg-[#F5A623] text-[#13213D] text-xs font-extrabold rounded-xl hover:bg-amber-400 active:scale-98 transition-all shadow-md"
          >
            {t('Continue with {{name}}', { name: targetChild.first })}
          </button>
        </div>
      )}

      {scanning && (
        <p className="text-[11px] text-[#6B7385]">
          {t('Point your phone camera at the QR code on the front or back of the ShuleCard.')}
        </p>
      )}
    </div>
  );
};
