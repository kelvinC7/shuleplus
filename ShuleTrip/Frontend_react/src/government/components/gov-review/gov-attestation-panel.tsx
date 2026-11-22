import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, PenLine, Stamp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ImageAttestationSlot({
  label,
  hint,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  icon: typeof PenLine;
  value: File | null;
  onChange: (file: File | null) => void;
}) {
  const preview = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-gradient-to-b from-white to-slate-50/80 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#000435]/5 text-[#000435]">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold text-navy">{label}</p>
            <p className="text-[10px] text-slate-500">{hint}</p>
          </div>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <label className="mt-3 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#FCB038]/40 bg-white/90 px-3 py-4 transition hover:border-[#FCB038] hover:bg-amber-50/30">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <img src={preview} alt={label} className="max-h-28 w-full object-contain" />
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-[#FCB038]" />
            <span className="mt-2 text-center text-xs font-bold text-navy">Tap to upload image</span>
            <span className="mt-0.5 text-[10px] text-slate-500">PNG, JPG, or WebP · max 5 MB</span>
          </>
        )}
      </label>
      {value ? (
        <p className="mt-2 truncate text-[10px] font-semibold text-slate-600">{value.name}</p>
      ) : null}
    </div>
  );
}

export function GovAttestationPanel({
  signatureName,
  onSignatureNameChange,
  reason,
  onReasonChange,
  deadline,
  onDeadlineChange,
  busy,
  approveLabel,
  message,
  onApprove,
  onRequestCorrections,
  onReject,
}: {
  signatureName: string;
  onSignatureNameChange: (v: string) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  deadline: string;
  onDeadlineChange: (v: string) => void;
  busy: boolean;
  approveLabel: string;
  message: string | null;
  onApprove: (files: { signature: File; stamp: File }) => void;
  onRequestCorrections: () => void;
  onReject: () => void;
}) {
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);

  function tryApprove() {
    if (!signatureFile || !stampFile) return;
    onApprove({ signature: signatureFile, stamp: stampFile });
  }

  const canApprove = signatureName.trim().length >= 2 && reason.trim().length >= 3 && signatureFile && stampFile;

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Official attestation</h3>
      <p className="mt-1 text-xs text-slate-600">
        Upload your scanned signature and office stamp. They are stored on the file and visible at later gates.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ImageAttestationSlot
          label="Signature image"
          hint="Clear scan or photo on white background"
          icon={PenLine}
          value={signatureFile}
          onChange={setSignatureFile}
        />
        <ImageAttestationSlot
          label="Official stamp"
          hint="District / sector seal image"
          icon={Stamp}
          value={stampFile}
          onChange={setStampFile}
        />
      </div>

      <label className="mt-4 block text-xs font-semibold text-slate-600">
        Name as on signature
        <input
          className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-base font-serif italic text-[#000435]"
          value={signatureName}
          onChange={(e) => onSignatureNameChange(e.target.value)}
          placeholder="Full legal name"
        />
      </label>

      <label className="mt-3 block text-xs font-semibold text-slate-600">
        Decision notes
        <textarea
          className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
          rows={4}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Reason for approval, corrections, or rejection…"
        />
      </label>

      <label className="mt-2 block text-xs font-semibold text-slate-600">
        Correction deadline (if returning to school)
        <input
          type="date"
          className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
          value={deadline}
          onChange={(e) => onDeadlineChange(e.target.value)}
        />
      </label>

      <div className="mt-4 flex flex-col gap-2">
        <Button variant="amber" disabled={busy || !canApprove} onClick={tryApprove}>
          {approveLabel}
        </Button>
        {!signatureFile || !stampFile ? (
          <p className="text-center text-[10px] font-semibold text-amber-800">Both signature and stamp images are required to approve.</p>
        ) : null}
        <Button variant="outline" disabled={busy} onClick={onRequestCorrections}>
          Return for corrections
        </Button>
        <Button variant="danger" disabled={busy} onClick={onReject}>
          Reject
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
    </div>
  );
}
