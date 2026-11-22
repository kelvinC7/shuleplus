import { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Trash2, Upload } from 'lucide-react';
import { cn } from '@/shared/cn';

export type UploadedFileMeta = {
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export function FileUploadZone({
  label,
  required,
  hint,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  accept?: string;
  value: UploadedFileMeta | null;
  onChange: (file: UploadedFileMeta | null, rawFile?: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function pickFile(file: File | null) {
    if (!file) {
      onChange(null);
      return;
    }
    onChange(
      {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      },
      file
    );
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {label}
            {required ? <span className="ml-1 text-red-500">*</span> : null}
          </p>
          {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {value ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Attached
          </span>
        ) : required ? (
          <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber-900">Required</span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Optional</span>
        )}
      </div>

      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-emerald-700 shadow-sm">
            <FileUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{value.fileName}</p>
            <p className="text-xs text-slate-500">{formatSize(value.fileSize)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600"
            aria-label="Remove file"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition',
            dragOver ? 'border-amber bg-amber-soft/50' : 'border-line bg-slate-50/80 hover:border-amber/50 hover:bg-amber-soft/30'
          )}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm">
            <Upload className="h-6 w-6 text-navy" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Drop file here or click to browse</p>
          <p className="text-xs text-slate-500">PDF, Word, or image up to 10 MB</p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
