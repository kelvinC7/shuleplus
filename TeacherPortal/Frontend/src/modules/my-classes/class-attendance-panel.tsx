'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Save, Search } from 'lucide-react';
import {
  completeClassAttendance,
  fetchClassAttendanceSession,
  myClassesApiError,
  saveClassAttendanceDraft,
  type ClassAttendanceRow,
  type ClassAttendanceSession,
  type MyClassItem,
} from '@/services/my-classes-api';
import { AttendanceStatusButton } from '@/components/attendance-status-ui';
import { STATUS_OPTIONS, countRows } from '@/modules/roll-call/constants';

function classLabel(cls: MyClassItem) {
  return cls.label || [cls.name, cls.stream].filter(Boolean).join(' ');
}

export function ClassAttendancePanel({
  selectedClass,
  term,
  academicYear,
}: {
  selectedClass: MyClassItem;
  term: string;
  academicYear: string;
}) {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState<ClassAttendanceSession | null>(null);
  const [rows, setRows] = useState<ClassAttendanceRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!term || !academicYear) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await fetchClassAttendanceSession(selectedClass.id, {
        className: classLabel(selectedClass),
        classLabel: classLabel(selectedClass),
        sessionDate,
        academicYear,
        term,
      });
      setSession(data);
      setRows(
        [...data.rows].sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }))
      );
    } catch (err) {
      setError(myClassesApiError(err, 'Could not load attendance session'));
      setSession(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, sessionDate, academicYear, term]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.fullName.toLowerCase().includes(q) || r.studentCode.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const counts = useMemo(() => countRows(rows), [rows]);
  const readonly = session?.status === 'COMPLETED';

  function updateRow(code: string, status: string) {
    setRows((prev) => prev.map((r) => (r.studentCode === code ? { ...r, status } : r)));
  }

  function markAllPresent() {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'PRESENT' })));
  }

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await saveClassAttendanceDraft(session.id, {
        rows: rows.map((r) => ({ studentCode: r.studentCode, status: r.status, notes: r.notes ?? null })),
      });
      setSession(data);
      setRows(data.rows);
      setSuccess('Attendance saved');
    } catch (err) {
      setError(myClassesApiError(err, 'Could not save attendance'));
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!session) return;
    setCompleting(true);
    setError(null);
    setSuccess(null);
    try {
      await saveClassAttendanceDraft(session.id, {
        rows: rows.map((r) => ({ studentCode: r.studentCode, status: r.status, notes: r.notes ?? null })),
      });
      const data = await completeClassAttendance(session.id);
      setSession(data);
      setRows(data.rows);
      setSuccess('Attendance submitted');
    } catch (err) {
      setError(myClassesApiError(err, 'Could not submit attendance'));
    } finally {
      setCompleting(false);
    }
  }

  if (!term || !academicYear) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Select term and academic year from the header to mark class attendance.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-20 shrink-0 space-y-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur-sm sm:px-4">
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <div className="shrink-0">
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              disabled={readonly}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
            {term} · {academicYear}
          </div>

          {!readonly && !loading && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={markAllPresent}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Mark all present
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 sm:px-4"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="hidden min-[400px]:inline">Save draft</span>
                <span className="min-[400px]:hidden">Save</span>
              </button>
              <button
                type="button"
                onClick={() => void handleComplete()}
                disabled={completing}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 sm:px-4"
              >
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Submit
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-semibold sm:flex-wrap sm:overflow-visible sm:pb-0 sm:text-xs">
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
              Present {counts.present}
            </span>
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Late {counts.late}</span>
            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-red-800">Absent {counts.absent}</span>
            <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">Excused {counts.excused}</span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
              Unmarked {counts.unmarked}
            </span>
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student…"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800">{error}</div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
            {success}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading attendance register…
        </div>
      ) : (
        <>
          <div className="hidden min-h-0 flex-1 overflow-y-auto bg-white md:block">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 shadow-sm">
                <tr>
                  <th className="w-[38%] px-4 py-2">Student</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.studentCode} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium leading-snug text-slate-900">{row.fullName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{row.studentCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_OPTIONS.map((opt) => (
                          <AttendanceStatusButton
                            key={opt.value}
                            status={opt.value}
                            active={row.status === opt.value}
                            disabled={readonly}
                            onClick={() => updateRow(row.studentCode, opt.value)}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/50 p-2 md:hidden">
            {filteredRows.map((row) => (
              <div key={row.studentCode} className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <p className="font-medium leading-snug text-slate-900">{row.fullName}</p>
                <p className="mb-2.5 mt-0.5 text-xs text-slate-500">{row.studentCode}</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <AttendanceStatusButton
                      key={opt.value}
                      status={opt.value}
                      active={row.status === opt.value}
                      disabled={readonly}
                      onClick={() => updateRow(row.studentCode, opt.value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
