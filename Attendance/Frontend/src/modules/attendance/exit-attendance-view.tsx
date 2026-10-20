'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageShell, KpiGrid, Panel } from '@/components/attendance-ui';
import { AttendanceFilterBar, filterSummary, useAttendanceFilters } from '@/components/attendance-filters';
import { StatusBadge } from '@/components/status-badge';
import { TapDeskView } from '@/modules/tap/tap-desk-view';
import { attendanceApi, type AttendanceRecord } from '@/services/attendance-api';
import { formatAttendanceTime, formatDurationMins } from '@/utils/format-attendance-time';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

export function ExitAttendanceView() {
  const toast = useToast();
  const { filters, setFilters, params, academic } = useAttendanceFilters({ mode: 'today' });
  const [allRows, setAllRows] = useState<AttendanceRecord[]>([]);
  const [showDesk, setShowDesk] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: att } = await attendanceApi.attendance({
        ...params,
        page: 1,
        limit: 100,
      });
      const payload = att.data;
      setAllRows(payload?.items ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load exit attendance'));
    } finally {
      setLoading(false);
    }
  }, [params, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () => allRows.filter((r) => r.exitTime || r.direction === 'EXIT' || r.status === 'EXITED_ONLY'),
    [allRows]
  );
  const periodLabel = filterSummary(filters, academic);
  const missingEntry = rows.filter((r) => r.exitTime && !r.entryTime).length;

  return (
    <PageShell
      title="Exit"
      subtitle={periodLabel}
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowDesk((v) => !v)}>
            {showDesk ? 'Hide desk' : 'Manual tap'}
          </button>
        </>
      }
    >
      <KpiGrid
        columns={3}
        items={[
          { label: 'Exits', value: loading ? '—' : rows.length },
          { label: 'With duration', value: loading ? '—' : rows.filter((r) => r.durationMins != null).length },
          { label: 'Missing entry', value: loading ? '—' : missingEntry },
        ]}
      />

      <AttendanceFilterBar
        filters={filters}
        setFilters={setFilters}
        academic={academic}
        showClassFilter
        searchPlaceholder="Search student, class, card…"
      />

      {showDesk ? (
        <Panel title="Manual exit">
          <TapDeskView direction="EXIT" />
        </Panel>
      ) : null}

      <Panel title="Departures">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-xs text-muted">
                <th className="px-3 py-2.5 font-semibold">Person</th>
                <th className="px-3 py-2.5 font-semibold">Class</th>
                <th className="px-3 py-2.5 font-semibold">Entry</th>
                <th className="px-3 py-2.5 font-semibold">Exit</th>
                <th className="px-3 py-2.5 font-semibold">Duration</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-slate-50/80">
                    <td className="px-3 py-3 font-semibold text-navy">{r.studentName}</td>
                    <td className="px-3 py-3">{r.className || '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatAttendanceTime(r.entryTime)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatAttendanceTime(r.exitTime)}</td>
                    <td className="px-3 py-3 text-xs">{formatDurationMins(r.durationMins)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No departures for this period.</p>
          ) : null}
        </div>
      </Panel>
    </PageShell>
  );
}
