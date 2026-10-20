'use client';

import { useCallback, useEffect, useState } from 'react';
import { Printer, Bell } from 'lucide-react';
import { AttendancePageLayout } from '@/components/attendance-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { attendanceApi, type AttendanceRecord } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

export function AttendanceListView() {
  const toast = useToast();
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [q, setQ] = useState('');

  const [notifying, setNotifying] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await attendanceApi.attendance({ q: q || undefined, page: 1, limit: 100 });
      setRows(data.data?.items ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load attendance'));
    }
  }, [q, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AttendancePageLayout
      kpis={[{ label: 'Today’s records', value: rows.length }]}
      actions={
        <div className="flex gap-2 print:hidden">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print register
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={notifying}
            onClick={async () => {
              setNotifying(true);
              try {
                const { data } = await attendanceApi.notifyAbsent();
                toast.success(`Notified ${data.data?.notified ?? 0} absent student parent(s)`);
              } catch (err) {
                toast.error(getApiErrorMessage(err, 'Could not send absent SMS'));
              } finally {
                setNotifying(false);
              }
            }}
          >
            <Bell className="h-4 w-4" /> {notifying ? 'Sending…' : 'SMS absentees'}
          </button>
        </div>
      }
    >
      <div className="hr-card mb-4 p-4">
        <input
          className="input"
          placeholder="Search student, code, card…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="hr-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-muted">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Card</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Exit</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/70">
                <td className="px-4 py-3 font-semibold text-navy">{r.studentName}</td>
                <td className="px-4 py-3">{r.className || '-'}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.cardNumber}</td>
                <td className="px-4 py-3 text-xs">
                  {r.entryTime ? new Date(r.entryTime).toLocaleTimeString() : '·'}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.exitTime ? new Date(r.exitTime).toLocaleTimeString() : '·'}
                </td>
                <td className="px-4 py-3">{r.durationMins != null ? `${r.durationMins}m` : '·'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AttendancePageLayout>
  );
}
