'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Phone, RefreshCw } from 'lucide-react';
import { DisciplineDataTable, type DisciplineTableColumn } from '@/components/discipline-data-table';
import { StatusBadge } from '@/components/status-badge';
import { GatePageLayout } from '@/modules/gateManager/gate-page-layout';
import { formatGateTime, outsideStatusLabel } from '@/modules/gateManager/gate-utils';
import { formatTime12h } from '@/modules/permissions/permission-utils';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { PermissionRequest } from '@/types/discipline';
import { toast } from 'sonner';

function OutsideTable({ rows, onCheckIn }: { rows: PermissionRequest[]; onCheckIn: (id: string) => void }) {
  const router = useRouter();
  const columns: DisciplineTableColumn<PermissionRequest>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <div>
          <p className="font-semibold text-[#000435]">{r.studentName}</p>
          <p className="text-xs text-slate-400">{r.studentCode}</p>
        </div>
      ),
    },
    { key: 'class', header: 'Class', render: (r) => r.className },
    { key: 'reason', header: 'Reason', render: (r) => r.reason },
    { key: 'left', header: 'Left At', render: (r) => formatGateTime(r.actualDepartureAt) },
    { key: 'return', header: 'Expected Back', render: (r) => formatTime12h(r.expectedReturnTime) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={outsideStatusLabel(r)} /> },
  ];

  return (
    <DisciplineDataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      page={1}
      totalPages={1}
      total={rows.length}
      pageSize={Math.max(rows.length, 1)}
      onPageChange={() => {}}
      onView={(r) => router.push(`/permissions/${r.id}`)}
      emptyMessage="No students currently outside campus"
    />
  );
}

export function GateOutsideView() {
  const router = useRouter();
  const [rows, setRows] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await disciplineApi.gateOutside();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load outside students'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <GatePageLayout title="Students Currently Outside Campus" subtitle="Live list of checked-out students">
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
        <button type="button" className="btn-primary" onClick={() => router.push('/gate/checkin')}><LogIn size={16} /> Check In</button>
      </div>
      {loading ? (
        <div className="hr-card p-8 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        <OutsideTable rows={rows} onCheckIn={(id) => router.push(`/gate/checkin?code=${id}`)} />
      )}
      {!loading && rows.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:hidden">
          {rows.map((r) => (
            <div key={r.id} className="hr-card p-4">
              <p className="font-semibold">{r.studentName}</p>
              <p className="text-xs text-slate-500">{r.className} · Left {formatGateTime(r.actualDepartureAt)}</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/permissions/${r.id}`} className="btn-secondary flex-1 py-1 text-xs">View</Link>
                {r.guardianPhone ? (
                  <a href={`tel:${r.guardianPhone}`} className="btn-secondary flex-1 py-1 text-xs"><Phone size={14} className="inline" /> Call Parent</a>
                ) : null}
                <Link href={`/gate/checkin?code=${r.referenceNumber}`} className="btn-primary flex-1 py-1 text-xs">Check In</Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </GatePageLayout>
  );
}

export function GateOverdueView() {
  const router = useRouter();
  const [rows, setRows] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overdueRes] = await Promise.all([
        disciplineApi.gateOverdue(),
        disciplineApi.gateProcessOverdue(),
      ]);
      setRows(overdueRes.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load overdue students'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <GatePageLayout title="Overdue Students" subtitle="Students past their expected return time">
      <button type="button" className="btn-secondary mb-4" onClick={() => void load()}><RefreshCw size={16} /> Refresh & Notify</button>
      <div className="hr-card overflow-hidden">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b bg-red-50/80 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Permission</th>
              <th className="px-4 py-3">Expected Return</th>
              <th className="px-4 py-3">Overdue</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No overdue students</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-[#000435]">{r.studentName}</td>
                  <td className="px-4 py-3">{r.className}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.referenceNumber}</td>
                  <td className="px-4 py-3">{formatTime12h(r.expectedReturnTime)}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{r.overdueMinutes ?? 0} min</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/permissions/${r.id}`} className="btn-secondary py-1 text-xs">View</Link>
                      {r.guardianPhone ? <a href={`tel:${r.guardianPhone}`} className="btn-secondary py-1 text-xs">Call Parent</a> : null}
                      <Link href={`/gate/checkin?code=${r.referenceNumber}`} className="btn-primary py-1 text-xs">Mark Returned</Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GatePageLayout>
  );
}
