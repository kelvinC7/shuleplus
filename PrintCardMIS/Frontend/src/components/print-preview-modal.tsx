'use client';

import { useEffect, useState } from 'react';
import {
  buildPayloadFromRecord,
} from '@/lib/card-payload';
import {
  CARD_H,
  CARD_W,
  renderSmartCardToCanvas,
} from '@/lib/smart-card-renderer';
import type { CardRecord, PersonKind, PrintBatch, PrintCardSchool } from '@/services/print-card-api';
import { PRINT_SHEET_LAYOUTS, type PrintSheetLayout } from '@/lib/print-workflow';
import { Loader2, X, ZoomIn } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  batch: PrintBatch | null;
  school: PrintCardSchool;
  kind: PersonKind;
  onPrint: (layout: PrintSheetLayout, onProgress?: (message: string | null) => void) => void;
  onRemoveItem?: (itemId: string) => void;
  printing?: boolean;
};

function LayoutPreview({ layout }: { layout: PrintSheetLayout }) {
  const { cols, rows } = layout === '1x1' ? { cols: 1, rows: 1 } : { cols: 3, rows: 3 };
  const cells = cols * rows;
  return (
    <div
      className="mx-auto w-full max-w-[120px] rounded border border-slate-300 bg-white p-1.5 shadow-sm"
      style={{ aspectRatio: '210/297' }}
      aria-hidden
    >
      <div
        className="grid h-full w-full gap-0.5"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {Array.from({ length: cells }, (_, i) => (
          <div
            key={i}
            className={`rounded-sm ${layout === '1x1' ? 'bg-primary/40' : 'bg-primary/25 ring-1 ring-primary/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

function CardThumb({
  record,
  kind,
  school,
}: {
  record: CardRecord;
  kind: PersonKind;
  school: PrintCardSchool;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const payload = buildPayloadFromRecord(record, kind, school);
    void renderSmartCardToCanvas(payload)
      .then((c) => {
        if (!cancelled) setUrl(c.toDataURL('image/png'));
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [record, kind, school]);

  if (!url) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-slate-100"
        style={{ aspectRatio: `${CARD_W}/${CARD_H}` }}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={record.fullName} className="w-full shadow-md ring-1 ring-black/10" />
  );
}

export function PrintPreviewModal({
  open,
  onClose,
  batch,
  school,
  kind,
  onPrint,
  onRemoveItem,
  printing,
}: Props) {
  const [zoomId, setZoomId] = useState<string | null>(null);
  const [sheetLayout, setSheetLayout] = useState<PrintSheetLayout>('3x3');
  const [renderProgress, setRenderProgress] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSheetLayout('3x3');
      setRenderProgress(null);
      setZoomId(null);
    }
  }, [open, batch?.id]);

  if (!open || !batch?.items?.length) return null;

  const layoutMeta = PRINT_SHEET_LAYOUTS.find((l) => l.id === sheetLayout)!;
  const pageCount = Math.ceil(batch.totalCards / layoutMeta.cardsPerPage);

  const zoomRecord = batch.items.find((i) => i.cardRecord?.id === zoomId)?.cardRecord;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy">Print Preparation</h2>
            <p className="text-sm text-muted">
              {batch.totalCards} card{batch.totalCards === 1 ? '' : 's'} · Batch {batch.batchNumber}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {batch.items.map((item) => {
              const record = item.cardRecord;
              if (!record) return null;
              return (
                <div key={item.id} className="group relative">
                  <CardThumb record={record} kind={kind} school={school} />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-navy">{record.fullName}</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Zoom"
                        onClick={() => setZoomId(record.id)}
                        className="rounded p-1 text-muted hover:bg-slate-100"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                      {onRemoveItem && (
                        <button
                          type="button"
                          title="Remove from batch"
                          onClick={() => onRemoveItem(item.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {item.printType === 'REPRINT' && (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      Reprint
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 border-t border-border px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
            <LayoutPreview layout={sheetLayout} />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Print layout</p>
              <div className="flex flex-wrap gap-2">
                {PRINT_SHEET_LAYOUTS.map((option) => {
                  const active = sheetLayout === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={printing}
                      onClick={() => setSheetLayout(option.id)}
                      aria-pressed={active}
                      className={`rounded-xl border-2 px-3 py-2 text-left transition ${
                        active
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-sm font-bold text-navy">{option.label}</span>
                      <span className="block text-[11px] text-muted">{option.description}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-medium text-navy">
                {batch.totalCards} card{batch.totalCards === 1 ? '' : 's'} →{' '}
                <span className="text-primary">{pageCount} A4 page{pageCount === 1 ? '' : 's'}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {renderProgress && (
              <p className="text-xs text-muted">{renderProgress}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onClose} disabled={printing} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled={printing}
                onClick={() => onPrint(sheetLayout, setRenderProgress)}
                className="btn-primary"
              >
                {printing ? 'Preparing…' : `Print ${batch.totalCards} Cards`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {zoomRecord && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setZoomId(null)}
        >
          <div className="max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardThumb record={zoomRecord} kind={kind} school={school} />
            <p className="mt-3 text-center text-sm font-semibold text-white">{zoomRecord.fullName}</p>
          </div>
        </div>
      )}
    </div>
  );
}
