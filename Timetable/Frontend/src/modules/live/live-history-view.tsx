'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  Map,
  PlayCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { TermYearBar } from '@/components/term-year-bar';
import { toast } from 'sonner';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  timetableApi,
  type LiveHistoryData,
  type LiveHistoryRow,
  type LivePeriodReplayData,
  type LiveRoomStatus,
} from '@/services/timetable-api';
import { exportLiveHistoryPdf } from '@/utils/live-history-pdf-export';
import {
  formatDurationMinutes,
  liveStatusBadge,
  liveStatusCard,
  liveStatusDot,
  liveStatusLabel,
} from './live-status-utils';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ON_TIME', label: 'On Time' },
  { value: 'LATE', label: 'Late' },
  { value: 'NOT_CHECKED_IN', label: 'Not Checked In' },
  { value: 'COMPLETED', label: 'Completed' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function exportCsv(rows: LiveHistoryRow[], filename: string) {
  const headers = [
    'Date',
    'Period',
    'Start',
    'End',
    'Teacher',
    'Course',
    'Class',
    'Location',
    'Check-In',
    'Check-Out',
    'Duration',
    'Status',
    'QR Verified',
  ];
  const lines = rows.map((r) =>
    [
      r.date,
      r.periodLabel,
      r.startTime,
      r.endTime,
      r.teacher,
      r.subject,
      r.className,
      r.room,
      r.checkIn ?? '',
      r.checkOut ?? '',
      r.durationMinutes ?? '',
      liveStatusLabel(r.status),
      r.qrVerified ? 'Yes' : 'No',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-navy">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function LiveHistoryView() {
  const { term, academicYear, setTerm, setAcademicYear, settings: academicSettings } =
    useAcademicSettings();
  const [data, setData] = useState<LiveHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayIso());
  const [className, setClassName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [replay, setReplay] = useState<LivePeriodReplayData | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const lastAuthToast = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await timetableApi.liveHistory({
        term,
        academicYear,
        date,
        className: className || undefined,
        teacherName: teacherName || undefined,
        status: status === 'ALL' ? undefined : status,
      });
      setData(res.data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not load live history';
      const now = Date.now();
      if (now - lastAuthToast.current > 30_000) {
        lastAuthToast.current = now;
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }, [term, academicYear, date, className, teacherName, status]);

  useEffect(() => {
    load();
  }, [load]);

  const loadReplay = useCallback(async () => {
    if (!selectedPeriod) {
      setReplay(null);
      return;
    }
    setReplayLoading(true);
    try {
      const res = await timetableApi.livePeriodReplay({
        date,
        periodLabel: selectedPeriod,
        term,
        academicYear,
      });
      setReplay(res.data.data);
    } catch (err: unknown) {
      setReplay(null);
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not load period replay'
      );
    } finally {
      setReplayLoading(false);
    }
  }, [selectedPeriod, date, term, academicYear]);

  useEffect(() => {
    void loadReplay();
  }, [loadReplay]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = data?.rows ?? [];
    if (selectedPeriod) {
      rows = rows.filter((r) => r.periodLabel === selectedPeriod);
    }
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.room.toLowerCase().includes(q) ||
        r.teacher.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q)
    );
  }, [data?.rows, search, selectedPeriod]);

  const mapRooms = useMemo(() => {
    if (!selectedPeriod) return data?.mapRooms ?? [];
    return (data?.mapRooms ?? []).filter((r) => r.periodLabel === selectedPeriod);
  }, [data?.mapRooms, selectedPeriod]);

  const periods = useMemo(
    () => [...new Set((data?.rows ?? []).map((r) => r.periodLabel))],
    [data?.rows]
  );

  const summary = data?.summary;

  return (
    <HrPageLayout
      title="Live History"
      description="Teacher classroom activity and period check-in history."
      actions={
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/live-monitor"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#FCB038] hover:underline"
            >
              ← Back to Live Monitor
            </Link>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportCsv(filteredRows, `live-history-${date}.csv`)}
                disabled={filteredRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
              >
                <Download size={16} /> Export CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  exportLiveHistoryPdf(filteredRows, {
                    date,
                    day: data?.day ?? '',
                    term,
                    academicYear,
                    summary: data?.summary,
                  }, `live-history-${date}.pdf`)
                }
                disabled={filteredRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
              >
                <FileText size={16} /> Export PDF
              </button>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div className="sm:col-span-2 xl:col-span-2">
              <TermYearBar
                compact
                term={term}
                academicYear={academicYear}
                onTermChange={setTerm}
                onYearChange={setAcademicYear}
                terms={academicSettings?.terms}
                academicYears={academicSettings?.academicYears}
              />
            </div>
            <label className="text-xs font-semibold text-muted">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-navy"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Class
              <input
                type="text"
                placeholder="All classes"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-navy placeholder:text-muted"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Teacher
              <input
                type="text"
                placeholder="All teachers"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-navy placeholder:text-muted"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Status
              <select
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-navy"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted sm:col-span-2 lg:col-span-1">
              Search
              <div className="relative mt-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  placeholder="Room, teacher, class…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white py-2 pl-8 pr-3 text-sm text-navy"
                />
              </div>
            </label>
          </div>
        </div>
      }
    >
      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> Loading history…
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <SummaryCard label="Periods" value={summary?.periods ?? 0} />
            <SummaryCard label="On Time" value={summary?.onTime ?? 0} />
            <SummaryCard label="Late" value={summary?.late ?? 0} />
            <SummaryCard label="Missing" value={summary?.missing ?? 0} />
            <SummaryCard
              label="Avg delay"
              value={summary?.avgDelayMinutes ? `${summary.avgDelayMinutes}m` : '—'}
            />
            <SummaryCard
              label="Verification rate"
              value={summary?.verificationRate != null ? `${summary.verificationRate}%` : '—'}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
            <section className="hr-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-navy">
                    <History size={16} /> Activity log
                  </h3>
                  <p className="text-xs text-muted">
                    {data.day} · {data.date} · {filteredRows.length} records
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium"
                    value={selectedPeriod ?? ''}
                    onChange={(e) => setSelectedPeriod(e.target.value || null)}
                  >
                    <option value="">All periods</option>
                    {periods.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowMap((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                      showMap ? 'border-[#000435] bg-[#000435] text-white' : 'border-border bg-white text-navy'
                    }`}
                  >
                    <Map size={14} /> View on map
                  </button>
                  {selectedPeriod ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#FCB038]/15 px-2.5 py-1.5 text-xs font-semibold text-navy">
                      <PlayCircle size={14} /> Replay {selectedPeriod}
                    </span>
                  ) : null}
                </div>
              </div>

              {selectedPeriod ? (
                <div className="border-b border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-navy">Period replay · {selectedPeriod}</p>
                      <p className="text-xs text-muted">
                        {replay?.startTime ?? '—'} – {replay?.endTime ?? '—'} · {date}
                      </p>
                    </div>
                    {replayLoading ? (
                      <Loader2 size={16} className="animate-spin text-muted" />
                    ) : null}
                  </div>
                  {replay ? (
                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
                      <div className="relative pl-4">
                        <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-slate-200" />
                        <ul className="space-y-3">
                          {replay.events.map((event, idx) => (
                            <li key={`${event.isoAt}-${idx}`} className="relative flex gap-3 text-sm">
                              <span
                                className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white ${liveStatusDot(
                                  event.type.includes('CHECK_IN') && !event.type.includes('LATE')
                                    ? 'ON_TIME'
                                    : event.type.includes('LATE') || event.type.includes('EARLY')
                                      ? 'LATE'
                                      : event.type.includes('MISSING')
                                        ? 'MISSING'
                                        : event.type.includes('END') || event.type.includes('SCHEDULED')
                                          ? 'COMPLETED'
                                          : 'UPCOMING'
                                )}`}
                              />
                              <div>
                                <p className="font-semibold text-navy">
                                  {event.at ?? '—'} · {event.message}
                                </p>
                                {event.room ? (
                                  <p className="text-xs text-muted">
                                    {event.room}
                                    {event.className ? ` · ${event.className}` : ''}
                                    {event.subject ? ` · ${event.subject}` : ''}
                                  </p>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {replay.mapRooms.map((room) => (
                          <div
                            key={room.id}
                            className={`rounded-lg border px-2.5 py-2 text-xs ${liveStatusCard(room.status)}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold">{room.label}</span>
                              <span className={`h-2 w-2 rounded-full ${liveStatusDot(room.status)}`} />
                            </div>
                            <p className="mt-0.5 opacity-80">{room.teacher}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : !replayLoading ? (
                    <p className="mt-3 text-sm text-muted">Select a period to replay its timeline.</p>
                  ) : null}
                </div>
              ) : null}

              {showMap ? (
                <div className="border-b border-slate-100 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
                    Historical map {selectedPeriod ? `· ${selectedPeriod}` : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {mapRooms.length === 0 ? (
                      <p className="col-span-full py-6 text-center text-sm text-muted">No map data for this filter.</p>
                    ) : (
                      mapRooms.map((room) => (
                        <div
                          key={room.id}
                          className={`rounded-xl border px-3 py-2 text-sm ${liveStatusCard(room.status)}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold">{room.label}</span>
                            <span className={`h-2 w-2 rounded-full ${liveStatusDot(room.status)}`} />
                          </div>
                          <p className="mt-1 text-xs opacity-80">{room.className}</p>
                          <p className="text-xs opacity-70">{room.subject}</p>
                          <p className={`mt-1 text-[10px] font-semibold ${liveStatusBadge(room.status)} inline-block rounded-full px-1.5 py-0.5`}>
                            {liveStatusLabel(room.status)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-navy">Period</th>
                      <th className="px-4 py-3 font-semibold text-navy">Time</th>
                      <th className="px-4 py-3 font-semibold text-navy">Teacher</th>
                      <th className="px-4 py-3 font-semibold text-navy">Course</th>
                      <th className="px-4 py-3 font-semibold text-navy">Class</th>
                      <th className="px-4 py-3 font-semibold text-navy">Location</th>
                      <th className="px-4 py-3 font-semibold text-navy">Check-In</th>
                      <th className="px-4 py-3 font-semibold text-navy">Check-Out</th>
                      <th className="px-4 py-3 font-semibold text-navy">Duration</th>
                      <th className="px-4 py-3 font-semibold text-navy">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-muted">
                          No history records for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr key={row.timetableId} className="border-t border-border/70 hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-medium">{row.periodLabel}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted">
                            {row.startTime} – {row.endTime}
                          </td>
                          <td className="px-4 py-3 font-medium text-navy">{row.teacher}</td>
                          <td className="px-4 py-3">{row.subject}</td>
                          <td className="px-4 py-3">{row.className}</td>
                          <td className="px-4 py-3 font-medium">{row.room}</td>
                          <td className="px-4 py-3">{row.checkIn ?? '—'}</td>
                          <td className="px-4 py-3">{row.checkOut ?? '—'}</td>
                          <td className="px-4 py-3">{formatDurationMinutes(row.durationMinutes)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${liveStatusBadge(row.status === 'NOT_CHECKED_IN' ? 'MISSING' : (row.status as LiveRoomStatus))}`}>
                              {liveStatusLabel(row.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="hr-card p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-navy">
                  <CalendarDays size={16} /> Teacher punctuality
                </h3>
                <p className="mt-1 text-xs text-muted">On-time rate for selected day</p>
                <ul className="mt-4 space-y-3">
                  {(data.teacherStats ?? []).length === 0 ? (
                    <li className="text-xs text-muted">No teacher data.</li>
                  ) : (
                    data.teacherStats.slice(0, 12).map((t) => (
                      <li key={t.teacher}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-semibold text-navy">{t.teacher}</span>
                          <span className="shrink-0 font-bold text-[#FCB038]">{t.onTimeRate}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#000435] to-[#FCB038]"
                            style={{ width: `${t.onTimeRate}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {t.onTime} on time · {t.late} late · {t.missing} missing
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section className="hr-card p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-navy">
                  <FileSpreadsheet size={16} /> Export
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Export applies current filters ({filteredRows.length} rows).
                </p>
                <button
                  type="button"
                  onClick={() => exportCsv(filteredRows, `live-history-${date}.csv`)}
                  disabled={filteredRows.length === 0}
                  className="mt-3 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
                >
                  Download CSV report
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportLiveHistoryPdf(filteredRows, {
                      date,
                      day: data.day,
                      term,
                      academicYear,
                      summary: data.summary,
                    }, `live-history-${date}.pdf`)
                  }
                  disabled={filteredRows.length === 0}
                  className="mt-2 w-full rounded-xl bg-[#000435] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#000435]/90 disabled:opacity-50"
                >
                  Download PDF report
                </button>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </HrPageLayout>
  );
}
