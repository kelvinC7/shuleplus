'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, RefreshCw, Search } from 'lucide-react';
import { PageShell, Panel, filterSelectClass } from '@/components/attendance-ui';
import { attendanceApi, type ParentNotification } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

export function ParentSmsView() {
  const toast = useToast();
  const [rows, setRows] = useState<ParentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('SMS');

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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((n) => {
      if (channel && n.channel !== channel) return false;
      if (status && n.status !== status) return false;
      if (!needle) return true;
      return (
        n.studentName.toLowerCase().includes(needle) ||
        n.message.toLowerCase().includes(needle) ||
        n.title.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, status, channel]);

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
      subtitle="Message log and absence alerts"
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
            <Bell size={16} /> {notifying ? 'Sending' : 'Notify absent today'}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search student or message"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
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

      <Panel title="Log">
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    No messages match these filters
                  </td>
                </tr>
              ) : (
                filtered.map((n) => (
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
                      {new Date(n.sentAt ?? n.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageShell>
  );
}
