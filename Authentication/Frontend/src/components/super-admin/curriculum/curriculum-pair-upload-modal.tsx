'use client';

import { useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { curriculumAdminApi } from '@/lib/curriculum-admin-api';

type Props = {
  bookId: string;
  bookTitle: string;
  hasCompanion: boolean;
  companionTitle?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function CurriculumPairUploadModal({
  bookId,
  bookTitle,
  hasCompanion,
  companionTitle,
  onClose,
  onSuccess,
}: Props) {
  const [tgFile, setTgFile] = useState<File | null>(null);
  const [pbFile, setPbFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!tgFile && !pbFile) {
      setError('Choose at least one PDF to upload.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      if (tgFile) fd.append('teachersGuideFile', tgFile);
      if (pbFile) fd.append('pupilsBookFile', pbFile);
      await curriculumAdminApi.uploadCurriculumPair(bookId, fd);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000435]/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-labelledby="pair-upload-title"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="pair-upload-title" className="text-lg font-bold text-[#000435]">
              Teacher&apos;s Guide &amp; Pupil&apos;s Book
            </h2>
            <p className="mt-1 text-xs text-slate-500">{bookTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm">
          <p className="text-slate-600">
            Upload missing PDFs or replace files. Extraction runs in the background; PB content is merged into TG
            lessons for lesson planning.
          </p>

          <UploadSlot
            label="Teacher's Guide (TG)"
            hint="Optional — only if you need to replace the current TG PDF"
            file={tgFile}
            onPick={setTgFile}
          />

          <UploadSlot
            label="Pupil's Book (PB)"
            hint={
              hasCompanion
                ? `Replace linked book${companionTitle ? `: ${companionTitle}` : ''}`
                : 'Required for tools, requirements, and activity alignment'
            }
            file={pbFile}
            onPick={setPbFile}
            emphasized={!hasCompanion}
          />

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[#000435] disabled:opacity-50"
            style={{ background: '#FCB038' }}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload &amp; extract
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadSlot({
  label,
  hint,
  file,
  onPick,
  emphasized,
}: {
  label: string;
  hint: string;
  file: File | null;
  onPick: (f: File | null) => void;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed px-4 py-4 ${
        emphasized ? 'border-[#FCB038] bg-amber-50/50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[#000435]">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      <input
        type="file"
        accept="application/pdf"
        className="mt-3 block w-full text-xs"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">
          {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
        </p>
      ) : null}
    </div>
  );
}
