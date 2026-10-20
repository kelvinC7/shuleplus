'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  itemLabel?: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  itemLabel,
  confirmLabel = 'Delete',
  loading = false,
}: ConfirmDeleteModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, loading]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-navy/55 backdrop-blur-[3px]"
        onClick={() => {
          if (!loading) onClose();
        }}
        aria-label="Close dialog"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-desc"
        className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_24px_60px_-12px_rgba(0,4,53,0.4)]"
      >
        <div className="px-6 pt-6 pb-2 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
            <Trash2 size={26} strokeWidth={1.75} />
          </span>
          <h2 id="confirm-delete-title" className="mt-4 text-lg font-bold text-navy">
            {title}
          </h2>
          <p id="confirm-delete-desc" className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </p>
          {itemLabel ? (
            <p className="mt-3 rounded-xl border border-border bg-slate-50 px-4 py-2.5 text-sm font-semibold text-navy">
              {itemLabel}
            </p>
          ) : null}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-700">
            <AlertTriangle size={13} /> This action cannot be undone.
          </p>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary w-full py-2.5 sm:w-auto"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:w-auto"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
