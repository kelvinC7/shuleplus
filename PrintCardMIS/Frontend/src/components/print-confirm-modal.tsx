'use client';

import { useState } from 'react';
import type { PrintBatch } from '@/services/print-card-api';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type ConfirmMode = 'ask' | 'partial';

type Props = {
  open: boolean;
  batch: PrintBatch | null;
  saving?: boolean;
  onClose: () => void;
  onAllSuccess: () => void;
  onPartial: (items: Array<{ itemId: string; success: boolean }>) => void;
  onCancel: () => void;
};

export function PrintConfirmModal({
  open,
  batch,
  saving = false,
  onClose,
  onAllSuccess,
  onPartial,
  onCancel,
}: Props) {
  const [mode, setMode] = useState<ConfirmMode>('ask');
  const [selection, setSelection] = useState<Record<string, boolean>>({});

  if (!open || !batch?.items?.length) return null;

  const items = batch.items.filter((i) => i.cardRecord);

  function openPartial() {
    const initial: Record<string, boolean> = {};
    for (const item of items) initial[item.id] = true;
    setSelection(initial);
    setMode('partial');
  }

  function submitPartial() {
    onPartial(
      items.map((item) => ({
        itemId: item.id,
        success: selection[item.id] ?? false,
      }))
    );
    setMode('ask');
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        {mode === 'ask' ? (
          <>
            <h2 className="text-xl font-bold text-navy">Confirm Printing</h2>
            <p className="mt-2 text-sm text-muted">
              Confirm the result so printed cards stay marked after refresh.
            </p>
            <p className="mt-1 text-sm font-medium text-navy">
              {batch.totalCards} card{batch.totalCards === 1 ? '' : 's'} were sent to the printer.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={saving}
                onClick={onAllSuccess}
                className="btn-primary flex-1 justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? 'Saving…' : 'Yes, All Printed'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={openPartial}
                className="btn-secondary flex-1 justify-center gap-2 disabled:opacity-50"
              >
                <AlertTriangle className="h-4 w-4" />
                Some Failed
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onCancel}
                className="btn-secondary flex-1 justify-center gap-2 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Not Printed
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-navy">Printing Result</h2>
            <p className="mt-1 text-sm text-muted">{batch.totalCards} cards sent — mark each result:</p>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selection[item.id] ?? false}
                    onChange={(e) =>
                      setSelection((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="flex-1 text-sm font-medium text-navy">
                    {item.cardRecord?.fullName}
                  </span>
                  <span className="text-xs text-muted">{item.cardRecord?.personCode}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setMode('ask')} className="btn-secondary flex-1">
                Back
              </button>
              <button type="button" disabled={saving} onClick={submitPartial} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Results'}
              </button>
            </div>
          </>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="mt-3 w-full text-center text-xs text-muted hover:text-navy disabled:opacity-50"
        >
          Close for now — you will be prompted again after refresh until you confirm
        </button>
      </div>
    </div>
  );
}
