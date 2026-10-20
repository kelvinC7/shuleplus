'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Printer, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ClassQrRecord } from '@/services/timetable-api';
import {
  CLASS_QR_PRINT_LAYOUTS,
  classQrImageUrl,
  openPrintWindowPlaceholder,
  printClassQrSheets,
  type ClassQrPrintLayout,
} from '@/lib/class-qr-print';

type Props = {
  open: boolean;
  onClose: () => void;
  schoolName: string;
  rows: ClassQrRecord[];
};

function LayoutPreview({ layout }: { layout: ClassQrPrintLayout }) {
  const cols = layout === '1x1' ? 1 : 3;
  const rows = layout === '1x1' ? 1 : 3;
  const cells = cols * rows;
  return (
    <div
      className="mx-auto w-full max-w-[110px] rounded border border-slate-300 bg-white p-1.5 shadow-sm"
      style={{ aspectRatio: '210/297' }}
      aria-hidden
    >
      <div
        className="grid h-full w-full gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: cells }, (_, i) => (
          <div
            key={i}
            className={`rounded-sm ${layout === '1x1' ? 'bg-primary/45' : 'bg-primary/25 ring-1 ring-primary/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ClassQrPrintDrawer({ open, onClose, schoolName, rows }: Props) {
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<ClassQrPrintLayout>('3x3');
  const [printing, setPrinting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setLayout('3x3');
    setSelected(new Set(rows.map((r) => r.id)));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, rows]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected]
  );

  const layoutMeta = CLASS_QR_PRINT_LAYOUTS.find((l) => l.id === layout)!;
  const pageCount = Math.max(1, Math.ceil(selectedRows.length / layoutMeta.perPage));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(rows.map((r) => r.id)));
  }

  async function handlePrint() {
    if (!selectedRows.length) {
      toast.error('Select at least one class QR code');
      return;
    }
    const printWindow = openPrintWindowPlaceholder();
    setPrinting(true);
    try {
      await printClassQrSheets(
        selectedRows.map((r) => ({
          id: r.id,
          schoolName: schoolName || 'School',
          classLabel: r.classLabel ?? r.name,
          qrCode: r.qrCode,
        })),
        layout,
        printWindow,
        `${schoolName || 'School'} · Class QR Codes`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Print failed');
      try {
        printWindow?.close();
      } catch {
        /* ignore */
      }
    } finally {
      setPrinting(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Print Class QR</p>
          <h2 className="truncate text-lg font-extrabold text-navy sm:text-xl">
            {schoolName || 'School'}
          </h2>
          <p className="text-sm text-muted">
            {selectedRows.length} selected · {pageCount} A4 page{pageCount === 1 ? '' : 's'} · {layoutMeta.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border bg-white p-2.5 text-muted hover:bg-slate-50 hover:text-navy"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[280px_1fr] lg:p-6">
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Sheet layout</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {CLASS_QR_PRINT_LAYOUTS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLayout(opt.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      layout === opt.id
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    <LayoutPreview layout={opt.id} />
                    <p className="mt-2 text-sm font-bold text-navy">{opt.label}</p>
                    <p className="text-[11px] text-muted">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Classes</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-amber-600 hover:underline"
                  onClick={selectAll}
                >
                  Select all
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">
                Same A4 layouts as Print Card MIS ({layout === '1x1' ? 'one large poster QR' : '62×87 mm tiles, 9 per page'}).
              </p>
            </div>

            <button
              type="button"
              disabled={printing || !selectedRows.length}
              onClick={() => void handlePrint()}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-50"
            >
              {printing ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
              Print selected
            </button>
          </aside>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
              const label = row.classLabel ?? row.name;
              const active = selected.has(row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => toggle(row.id)}
                  className={`flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${
                    active
                      ? 'border-primary ring-2 ring-primary/25'
                      : 'border-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="border-b border-border/70 bg-gradient-to-b from-slate-50 to-white px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      {schoolName || 'School'}
                    </p>
                    <p className="mt-1 truncate text-lg font-extrabold text-navy">{label}</p>
                    <code className="mt-1 inline-block rounded-md bg-navy/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-navy/80">
                      {row.qrCode}
                    </code>
                  </div>
                  <div className="flex flex-1 flex-col items-center px-4 py-5">
                    <div className="rounded-2xl border border-border bg-white p-3 shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={classQrImageUrl(row.qrCode, 280)}
                        alt={`QR for ${label}`}
                        width={220}
                        height={220}
                        className="h-[220px] w-[220px] rounded-xl object-contain"
                      />
                    </div>
                    <p className="mt-3 text-xs font-medium text-muted">
                      {active ? 'Included in print' : 'Click to include'}
                    </p>
                  </div>
                </button>
              );
            })}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
