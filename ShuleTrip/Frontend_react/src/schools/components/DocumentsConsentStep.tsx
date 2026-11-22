import { useState } from 'react';
import { CheckCircle2, Clock, IdCard, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import { FileUploadZone, type UploadedFileMeta } from '@/components/ui/file-upload';
import { api } from '@/services/api';
import type { ManifestSelection } from '@/schools/components/StudentManifestStep';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/cn';
import { DRIVER_LICENSE_DOC_TYPE, TRIP_DOC_TYPES } from '@/schools/config/trip-documents';

export { TRIP_DOC_TYPES } from '@/schools/config/trip-documents';

export type TripDocumentEntry = {
  documentType: string;
  fileName: string;
  fileSize?: number;
  id?: string;
  storageKey?: string | null;
};

export function DocumentsConsentStep({
  tripId,
  onEnsureDraft,
  documents,
  onDocumentsChange,
  participants,
  onRefreshConsent,
  refreshingConsent,
  driverName,
  driverLicenseCategory,
  driverLicenseNumber,
}: {
  tripId?: string | null;
  onEnsureDraft?: () => Promise<string>;
  documents: TripDocumentEntry[];
  onDocumentsChange: (next: TripDocumentEntry[]) => void;
  participants: ManifestSelection[];
  onRefreshConsent?: () => void | Promise<void>;
  refreshingConsent?: boolean;
  driverName?: string;
  driverLicenseCategory?: string;
  driverLicenseNumber?: string;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  function fileFor(type: string): UploadedFileMeta | null {
    const doc =
      type === DRIVER_LICENSE_DOC_TYPE
        ? documents.find(
            (d) => d.documentType === type || d.documentType === 'Driver license copy'
          )
        : documents.find((d) => d.documentType === type);
    if (!doc?.fileName) return null;
    return {
      fileName: doc.fileName,
      fileSize: doc.fileSize ?? 0,
      mimeType: 'application/octet-stream',
    };
  }

  async function setFile(type: string, meta: UploadedFileMeta | null, rawFile?: File | null) {
    setUploadError(null);
    if (!meta || !rawFile) {
      onDocumentsChange(documents.filter((d) => d.documentType !== type));
      return;
    }

    setUploading(type);
    try {
      let activeTripId = tripId;
      if (!activeTripId && onEnsureDraft) {
        activeTripId = await onEnsureDraft();
      }
      if (!activeTripId) {
        onDocumentsChange([
          ...documents.filter((d) => d.documentType !== type),
          { documentType: type, fileName: meta.fileName, fileSize: meta.fileSize },
        ]);
        setUploadError('Could not start a draft for upload. Complete trip title and try again, or submit from Review.');
        return;
      }

      const form = new FormData();
      form.append('documentType', type);
      form.append('file', rawFile);
      const { data } = await api.post<{
        data: { id: string; documentType: string; fileName: string | null; storageKey: string | null };
      }>(`/trips/${activeTripId}/documents/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const doc = data.data;
      onDocumentsChange([
        ...documents.filter((d) => d.documentType !== type),
        {
          documentType: type,
          fileName: doc.fileName ?? meta.fileName,
          fileSize: meta.fileSize,
          id: doc.id,
          storageKey: doc.storageKey,
        },
      ]);
    } catch (e) {
      setUploadError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed'
      );
    } finally {
      setUploading(null);
    }
  }

  const consentCount = participants.filter((p) => p.guardianConsent).length;
  const allConsented = participants.length > 0 && consentCount === participants.length;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-bold text-navy">Required documents</h3>
        <p className="mt-1 text-sm text-slate-600">
          Files are uploaded to ShuleTrip storage and can be opened by government reviewers.
        </p>
        {uploadError ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">{uploadError}</p> : null}
        {driverName?.trim() && driverLicenseNumber?.trim() ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-navy/15 bg-navy/5 px-4 py-3">
            <IdCard className="mt-0.5 h-5 w-5 shrink-0 text-navy" />
            <p className="text-sm text-slate-700">
              Upload the license for <strong className="text-navy">{driverName}</strong>
              {driverLicenseCategory ? (
                <>
                  {' '}
                  · category <strong className="font-mono text-navy">{driverLicenseCategory}</strong>
                </>
              ) : null}{' '}
              · no. <strong className="font-mono text-navy">{driverLicenseNumber}</strong>
            </p>
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {TRIP_DOC_TYPES.map(({ type, hint, required }) => (
            <div
              key={type}
              className={
                uploading === type
                  ? 'opacity-60'
                  : type === DRIVER_LICENSE_DOC_TYPE
                    ? 'rounded-2xl ring-2 ring-navy/10 ring-offset-2'
                    : ''
              }
            >
              <FileUploadZone
                label={type}
                hint={hint}
                required={required}
                value={fileFor(type)}
                onChange={(f, raw) => setFile(type, f, raw)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-slate-50/50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-navy">Guardian consent</h3>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              View only — submit the trip first; parents then receive it in <strong className="text-navy">ParentMIS</strong>{' '}
              and approve using the guardian phone on the manifest. Use refresh to see updates.
            </p>
          </div>
          {onRefreshConsent ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2 text-xs"
              disabled={refreshingConsent || !tripId}
              onClick={() => void onRefreshConsent()}
            >
              {refreshingConsent ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh status
            </Button>
          ) : null}
        </div>

        <div
          className={cn(
            'mt-4 flex items-center gap-3 rounded-xl border px-4 py-3',
            allConsented ? 'border-emerald-200 bg-emerald-50/90' : 'border-amber/30 bg-amber-soft/80'
          )}
        >
          {allConsented ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <Smartphone className="h-5 w-5 shrink-0 text-amber-900" />
          )}
          <p className="text-sm font-semibold text-slate-800">
            {consentCount}/{participants.length} learners with parent approval
            {allConsented ? ' — all consents received' : ' — submit trip to notify parents in ParentMIS'}
          </p>
        </div>

        <ul className="mt-4 max-h-72 space-y-2 overflow-auto">
          {participants.length === 0 ? (
            <li className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-slate-500">
              Add learners on the manifest step first.
            </li>
          ) : (
            participants.map((p) => (
              <li
                key={p.studentId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{p.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {p.classLabel ?? 'Class n/a'}
                    {p.guardianPhone ? ` · ${p.guardianPhone}` : ' · No parent phone'}
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
                    p.guardianConsent ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {p.guardianConsent ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approved in ParentMIS
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" /> Awaiting parent
                    </>
                  )}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
