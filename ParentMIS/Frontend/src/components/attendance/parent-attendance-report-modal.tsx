'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { ParentAttendanceReportForm } from '@/components/attendance/parent-attendance-report-form';

type Props = {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  onSuccess?: (message: string) => void;
};

export function ParentAttendanceReportModal({ open, onClose, defaultDate, onSuccess }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-end justify-center bg-[#0c1424]/55 p-0 min-[640px]:items-center min-[640px]:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report absent or late"
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl min-[640px]:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#b26b00]">Attendance</p>
            <h3 className="text-lg font-extrabold text-navy">Report absent or late</h3>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-navy"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-5">
          <ParentAttendanceReportForm
            defaultDate={defaultDate}
            compact
            onSuccess={(msg) => {
              onSuccess?.(msg);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
