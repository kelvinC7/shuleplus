'use client';

import { useEffect, useMemo, useState } from 'react';
import { preloadIdPhotoBackgroundModel } from '@shuleplus/id-photo-browser';
import { buildPayloadFromRecord } from '@/lib/card-payload';
import { downloadA4PdfFromCardImages } from '@/lib/export-a4-pdf';
import { renderSmartCardToCanvas } from '@/lib/smart-card-renderer';
import { captureTokenFromUrl, getToken } from '@/shared/auth-token';
import { fetchSchools, fetchStudents, type CardRecord, type PrintCardSchool } from '@/services/print-card-api';

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function markExport(status: 'done' | 'error', message?: string) {
  if (typeof document !== 'undefined') {
    document.body.dataset.exportStatus = status;
    if (message) document.body.dataset.exportMessage = message;
  }
}

export default function SheetExportPage() {
  const params = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const organizationId = params.get('organizationId') ?? '';
  const cardRecordIdsParam = params.get('cardRecordIds') ?? '';
  const cardRecordIds = parseIds(cardRecordIdsParam);
  const batchNumber = params.get('batchNumber') ?? 'PB-DRAFT';
  const batchFileIndex = params.get('batchFileIndex') ?? '1';
  const auto = params.get('auto') === '1';

  const [status, setStatus] = useState('Waiting…');
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    captureTokenFromUrl();
  }, []);

  useEffect(() => {
    if (!auto) return;

    let cancelled = false;

    async function run() {
      try {
        if (!getToken()) {
          throw new Error('Missing ?token= in URL (Print Card API bearer token).');
        }
        if (!organizationId || cardRecordIds.length === 0) {
          throw new Error('Missing organizationId or cardRecordIds query parameters.');
        }

        setStatus('Loading school…');
        const schools = await fetchSchools();
        const school: PrintCardSchool | undefined = schools.find((s) => s.id === organizationId);
        if (!school) {
          throw new Error(`School not found for organizationId=${organizationId}`);
        }

        setStatus('Loading student card records…');
        const allCards = await fetchStudents(organizationId, { hasPhoto: 'true' });
        const byId = new Map<string, CardRecord>(allCards.map((c) => [c.id, c]));
        const ordered: CardRecord[] = [];
        for (const id of cardRecordIds) {
          const rec = byId.get(id);
          if (!rec) throw new Error(`Card record not found: ${id}`);
          ordered.push(rec);
        }

        setStatus('Preparing ID photo model…');
        await preloadIdPhotoBackgroundModel();

        const images: string[] = [];
        for (let i = 0; i < ordered.length; i += 1) {
          if (cancelled) return;
          setStatus(`Rendering card ${i + 1} / ${ordered.length}…`);
          const payload = buildPayloadFromRecord(ordered[i]!, 'STUDENT', school);
          const canvas = await renderSmartCardToCanvas(payload);
          images.push(canvas.toDataURL('image/png'));
        }

        const filename = `Print Cards ${batchNumber} batch-${batchFileIndex}.pdf`;
        setStatus(`Saving ${filename}…`);
        downloadA4PdfFromCardImages(filename, images, '3x3');

        markExport('done');
        setStatus(`Done — ${filename}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Export failed';
        setExportError(message);
        markExport('error', message);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [auto, organizationId, cardRecordIdsParam, batchNumber, batchFileIndex]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-lg rounded-2xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold text-navy">Print sheet export</h1>
        <p className="mt-3 text-sm text-muted">{status}</p>
        {exportError && <p className="mt-2 text-sm text-red-600">{exportError}</p>}
        {!auto && (
          <p className="mt-4 text-xs text-muted">
            Add <code className="rounded bg-slate-100 px-1">auto=1</code> to start export automatically.
          </p>
        )}
      </div>
    </div>
  );
}
