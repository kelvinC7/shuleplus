import { useEffect, useState } from 'react';
import { Calendar, ExternalLink, FileText, Loader2, ShieldCheck, X } from 'lucide-react';
import { govApi } from '@/services/api';

export type GovTripDocument = {
  id?: string;
  documentType: string;
  fileName?: string | null;
  storageKey?: string | null;
  verificationStatus?: string;
  reviewerComment?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  VERIFIED: 'bg-emerald-100 text-emerald-800',
  NOT_REVIEWED: 'bg-slate-100 text-slate-700',
  MISSING: 'bg-red-100 text-red-800',
  INVALID: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-amber-100 text-amber-900',
  CORRECTION_REQUIRED: 'bg-amber-100 text-amber-900',
};

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').toLowerCase();
}

export function GovTripDocumentsGrid({ tripId, documents }: { tripId: string; documents: GovTripDocument[] }) {
  const [preview, setPreview] = useState<GovTripDocument | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setBlobUrl(null);
      setLoadError(null);
      if (!preview?.id || !preview.storageKey) {
        if (preview && !preview.storageKey) {
          setLoadError(
            'Only the file name was saved — the school must re-upload this document in the trip wizard (Documents step) after the latest update.'
          );
        }
        return;
      }
      setLoadingFile(true);
      try {
        const { data } = await govApi.get<Blob>(
          `/government/applications/${tripId}/documents/${preview.id}/file`,
          { responseType: 'blob' }
        );
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setBlobUrl(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Could not load file. Ask the school to upload again.'
          );
        }
      } finally {
        if (!cancelled) setLoadingFile(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [preview, tripId]);

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        No documents registered on this application yet.
      </div>
    );
  }

  const isPdf = preview?.fileName?.toLowerCase().endsWith('.pdf');

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {documents.map((doc, idx) => {
          const status = doc.verificationStatus ?? 'NOT_REVIEWED';
          const hasFile = Boolean(doc.storageKey);
          return (
            <button
              key={doc.id ?? `${doc.documentType}-${idx}`}
              type="button"
              onClick={() => setPreview(doc)}
              className="flex flex-col rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:border-[#FCB038]/60 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#000435]/5 text-[#000435]">
                  <FileText className="h-5 w-5" />
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[status] ?? STATUS_STYLE.NOT_REVIEWED}`}
                >
                  {formatStatus(status)}
                </span>
              </div>
              <p className="mt-3 text-sm font-bold text-navy">{doc.documentType}</p>
              <p className="mt-1 truncate text-xs text-slate-600">{doc.fileName ?? 'No file name'}</p>
              <p className="mt-3 text-xs font-semibold text-[#FCB038]">
                {hasFile ? 'Tap to view file' : 'Metadata only — re-upload required'}
              </p>
            </button>
          );
        })}
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-bold text-navy">Document evidence</p>
              <button type="button" onClick={() => setPreview(null)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4 sm:p-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Type</p>
                <p className="mt-1 font-semibold text-navy">{preview.documentType}</p>
                <p className="mt-1 text-sm text-slate-600">{preview.fileName}</p>
              </div>

              {loadingFile ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FCB038]" />
                </div>
              ) : loadError ? (
                <p className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-950">{loadError}</p>
              ) : blobUrl ? (
                <div className="overflow-hidden rounded-xl border border-line bg-slate-100">
                  {isPdf ? (
                    <iframe title={preview.fileName ?? 'Document'} src={blobUrl} className="h-[min(60vh,520px)] w-full" />
                  ) : (
                    <img src={blobUrl} alt={preview.fileName ?? 'Document'} className="max-h-[60vh] w-full object-contain" />
                  )}
                  <a
                    href={blobUrl}
                    download={preview.fileName ?? 'document'}
                    className="flex items-center justify-center gap-2 border-t border-line bg-white py-3 text-sm font-bold text-navy hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" /> Download / open in new tab
                  </a>
                </div>
              ) : null}

              {(preview.issueDate || preview.expiryDate) && (
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                  {preview.issueDate ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Issued {new Date(preview.issueDate).toLocaleDateString()}
                    </span>
                  ) : null}
                  {preview.expiryDate ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Expires {new Date(preview.expiryDate).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
              )}
              {preview.reviewerComment ? (
                <div className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p>{preview.reviewerComment}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
