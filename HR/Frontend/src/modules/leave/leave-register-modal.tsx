'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { RegisterLeaveView } from './register-leave-view';

interface LeaveRegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeaveRegisterModal({ open, onClose, onSuccess }: LeaveRegisterModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000435]/50 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-register-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close leave registration"
        onClick={onClose}
      />
      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_24px_64px_-16px_rgba(0,4,53,0.45)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-[#000435] px-5 py-4 text-white sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">Leave</p>
            <h2 id="leave-register-title" className="text-lg font-bold">
              Register Leave Request
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            <X size={14} />
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <RegisterLeaveView
            variant="modal"
            onClose={onClose}
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
