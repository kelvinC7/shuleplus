'use client';

import { useCallback, useEffect, useState } from 'react';
import { AttendancePageLayout } from '@/components/attendance-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { attendanceApi } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

export function NotificationsView() {
  const toast = useToast();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof attendanceApi.notifications>>['data']['data']>([]);
  useEffect(() => {
    void attendanceApi
      .notifications()
      .then((r) => setRows(r.data.data))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed')));
  }, [toast]);
  return (
    <AttendancePageLayout kpis={[{ label: 'Notifications', value: rows.length }]}>
      <div className="space-y-3">
        {rows.map((n) => (
          <div key={n.id} className="hr-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-navy">{n.title}</p>
              <StatusBadge status={n.channel} />
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted">{n.message}</p>
            <p className="mt-2 text-xs text-muted">{n.studentName}</p>
          </div>
        ))}
      </div>
    </AttendancePageLayout>
  );
}

export function PermissionsView() {
  const toast = useToast();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof attendanceApi.permissions>>['data']['data']>([]);
  const load = useCallback(async () => {
    try {
      const { data } = await attendanceApi.permissions();
      setRows(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <AttendancePageLayout
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            void attendanceApi
              .createPermission({
                studentName: 'John Doe',
                className: 'S3 MPC',
                type: 'EARLY_DEPARTURE',
                reason: 'Medical appointment',
                forDate: new Date().toISOString().slice(0, 10),
              })
              .then(load)
          }
        >
          Sample request
        </button>
      }
      kpis={[{ label: 'Requests', value: rows.length }]}
    >
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="hr-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-navy">
                {r.studentName} · {r.type}
              </p>
              <p className="text-xs text-muted">{r.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} />
              {r.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary !py-1 text-xs"
                    onClick={() => void attendanceApi.approvePermission(r.id).then(load)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1 text-xs"
                    onClick={() => void attendanceApi.rejectPermission(r.id).then(load)}
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </AttendancePageLayout>
  );
}

export function ReplacementsView() {
  const toast = useToast();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof attendanceApi.replacements>>['data']['data']>([]);
  useEffect(() => {
    void attendanceApi
      .replacements()
      .then((r) => setRows(r.data.data))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed')));
  }, [toast]);
  return (
    <AttendancePageLayout kpis={[{ label: 'Replacement requests', value: rows.length }]}>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="hr-card p-4">
            <p className="font-semibold text-navy">{r.oldCard?.cardNumber}</p>
            <p className="text-sm text-muted">{r.reason || 'No reason'}</p>
            <StatusBadge status={r.status} />
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Mark a card as Lost from Smart Cards to open a replacement.</p>
        ) : null}
      </div>
    </AttendancePageLayout>
  );
}

export function SecurityView() {
  const toast = useToast();
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof attendanceApi.alerts>>['data']['data']>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof attendanceApi.auditLogs>>['data']['data']>([]);
  const load = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([attendanceApi.alerts(), attendanceApi.auditLogs()]);
      setAlerts(a.data.data);
      setLogs(l.data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <AttendancePageLayout kpis={[{ label: 'Alerts', value: alerts.length }, { label: 'Audit logs', value: logs.length }]}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase text-navy">Security alerts</h2>
          {alerts.map((a) => (
            <div key={a.id} className="hr-card p-4">
              <div className="flex justify-between gap-2">
                <p className="font-semibold text-navy">{a.title}</p>
                <StatusBadge status={a.severity} />
              </div>
              <p className="text-sm text-muted">{a.message}</p>
              {!a.resolved ? (
                <button
                  type="button"
                  className="btn-secondary mt-2 !py-1 text-xs"
                  onClick={() => void attendanceApi.resolveAlert(a.id).then(load)}
                >
                  Resolve
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase text-navy">Audit logs</h2>
          {logs.map((l) => (
            <div key={l.id} className="hr-card px-4 py-3 text-sm">
              <p className="font-semibold text-navy">{l.action}</p>
              <p className="text-xs text-muted">{l.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </AttendancePageLayout>
  );
}

export function ReportsView() {
  const toast = useToast();
  const [data, setData] = useState<Awaited<ReturnType<typeof attendanceApi.reportsSummary>>['data']['data'] | null>(null);
  useEffect(() => {
    void attendanceApi
      .reportsSummary()
      .then((r) => setData(r.data.data))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed')));
  }, [toast]);
  return (
    <AttendancePageLayout kpis={[{ label: 'Late today', value: data?.lateToday ?? 0 }]}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="hr-card p-4">
          <h3 className="mb-2 text-sm font-bold text-navy">Daily by status</h3>
          {(data?.daily ?? []).map((d) => (
            <p key={d.status} className="flex justify-between text-sm">
              <span>{d.status}</span>
              <strong>{d._count}</strong>
            </p>
          ))}
        </div>
        <div className="hr-card p-4">
          <h3 className="mb-2 text-sm font-bold text-navy">By class</h3>
          {(data?.byClass ?? []).map((d) => (
            <p key={String(d.className)} className="flex justify-between text-sm">
              <span>{d.className || '-'}</span>
              <strong>{d._count}</strong>
            </p>
          ))}
        </div>
        <div className="hr-card p-4">
          <h3 className="mb-2 text-sm font-bold text-navy">Weekly volume</h3>
          {(data?.weekly ?? []).map((d) => (
            <p key={String(d.lessonDate)} className="flex justify-between text-sm">
              <span>{new Date(d.lessonDate).toLocaleDateString()}</span>
              <strong>{d._count}</strong>
            </p>
          ))}
        </div>
      </div>
    </AttendancePageLayout>
  );
}

export function MovementView() {
  const toast = useToast();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof attendanceApi.liveMonitor>>['data']['data']['movement']>([]);
  const [kpis, setKpis] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const { data } = await attendanceApi.liveMonitor();
      setRows(data.data.movement ?? []);
      setKpis(data.data.kpis ?? {});
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load movement'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(t);
  }, [load]);

  const inside = rows.filter((r) => r.direction === 'ENTRY' && !r.exitTime);
  const exited = rows.filter((r) => r.direction === 'EXIT' || r.exitTime);

  return (
    <AttendancePageLayout
      kpis={[
        { label: 'Inside now', value: inside.length || kpis.present || 0 },
        { label: 'Exited today', value: exited.length || kpis.exited || 0 },
        { label: 'Late', value: kpis.late ?? 0 },
        { label: 'Movement events', value: rows.length },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hr-card p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-navy">Currently inside</h2>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto">
            {(inside.length ? inside : rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE')).map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-navy">{m.studentName}</p>
                  <p className="text-xs text-muted">
                    {m.className || '-'} · Entry {m.entryTime ? new Date(m.entryTime).toLocaleTimeString() : '·'}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
            {rows.length === 0 ? <p className="text-sm text-muted">No movement yet.</p> : null}
          </div>
        </div>
        <div className="hr-card p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-navy">Recent exits & taps</h2>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto">
            {rows.map((m) => (
              <div key={`all-${m.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-navy">{m.studentName}</p>
                  <p className="text-xs text-muted">
                    {m.direction} · {m.gateName || m.deviceCode || '-'}
                  </p>
                </div>
                <StatusBadge status={m.direction} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AttendancePageLayout>
  );
}

export function AnalyticsView() {
  return <ReportsView />;
}
