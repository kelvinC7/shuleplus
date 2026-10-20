'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Printer, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ClassQrPrintDrawer } from '@/components/class-qr-print-drawer';
import { HrPageLayout } from '@/components/hr-page-layout';
import { useAuth } from '@/contexts/auth-context';
import { classQrImageUrl } from '@/lib/class-qr-print';
import { timetableApi, type ClassQrRecord } from '@/services/timetable-api';

export function ClassQrView() {
  const { summary } = useAuth();
  const schoolName = summary?.organizationName ?? 'School';
  const [rows, setRows] = useState<ClassQrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    setLoading(true);
    try {
      const res = await timetableApi.classQrSync();
      setRows(res.data.data.classes);
    } catch (err: unknown) {
      if (!opts?.silent) {
        toast.error(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Could not load classes from Student Management'
        );
      }
      try {
        const res = await timetableApi.classQrList();
        setRows(res.data.data);
      } catch {
        /* keep current rows */
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ silent: true });
  }, [load]);

  function downloadQr(row: ClassQrRecord) {
    const link = document.createElement('a');
    link.href = classQrImageUrl(row.qrCode, 512);
    link.download = `${(row.classLabel ?? row.name).replace(/\s+/g, '-')}-qr.png`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  }

  return (
    <>
      <HrPageLayout
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary py-2.5"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              className="btn-primary py-2.5"
              disabled={!rows.length || loading}
              onClick={() => setPrintOpen(true)}
            >
              <Printer size={16} /> Print Class QR
            </button>
          </div>
        }
      >
        <div className="hr-card p-5 sm:p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{schoolName}</p>
              <h2 className="mt-1 text-xl font-extrabold text-navy">Class QR Codes</h2>
              <p className="mt-1 text-sm text-muted">
                Classes sync automatically from Student Management. Print 1 per A4 or 9 per A4.
              </p>
            </div>
            {rows.length ? (
              <button
                type="button"
                className="btn-primary py-2.5"
                onClick={() => setPrintOpen(true)}
              >
                <Printer size={16} /> Open print studio
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
              <Loader2 size={18} className="animate-spin" />
              Loading classes…
            </div>
          ) : !rows.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-slate-50/80 px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/5 text-navy/40">
                <QrCode size={32} />
              </div>
              <p className="mt-4 text-lg font-bold text-navy">No classes yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Add classes in Student Management, then open this page again — they sync automatically.
              </p>
              <button
                type="button"
                className="btn-secondary mt-6 py-2.5"
                disabled={loading}
                onClick={() => void load()}
              >
                <RefreshCw size={16} /> Try again
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((row) => {
                const label = row.classLabel ?? row.name;
                return (
                  <article
                    key={row.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                  >
                    <div className="border-b border-border/60 bg-gradient-to-b from-slate-50 to-white px-4 py-4 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {schoolName}
                      </p>
                      <p className="mt-1 truncate text-lg font-extrabold text-navy">{label}</p>
                      <code className="mt-1.5 inline-block rounded-md bg-navy/5 px-2.5 py-1 font-mono text-[11px] font-semibold text-navy/80">
                        {row.qrCode}
                      </code>
                    </div>
                    <div className="flex flex-1 flex-col items-center px-4 py-5">
                      <div className="rounded-2xl border border-border bg-white p-3 shadow-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={classQrImageUrl(row.qrCode, 320)}
                          alt={`QR for ${label}`}
                          width={200}
                          height={200}
                          className="h-[200px] w-[200px] rounded-xl object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-secondary mt-4 w-full py-2 text-xs"
                        onClick={() => downloadQr(row)}
                      >
                        <Download size={14} /> Download PNG
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </HrPageLayout>

      <ClassQrPrintDrawer
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        schoolName={schoolName}
        rows={rows}
      />
    </>
  );
}
