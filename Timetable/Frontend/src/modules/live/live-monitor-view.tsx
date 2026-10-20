'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  Layers,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { TermYearBar } from '@/components/term-year-bar';
import { toast } from 'sonner';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { useLiveMonitorSocket } from '@/hooks/use-live-monitor-socket';
import {
  timetableApi,
  type LiveAlert,
  type LiveMapRoom,
  type LiveMonitorData,
  type LiveRoomStatus,
} from '@/services/timetable-api';
import {
  formatClockTime,
  liveStatusBadge,
  liveStatusCard,
  liveStatusDot,
  liveStatusLabel,
} from './live-status-utils';

type ViewMode = 'classrooms' | 'teachers' | 'courses';

function StatusKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'green' | 'amber' | 'red' | 'slate';
}) {
  const tones = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  const dots = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    slate: 'bg-slate-300',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
        <span className={`h-2 w-2 rounded-full ${dots[tone]}`} />
        {label}
      </div>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function RoomTile({
  room,
  selected,
  onSelect,
}: {
  room: LiveMapRoom;
  selected: boolean;
  onSelect: () => void;
}) {
  const pulse = room.status === 'ON_TIME' || room.status === 'LATE';
  const checkedIn = Boolean(room.checkedInAt);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex min-h-[96px] flex-col rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${liveStatusCard(room.status)} ${
        selected ? 'ring-2 ring-[#FCB038]' : ''
      }`}
    >
      {pulse ? (
        <span
          className={`pointer-events-none absolute inset-0 rounded-xl opacity-30 ${liveStatusDot(room.status)} animate-ping`}
          aria-hidden
        />
      ) : null}
      <div className="relative flex items-start justify-between gap-1">
        <span className="text-sm font-bold">{room.label}</span>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${liveStatusDot(room.status)}`} />
      </div>
      <p className="relative mt-1 truncate text-xs font-medium opacity-80">{room.className}</p>
      <p className="relative truncate text-xs opacity-70">
        {room.subject ?? (room.status === 'FREE' ? 'No class' : '—')}
      </p>
      {room.teacher && room.status !== 'FREE' ? (
        <p className="relative truncate text-[10px] font-medium opacity-60">{room.teacher}</p>
      ) : null}
      {room.status === 'LATE' && room.minutesLate ? (
        <p className="relative mt-auto text-[10px] font-semibold text-amber-700">
          {room.minutesLate} min late
        </p>
      ) : checkedIn && (room.status === 'ON_TIME' || room.status === 'LATE') ? (
        <p className="relative mt-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
          {room.qrVerified ? <QrCode size={10} /> : null}
          Checked in {formatClockTime(room.checkedInAt)}
        </p>
      ) : room.status === 'UPCOMING' && room.startTime ? (
        <p className="relative mt-auto text-[10px] font-medium opacity-60">Starts {room.startTime}</p>
      ) : room.status === 'MISSING' ? (
        <p className="relative mt-auto text-[10px] font-semibold text-red-700">Not checked in</p>
      ) : null}
    </button>
  );
}

