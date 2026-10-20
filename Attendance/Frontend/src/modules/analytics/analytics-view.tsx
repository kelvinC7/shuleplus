'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, RefreshCw, Users, GraduationCap } from 'lucide-react';
import { PageShell, KpiGrid, Panel, MiniBarChart } from '@/components/attendance-ui';
import { AttendanceFilterBar, filterSummary, useAttendanceFilters } from '@/components/attendance-filters';
import { attendanceApi, type AnalyticsData } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

function DailyTrendChart({ rows }: { rows: AnalyticsData['dailyTrend'] }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted">No attendance data for this period.</p>;
  }
  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-2 pt-4" style={{ minHeight: 180 }}>
      {rows.map((row) => (
        <div key={row.date} className="flex min-w-[36px] flex-1 flex-col items-center gap-1">
          <div className="flex h-32 w-full items-end justify-center gap-0.5">
            <div
              className="w-2 rounded-t bg-emerald-500 transition-all"
              style={{ height: `${(row.present / max) * 100}%`, minHeight: row.present ? 4 : 0 }}
              title={`Present: ${row.present}`}
            />
            <div
              className="w-2 rounded-t bg-amber-400 transition-all"
              style={{ height: `${(row.late / max) * 100}%`, minHeight: row.late ? 4 : 0 }}
              title={`Late: ${row.late}`}
            />
            <div
              className="w-2 rounded-t bg-red-400 transition-all"
              style={{ height: `${(row.absent / max) * 100}%`, minHeight: row.absent ? 4 : 0 }}
              title={`Absent: ${row.absent}`}
            />
          </div>
          <span className="text-[9px] font-medium text-muted">{row.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsView() {
  const toast = useToast();
  const { filters, setFilters, params, academic } = useAttendanceFilters({ mode: 'term' });
  const [personType, setPersonType] = useState<'ALL' | 'STUDENT' | 'STAFF'>('ALL');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const load = useCallback(async () => {
    try {
      const { data: res } = await attendanceApi.analytics({
        ...params,
        personType: personType === 'ALL' ? undefined : personType,
      });
      setData(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load analytics'));
    }
  }, [params, personType, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = data?.kpis;

  return (
    <PageShell
      title="Analytics"
      subtitle={filterSummary(filters, academic)}
      actions={
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'STUDENT', 'STAFF'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setPersonType(t)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              personType === t ? 'bg-navy text-white shadow-sm' : 'border border-border bg-white text-navy hover:bg-slate-50'
            }`}
          >
            {t === 'ALL' ? 'Everyone' : t === 'STUDENT' ? 'Students' : 'Staff'}
          </button>
        ))}
      </div>

      <AttendanceFilterBar filters={filters} setFilters={setFilters} academic={academic} />

      <KpiGrid
        columns={4}
        items={[
          { label: 'Total records', value: kpis?.totalRecords ?? 0, icon: <BarChart3 size={18} /> },
          { label: 'Present', value: kpis?.present ?? 0 },
          { label: 'Late', value: kpis?.late ?? 0 },
          { label: 'Absent', value: kpis?.absent ?? 0 },
          {
            label: 'Student rate',
            value: `${kpis?.studentAttendanceRate ?? 0}%`,
            icon: <GraduationCap size={18} />,
          },
          {
            label: 'Staff rate',
            value: `${kpis?.staffAttendanceRate ?? 0}%`,
            icon: <Users size={18} />,
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Daily trend"
          action={
            <div className="flex gap-2 text-[10px] font-semibold text-muted">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Late</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Absent</span>
            </div>
          }
        >
          <DailyTrendChart rows={data?.dailyTrend ?? []} />
        </Panel>

        <Panel title="Status breakdown">
          <MiniBarChart
            rows={(data?.statusBreakdown ?? []).map((r) => ({
              label: r.label,
              value: r.value,
              color: r.color,
            }))}
          />
        </Panel>

        <Panel title="By class">
          <MiniBarChart
            rows={(data?.byClass ?? []).map((r) => ({
              label: r.label,
              value: r.rate,
              color: r.rate >= 85 ? '#10b981' : r.rate >= 70 ? '#FCB038' : '#ef4444',
            }))}
          />
        </Panel>

        <Panel title="Students vs staff">
          <MiniBarChart
            rows={(data?.byPersonType ?? []).map((r) => ({
              label: `${r.label} (${r.unique} people)`,
              value: r.present,
              color: r.label === 'Students' ? '#3b82f6' : '#6366f1',
            }))}
          />
        </Panel>
      </div>

    </PageShell>
  );
}
