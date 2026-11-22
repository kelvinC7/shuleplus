'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Upload } from 'lucide-react';
import { curriculumAdminApi, type EducationLevelConfig } from '@/lib/curriculum-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { CurriculumPageShell } from './curriculum-page-shell';

const STEPS = ['Book information', 'Upload PDF', 'Extraction options', 'Confirm'];

const DOC_TYPES = [
  { id: 'teachers_guide', label: "Teacher's Guide" },
  { id: 'pupils_book', label: "Pupil's Book" },
  { id: 'syllabus', label: 'Syllabus / Curriculum Framework' },
  { id: 'other', label: 'Other curriculum document' },
];

export function AddCurriculumWizard() {
  const toast = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [levels, setLevels] = useState<EducationLevelConfig[]>([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [companionFile, setCompanionFile] = useState<File | null>(null);
  const [uploadPair, setUploadPair] = useState(true);

  const [form, setForm] = useState({
    title: '',
    educationLevel: 'primary',
    grade: 'P5',
    subject: '',
    documentType: 'teachers_guide',
    language: 'English',
    publisher: 'REB',
    curriculumVersion: 'CBC',
    academicYear: '2025',
    publicationYear: '2025',
    sourceUrl: 'https://elearning.reb.rw/',
    description: '',
    extractTextFirst: true,
    ocrScannedPages: true,
    preservePageRefs: true,
  });

  useEffect(() => {
    curriculumAdminApi.getEducationLevels().then(setLevels).catch(() => setLevels([]));
  }, []);

  const grades = useMemo(() => {
    return levels.find((l) => l.id === form.educationLevel)?.grades ?? [];
  }, [levels, form.educationLevel]);

  useEffect(() => {
    if (grades.length && !grades.some((g) => g.id === form.grade)) {
      setForm((f) => ({ ...f, grade: grades[0].id }));
    }
  }, [grades, form.grade]);

  const onLevelChange = (educationLevel: string) => {
    const g = levels.find((l) => l.id === educationLevel)?.grades[0]?.id ?? '';
    setForm((f) => ({ ...f, educationLevel, grade: g }));
  };

  const canContinue = () => {
    if (step === 0) return form.title.trim().length >= 3 && form.subject.trim().length >= 2;
    if (step === 1) return Boolean(file && file.type === 'application/pdf');
    return true;
  };

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (uploadPair && companionFile) {
        fd.append('companionFile', companionFile);
      }
      fd.append('title', form.title);
      fd.append('subject', form.subject);
      fd.append('grade', form.grade);
      fd.append('language', form.language);
      fd.append('educationLevel', form.educationLevel);
      fd.append('documentType', form.documentType);
      fd.append('publisher', form.publisher);
      fd.append('description', form.description);
      fd.append('curriculumVersion', form.curriculumVersion);
      fd.append('academicYear', form.academicYear);
      fd.append('publicationYear', form.publicationYear);
      fd.append('sourceUrl', form.sourceUrl);
      fd.append(
        'extractionOptions',
        JSON.stringify({
          extractTextFirst: form.extractTextFirst,
          ocrScannedPages: form.ocrScannedPages,
          preservePageRefs: form.preservePageRefs,
        })
      );
      const result = await curriculumAdminApi.uploadBook(fd);
      toast.success('Book uploaded — extraction queued (not published until review)');
      router.push(`/super-admin/curriculum/review/${result.book.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const levelLabel = levels.find((l) => l.id === form.educationLevel)?.label ?? form.educationLevel;

  return (
    <CurriculumPageShell title="Add Curriculum Book" subtitle={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-semibold ${i <= step ? 'bg-[#000435] text-white' : 'bg-slate-100 text-slate-500'}`}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Book title">
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Education level">
                  <select className={inputCls} value={form.educationLevel} onChange={(e) => onLevelChange(e.target.value)}>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Class / grade">
                  <select className={inputCls} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="text-xs text-slate-500">Selected: {levelLabel} · {form.grade}</p>
              <Field label="Subject / course">
                <input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Mathematics" />
              </Field>
              <Field label="Document type">
                <select className={inputCls} value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
                  {DOC_TYPES.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Language">
                <input className={inputCls} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm">
                <input
                  type="checkbox"
                  checked={uploadPair}
                  onChange={(e) => {
                    setUploadPair(e.target.checked);
                    if (!e.target.checked) setCompanionFile(null);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-[#000435]">Upload Teacher&apos;s Guide + Pupil&apos;s Book together</span>
                  <span className="mt-1 block text-xs text-slate-600">
                    Both PDFs are extracted and merged so lesson plans use TG procedures, tools, and PB activities.
                  </span>
                </span>
              </label>

              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <Upload className="text-[#FCB038]" size={36} />
                <p className="mt-3 font-medium text-[#000435]">
                  {form.documentType === 'pupils_book' ? "Pupil's Book (PB)" : "Teacher's Guide (TG)"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Max 80 MB · PDF only</p>
                <input
                  type="file"
                  accept="application/pdf"
                  className="mt-4 text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <p className="mt-2 text-sm text-emerald-700">
                    {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  </p>
                ) : null}
              </div>

              {uploadPair ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#FCB038]/40 bg-amber-50/50 px-6 py-10 text-center">
                  <Upload className="text-[#000435]" size={36} />
                  <p className="mt-3 font-medium text-[#000435]">
                    {form.documentType === 'pupils_book' ? "Teacher's Guide (TG)" : "Pupil's Book (PB)"}
                  </p>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="mt-4 text-sm"
                    onChange={(e) => setCompanionFile(e.target.files?.[0] ?? null)}
                  />
                  {companionFile ? (
                    <p className="mt-2 text-sm text-emerald-700">
                      {companionFile.name} ({(companionFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Recommended for intelligent lesson plans</p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 text-sm">
              <Toggle label="Extract embedded text before OCR" checked={form.extractTextFirst} onChange={(v) => setForm({ ...form, extractTextFirst: v })} />
              <Toggle label="OCR only scanned / unreadable pages" checked={form.ocrScannedPages} onChange={(v) => setForm({ ...form, ocrScannedPages: v })} />
              <Toggle label="Preserve source page references" checked={form.preservePageRefs} onChange={(v) => setForm({ ...form, preservePageRefs: v })} />
              <p className="text-xs text-amber-800 pt-2">
                v2 extraction parses units, objectives, materials, tools, and requirements from TG/PB structure. Extraction runs in the background — track progress under AI Processing Jobs.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 text-sm">
              <Row k="Title" v={form.title} />
              <Row k="Level / class" v={`${levelLabel} · ${form.grade}`} />
              <Row k="Subject" v={form.subject} />
              <Row k="Document" v={DOC_TYPES.find((d) => d.id === form.documentType)?.label ?? form.documentType} />
              <Row k="Primary PDF" v={file?.name ?? '—'} />
              {uploadPair ? <Row k="Companion PDF" v={companionFile?.name ?? '— (single upload)'} /> : null}
              <p className="pt-3 text-xs text-slate-600">Upload creates a book in <strong>Uploaded / Extracting</strong> state — not published to teachers until you review and publish.</p>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button type="button" disabled={step === 0 || uploading} className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" disabled={!canContinue()} className="rounded-lg px-4 py-2 text-sm font-bold text-[#000435] disabled:opacity-40" style={{ background: '#FCB038' }} onClick={() => setStep((s) => s + 1)}>
                Continue
              </button>
            ) : (
              <button type="button" disabled={uploading || !file} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#000435] disabled:opacity-40" style={{ background: '#FCB038' }} onClick={() => void submit()}>
                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Upload & start extraction
              </button>
            )}
          </div>
        </div>
      </div>
    </CurriculumPageShell>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-slate-50 py-1">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-[#000435]">{v}</span>
    </div>
  );
}
