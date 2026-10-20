'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Minus, Plus, Printer, X } from 'lucide-react';
import ModernStudentReportCard from '@/components/report-card/modern-student-report-card';
import type { ReportCardDataV2 } from '@/types/report-card';
import { downloadReportPdf, printReportPdf } from '@/lib/report-document';

type Props = {
  open: boolean;
  report: ReportCardDataV2 | null;
  onClose: () => void;
};

export function ReportCardViewerModal({ open, report, onClose }: Props) {
  const docRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const fileName = report
    ? `report-${[report.student?.firstName, report.student?.lastName].filter(Boolean).join('_') || 'student'}-${report.academicYear}.pdf`
    : 'report.pdf';

  const handleDownload = useCallback(async () => {
    if (!docRef.current || !report) return;
    setBusy(true);
    try {
      await downloadReportPdf(docRef.current, fileName);
    } finally {
      setBusy(false);
    }
  }, [report, fileName]);

  const handlePrint = useCallback(async () => {
    if (!docRef.current) return;
    setBusy(true);
    try {
      await printReportPdf(docRef.current);
    } finally {
      setBusy(false);
    }
  }, []);

  if (!open || !report) return null;

  const title = [report.student?.firstName, report.student?.lastName].filter(Boolean).join(' ') || 'Report card';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#404040]">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#323639] px-3 py-2 text-white">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {title} · {report.academicYear} {report.term ? `· ${report.term}` : ''}
        </p>
        <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" onClick={() => setZoom((z) => Math.max(60, z - 10))} aria-label="Zoom out">
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-10 text-right text-xs tabular-nums">{zoom}%</span>
        <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" onClick={() => setZoom((z) => Math.min(140, z + 10))} aria-label="Zoom in">
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" disabled={busy} className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-50" onClick={() => void handleDownload()} title="Download PDF">
          <Download className="h-4 w-4" />
        </button>
        <button type="button" disabled={busy} className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-50" onClick={() => void handlePrint()} title="Print">
          <Printer className="h-4 w-4" />
        </button>
        <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 justify-center overflow-auto px-2 py-6 sm:px-6">
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', width: '100%', maxWidth: 794 }}>
          <ModernStudentReportCard report={report} documentRef={docRef} />
        </div>
      </div>
    </div>
  );
}
