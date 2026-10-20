'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CloudOff,
  Loader2,
  Save,
  Search,
} from 'lucide-react';
import {
  assessmentApiError,
  enterAssessmentMarks,
  fetchAssessment,
  fetchAssessmentMarks,
} from '@/services/assessment-api';
import type { Assessment, StudentListItem, MarkEntry, MarkEntryStatus } from '@/types/assessment';

const MARK_STATUSES: Array<{ value: MarkEntryStatus; label: string; color: string }> = [
  { value: 'PRESENT', label: 'Present', color: 'text-emerald-600' },
  { value: 'ABSENT', label: 'Absent', color: 'text-red-600' },
  { value: 'EXCUSED', label: 'Excused', color: 'text-amber-600' },
  { value: 'EXEMPT', label: 'Exempt', color: 'text-violet-600' },
  { value: 'MISSING', label: 'Missing', color: 'text-slate-400' },
];

export function MarkEntryView({ id }: { id: string }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [entries, setEntries] = useState<Map<string, MarkEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const isDirty = useRef(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxMark = assessment?.maxMark ?? 100;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, existingMarks] = await Promise.all([
        fetchAssessment(id),
        fetchAssessmentMarks(id).catch(() => []),
      ]);
      setAssessment(a);

      const existingList = Array.isArray(existingMarks) ? existingMarks : [];

      let studentList: StudentListItem[] = [];
      if (a.classId) {
        const className = a.class
          ? [a.class.name, a.class.stream].filter(Boolean).join(' ')
          : undefined;
        try {
          studentList = await import('@/services/assessment-api').then((m) =>
            m.fetchClassStudents(a.classId, className),
          );
        } catch {
          studentList = [];
        }
      }

      setStudents(studentList);

      const entryMap = new Map<string, MarkEntry>();
      for (const m of existingList as any[]) {
        const student = m.student ?? studentList.find((s) => s.id === m.studentId);
        entryMap.set(m.studentId, {
          studentId: m.studentId,
          score: m.score != null ? String(m.score) : '',
          markStatus: (m.markStatus as MarkEntryStatus) || 'PRESENT',
          remarks: m.remarks || '',
        });
      }
      for (const s of studentList) {
        if (!entryMap.has(s.id)) {
          entryMap.set(s.id, {
            studentId: s.id,
            score: '',
            markStatus: 'PRESENT',
            remarks: '',
          });
        }
      }
      setEntries(entryMap);
    } catch (err) {
      setError(assessmentApiError(err, 'Could not load assessment'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, []);

  function updateEntry(studentId: string, field: keyof MarkEntry, value: string) {
    setEntries((prev) => {
      const next = new Map(prev);
      const entry = next.get(studentId) ?? {
        studentId,
        score: '',
        markStatus: 'PRESENT' as MarkEntryStatus,
        remarks: '',
      };
      (entry as any)[field] = value;
      next.set(studentId, entry);
      return next;
    });
    isDirty.current = true;
    setSaveStatus(null);
  }

  function validateMark(value: string): string {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Invalid number';
    if (num < 0) return 'Cannot be negative';
    if (num > maxMark) return `Max is ${maxMark}`;
    return '';
  }

  async function handleSave() {
    if (!assessment) return;
    setSaving(true);
    setError(null);
    setSaveStatus('saving');
    try {
      const marksToSubmit = Array.from(entries.values())
        .filter((e) => e.score !== '' || e.markStatus !== 'PRESENT')
        .map((e) => {
          const student = students.find((s) => s.id === e.studentId);
          return {
            studentId: e.studentId,
            studentCode: student?.studentCode,
            fullName: student?.fullName,
            score: e.score ? parseFloat(e.score) : 0,
            markStatus: e.markStatus,
            remarks: e.remarks || undefined,
          };
        });

      await enterAssessmentMarks(assessment.id, marksToSubmit);
      isDirty.current = false;
      setSaveStatus('saved');
    } catch (err) {
      setError(assessmentApiError(err, 'Failed to save marks'));
      setSaveStatus('offline');
    } finally {
      setSaving(false);
    }
  }

  const filteredStudents = students.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !s.fullName.toLowerCase().includes(q) &&
        !s.studentCode.toLowerCase().includes(q)
      )
        return false;
    }
    if (filterStatus) {
      const entry = entries.get(s.id);
      if (entry && entry.markStatus !== filterStatus) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-red-600">{error ?? 'Assessment not found'}</p>
        <button onClick={load} className="text-sm font-semibold text-primary underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-navy">Mark Entry</h1>
          <p className="text-sm text-muted">
            {assessment.title}
            {assessment.subject ? ` · ${assessment.subject.name}` : ''}
            {assessment.class
              ? ` · ${assessment.class.stream ? `${assessment.class.name} ${assessment.class.stream}` : assessment.class.name}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {saveStatus === 'offline' && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <CloudOff className="h-3.5 w-3.5" /> Save failed
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Marks
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          <option value="">All statuses</option>
          {MARK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Students table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
                  #
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
                  Code
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
                  Score (/{maxMark})
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.map((s, idx) => {
                const entry = entries.get(s.id);
                const markError = entry?.score ? validateMark(entry.score) : '';
                return (
                  <tr key={s.id} className="transition hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-navy">{s.fullName}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.studentCode}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={maxMark}
                        step="0.5"
                        value={entry?.score ?? ''}
                        onChange={(e) => updateEntry(s.id, 'score', e.target.value)}
                        className={`w-20 rounded-lg border bg-white px-3 py-1.5 text-center text-sm outline-none transition focus:ring-2 ${
                          markError
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                            : 'border-border focus:border-primary focus:ring-primary/10'
                        }`}
                        placeholder="—"
                      />
                      {markError && (
                        <p className="mt-0.5 text-[10px] text-red-500">{markError}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={entry?.markStatus ?? 'PRESENT'}
                        onChange={(e) => updateEntry(s.id, 'markStatus', e.target.value)}
                        className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                      >
                        {MARK_STATUSES.map((ms) => (
                          <option key={ms.value} value={ms.value}>
                            {ms.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={entry?.remarks ?? ''}
                        onChange={(e) => updateEntry(s.id, 'remarks', e.target.value)}
                        className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                        placeholder="Optional"
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                    {students.length === 0
                      ? 'No students found for this class'
                      : 'No students match your search'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
