'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageShell, KpiGrid, Panel } from '@/components/attendance-ui';
import { AttendanceFilterBar, filterSummary, useAttendanceFilters } from '@/components/attendance-filters';
import { StatusBadge } from '@/components/status-badge';
import { TapDeskView } from '@/modules/tap/tap-desk-view';
import { attendanceApi, type AttendanceRecord } from '@/services/attendance-api';
import { formatAttendanceTime } from '@/utils/format-attendance-time';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

function isEntryRow(r: AttendanceRecord) {
  return Boolean(r.entryTime) || r.direction === 'ENTRY' || ['PRESENT', 'LATE', 'ENTERED_ONLY'].includes(r.status);
}

export function EntryAttendanceView() {
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
      toast.error(getApiErrorMessage(err, 'Failed to load entry attendance'));
    } finally {
      setLoading(false);
    }
  }, [params, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => allRows.filter(isEntryRow), [allRows]);
  const periodLabel = filterSummary(filters, academic);
  const arrived = rows.filter((r) => r.status === 'PRESENT' || r.status === 'ENTERED_ONLY').length;
  const late = rows.filter((r) => r.status === 'LATE').length;

  return (
    <PageShell
      title="Entry"
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
          { label: 'Arrived', value: loading ? '—' : arrived + late },
          { label: 'Late', value: loading ? '—' : late },
          { label: 'With entry time', value: loading ? '—' : rows.filter((r) => r.entryTime).length },
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
        <Panel title="Manual entry">
          <TapDeskView direction="ENTRY" />
        </Panel>
      ) : null}

      <Panel title="Arrivals">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-xs text-muted">
                <th className="px-3 py-2.5 font-semibold">Person</th>
                <th className="px-3 py-2.5 font-semibold">Class</th>
                <th className="px-3 py-2.5 font-semibold">Entry</th>
                <th className="px-3 py-2.5 font-semibold">Gate</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-slate-50/80">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-navy">{r.studentName}</p>
                      {r.studentCode ? (
                        <p className="font-mono text-[10px] text-muted">{r.studentCode}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{r.className || '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatAttendanceTime(r.entryTime)}</td>
                    <td className="px-3 py-3 text-xs">{r.gateName || r.deviceCode || '—'}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No arrivals for this period.</p>
          ) : null}
        </div>
      </Panel>
    </PageShell>
  );
}
