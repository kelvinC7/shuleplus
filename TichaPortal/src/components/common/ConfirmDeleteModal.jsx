import React, { useEffect } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';

/**
 * @param {{ open: boolean; title?: string; description?: string; itemLabel?: string; loading?: boolean; onCancel: () => void; onConfirm: () => void | Promise<void> }} props
 */
export default function ConfirmDeleteModal({
  open,
  title = 'Delete this item?',
  description = 'This action cannot be undone.',
  itemLabel,
  loading = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000435]/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <Trash2 size={20} />
            </div>
            <div>
              <h2 id="confirm-delete-title" className="text-base font-bold text-[#000435]">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {itemLabel ? (
          <div className="mx-5 mt-4 rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-medium text-[#000435]">
            {itemLabel}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}
