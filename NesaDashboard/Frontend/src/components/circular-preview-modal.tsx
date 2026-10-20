'use client';

import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { nesaApi } from '@/services/nesa-api';

interface CircularPreviewModalProps {
  circularId: string | null;
  title?: string;
  onClose: () => void;
}

export function CircularPreviewModal({ circularId, title, onClose }: CircularPreviewModalProps) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!circularId) {
      setHtml('');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const doc = await nesaApi.getPrintHtml(circularId);
        if (!cancelled) setHtml(doc);
      } catch (err) {
        if (!cancelled) {
          setHtml('');
          setError(
            (err as { response?: { data?: { message?: string } } | string })?.response &&
              typeof (err as { response?: { data?: unknown } }).response?.data === 'string'
              ? 'Failed to load print preview'
              : ((err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Failed to load circular preview from BabyeyiWizard')
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [circularId]);

  if (!circularId) return null;

  function printDoc() {
    const frame = document.getElementById('nesa-circular-preview-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-[2px]">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-navy/10 px-5 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy/40">
              View &amp; Print
            </p>
            <h3 className="text-sm font-bold text-navy">{title ?? 'Official circular'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={printDoc}
              disabled={!html || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40"
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-navy/10 p-2 text-navy hover:bg-navy/[0.04]"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-[#f5f5f7]">
          {loading ? (
            <p className="p-8 text-center text-sm text-navy/45">Loading official document…</p>
          ) : error ? (
            <p className="p-8 text-center text-sm text-danger">{error}</p>
          ) : (
            <iframe
              id="nesa-circular-preview-frame"
              title="Circular preview"
              className="h-full w-full border-0 bg-white"
              srcDoc={html}
            />
          )}
        </div>
      </div>
    </div>
  );
}
