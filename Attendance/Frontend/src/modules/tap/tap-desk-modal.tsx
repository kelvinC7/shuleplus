'use client';

import { X } from 'lucide-react';
import { TapDeskView } from '@/modules/tap/tap-desk-view';

type Props = {
  open: boolean;
  onClose: () => void;
  direction: 'ENTRY' | 'EXIT';
  onSuccess?: () => void;
};

export function TapDeskModal({ open, onClose, direction, onSuccess }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-navy/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={direction === 'ENTRY' ? 'Manual entry' : 'Manual exit'}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {direction === 'ENTRY' ? 'Gate entry' : 'Gate exit'}
            </p>
            <h2 className="text-lg font-bold text-navy">Manual tap</h2>
          </div>
          <button
            type="button"
            className="rounded-xl border border-border p-2 text-muted transition hover:bg-slate-50 hover:text-navy"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          <TapDeskView
            direction={direction}
            compact
            onSuccess={() => {
              onSuccess?.();
            }}
          />
        </div>
      </div>
    </div>
  );
}
