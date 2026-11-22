'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bus,
  CheckCircle2,
  Loader2,
  Play,
  Square,
  QrCode,
  FileDown,
  RefreshCw,
  Search,
  UserX,
  WifiOff,
} from 'lucide-react';
import { TransportRecordsTable, type RecordsColumn } from '@/components/transport-records-table';
import { useAuth } from '@/contexts/auth-context';
import {
  downloadTransportReportPdf,
  fetchAllAttendanceHistory,
} from '@/utils/transport-report-pdf';
import { QrScannerPanel } from '@/components/qr-scanner-panel';
import { StatusBadge } from '@/components/status-badge';
import { TransportPageLayout } from '@/components/transport-page-layout';
import {
  transportApi,
  type AttendanceDashboard,
  type AttendanceHistoryRow,
  type AttendanceRouteOption,
  type TransportEventType,
} from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatDate, formatTime } from '@/utils/format';
import { joinParts, orEmpty } from '@/utils/empty';
import {
  enqueueOffline,
  newIdempotencyKey,
  readOfflineQueue,
  removeOfflineKeys,
} from '@/modules/attendance/attendance-offline';
import { AttendanceEventDetailDrawer } from '@/modules/attendance/attendance-event-detail-drawer';

const EVENT_OPTIONS: { value: TransportEventType; label: string; short: string }[] = [
  { value: 'BOARDING_TO_SCHOOL', label: 'Morning boarding', short: 'Morning boarding' },
  { value: 'ARRIVED_AT_SCHOOL', label: 'Arrived at school', short: 'School arrival' },
  { value: 'BOARDING_TO_HOME', label: 'Return boarding', short: 'Return boarding' },
  { value: 'DROPPED_OFF_HOME', label: 'Home drop-off', short: 'Home drop-off' },
];

function eventLabel(type: string) {
  return EVENT_OPTIONS.find((e) => e.value === type)?.label ?? type;
}

function isSchoolEvent(type: TransportEventType) {
  return type === 'BOARDING_TO_SCHOOL' || type === 'ARRIVED_AT_SCHOOL';
}

function defaultEventForDirection(dir: 'TO_SCHOOL' | 'TO_HOME'): TransportEventType {
  return dir === 'TO_SCHOOL' ? 'BOARDING_TO_SCHOOL' : 'BOARDING_TO_HOME';
}

function coerceEventType(dir: 'TO_SCHOOL' | 'TO_HOME', current: TransportEventType): TransportEventType {
  if (dir === 'TO_SCHOOL' && !isSchoolEvent(current)) return defaultEventForDirection('TO_SCHOOL');
  if (dir === 'TO_HOME' && isSchoolEvent(current)) return defaultEventForDirection('TO_HOME');
  return current;
}

function formatNotifySummary(notifications: AttendanceHistoryRow['notifications']) {
  if (!notifications?.length) return { line: 'None', title: undefined as string | undefined };
  const app = notifications.find((n) => n.channel === 'APP' || n.channel === 'PUSH');
  const sms = notifications.find((n) => n.channel === 'SMS');
  const parts: string[] = [];
  if (app) parts.push(`App: ${app.status}`);
  if (sms) parts.push(`SMS: ${sms.status}`);
  const failed = [app, sms].find((n) => n && (n.status === 'FAILED' || n.status === 'RETRYING'));
  return {
    line: parts.join(' · ') || notifications[0]?.status || 'None',
    title: failed?.providerRef ?? undefined,
  };
}

function isoDateLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDate(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return isoDateLocal(d);
}

type TabId = 'overview' | 'manual' | 'qr' | 'rfid' | 'history';
type DatePreset = 'today' | 'yesterday' | 'custom';

