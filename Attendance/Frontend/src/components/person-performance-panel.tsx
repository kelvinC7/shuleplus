'use client';

import { useCallback, useEffect, useState } from 'react';
import { MiniBarChart, Panel } from '@/components/attendance-ui';
import { TermPerformanceBar } from '@/components/term-performance-bar';
import type { AttendanceFilterParams, PerformanceStats } from '@/services/attendance-api';
import { attendanceApi, type PersonPerformanceDetail } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

function DailyBars({ rows }: { rows: PersonPerformanceDetail['dailyTrend'] }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted">No attendance in this period.</p>;
  }
  return (
    <div className="flex items-end gap-0.5 overflow-x-auto pb-2 pt-2" style={{ minHeight: 140 }}>
      {rows.map((row) => {
        const color =
          row.late > 0 ? 'bg-amber-400' : row.absent > 0 ? 'bg-red-400' : 'bg-emerald-500';
        return (
        <div key={row.date} className="flex w-7 shrink-0 flex-col items-center gap-1">
          <div className="flex h-24 w-full items-end justify-center">
            <div className={`w-full max-w-[14px] rounded-t ${color}`} style={{ height: '100%', minHeight: 4 }} />
          </div>
          <span className="text-[9px] font-medium text-muted" title={row.date}>
            {row.date.slice(5)}
          </span>
        </div>
        );
      })}
    </div>
  );
}

export function PersonPerformancePanel({
  personId,
  kind,
  performance,
  params,
}: {
  personId: string;
  kind: 'STUDENT' | 'STAFF';
  performance?: PerformanceStats | null;
  params: AttendanceFilterParams;
}) {
  const toast = useToast();
  const [data, setData] = useState<PersonPerformanceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fn =
        kind === 'STUDENT'
          ? attendanceApi.studentPerformance(personId, params)
          : attendanceApi.staffPerformance(personId, params);
      const { data: res } = await fn;
      setData(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load performance'));
    } finally {
      setLoading(false);
    }
  }, [kind, params, personId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return <p className="py-10 text-center text-sm text-muted">Loading performance…</p>;
  }

  const entry = data?.entryCompare;

  return (
    <div className="space-y-4">
      {performance ? (
        <div className="rounded-xl border border-border bg-slate-50/80 p-4">
          <TermPerformanceBar performance={performance} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Daily activity"
          action={
            <div className="flex gap-2 text-[10px] font-medium text-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Late
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" /> Absent
              </span>
            </div>
          }
        >
          <DailyBars rows={data?.dailyTrend ?? []} />
        </Panel>

        <Panel title="Status mix">
          <MiniBarChart rows={data?.statusBreakdown ?? []} />
        </Panel>
      </div>

      {kind === 'STUDENT' && entry?.studentAvg && entry.classAvg ? (
        <Panel title="Entry time vs class">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-white p-3 text-center">
              <p className="text-xs text-muted">Student avg</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-navy">{entry.studentAvg}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3 text-center">
              <p className="text-xs text-muted">Class avg</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-navy">{entry.classAvg}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3 text-center">
              <p className="text-xs text-muted">Difference</p>
              <p
                className={`mt-1 text-xl font-bold tabular-nums ${
                  (entry.deltaMinutes ?? 0) <= 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {entry.deltaMinutes != null
                  ? `${entry.deltaMinutes > 0 ? '+' : ''}${entry.deltaMinutes} min`
                  : '—'}
              </p>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
