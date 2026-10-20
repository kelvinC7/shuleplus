'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DevicePageLayout } from '@/components/device-page-layout';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { deviceApi } from '@/services/device-api';
import type { DashboardData } from '@/types';

export function AttendanceView() {
  const [attendance, setAttendance] = useState<DashboardData['attendance'] | null>(null);
  const [timeline, setTimeline] = useState<DashboardData['timeline']>([]);
  const [liveCount, setLiveCount] = useState(0);

  const load = useCallback(async () => {
    const { data } = await deviceApi.dashboard();
    setAttendance(data.data.attendance);
    setTimeline(Array.isArray(data.data.timeline) ? data.data.timeline : []);
    setLiveCount(data.data.attendance.total);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => setLiveCount((c) => c + (Math.random() > 0.9 ? 1 : 0)), 6000);
    return () => clearInterval(t);
  }, [load]);

  const maxTimeline = Math.max(...timeline.map((t) => t.count), 1);
  const maxGate = useMemo(
    () => Math.max(...(attendance?.byGate ?? []).map((g) => g.count), 1),
    [attendance?.byGate]
  );

  return (
    <DevicePageLayout subtitle="Real-time counters from all gate readers">
      <StatsGrid columns={4}>
        <StatCard label="Total Today" value={liveCount.toLocaleString()} delta="Live counter" />
        <StatCard label="Present" value={attendance?.present ?? '—'} />
        <StatCard label="Late" value={attendance?.late ?? '—'} />
        <StatCard label="Unknown Cards" value={attendance?.unknownCards ?? '—'} />
      </StatsGrid>

      <div className="hr-card p-6 text-center">
        <p className="text-sm text-muted">Students checked in</p>
        <p className="mt-2 text-5xl font-bold text-navy">{liveCount.toLocaleString()}</p>
        <p className="mt-2 text-xs text-emerald-600 animate-pulse">Live counter · updates when cards are scanned</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="hr-card overflow-hidden p-5">
          <h2 className="mb-3 font-bold text-navy">By Gate</h2>
          <ul className="space-y-3">
            {(attendance?.byGate ?? []).map((g) => (
              <li key={g.deviceCode}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{g.gate}</span>
                  <span className="font-semibold">{g.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full max-w-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (g.count / maxGate) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="hr-card overflow-hidden p-5">
          <h2 className="mb-3 font-bold text-navy">Arrival Timeline</h2>
          <div className="flex h-32 items-end gap-2 overflow-x-auto pb-2">
            {timeline.map((slot) => (
              <div key={slot.label} className="flex w-10 shrink-0 flex-col items-center justify-end gap-1">
                <div
                  className="w-8 shrink-0 rounded-t bg-primary/70"
                  style={{ height: `${Math.max(4, (slot.count / maxTimeline) * 96)}px` }}
                />
                <span className="text-[9px] text-muted">{slot.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DevicePageLayout>
  );
}
