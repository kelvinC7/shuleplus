'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CheckCircle2, Download, Minus, Plus, X } from 'lucide-react';
import { REPORT_A4_WIDTH_PX } from '@/lib/report-a4';
import ModernStudentReportCard from '@/components/report-card/modern-student-report-card';
import MidTermStudentReportCard from '@/components/report-card/mid-term-student-report-card';
import type { ReportCardDataV2 } from '@/types/report-card';
import { downloadReportPdf } from '@/lib/report-document';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  report: ReportCardDataV2 | null;
  onClose: () => void;
  subtitle?: string;
};

export function ReportCardViewerModal({ open, report, onClose, subtitle }: Props) {
  const docRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('report-viewer-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('report-viewer-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  /** Fit A4 width on narrow phones (independent of user zoom slider). */
  const [viewportFit, setViewportFit] = useState(1);
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const pad = 24;
      const w = Math.max(280, window.innerWidth - pad);
      setViewportFit(Math.min(1, w / REPORT_A4_WIDTH_PX));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open]);

  useEffect(() => {
    if (open) setZoom(100);
  }, [open, report?.meta?.reportNumber]);

  const fileName = report
    ? `report-${[report.student?.firstName, report.student?.lastName].filter(Boolean).join('_') || 'student'}-${report.academicYear}.pdf`
    : 'report.pdf';

  const handleDownload = useCallback(async () => {
    if (!docRef.current || !report) return;
    setBusy(true);
    try {
      await downloadReportPdf(docRef.current, fileName);
      toast.success('Report downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  }, [report, fileName]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !report || !mounted) return null;

  const scale = (viewportFit * zoom) / 100;

  const studentName =
    [report.student?.firstName, report.student?.lastName].filter(Boolean).join(' ') || 'Student';
  const termLine =
    subtitle || [report.term, report.academicYear].filter(Boolean).join(' · ') || 'Report card';

  return createPortal(
    <div className="report-viewer-modal no-print-backdrop fixed inset-0 z-[9999] flex flex-col bg-[#1a1a1a]">
      <header className="no-print flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-[#1e1e1e] px-2 py-2 text-white sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to reports</span>
          <span className="sm:hidden">Back</span>
        </button>

        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {studentName}
          <span className="hidden font-normal text-white/70 sm:inline"> · {termLine}</span>
        </p>

        <div className="hidden items-center gap-1 md:flex">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white/10"
            onClick={() => setZoom((z) => Math.max(60, z - 10))}
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={60}
            max={140}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 w-24 accent-[#fcb038]"
            aria-label="Zoom"
          />
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white/10"
            onClick={() => setZoom((z) => Math.min(140, z + 10))}
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDownload()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#fcb038] px-4 py-2 text-sm font-extrabold text-[#000435] shadow-sm transition hover:bg-[#e5a032] disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>

        <span className="hidden items-center gap-1 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-bold text-white sm:inline-flex">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Published
        </span>

        <button type="button" className="rounded-lg p-2 hover:bg-white/10" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 justify-center overflow-x-hidden overflow-y-auto px-2 py-4 sm:px-6 sm:py-6">
        <div
          className="report-card-page mx-auto w-full max-w-[794px] transition-transform duration-150"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: REPORT_A4_WIDTH_PX,
            maxWidth: '100%',
          }}
        >
          {report.reportKind === 'midterm' || report.reportKind === 'beginning' ? (
            <MidTermStudentReportCard report={report} documentRef={docRef} />
          ) : (
            <ModernStudentReportCard report={report} documentRef={docRef} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