function DetailsPanel({ room, onClose }: { room: LiveMapRoom; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${liveStatusDot(room.status)}`} />
            <h3 className="text-base font-bold text-navy">{room.label}</h3>
          </div>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${liveStatusBadge(room.status)}`}>
            {liveStatusLabel(room.status)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-slate-100"
          aria-label="Close details"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        {room.subject ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Current lesson</p>
            <p className="mt-1 text-lg font-bold text-navy">{room.subject}</p>
            <p className="text-muted">{room.className}</p>
          </div>
        ) : null}
        {room.teacher ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Teacher</p>
            <p className="mt-1 font-semibold text-navy">{room.teacher}</p>
          </div>
        ) : null}
        {room.periodLabel && room.startTime && room.endTime ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Period</p>
            <p className="mt-1 font-semibold text-navy">
              {room.periodLabel} · {room.startTime} – {room.endTime}
            </p>
          </div>
        ) : null}
        {room.checkedInAt ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Check-in</p>
            <p className="mt-1 font-semibold text-navy">{formatClockTime(room.checkedInAt)}</p>
            {room.status === 'LATE' && room.minutesLate ? (
              <p className="text-xs font-semibold text-amber-700">{room.minutesLate} minutes late</p>
            ) : null}
          </div>
        ) : room.status === 'MISSING' ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            Teacher should be teaching but has not checked in.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${room.qrVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
            {room.qrVerified ? '✓ QR scanned' : 'No QR scan'}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-semibold ${room.attendanceDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {room.attendanceDone ? 'Attendance done' : 'Attendance pending'}
          </span>
        </div>
        {room.periodLabel ? (
          <p className="text-xs text-muted">
            Live period · {room.periodLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function LiveMonitorView() {
  const { term, academicYear, setTerm, setAcademicYear, settings: academicSettings } =
    useAcademicSettings();
  const [data, setData] = useState<LiveMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState(8);
  const [viewMode, setViewMode] = useState<ViewMode>('classrooms');
  const [search, setSearch] = useState('');
  const [building, setBuilding] = useState('All');
  const [floor, setFloor] = useState('All');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mapScale, setMapScale] = useState(1);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const lastAuthToast = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await timetableApi.liveMonitor({ term, academicYear });
        const payload = res.data.data;
        setData(payload);
        setRefreshSeconds(payload.refreshSeconds || 8);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not load live monitor';
        const isAuth = /invalid|expired|token|authentication/i.test(message);
        if (!silent || !isAuth) {
          const now = Date.now();
          if (now - lastAuthToast.current > 30_000) {
            lastAuthToast.current = now;
            toast.error(message);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [term, academicYear]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ms = Math.max(3, refreshSeconds) * 1000;
    const id = window.setInterval(() => load(true), ms);
    return () => window.clearInterval(id);
  }, [load, refreshSeconds]);

  const { connected: wsConnected } = useLiveMonitorSocket(() => load(true), Boolean(data));

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.mapRooms ?? []).filter((room) => {
      if (building !== 'All' && room.building !== building) return false;
      if (floor !== 'All' && room.floor !== floor) return false;
      if (!q) return true;
      return (
        room.label.toLowerCase().includes(q) ||
        room.className.toLowerCase().includes(q) ||
        (room.subject?.toLowerCase().includes(q) ?? false) ||
        (room.teacher?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data?.mapRooms, building, floor, search]);

  const selectedRoom = useMemo(() => {
    if (!selectedKey) return null;
    return filteredRooms.find((r) => r.label.toLowerCase() === selectedKey) ?? null;
  }, [filteredRooms, selectedKey]);

  const focusRoom = useCallback((mapKey: string) => {
    setSelectedKey(mapKey);
    setViewMode('classrooms');
  }, []);

  const kpis = data?.kpis;
  const currentTime = data?.currentTime ?? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <HrPageLayout
      title="Live Monitor"
      description="Real-time classroom and teacher activity across your school."
      actions={
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Radio size={12} className="animate-pulse" /> LIVE · {currentTime}
              </span>
              {wsConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                  Realtime connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  Polling every {refreshSeconds}s
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50"
                onClick={() => load()}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <Link
                href="/smart-settings"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                <Settings size={16} /> Settings
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1 rounded-2xl border border-border bg-white p-3 sm:min-w-[360px]">
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
              Day
              <div className="mt-1 rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm font-semibold text-navy">
                {data?.day ?? '-'}
              </div>
            </label>
            <div className="relative min-w-[220px] flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                placeholder="Search classroom, teacher, class or course…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm text-navy placeholder:text-muted"
              />
            </div>
          </div>
        </div>
      }
    >
      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> Loading live board…
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatusKpi label="On Time" value={kpis?.onTime ?? 0} tone="green" />
            <StatusKpi label="Late" value={kpis?.late ?? 0} tone="amber" />
            <StatusKpi label="Missing" value={kpis?.missing ?? 0} tone="red" />
            <StatusKpi label="Upcoming" value={kpis?.upcoming ?? 0} tone="slate" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Active classes</p>
              <p className="mt-1 text-2xl font-bold text-navy">{kpis?.activeClasses ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Teachers checked in</p>
              <p className="mt-1 text-2xl font-bold text-navy">{kpis?.teachersPresent ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Rooms occupied</p>
              <p className="mt-1 text-2xl font-bold text-navy">
                {kpis?.roomsOccupied ?? 0}
                <span className="text-base font-medium text-muted"> / {kpis?.totalRooms ?? 0}</span>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Completed today</p>
              <p className="mt-1 text-2xl font-bold text-navy">{kpis?.lessonsCompleted ?? 0}</p>
            </div>
          </div>

          {data.currentPeriod ? (
            <section className="hr-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Current period</p>
                  <p className="text-lg font-bold text-navy">
                    {data.currentPeriod.label} · {data.currentPeriod.startTime} – {data.currentPeriod.endTime}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#FCB038]">NOW · {currentTime}</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#000435] to-[#FCB038] transition-all duration-700"
                  style={{ width: `${data.currentPeriod.progressPercent}%` }}
                />
              </div>
              <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
                {data.periodTimeline.map((p) => (
                  <div
                    key={`${p.label}-${p.startTime}`}
                    className={`min-w-[72px] shrink-0 rounded-lg px-2 py-1.5 text-center text-[10px] ${
                      p.isCurrent
                        ? 'bg-[#000435] font-bold text-white'
                        : p.isPast
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-white text-muted ring-1 ring-border'
                    }`}
                  >
                    <p>{p.label}</p>
                    <p className="opacity-80">{p.startTime}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <section
              className={`hr-card flex flex-col overflow-hidden ${mapFullscreen ? 'fixed inset-4 z-50' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-navy">School live map</span>
                  <div className="flex rounded-lg border border-border p-0.5 text-xs">
                    {(['classrooms', 'teachers', 'courses'] as ViewMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={`rounded-md px-2.5 py-1 font-semibold capitalize ${
                          viewMode === mode ? 'bg-[#000435] text-white' : 'text-muted hover:text-navy'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                  >
                    <option value="All">All buildings</option>
                    {(data.buildings ?? []).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                  >
                    <option value="All">All floors</option>
                    {(data.floors ?? []).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-lg border border-border p-1.5 hover:bg-slate-50"
                    onClick={() => setMapScale((s) => Math.min(1.5, s + 0.1))}
                    aria-label="Zoom in"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border p-1.5 hover:bg-slate-50"
                    onClick={() => setMapScale((s) => Math.max(0.7, s - 0.1))}
                    aria-label="Zoom out"
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border p-1.5 hover:bg-slate-50"
                    onClick={() => setMapFullscreen((v) => !v)}
                    aria-label="Toggle fullscreen"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {viewMode === 'classrooms' ? (
                  <div
                    className="min-h-[280px] origin-top-left transition-transform duration-200"
                    style={{ transform: `scale(${mapScale})` }}
                  >
                    {building !== 'All' ? (
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
                        <Building2 size={14} /> {building}
                        {floor !== 'All' ? ` · ${floor}` : ''}
                      </p>
                    ) : null}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {filteredRooms.length === 0 ? (
                        <p className="col-span-full py-8 text-center text-sm text-muted">
                          No classrooms match your filters.
                        </p>
                      ) : (
                        filteredRooms.map((room) => (
                          <RoomTile
                            key={room.id}
                            room={room}
                            selected={selectedKey === room.label.toLowerCase()}
                            onSelect={() => setSelectedKey(room.label.toLowerCase())}
                          />
                        ))
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
                      {(['ON_TIME', 'LATE', 'MISSING', 'UPCOMING', 'COMPLETED', 'FREE'] as LiveRoomStatus[]).map(
                        (s) => (
                          <span key={s} className="inline-flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${liveStatusDot(s)}`} />
                            {liveStatusLabel(s)}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                ) : viewMode === 'teachers' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Teacher</th>
                          <th className="px-3 py-2 font-semibold">Current class</th>
                          <th className="px-3 py-2 font-semibold">Location</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.teachers ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-muted">
                              No teachers in current periods.
                            </td>
                          </tr>
                        ) : (
                          data.teachers.map((t) => (
                            <tr
                              key={t.timetableId}
                              className="cursor-pointer border-t border-border/70 hover:bg-slate-50"
                              onClick={() => focusRoom(t.room.toLowerCase())}
                            >
                              <td className="px-3 py-2.5 font-medium">{t.teacher}</td>
                              <td className="px-3 py-2.5">{t.className}</td>
                              <td className="px-3 py-2.5">{t.room}</td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${liveStatusBadge(t.status)}`}>
                                  {t.status === 'LATE' && t.minutesLate
                                    ? `${t.minutesLate} min late`
                                    : liveStatusLabel(t.status)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(data.courses ?? []).length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted">No courses in current periods.</p>
                    ) : (
                      data.courses.map((course) => (
                        <div key={course.subject} className="rounded-xl border border-border p-3">
                          <p className="font-bold text-navy">{course.subject}</p>
                          <ul className="mt-2 space-y-1.5">
                            {course.classes.map((c) => (
                              <li
                                key={`${course.subject}-${c.className}`}
                                className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                                onClick={() => focusRoom(c.room.toLowerCase())}
                              >
                                <span>
                                  {c.className} → {c.room}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${liveStatusBadge(c.status)}`}>
                                  {c.status === 'LATE' && c.minutesLate
                                    ? `${c.minutesLate} min late`
                                    : liveStatusLabel(c.status)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <div className="hr-card p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-navy">
                  <AlertTriangle size={16} className="text-amber-600" /> Needs attention
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                    <span className="text-red-900">Not checked in</span>
                    <span className="font-bold text-red-700">{data.needsAttention.missing}</span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                    <span className="text-amber-900">Late teachers</span>
                    <span className="font-bold text-amber-700">{data.needsAttention.late}</span>
                  </li>
                  {data.needsAttention.conflicts > 0 ? (
                    <li className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2">
                      <span className="text-orange-900">Classroom conflicts</span>
                      <span className="font-bold text-orange-700">{data.needsAttention.conflicts}</span>
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="hr-card flex max-h-[240px] flex-col overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-bold text-navy">
                  <Bell size={16} /> Live alerts
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {(data.alerts ?? []).length === 0 ? (
                    <p className="px-2 py-4 text-xs text-muted">No alerts yet today.</p>
                  ) : (
                    data.alerts.map((alert: LiveAlert) => (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => focusRoom(alert.mapKey)}
                        className="mb-1.5 w-full rounded-lg border border-border/60 px-3 py-2 text-left text-xs hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${liveStatusDot(
                              alert.type === 'CHECK_IN'
                                ? 'ON_TIME'
                                : alert.type === 'LATE'
                                  ? 'LATE'
                                  : alert.type === 'EARLY_DEPARTURE'
                                    ? 'LATE'
                                    : alert.type === 'MISSING_CHECKOUT'
                                      ? 'MISSING'
                                      : 'MISSING'
                            )}`}
                          />
                          <span className="font-semibold text-navy">
                            {new Date(alert.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 font-medium">{alert.message}</p>
                        <p className="text-muted">
                          {alert.room} · {alert.className} · {alert.subject}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="min-h-[280px] flex-1">
                {selectedRoom ? (
                  <DetailsPanel room={selectedRoom} onClose={() => setSelectedKey(null)} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50/50 px-6 py-10 text-center">
                    <Layers size={28} className="text-muted" />
                    <p className="mt-3 text-sm font-bold text-navy">Live details</p>
                    <p className="mt-1 text-xs text-muted">
                      Select a classroom on the map to view its current activity.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>

          <section className="hr-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-navy">Running lessons</h3>
                <p className="text-xs text-muted">
                  Last refresh {data.refreshedAt ? new Date(data.refreshedAt).toLocaleTimeString() : '—'}
                </p>
              </div>
              <Link href="/live-history" className="text-xs font-semibold text-[#FCB038] hover:underline">
                View live history →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-navy">Period</th>
                    <th className="px-4 py-3 font-semibold text-navy">Location</th>
                    <th className="px-4 py-3 font-semibold text-navy">Subject</th>
                    <th className="px-4 py-3 font-semibold text-navy">Teacher</th>
                    <th className="px-4 py-3 font-semibold text-navy">QR</th>
                    <th className="px-4 py-3 font-semibold text-navy">Attendance</th>
                    <th className="px-4 py-3 font-semibold text-navy">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.grid ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted">
                        No current periods in the grid.
                      </td>
                    </tr>
                  ) : (
                    data.grid.map((row) => (
                      <tr
                        key={row.timetableId}
                        className="cursor-pointer border-t border-border/70 hover:bg-slate-50"
                        onClick={() => focusRoom(row.classroom.toLowerCase())}
                      >
                        <td className="px-4 py-3 font-medium text-navy">{row.time}</td>
                        <td className="px-4 py-3">{row.classroom}</td>
                        <td className="px-4 py-3 font-semibold text-navy">{row.subject}</td>
                        <td className="px-4 py-3">{row.teacher}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              row.qrVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.qrVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{row.attendance}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${liveStatusBadge(row.punctuality === 'MISSED' ? 'MISSING' : row.punctuality === 'LATE' || row.punctuality === 'VERY_LATE' ? 'LATE' : 'ON_TIME')}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </HrPageLayout>
  );
}
