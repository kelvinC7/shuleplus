'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Radio,
  LogIn,
  LogOut,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  PageShell,
  KpiGrid,
  Panel,
  filterSelectClass,
  PersonAvatar,
} from '@/components/attendance-ui';
import { AttendanceFilterBar, filterSummary, useAttendanceFilters } from '@/components/attendance-filters';
import { StatusBadge } from '@/components/status-badge';
import {
  attendanceApi,
  type LiveMonitorData,
  type AttendanceRecord,
} from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

function formatTime(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Kigali',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function EventRow({
  record,
  selected,
  onSelect,
}: {
  record: AttendanceRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const isEntry = record.direction === 'ENTRY' || Boolean(record.entryTime && !record.exitTime);
  const isStaff = record.personType === 'STAFF';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-3 py-3 text-left transition sm:px-4 ${
        selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-white hover:border-primary/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <PersonAvatar
          name={record.studentName}
          photoUrl={record.photoUrl}
          personKind={record.personType ?? (isStaff ? 'STAFF' : 'STUDENT')}
          size={52}
          badge={
            isEntry ? (
              <LogIn className="h-3 w-3 text-emerald-600" />
            ) : (
              <LogOut className="h-3 w-3 text-slate-500" />
            )
          }
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] text-muted">{formatTime(record.entryTime || record.exitTime)}</p>
            <div className="flex items-center gap-1.5">
              {isStaff ? (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">
                  Staff
                </span>
              ) : (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700">
                  Student
                </span>
              )}
              <StatusBadge status={record.status} />
            </div>
          </div>
          <p className="mt-1 font-bold text-navy">{record.studentName}</p>
          <p className="text-xs text-muted">
            {record.studentCode || '-'} · {record.className || (isStaff ? 'Staff' : '·')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                isEntry ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isEntry ? 'ENTRY' : 'EXIT'}
            </span>
            <span className="text-[11px] text-muted">
              {record.gateName || record.deviceCode || 'Gate'}
              {record.cardNumber ? ` · Card …${record.cardNumber.slice(-4)}` : ''}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function LiveMonitorView() {
  const toast = useToast();
  const { filters, setFilters, params, academic } = useAttendanceFilters({ mode: 'today' });
  const [data, setData] = useState<LiveMonitorData | null>(null);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [eventFilter, setEventFilter] = useState('all');
  const [personType, setPersonType] = useState<'ALL' | 'STUDENT' | 'STAFF'>('ALL');

  const load = useCallback(async () => {
    try {
      const { data: res } = await attendanceApi.liveMonitor({
        ...params,
        personType: personType === 'ALL' ? undefined : personType,
      });
      setData(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Monitor refresh failed'));
    }
  }, [params, personType, toast]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(t);
  }, [load]);

  const k = data?.kpis ?? {};
  const readersOnline = (data?.devices ?? []).filter((d) => d.status === 'ONLINE').length;
  const readersTotal = data?.devices?.length ?? 0;

  const movement = (data?.movement ?? []).filter((m) => {
    if (eventFilter === 'entry') return m.direction === 'ENTRY' || Boolean(m.entryTime && !m.exitTime);
    if (eventFilter === 'exit') return m.direction === 'EXIT' || Boolean(m.exitTime);
    if (eventFilter === 'late') return m.status === 'LATE';
    if (eventFilter === 'staff') return m.personType === 'STAFF';
    if (eventFilter === 'student') return m.personType !== 'STAFF';
    return true;
  });

  return (
    <PageShell
      title="Live Monitor"
      subtitle={data?.filterPeriod ?? filterSummary(filters, academic)}
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          System online
        </span>
      }
      actions={
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
    >
      <KpiGrid
        columns={3}
        items={[
          {
            label: 'Student entries',
            value: k.studentEntries ?? 0,
            hint: `${k.present ?? 0} unique gate reads today`,
            icon: <LogIn size={18} />,
          },
          {
            label: 'Student exits',
            value: k.exited ?? 0,
            hint: `${k.inside ?? 0} students still on campus`,
            icon: <LogOut size={18} />,
          },
          {
            label: 'Students (reads)',
            value: k.present ?? 0,
            hint: `Entry-only or exit-only both count`,
            icon: <GraduationCap size={18} />,
          },
          {
            label: 'Staff on site',
            value: k.staffInside ?? 0,
            hint: `${k.staffPresent ?? 0} of ${k.enrolledStaffRoster ?? k.enrolledStaff ?? '—'} roster · HR/TT/IAM`,
            icon: <Briefcase size={18} />,
          },
          { label: 'Alerts', value: k.securityAlerts ?? 0, icon: <AlertTriangle size={18} /> },
          { label: 'Readers', value: `${readersOnline}/${readersTotal || 0}`, icon: <Radio size={18} /> },
        ]}
      />

      {(data?.devices?.length ?? 0) > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data!.devices.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{d.gateName || d.name}</p>
                <p className="font-mono text-[10px] text-muted">{d.deviceCode}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                  d.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    d.status === 'ONLINE' ? 'animate-pulse bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                {d.status === 'ONLINE' ? 'Online' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <AttendanceFilterBar
        filters={filters}
        setFilters={setFilters}
        academic={academic}
        showClassFilter
        searchPlaceholder="Search person, code, card…"
        extra={
          <>
            <select
              className={filterSelectClass}
              value={personType}
              onChange={(e) => setPersonType(e.target.value as 'ALL' | 'STUDENT' | 'STAFF')}
            >
              <option value="ALL">Everyone</option>
              <option value="STUDENT">Students</option>
              <option value="STAFF">Staff</option>
            </select>
            <select
              className={filterSelectClass}
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="all">All events</option>
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
              <option value="late">Late</option>
              <option value="student">Students</option>
              <option value="staff">Staff</option>
            </select>
            <span className="hidden text-xs text-muted lg:inline">
              Updated {data?.refreshedAt ? new Date(data.refreshedAt).toLocaleTimeString() : '·'}
            </span>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel title="Live event stream">
          <div className="max-h-[36rem] space-y-2 overflow-y-auto pr-1">
            {movement.map((m) => (
              <EventRow
                key={m.id}
                record={m}
                selected={selected?.id === m.id}
                onSelect={() => setSelected(m)}
              />
            ))}
            {movement.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Waiting for scans…</p>
            ) : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Event details">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <PersonAvatar
                    name={selected.studentName}
                    photoUrl={selected.photoUrl}
                    personKind={selected.personType ?? (selected.level?.startsWith('STAFF:') ? 'STAFF' : 'STUDENT')}
                    size={64}
                  />
                  <div>
                    <p className="font-bold text-navy">{selected.studentName}</p>
                    <p className="text-xs text-muted">
                      {selected.studentCode || '-'} · {selected.className || 'Staff'}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Entry</dt>
                    <dd className="font-medium">{formatTime(selected.entryTime)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Exit</dt>
                    <dd className="font-medium">{formatTime(selected.exitTime)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Gate / Reader</dt>
                    <dd>{selected.gateName || selected.deviceCode || '-'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Access card</dt>
                    <dd className="font-mono text-xs">{selected.cardNumber || '-'}</dd>
                  </div>
                </dl>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                  {selected.status === 'LATE' ? (
                    <XCircle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  <span className="font-medium text-navy">
                    {selected.direction === 'ENTRY' || selected.entryTime ? 'Entry recorded' : 'Exit recorded'}
                  </span>
                </div>
                {selected.parentSms ? (
                  <div
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      selected.parentSms.status === 'SENT'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : selected.parentSms.status === 'FAILED'
                          ? 'border-amber-200 bg-amber-50 text-amber-950'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="font-semibold">Parent SMS · {selected.parentSms.status}</p>
                    <p className="mt-0.5 opacity-90">{selected.parentSms.detail}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted">No parent SMS log for this student yet today.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">Select an event to view person details and photo.</p>
            )}
          </Panel>

          <Panel title="Active alerts">
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {(data?.alerts ?? []).map((a) => (
                <div key={a.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                  <p className="font-semibold text-navy">{a.title}</p>
                  <p className="text-muted">{a.message}</p>
                </div>
              ))}
              {(data?.alerts?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted">No active alerts.</p>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