export function RouteAttendanceView() {
  const toast = useToast();
  const { organizationName } = useAuth();
  const [tab, setTab] = useState<TabId>('overview');
  const [routes, setRoutes] = useState<AttendanceRouteOption[]>([]);
  const [routeId, setRouteId] = useState('');
  const [direction, setDirection] = useState<'TO_SCHOOL' | 'TO_HOME'>('TO_SCHOOL');
  const [serviceDate, setServiceDate] = useState(() => isoDateLocal());
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [tripId, setTripId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<TransportEventType>('BOARDING_TO_SCHOOL');
  const [dashboard, setDashboard] = useState<AttendanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [offlineCount, setOfflineCount] = useState(0);
  const [online, setOnline] = useState(true);

  const [historyRows, setHistoryRows] = useState<AttendanceHistoryRow[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(15);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyExporting, setHistoryExporting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyQ, setHistoryQ] = useState('');
  const [historyFrom, setHistoryFrom] = useState(() => isoDateLocal());
  const [historyTo, setHistoryTo] = useState(() => isoDateLocal());
  const [historyEventFilter, setHistoryEventFilter] = useState<string>('');
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);
  const [qrActive, setQrActive] = useState(false);

  const selectedRoute = routes.find((r) => r.id === routeId);

  const syncDirectionEvent = useCallback((dir: 'TO_SCHOOL' | 'TO_HOME') => {
    setTripId(null);
    setEventType((prev) => coerceEventType(dir, prev));
  }, []);

  const flushOffline = useCallback(async () => {
    const queue = readOfflineQueue();
    if (!queue.length || !navigator.onLine) return;
    try {
      const { data } = await transportApi.attendanceSync(queue);
      const okKeys = data.data.filter((r) => r.ok).map((r) => r.idempotencyKey);
      removeOfflineKeys(okKeys);
      setOfflineCount(readOfflineQueue().length);
      if (okKeys.length) toast.success(`Synchronized ${okKeys.length} offline attendance event(s)`);
    } catch {
      /* keep queue */
    }
  }, [toast]);

  const loadRoutes = useCallback(async () => {
    const { data } = await transportApi.attendanceRoutes();
    setRoutes(data.data ?? []);
    setRouteId((prev) => prev || data.data?.[0]?.id || '');
  }, []);

  const ensureTrip = useCallback(async () => {
    if (!routeId) return null;
    const { data } = await transportApi.attendanceEnsureTrip({
      routeId,
      direction,
      serviceDate,
      busId: selectedRoute?.primaryBusId ?? selectedRoute?.buses[0]?.id,
    });
    const trip = data.data;
    setTripId(trip.id);
    return trip.id;
  }, [routeId, direction, serviceDate, selectedRoute]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      let id = tripId;
      if (!id) id = await ensureTrip();
      if (!id) return;
      const { data } = await transportApi.attendanceDashboard(id, eventType);
      setDashboard(data.data);
      setTripId(data.data.trip.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load attendance'));
    } finally {
      setLoading(false);
    }
  }, [tripId, ensureTrip, eventType, toast]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await transportApi.attendanceHistory({
        page: historyPage,
        limit: historyPageSize,
        q: historyQ || undefined,
        tripId: tripId ?? undefined,
        routeId: routeId || undefined,
        from: historyFrom || undefined,
        to: historyTo || undefined,
        eventType: (historyEventFilter || undefined) as TransportEventType | undefined,
      });
      setHistoryRows(data.data.rows);
      setHistoryTotal(data.data.total);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load history'));
    } finally {
      setHistoryLoading(false);
    }
  }, [
    historyPage,
    historyPageSize,
    historyQ,
    historyFrom,
    historyTo,
    historyEventFilter,
    tripId,
    routeId,
    toast,
  ]);

  const historyQueryBase = useCallback(
    () => ({
      q: historyQ.trim() || undefined,
      tripId: tripId ?? undefined,
      routeId: routeId || undefined,
      from: historyFrom || undefined,
      to: historyTo || undefined,
      eventType: (historyEventFilter || undefined) as TransportEventType | undefined,
    }),
    [historyQ, tripId, routeId, historyFrom, historyTo, historyEventFilter]
  );

  const exportHistoryPdf = useCallback(async () => {
    setHistoryExporting(true);
    try {
      const all = (await fetchAllAttendanceHistory(async (p, limit) => {
        const { data } = await transportApi.attendanceHistory({
          ...historyQueryBase(),
          page: p,
          limit,
        });
        return { rows: data.data.rows, total: data.data.total };
      })) as AttendanceHistoryRow[];

      const filterParts = [
        historyFrom && historyTo ? `${historyFrom} to ${historyTo}` : null,
        historyEventFilter ? eventLabel(historyEventFilter) : null,
        historyQ.trim() ? `Search: ${historyQ.trim()}` : null,
      ].filter(Boolean);

      await downloadTransportReportPdf({
        meta: {
          organizationName: organizationName ?? 'School',
          reportTitle: 'Route Attendance History',
          subtitle: 'Transport safety and parent notifications',
          filterSummary: filterParts.length ? filterParts.join(' · ') : undefined,
        },
        filename: `route-attendance-history-${historyFrom}-${historyTo}.pdf`,
        head: ['#', 'Learner', 'Code', 'Event', 'Route', 'Bus', 'Date', 'Time', 'Method', 'Notify'],
        body: all.map((r, i) => {
          const { line } = formatNotifySummary(r.notifications);
          return [
            String(i + 1),
            r.studentName,
            r.studentCode ?? '',
            eventLabel(r.eventType),
            r.routeName ?? '',
            r.busCode ?? '',
            formatDate(r.scannedAt),
            formatTime(r.scannedAt),
            r.attendanceMethod ?? '',
            line,
          ];
        }),
      });
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'PDF export failed'));
    } finally {
      setHistoryExporting(false);
    }
  }, [historyQueryBase, historyFrom, historyTo, historyEventFilter, historyQ, organizationName, toast]);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      void flushOffline();
    };
    const off = () => setOnline(false);
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    setOfflineCount(readOfflineQueue().length);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [flushOffline]);

  useEffect(() => {
    setTripId(null);
    setDashboard(null);
  }, [routeId, direction, serviceDate]);

  useEffect(() => {
    if (!routeId) return;
    void loadDashboard();
  }, [routeId, direction, serviceDate, eventType, loadDashboard]);

  function applyDatePreset(preset: DatePreset) {
    setDatePreset(preset);
    const today = isoDateLocal();
    if (preset === 'today') setServiceDate(today);
    else if (preset === 'yesterday') setServiceDate(shiftDate(today, -1));
  }

  useEffect(() => {
    if (tab === 'history') void loadHistory();
  }, [tab, loadHistory]);

  const historyColumns: RecordsColumn<AttendanceHistoryRow>[] = useMemo(
    () => [
      {
        key: 'learner',
        header: 'Learner',
        mobileLabel: 'Learner',
        render: (r) => (
          <div>
            <p className="font-semibold text-[#000435]">{r.studentName}</p>
            <p className="text-xs text-muted md:hidden">{r.studentCode}</p>
          </div>
        ),
      },
      {
        key: 'code',
        header: 'Code',
        hideOnMobile: true,
        render: (r) => <span className="text-muted">{r.studentCode ?? ''}</span>,
      },
      {
        key: 'event',
        header: 'Event',
        render: (r) => <span className="text-sm">{eventLabel(r.eventType)}</span>,
      },
      {
        key: 'route',
        header: 'Route / bus',
        render: (r) => (
          <span className="text-sm text-muted">{joinParts([orEmpty(r.routeName), orEmpty(r.busCode)])}</span>
        ),
      },
      {
        key: 'time',
        header: 'Time',
        render: (r) => (
          <span className="whitespace-nowrap text-sm tabular-nums">
            {formatDate(r.scannedAt)} {formatTime(r.scannedAt)}
          </span>
        ),
      },
      {
        key: 'method',
        header: 'Method',
        hideOnMobile: true,
        render: (r) => r.attendanceMethod ?? '',
      },
      {
        key: 'notify',
        header: 'Notify',
        mobileLabel: 'Parent notify',
        render: (r) => {
          const { line, title } = formatNotifySummary(r.notifications);
          return (
            <span title={title} className={`text-xs ${title ? 'underline decoration-dotted' : ''}`}>
              {line}
            </span>
          );
        },
      },
    ],
    []
  );

  const roster = dashboard?.roster ?? [];
  const classes = useMemo(
    () => [...new Set(roster.map((r) => r.className).filter(Boolean))].sort() as string[],
    [roster]
  );

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster.filter((r) => {
      if (classFilter && r.className !== classFilter) return false;
      if (!q) return true;
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        (r.className?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [roster, search, classFilter]);

  const groupedByStop = useMemo(() => {
    const map = new Map<string, typeof filteredRoster>();
    for (const row of filteredRoster) {
      const key = row.assignedStopName ?? 'Unassigned stop';
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRoster]);

  async function recordManual(studentCode: string, action: 'CONFIRM' | 'ABSENT') {
    if (!tripId) return;
    setBusyCode(studentCode);
    const idempotencyKey = newIdempotencyKey(`manual-${studentCode}`);
    const clientRecordedAt = new Date().toISOString();
    try {
      if (!online) {
        enqueueOffline({
          tripId,
          eventType,
          studentCode,
          action,
          idempotencyKey,
          clientRecordedAt,
          method: 'MANUAL',
        });
        setOfflineCount(readOfflineQueue().length);
        toast.info('Saved offline. Will sync when connected.');
        await loadDashboard();
        return;
      }
      await transportApi.attendanceRecord({
        tripId,
        eventType,
        studentCode,
        action,
        idempotencyKey,
        clientRecordedAt,
      });
      toast.success(action === 'CONFIRM' ? 'Attendance confirmed' : 'Absence recorded');
      await loadDashboard();
      void flushOffline();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save attendance'));
    } finally {
      setBusyCode(null);
    }
  }

  async function processQr(cardNumber: string) {
    if (!tripId || !dashboard) {
      toast.error('Select a route and trip first');
      return;
    }
    const idempotencyKey = newIdempotencyKey('qr');
    try {
      if (!online) {
        toast.error('QR scan requires connection, or use manual attendance offline');
        return;
      }
      const { data } = await transportApi.tap({
        cardNumber,
        busCode: dashboard.trip.bus.code,
        tripId,
        eventType,
        attendanceMethod: 'QR',
        idempotencyKey,
      });
      toast.success(data.data.parentMessage ?? `${data.data.student.name} recorded`);
      await loadDashboard();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Scan failed'));
    }
  }

  async function endRoute() {
    const id = tripId ?? dashboard?.trip.id;
    if (!id) return;
    if (!window.confirm('End this route for today? Recorded attendance is kept.')) return;
    try {
      await transportApi.completeTrip(id);
      toast.success('Route ended');
      await loadDashboard();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not end route'));
    }
  }

  async function startJourney() {
    if (!routeId) return;
    if (
      !window.confirm(
        direction === 'TO_SCHOOL'
          ? 'Start morning pickup route and notify parents?'
          : 'Start afternoon home route and notify parents?'
      )
    ) {
      return;
    }

    const today = isoDateLocal();
    setServiceDate(today);
    setDatePreset('today');

    try {
      const { data: ensured } = await transportApi.attendanceEnsureTrip({
        routeId,
        direction,
        serviceDate: today,
        busId: selectedRoute?.primaryBusId ?? selectedRoute?.buses[0]?.id,
      });
      const activeTripId = ensured.data.id;
      setTripId(activeTripId);

      const { data: started } = await transportApi.attendanceStartJourney(activeTripId);
      const payload = started.data;
      if (payload.alreadyStarted) {
        toast.info(`Route already started at ${formatTime(payload.startedAt)}`);
      } else {
        toast.success(
          `Pickup route started ${formatTime(payload.startedAt)} · ${payload.parentsNotified} parent alert(s) queued (each stop is personalized)`
        );
      }
      await loadDashboard();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not start journey'));
    }
  }

  async function bulkConfirmAll() {
    if (!tripId || !dashboard) return;
    const pending = dashboard.roster.filter((r) => r.status === 'NOT_RECORDED').map((r) => r.studentCode);
    if (!pending.length) return;
    if (!window.confirm(`Mark ${pending.length} learner(s) as confirmed for ${eventLabel(eventType)}?`)) return;
    try {
      await transportApi.attendanceBulkConfirm({
        tripId,
        eventType,
        studentCodes: pending,
        idempotencyPrefix: newIdempotencyKey('bulk'),
      });
      toast.success('Bulk confirmation completed');
      await loadDashboard();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Bulk confirm failed'));
    }
  }

  const stats = dashboard?.stats;
  const progress =
    stats && stats.expected > 0 ? Math.round((stats.confirmed / stats.expected) * 100) : 0;

  const workTabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'manual', label: 'Manual' },
    { id: 'qr', label: 'Scan QR' },
    { id: 'rfid', label: 'Tap RFID' },
    { id: 'history', label: 'History' },
  ];

  useEffect(() => {
    if (tab !== 'qr') setQrActive(false);
  }, [tab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-wrap items-center gap-2">
          {!online ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
              <WifiOff size={14} /> Offline
              {offlineCount > 0 ? ` · ${offlineCount} queued` : ''}
            </span>
          ) : null}
          <button type="button" className="btn-secondary text-sm" onClick={() => void loadDashboard()}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Date</span>
          {(
            [
              ['today', 'Today'],
              ['yesterday', 'Yesterday'],
              ['custom', 'Custom'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                datePreset === key
                  ? 'rounded-full bg-[#000435] px-3 py-1.5 text-xs font-medium text-white'
                  : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50'
              }
              onClick={() => applyDatePreset(key)}
            >
              {label}
            </button>
          ))}
          {datePreset === 'custom' ? (
            <input
              type="date"
              className="input max-w-[160px]"
              value={serviceDate}
              onChange={(e) => {
                setServiceDate(e.target.value);
                setDatePreset('custom');
              }}
            />
          ) : (
            <span className="text-sm font-medium text-[#000435]">{formatDate(serviceDate)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-medium text-muted">
          Route
          <select
 className="input"
 value={routeId}
 onChange={(e) => {
 setTripId(null);
 setRouteId(e.target.value);
 }}
 >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} · {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-muted">
          Journey
          <select
            className="input"
            value={direction}
            onChange={(e) => {
              const d = e.target.value as 'TO_SCHOOL' | 'TO_HOME';
              setDirection(d);
              syncDirectionEvent(d);
            }}
          >
            <option value="TO_SCHOOL">Morning (to school)</option>
            <option value="TO_HOME">Afternoon (to home)</option>
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-muted">
          Attendance event
          <select
            className="input"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as TransportEventType)}
          >
            {EVENT_OPTIONS.filter((opt) =>
              direction === 'TO_SCHOOL'
                ? opt.value === 'BOARDING_TO_SCHOOL' || opt.value === 'ARRIVED_AT_SCHOOL'
                : opt.value === 'BOARDING_TO_HOME' || opt.value === 'DROPPED_OFF_HOME'
            ).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        </div>
      </div>

      {dashboard ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#000435] to-[#0a1454] p-5 text-white shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-semibold">
                {selectedRoute?.code ?? 'Route'} · {dashboard.trip.route?.name ?? selectedRoute?.name}
              </p>
              <p className="mt-1 text-sm text-white/85">
                {joinParts([
                  dashboard.trip.bus.code,
                  dashboard.trip.bus.plateNumber,
                  eventLabel(eventType),
                ])}
              </p>
              <p className="mt-2 text-xs text-white/65">
                {joinParts([
                  dashboard.trip.driver?.name ? `Driver ${dashboard.trip.driver.name}` : null,
                  (dashboard.trip.attendant?.name ?? selectedRoute?.supervisors[0]?.name)
                    ? `Supervisor ${dashboard.trip.attendant?.name ?? selectedRoute?.supervisors[0]?.name}`
                    : null,
                  dashboard.trip.startedAt
                    ? `Started ${formatTime(dashboard.trip.startedAt)}`
                    : null,
                ])}
              </p>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
              <StatusBadge
                status={
                  dashboard.trip.status === 'COMPLETED'
                    ? 'COMPLETED'
                    : dashboard.trip.startedAt
                      ? 'LIVE'
                      : 'SCHEDULED'
                }
              />
              {!dashboard.trip.startedAt ? (
                <p className="text-xs text-white/75 sm:max-w-xs sm:text-right">
                  Notify parents when the driver starts the pickup route.
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {!dashboard.trip.startedAt ? (
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#FCB038] px-4 py-2.5 text-sm font-semibold text-[#000435] hover:brightness-105 sm:w-auto"
                    onClick={() => void startJourney()}
                  >
                    <Play size={16} />
                    Start pickup route
                  </button>
                ) : dashboard.trip.status !== 'COMPLETED' ? (
                  <>
                    <span className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/25 px-4 py-2 text-center text-sm font-medium text-white/90">
                      Started {formatTime(dashboard.trip.startedAt!)}
                    </span>
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#FCB038] bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 sm:w-auto"
                      onClick={() => void endRoute()}
                    >
                      <Square size={16} fill="currentColor" />
                      End route
                    </button>
                  </>
                ) : (
                  <span className="text-sm font-medium text-white/80">Route completed</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {workTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === t.id
                  ? 'border-[#FCB038] text-[#000435]'
                  : 'border-transparent text-muted hover:text-[#000435]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <TransportPageLayout
          kpis={[
            { label: 'Expected', value: stats?.expected ?? 0 },
            { label: 'Confirmed', value: stats?.confirmed ?? 0 },
            { label: 'Pending', value: stats?.notRecorded ?? 0 },
            {
              label: 'Notify',
              value: stats
                ? `${stats.notifications.delivered}/${stats.notifications.total || stats.confirmed}`
                : 0,
            },
          ]}
        >
          <div className="hr-card p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-[#000435]">Attendance progress</span>
              <span>
                {stats?.confirmed ?? 0} of {stats?.expected ?? 0} confirmed ({progress}%)
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#FCB038] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-4 text-sm font-medium text-[#000435]">Needs attention</p>
            <ul className="mt-2 space-y-2">
              {loading ? (
                <li className="text-muted">Loading…</li>
              ) : roster.filter((r) => r.status === 'NOT_RECORDED').length === 0 ? (
                <li className="text-muted">Everyone recorded for this event.</li>
              ) : (
                roster
                  .filter((r) => r.status === 'NOT_RECORDED')
                  .slice(0, 12)
                  .map((r) => (
                    <li key={r.studentCode} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <span>
                        {r.studentName} · {r.studentCode}
                      </span>
                      <StatusBadge status="PENDING" />
                    </li>
                  ))
              )}
            </ul>
          </div>
        </TransportPageLayout>
      )}

      {tab === 'manual' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="input pl-9"
                placeholder="Search name or ShuleCode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="button" className="btn-secondary text-sm" onClick={() => void bulkConfirmAll()}>
              Confirm all pending
            </button>
          </div>
          {loading ? (
            <p className="flex items-center gap-2 text-muted">
              <Loader2 className="animate-spin" size={18} /> Loading roster…
            </p>
          ) : (
            groupedByStop.map(([stopName, rows]) => (
              <div key={stopName} className="hr-card overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-sm font-medium text-[#000435]">
                  {stopName}
                </div>
                <ul className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <li key={r.studentCode} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-[#000435]">{r.studentName}</p>
                        <p className="text-xs text-muted">
                          {joinParts([r.studentCode, r.className ?? ''])}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {r.status === 'RECORDED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={14} /> Confirmed
                          </span>
                        ) : r.status === 'ABSENT' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                            <UserX size={14} /> Absent
                          </span>
                        ) : (
                          <StatusBadge status="PENDING" />
                        )}
                        {r.status === 'NOT_RECORDED' ? (
                          <>
                            <button
                              type="button"
                              className="btn-primary min-h-[44px]"
                              disabled={busyCode === r.studentCode}
                              onClick={() => void recordManual(r.studentCode, 'CONFIRM')}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="btn-secondary min-h-[44px]"
                              disabled={busyCode === r.studentCode}
                              onClick={() => void recordManual(r.studentCode, 'ABSENT')}
                            >
                              Absent
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'qr' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#000435]">
                {eventLabel(eventType)} · {dashboard?.trip.bus.code ?? 'Bus'}
              </p>
              {qrActive ? (
                <button type="button" className="btn-secondary text-sm" onClick={() => setQrActive(false)}>
                  <Square size={14} /> Stop QR
                </button>
              ) : (
                <button type="button" className="btn-primary text-sm" onClick={() => setQrActive(true)}>
                  <QrCode size={16} /> Start QR
                </button>
              )}
            </div>
            {qrActive ? (
              <QrScannerPanel
                active
                onScan={(value) => void processQr(value)}
                onStop={() => setQrActive(false)}
              />
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center sm:min-h-[280px]">
                <QrCode size={40} className="mb-3 text-[#FCB038]" strokeWidth={1.5} />
                <p className="text-sm text-muted">Camera is off. Start QR when you are ready to scan.</p>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4">
            <p className="text-sm font-semibold text-[#000435]">Type card number</p>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                void processQr(String(fd.get('card') ?? ''));
              }}
            >
              <input name="card" className="input flex-1" placeholder="Card or QR value" required />
              <button type="submit" className="btn-primary shrink-0">
                Record
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'rfid' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4">
            <p className="text-sm font-semibold text-[#000435]">Bus readers</p>
            <ul className="mt-3 divide-y divide-slate-100">
              {(dashboard?.devices ?? []).length === 0 ? (
                <li className="py-6 text-center text-sm text-muted">No readers on this bus.</li>
              ) : (
                dashboard?.devices.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="font-medium text-navy">{d.deviceCode}</span>
                    <StatusBadge status={d.status} />
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4">
            <p className="text-sm font-semibold text-[#000435]">Simulate RFID tap</p>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                void processQr(String(fd.get('card') ?? ''));
              }}
            >
              <input name="card" className="input flex-1" placeholder="Card UID" />
              <button type="submit" className="btn-primary shrink-0">
                Record tap
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          <form
            className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/90 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setHistoryPage(1);
              void loadHistory();
            }}
          >
            <input
              type="date"
              className="input w-full min-w-[130px] sm:w-auto"
              aria-label="From date"
              value={historyFrom}
              onChange={(e) => setHistoryFrom(e.target.value)}
            />
            <input
              type="date"
              className="input w-full min-w-[130px] sm:w-auto"
              aria-label="To date"
              value={historyTo}
              onChange={(e) => setHistoryTo(e.target.value)}
            />
            <select
              className="input w-full min-w-[140px] sm:w-auto"
              value={historyEventFilter}
              onChange={(e) => setHistoryEventFilter(e.target.value)}
              aria-label="Event type"
            >
              <option value="">All events</option>
              {EVENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.short}
                </option>
              ))}
            </select>
            <input
              className="input min-w-[160px] flex-1"
              placeholder="Search learner or code"
              value={historyQ}
              onChange={(e) => setHistoryQ(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0">
              Search
            </button>
            <button
              type="button"
              className="btn-primary shrink-0"
              disabled={historyExporting}
              onClick={() => void exportHistoryPdf()}
            >
              <FileDown size={16} />
              {historyExporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </form>
          <TransportRecordsTable
            columns={historyColumns}
            rows={historyRows}
            rowKey={(r) => r.id}
            page={historyPage}
            pageSize={historyPageSize}
            total={historyTotal}
            loading={historyLoading}
            emptyMessage="No records match your filters."
            onPageChange={setHistoryPage}
            onPageSizeChange={(n) => {
              setHistoryPageSize(n);
              setHistoryPage(1);
            }}
            onRowClick={(r) => setHistoryDetailId(r.id)}
          />
        </div>
      )}

      <AttendanceEventDetailDrawer eventId={historyDetailId} onClose={() => setHistoryDetailId(null)} />
    </div>
  );
}
