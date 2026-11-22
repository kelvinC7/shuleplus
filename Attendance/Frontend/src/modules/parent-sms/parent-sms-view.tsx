'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { PageShell, Panel, filterSelectClass } from '@/components/attendance-ui';
import {
  AttendanceFilterBar,
  filterSummary,
  useAttendanceFilters,
} from '@/components/attendance-filters';
import { ListPagination } from '@/components/list-pagination';
import { attendanceApi, type ParentNotification } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

function notificationDay(n: ParentNotification) {
  const raw = n.sentAt ?? n.createdAt;
  if (!raw) return '';
  return new Date(raw).toISOString().slice(0, 10);
}

export function ParentSmsView() {
  const toast = useToast();
  const { filters, setFilters, params, academic } = useAttendanceFilters({ mode: 'today' });
  const [rows, setRows] = useState<ParentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState(false);
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await attendanceApi.notifications();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load messages'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters, status, channel]);

  const filtered = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    const classNeedle = filters.className.trim().toLowerCase();
    const dayIso =
      filters.mode === 'date' && filters.date
        ? filters.date.slice(0, 10)
        : filters.mode === 'today'
          ? new Date().toISOString().slice(0, 10)
          : filters.mode === 'range' && filters.from
            ? filters.from.slice(0, 10)
            : '';

    return rows.filter((n) => {
      if (channel && n.channel !== channel) return false;
      if (status && n.status !== status) return false;
      if (filters.mode === 'today' || filters.mode === 'date') {
        if (dayIso && notificationDay(n) !== dayIso) return false;
      } else if (filters.mode === 'range' && filters.from && filters.to) {
        const d = notificationDay(n);
        if (d < filters.from.slice(0, 10) || d > filters.to.slice(0, 10)) return false;
      }
      if (classNeedle) {
        const hay = `${n.studentName} ${n.message} ${n.title}`.toLowerCase();
        if (!hay.includes(classNeedle)) return false;
      }
      if (!needle) return true;
      return (
        n.studentName.toLowerCase().includes(needle) ||
        n.message.toLowerCase().includes(needle) ||
        n.title.toLowerCase().includes(needle)
      );
    });
  }, [rows, filters, status, channel]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paged = filtered.slice((page - 1) * limit, page * limit);
  const sent = filtered.filter((n) => n.status === 'SENT').length;
  const failed = filtered.filter((n) => n.status === 'FAILED').length;

  const notifyAbsent = async () => {
    setNotifying(true);
    try {
      const { data: res } = await attendanceApi.notifyAbsent();
      toast.success(`Sent to ${res.data?.notified ?? 0} absent student(s)`);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Send failed'));
    } finally {
      setNotifying(false);
    }
  };

  return (
    <PageShell
      title="Parent SMS"
      subtitle={filterSummary(filters, academic)}
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={notifying}
            onClick={() => void notifyAbsent()}
          >
            <Bell size={16} /> {notifying ? 'Sending' : 'Notify absent (filtered day)'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Matching log</p>
          <p className="text-2xl font-extrabold text-navy">{loading ? '…' : filtered.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Sent</p>
          <p className="text-2xl font-extrabold text-emerald-600">{loading ? '…' : sent}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Failed</p>
          <p className="text-2xl font-extrabold text-red-600">{loading ? '…' : failed}</p>
        </div>
      </div>

      <AttendanceFilterBar
        filters={filters}
        setFilters={setFilters}
        academic={academic}
        showClassFilter
        searchPlaceholder="Search student or message"
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className={filterSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="SKIPPED">Skipped</option>
          <option value="QUEUED">Queued</option>
        </select>
        <select className={filterSelectClass} value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="">All channels</option>
          <option value="SMS">SMS</option>
          <option value="APP">App</option>
        </select>
      </div>

      <Panel title="Message log">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Channel</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Message</th>
                <th className="px-4 py-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    Loading
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    No messages match these filters
                  </td>
                </tr>
              ) : (
                paged.map((n) => (
                  <tr key={n.id} className="border-b border-border/60 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-navy">{n.studentName}</td>
                    <td className="px-4 py-3 text-xs">{n.channel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          n.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-700'
                            : n.status === 'FAILED'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-slate-100 text-muted'
                        }`}
                      >
                        {n.status}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-muted">
                      <span className="line-clamp-2">{n.message}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                      {new Date(n.sentAt ?? n.createdAt).toLocaleString(undefined, {
                        timeZone: 'Africa/Kigali',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ListPagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
        />
      </Panel>
    </PageShell>
  );
}
