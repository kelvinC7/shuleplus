'use client';

import { FileText, Download } from 'lucide-react';
import type { SchoolTrip } from '@/types/shuletrip';
import { downloadTripDocumentPdf } from '@/utils/download-trip-pdfs';

export function TripDocumentsPanel({ trip }: { trip: SchoolTrip }) {
  const docs = trip.documents ?? [];

  return (
    <div className="grid gap-2">
      {docs.map((doc) => (
        <button
          key={doc.id}
          type="button"
          onClick={() => downloadTripDocumentPdf(trip, doc.kind)}
          className="hr-card flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold text-[var(--yo-navy)] transition hover:bg-white active:scale-[0.99]"
        >
          <span className="flex items-center gap-2">
            <FileText className="size-4 text-[var(--yo-amber)]" />
            {doc.title}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--yo-muted)]">
            <Download className="size-3.5" /> PDF
          </span>
        </button>
      ))}
    </div>
  );
}
