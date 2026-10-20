'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Radio, Search, X } from 'lucide-react';
import {
  fetchClassDiscipline,
  fetchClassGateAttendance,
  myClassesApiError,
  type ClassShuleCardRow,
  type DisciplineCaseRecord,
  type MyClassItem,
} from '@/services/my-classes-api';

const PAGE_SIZE = 15;

function classLabel(cls: MyClassItem) {
  return cls.label || [cls.name, cls.stream].filter(Boolean).join(' ');
}

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function StudentAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200" />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FCB038]/15 text-sm font-bold text-[#000435] ring-1 ring-[#FCB038]/30">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function TermProgressBar({ rate }: { rate: number | null }) {
  const pct = rate ?? 0;
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FCB038] to-emerald-500 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs font-semibold text-slate-700">{rate != null ? `${rate}%` : '—'}</span>
    </div>
  );
}

function StatusPills({ status }: { status?: string | null }) {
  if (!status) return <span className="text-xs text-slate-400">No tap</span>;
  const tone =
    status === 'LATE'
      ? 'bg-amber-50 text-amber-800 ring-amber-200'
      : status === 'ABSENT'
        ? 'bg-red-50 text-red-800 ring-red-200'
        : 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function GateAttendancePanel({
  selectedClass,
  term,
  academicYear,
}: {
  selectedClass: MyClassItem;
  term?: string;
  academicYear?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [filterMode, setFilterMode] = useState<'day' | 'term' | 'range'>('day');
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ClassShuleCardRow[]>([]);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClassShuleCardRow | null>(null);
  const [discipline, setDiscipline] = useState<DisciplineCaseRecord[]>([]);
  const [disciplineLoading, setDisciplineLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchClassGateAttendance(selectedClass.id, classLabel(selectedClass), {
        date: filterMode === 'day' ? date : today,
        from: filterMode === 'range' ? from : undefined,
        to: filterMode === 'range' ? to : undefined,
        term: filterMode === 'term' ? term : undefined,
        academicYear,
        q: search || undefined,
      });
      setRows(result.rows);
      setServiceAvailable(result.serviceAvailable);
    } catch (err) {
      setError(myClassesApiError(err, 'Could not load ShuleCard attendance'));
      setRows([]);
      setServiceAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, filterMode, date, from, to, term, academicYear, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filterMode, date, from, to, search, term]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const r of rows) {
      const st = r.record?.status;
      if (st === 'LATE') late++;
      else if (st === 'ABSENT') absent++;
      else if (st === 'PRESENT' || r.record?.entryTime) present++;
    }
    return { present, late, absent };
  }, [rows]);

  async function openDrawer(row: ClassShuleCardRow) {
    setSelected(row);
    setDiscipline([]);
    setDisciplineLoading(true);
    try {
      const d = await fetchClassDiscipline(selectedClass.id, classLabel(selectedClass), {
        search: row.studentCode,
        term,
        academicYear,
      });
      setDiscipline(d.cases.filter((c) => c.studentCode === row.studentCode).slice(0, 8));
    } catch {
      setDiscipline([]);
    } finally {
      setDisciplineLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-3 sm:p-4">
      <div className="shrink-0 space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#FCB038]">ShuleCard · Gate RFID</p>
          <p className="text-sm text-slate-600">Daily check-in/out from card taps · term attendance rate per student</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['day', 'term', 'range'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMode(m)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                filterMode === m ? 'bg-[#000435] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {m === 'day' ? 'By day' : m}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {filterMode === 'day' && (
            <label className="text-xs font-medium text-slate-600">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          )}
          {filterMode === 'range' && (
            <>
              <label className="text-xs font-medium text-slate-600">
                From
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                To
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </>
          )}
          {filterMode === 'term' && (
            <p className="text-xs text-slate-500">
              Term rate: <strong>{term}</strong> · {academicYear}
            </p>
          )}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          <div className="rounded-lg bg-emerald-50 py-2 text-emerald-800">Present {summary.present}</div>
          <div className="rounded-lg bg-amber-50 py-2 text-amber-900">Late {summary.late}</div>
          <div className="rounded-lg bg-red-50 py-2 text-red-800">Absent {summary.absent}</div>
        </div>
      </div>

      {!serviceAvailable && (
        <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Gate attendance service is temporarily unavailable.
        </div>
      )}
      {error && <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          <div className="hidden min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3 w-12">#</th>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Check-in</th>
                  <th className="px-3 py-3">Check-out</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Term attendance</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr
                    key={r.studentId}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/80"
                    onClick={() => void openDrawer(r)}
                  >
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <StudentAvatar name={r.fullName} photoUrl={r.photoUrl} />
                        <div>
                          <p className="font-semibold text-[#000435]">{r.fullName}</p>
                          <p className="font-mono text-[10px] text-slate-500">{r.studentCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{formatTime(r.record?.entryTime)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatTime(r.record?.exitTime)}</td>
                    <td className="px-3 py-3">
                      <StatusPills status={r.record?.status} />
                    </td>
                    <td className="px-3 py-3">
                      <TermProgressBar rate={r.termAttendanceRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {pageRows.map((r, i) => (
              <button
                key={r.studentId}
                type="button"
                onClick={() => void openDrawer(r)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <StudentAvatar name={r.fullName} photoUrl={r.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy">{r.fullName}</p>
                    <p className="font-mono text-[10px] text-slate-500">{r.studentCode}</p>
                  </div>
                  <span className="text-xs text-slate-400">#{(page - 1) * PAGE_SIZE + i + 1}</span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span>In {formatTime(r.record?.entryTime)}</span>
                  <span>Out {formatTime(r.record?.exitTime)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusPills status={r.record?.status} />
                  <TermProgressBar rate={r.termAttendanceRate} />
                </div>
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-600">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} className="rounded-lg border px-2 py-1 disabled:opacity-40" onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <span>
                {page}/{totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} className="rounded-lg border px-2 py-1 disabled:opacity-40" onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close" onClick={() => setSelected(null)} />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 bg-[#000435] px-4 py-4 text-white">
              <div className="flex gap-3">
                <StudentAvatar name={selected.fullName} photoUrl={selected.photoUrl} />
                <div>
                  <p className="font-semibold">{selected.fullName}</p>
                  <p className="font-mono text-xs text-white/70">{selected.studentCode}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
              <section>
                <h3 className="text-xs font-bold uppercase text-slate-500">Today gate record</h3>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-xs text-slate-500">Check-in</p>
                    <p className="font-mono font-semibold">{formatTime(selected.record?.entryTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Check-out</p>
                    <p className="font-mono font-semibold">{formatTime(selected.record?.exitTime)}</p>
                  </div>
                  <div className="col-span-2">
                    <StatusPills status={selected.record?.status} />
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase text-slate-500">Term performance</h3>
                <TermProgressBar rate={selected.termAttendanceRate} />
                <p className="mt-1 text-xs text-slate-500">
                  {selected.termPresentDays} present · {selected.termLateDays} late · {selected.termRecordDays} gate days
                </p>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase text-slate-500">Discipline</h3>
                {disciplineLoading ? (
                  <p className="text-xs text-slate-500">Loading…</p>
                ) : discipline.length === 0 ? (
                  <p className="text-xs text-slate-500">No discipline cases on file.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {discipline.map((c) => (
                      <li key={c.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                        <p className="font-semibold text-navy">{c.category}</p>
                        <p className="text-slate-500">{c.incidentDate} · {c.status}</p>
                        {c.description ? <p className="mt-1 text-slate-600">{c.description}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
