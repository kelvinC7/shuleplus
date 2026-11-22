import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, PenLine, Stamp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/cn';

type DecisionMode = 'approve' | 'corrections' | 'reject';

function ImageSlot({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  icon: typeof PenLine;
  value: File | null;
  onChange: (file: File | null) => void;
}) {
  const preview = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div className="rounded-xl border border-line bg-slate-50/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold text-navy">
          <Icon className="size-4 text-amber-700" />
          {label}
        </span>
        {value ? (
          <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1 text-slate-400 hover:text-red-600" aria-label="Remove">
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <label className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-white px-2 py-3 hover:border-amber/60">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <img src={preview} alt={label} className="max-h-24 w-full object-contain" />
        ) : (
          <>
            <ImagePlus className="size-7 text-amber-600" />
            <span className="mt-1 text-[11px] font-semibold text-slate-600">Upload image</span>
          </>
        )}
      </label>
    </div>
  );
}

const inputCls =
  'mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-navy/30 focus:ring-2 focus:ring-navy/10';

export function GovDecisionModal({
  open,
  onClose,
  mode,
  onModeChange,
  approveLabel,
  signatureName,
  onSignatureNameChange,
  reason,
  onReasonChange,
  deadline,
  onDeadlineChange,
  busy,
  message,
  onSubmitApprove,
  onSubmitCorrections,
  onSubmitReject,
}: {
  open: boolean;
  onClose: () => void;
  mode: DecisionMode;
  onModeChange: (m: DecisionMode) => void;
  approveLabel: string;
  signatureName: string;
  onSignatureNameChange: (v: string) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  deadline: string;
  onDeadlineChange: (v: string) => void;
  busy: boolean;
  message: string | null;
  onSubmitApprove: (files: { signature: File; stamp: File }) => void;
  onSubmitCorrections: () => void;
  onSubmitReject: () => void;
}) {
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setSignatureFile(null);
      setStampFile(null);
    }
  }, [open]);

  if (!open) return null;

  const canApprove =
    mode === 'approve' &&
    signatureName.trim().length >= 2 &&
    reason.trim().length >= 3 &&
    signatureFile &&
    stampFile;

  const canOther = mode !== 'approve' && reason.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-bold text-navy">Official decision</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-line bg-slate-50 p-2">
          {(
            [
              ['approve', 'Approve'],
              ['corrections', 'Corrections'],
              ['reject', 'Reject'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              className={cn(
                'flex-1 rounded-lg py-2 text-xs font-bold sm:text-sm',
                mode === id ? 'bg-navy text-white' : 'text-slate-600 hover:bg-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {mode === 'approve' ? (
            <>
              <p className="text-sm text-slate-600">Upload signature and stamp, then confirm approval for this stage.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <ImageSlot label="Signature" icon={PenLine} value={signatureFile} onChange={setSignatureFile} />
                <ImageSlot label="Stamp" icon={Stamp} value={stampFile} onChange={setStampFile} />
              </div>
              <label className="block text-xs font-semibold text-slate-600">
                Name on signature
                <input className={cn(inputCls, 'font-serif italic')} value={signatureName} onChange={(e) => onSignatureNameChange(e.target.value)} />
              </label>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              {mode === 'corrections'
                ? 'Send the application back to the school with clear instructions.'
                : 'Reject this application. The school will be notified with your reason.'}
            </p>
          )}

          <label className="block text-xs font-semibold text-slate-600">
            Notes / reason <span className="text-red-600">*</span>
            <textarea className={inputCls} rows={3} value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Required (min 3 characters)" />
          </label>

          {mode === 'corrections' ? (
            <label className="block text-xs font-semibold text-slate-600">
              Response deadline
              <input type="date" className={inputCls} value={deadline} onChange={(e) => onDeadlineChange(e.target.value)} />
            </label>
          ) : null}

          {message ? <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">{message}</p> : null}
        </div>

        <div className="border-t border-line p-4">
          {mode === 'approve' ? (
            <Button
              variant="amber"
              className="w-full"
              disabled={busy || !canApprove}
              onClick={() => signatureFile && stampFile && onSubmitApprove({ signature: signatureFile, stamp: stampFile })}
            >
              {approveLabel}
            </Button>
          ) : mode === 'corrections' ? (
            <Button variant="outline" className="w-full" disabled={busy || !canOther} onClick={onSubmitCorrections}>
              Send for corrections
            </Button>
          ) : (
            <Button variant="danger" className="w-full" disabled={busy || !canOther} onClick={onSubmitReject}>
              Reject application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
