'use client';

import { AlertTriangle } from 'lucide-react';
import { LibModal } from '@/components/lib-modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  loading,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <LibModal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${variant === 'danger' ? 'bg-red-50 text-danger' : 'bg-navy/5 text-navy'}`}>
          <AlertTriangle size={28} />
        </div>
        <p className="text-sm text-muted">{message}</p>
        <div className="flex w-full gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              variant === 'danger'
                ? 'bg-danger text-white hover:bg-red-600 disabled:opacity-60'
                : 'btn-primary'
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Working…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </LibModal>
  );
}
