import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckSquare, CloudDownload, FileSpreadsheet, PenLine, Search, Square, Upload, Users, X } from 'lucide-react';
import type { SchoolManifestMode } from '@/contexts/school-auth-context';
import { api } from '@/services/api';
import type { SmStudentRow } from '@/schools/types/trip';
import { cn } from '@/shared/cn';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form-field';
import {
  manifestTemplateCsv,
  parseManifestWorkbook,
  type ParsedManifestRow,
} from '@/schools/utils/parse-manifest-spreadsheet';

export type ManifestSelection = {
  studentId: string;
  studentCode: string;
  fullName: string;
  classLabel?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianName?: string;
  gender?: string;
  photoUrl?: string;
  guardianConsent: boolean;
  source?: 'student_management' | 'manual';
};

type ManualTab = 'single' | 'upload';

function newManualId() {
  return `manual-${crypto.randomUUID()}`;
}

function manualCode() {
  return `MNL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function parsedToSelection(row: ParsedManifestRow): ManifestSelection {
  return {
    studentId: newManualId(),
    studentCode: manualCode(),
    fullName: row.fullName,
    classLabel: row.classLabel,
    guardianPhone: row.guardianPhone,
    guardianEmail: row.guardianEmail,
    guardianName: row.guardianName,
    gender: row.gender,
    guardianConsent: false,
    source: 'manual',
  };
}

function mergeSelections(existing: ManifestSelection[], incoming: ManifestSelection[]) {
  const byKey = new Map(existing.map((s) => [s.studentId, s]));
  for (const row of incoming) {
    if (!byKey.has(row.studentId)) byKey.set(row.studentId, row);
  }
  return [...byKey.values()];
}

function SelectedManifestPanel({
  selected,
  onChange,
}: {
  selected: ManifestSelection[];
  onChange: (next: ManifestSelection[]) => void;
}) {
  if (!selected.length) return null;
  return (
    <div className="mt-6 rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-bold text-navy">
          Trip manifest <span className="text-slate-500">({selected.length} learners)</span>
        </p>
        <Button variant="ghost" type="button" className="h-8 px-2 text-xs" onClick={() => onChange([])}>
          Clear all
        </Button>
      </div>
      <div className="max-h-52 overflow-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Learner</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Parent / phone</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {selected.map((s) => (
              <tr key={s.studentId} className="border-t border-line/80">
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-slate-900">{s.fullName}</p>
                  <p className="text-xs text-slate-500">{s.studentCode}</p>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{s.classLabel ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {s.guardianName ? <span className="block text-xs text-slate-500">{s.guardianName}</span> : null}
                  {s.guardianPhone ?? '—'}
                </td>
                <td className="px-2 py-2.5">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove"
                    onClick={() => onChange(selected.filter((x) => x.studentId !== s.studentId))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentManagementSyncPanel({
  selected,
  onChange,
}: {
  selected: ManifestSelection[];
  onChange: (next: ManifestSelection[]) => void;
}) {
  const [students, setStudents] = useState<SmStudentRow[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; label: string }>>([]);
  const [q, setQ] = useState('');
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [smConfigured, setSmConfigured] = useState(true);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.studentId)), [selected]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [stuRes, clsRes] = await Promise.all([
          api.get<{ data: SmStudentRow[]; meta?: { studentManagement?: boolean } }>('/students', {
            params: { q: q || undefined, className: className || undefined },
          }),
          api.get<{ data: Array<{ id: string; label: string }> }>('/classes'),
        ]);
        if (!cancelled) {
          setStudents(stuRes.data.data);
          setSmConfigured(stuRes.data.meta?.studentManagement !== false);
          setClasses(clsRes.data.data ?? []);
        }
      } catch {
        if (!cancelled) setStudents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, className]);

  function rowToSelection(row: SmStudentRow): ManifestSelection {
    const existing = selected.find((s) => s.studentId === row.id);
    return (
      existing ?? {
        studentId: row.id,
        studentCode: row.studentCode,
        fullName: row.fullName,
        classLabel: row.className ?? undefined,
        guardianPhone: row.parentPhone ?? undefined,
        photoUrl: row.photoUrl ?? undefined,
        guardianConsent: false,
        source: 'student_management',
      }
    );
  }

  function toggle(row: SmStudentRow) {
    if (selectedIds.has(row.id)) {
      onChange(selected.filter((s) => s.studentId !== row.id));
      return;
    }
    onChange([...selected, rowToSelection(row)]);
  }

  function selectAllVisible() {
    const merged = new Map(selected.map((s) => [s.studentId, s]));
    for (const row of students) {
      if (!merged.has(row.id)) merged.set(row.id, rowToSelection(row));
    }
    onChange([...merged.values()]);
  }

  function deselectAllVisible() {
    const visible = new Set(students.map((s) => s.id));
    onChange(selected.filter((s) => !visible.has(s.studentId)));
  }

  const visibleSelectedCount = students.filter((s) => selectedIds.has(s.id)).length;
  const allVisibleSelected = students.length > 0 && visibleSelectedCount === students.length;

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-navy/15 bg-navy/5 px-4 py-3 text-sm text-slate-700">
        You opened ShuleTrip from your organization dashboard with the module assigned — learners and classes load
        automatically from Student Management.
      </p>

      {!smConfigured ? (
        <p className="rounded-xl border border-amber/30 bg-amber-soft px-4 py-3 text-sm font-medium text-amber-950">
          Student Management API is not configured on the server. Contact your administrator to set{' '}
          <code className="text-xs">STUDENT_MANAGEMENT_API_URL</code>.
        </p>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-line bg-slate-50/80 p-4 md:grid-cols-[1fr_200px]">
        <Field label="Search learners">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Name or student code…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </Field>
        <Field label="Class">
          <Select value={className} onChange={(e) => setClassName(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.label}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white">
          <Users className="h-3.5 w-3.5" />
          {selected.length} on manifest
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            type="button"
            className="px-3 py-2 text-xs"
            disabled={students.length === 0 || allVisibleSelected}
            onClick={selectAllVisible}
          >
            <CheckSquare className="mr-1 h-4 w-4" />
            Select all shown
          </Button>
          <Button
            variant="outline"
            type="button"
            className="px-3 py-2 text-xs"
            disabled={visibleSelectedCount === 0}
            onClick={deselectAllVisible}
          >
            <Square className="mr-1 h-4 w-4" />
            Deselect shown
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs font-bold uppercase tracking-wide text-slate-500 backdrop-blur">
              <tr>
                <th className="w-12 px-4 py-3" />
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Guardian phone</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Loading from Student Management…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    No active students match your filters.
                  </td>
                </tr>
              ) : (
                students.map((row) => {
                  const on = selectedIds.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'cursor-pointer border-t border-line transition hover:bg-slate-50/80',
                        on && 'bg-amber-soft/50'
                      )}
                      onClick={() => toggle(row)}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'grid h-5 w-5 place-items-center rounded-md border-2',
                            on ? 'border-amber bg-amber text-navy' : 'border-line bg-white'
                          )}
                        >
                          {on ? <CheckSquare className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{row.fullName}</p>
                        <p className="text-xs text-slate-500">{row.studentCode}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.className ?? 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-600">{row.parentPhone ?? 'N/A'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ManualManifestPanel({
  selected,
  onChange,
}: {
  selected: ManifestSelection[];
  onChange: (next: ManifestSelection[]) => void;
}) {
  const [tab, setTab] = useState<ManualTab>('single');
  const [uploadClass, setUploadClass] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<ParsedManifestRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [classLabel, setClassLabel] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');

  function addSingle() {
    const name = fullName.trim();
    const phone = guardianPhone.trim();
    const email = guardianEmail.trim();
    const cls = classLabel.trim();
    if (!name || !phone || !cls) return;
    const row: ManifestSelection = {
      studentId: newManualId(),
      studentCode: manualCode(),
      fullName: name,
      gender: gender.trim() || undefined,
      classLabel: cls,
      guardianName: guardianName.trim() || undefined,
      guardianPhone: phone,
      guardianEmail: email || undefined,
      guardianConsent: false,
      source: 'manual',
    };
    onChange([...selected, row]);
    setFullName('');
    setGender('');
    setGuardianName('');
    setGuardianPhone('');
    setGuardianEmail('');
  }

  function downloadTemplate() {
    const blob = new Blob([manifestTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trip-manifest-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File) {
    setUploadError(null);
    setUploadPreview([]);
    const buf = await file.arrayBuffer();
    const defaultClass = uploadClass.trim();
    try {
      const rows = parseManifestWorkbook(buf, defaultClass);
      if (!rows.length) {
        setUploadError('No valid rows found. Required columns: student name and parent phone.');
        return;
      }
      setUploadPreview(rows);
    } catch {
      setUploadError('Could not read this file. Use .xlsx, .xls, or .csv with the template columns.');
    }
  }

  function importPreview() {
    const incoming = uploadPreview.map((r) => parsedToSelection(r));
    onChange(mergeSelections(selected, incoming));
    setUploadPreview([]);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-2xl border border-line bg-slate-50/80 p-1">
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition',
            tab === 'single' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'
          )}
          onClick={() => setTab('single')}
        >
          <PenLine className="h-4 w-4" />
          Add one learner
        </button>
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition',
            tab === 'upload' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'
          )}
          onClick={() => setTab('upload')}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Upload Excel
        </button>
      </div>

      {tab === 'single' ? (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">
            Parent phone is used for guardian login; email is used to verify PIN reset in yoShule.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Student full name" required>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Uwase" />
            </Field>
            <Field label="Gender">
              <Select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select…</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
            <Field label="Class name" required>
              <Input value={classLabel} onChange={(e) => setClassLabel(e.target.value)} placeholder="S3A" />
            </Field>
            <Field label="Parent / guardian name">
              <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Paul Uwase" />
            </Field>
            <Field label="Parent phone (consent login)" required>
              <Input
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="+250788123456"
              />
            </Field>
            <Field label="Parent / guardian email">
              <Input
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                placeholder="parent@example.com"
                autoComplete="email"
              />
            </Field>
          </div>
          <Button
            type="button"
            variant="amber"
            className="mt-4"
            disabled={!fullName.trim() || !classLabel.trim() || !guardianPhone.trim()}
            onClick={addSingle}
          >
            Add to manifest
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-bold text-navy">Bulk upload</h3>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Columns: <strong>Student Name</strong>, <strong>Gender</strong>, <strong>Class</strong>,{' '}
                <strong>Parent Name</strong>, <strong>Parent Phone</strong>. Excel (.xlsx) or CSV.
              </p>
            </div>
            <Button type="button" variant="outline" className="shrink-0 gap-2 text-xs" onClick={downloadTemplate}>
              <CloudDownload className="h-4 w-4" />
              Download template
            </Button>
          </div>

          <Field
            label="Default class (optional)"
            hint="Used when the spreadsheet has no Class column — all rows share this class"
            className="mt-4"
          >
            <Input value={uploadClass} onChange={(e) => setUploadClass(e.target.value)} placeholder="e.g. P5 Blue" />
          </Field>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-slate-50/50 px-6 py-10 transition hover:border-navy/30 hover:bg-slate-50">
            <Upload className="h-8 w-8 text-slate-400" />
            <span className="mt-2 text-sm font-bold text-navy">Choose spreadsheet</span>
            <span className="text-xs text-slate-500">.xlsx, .xls, .csv</span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>

          {uploadError ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{uploadError}</p>
          ) : null}

          {uploadPreview.length > 0 ? (
            <div className="mt-4 rounded-xl border border-line">
              <p className="border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Preview · {uploadPreview.length} learners
              </p>
              <ul className="max-h-40 overflow-auto divide-y divide-line/80 text-sm">
                {uploadPreview.slice(0, 8).map((r, i) => (
                  <li key={`${r.fullName}-${i}`} className="flex justify-between gap-2 px-4 py-2">
                    <span className="font-medium text-slate-900">{r.fullName}</span>
                    <span className="text-slate-500">
                      {r.classLabel} · {r.guardianPhone}
                    </span>
                  </li>
                ))}
                {uploadPreview.length > 8 ? (
                  <li className="px-4 py-2 text-xs text-slate-500">+ {uploadPreview.length - 8} more</li>
                ) : null}
              </ul>
              <div className="border-t border-line p-3">
                <Button type="button" variant="amber" onClick={importPreview}>
                  Import {uploadPreview.length} learners
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function StudentManifestStep({
  selected,
  onChange,
  manifestMode,
}: {
  selected: ManifestSelection[];
  onChange: (next: ManifestSelection[]) => void;
  manifestMode: SchoolManifestMode;
}) {
  const syncFromSm = manifestMode === 'student_management_sync';

  return (
    <div>
      {syncFromSm ? (
        <StudentManagementSyncPanel selected={selected} onChange={onChange} />
      ) : (
        <>
          <p className="mb-4 rounded-xl border border-amber/25 bg-amber-soft/60 px-4 py-3 text-sm text-slate-700">
            You signed in with the <strong className="font-bold text-navy">ShuleTrip school portal</strong>. Add learners
            one at a time or upload a spreadsheet with parent phone numbers for consent.
          </p>
          <ManualManifestPanel selected={selected} onChange={onChange} />
        </>
      )}

      <SelectedManifestPanel selected={selected} onChange={onChange} />
    </div>
  );
}
