'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  PageShell,
  KpiGrid,
  Panel,
  PersonAvatar,
  TabBar,
  DetailStat,
  RankMedal,
} from '@/components/attendance-ui';
import { PersonPerformancePanel } from '@/components/person-performance-panel';
import { AttendanceFilterBar, filterSummary, useAttendanceFilters } from '@/components/attendance-filters';
import { TermPerformanceBar, WeekendWorkerBadge } from '@/components/term-performance-bar';
import { StatusBadge } from '@/components/status-badge';
import { ListPagination } from '@/components/list-pagination';
import {
  attendanceApi,
  type StaffPerson,
} from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function StaffView() {
  const toast = useToast();
  const { filters, setFilters, params, academic } = useAttendanceFilters({ mode: 'term' });
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof attendanceApi.peopleStaff>>['data']['data'] | null>(null);
  const [selected, setSelected] = useState<StaffPerson | null>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'performance'>('profile');
  const [pageTab, setPageTab] = useState<'roster' | 'rankings'>('roster');
  const [rankings, setRankings] = useState<
    Awaited<ReturnType<typeof attendanceApi.peopleStaffRankings>>['data']['data'] | null
  >(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const filterKey = JSON.stringify(params);
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const load = useCallback(async () => {
    try {
      const { data } = await attendanceApi.peopleStaff({ ...params, page, limit });
      setOverview(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load staff'));
    }
  }, [params, page, limit, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadRankings = useCallback(async () => {
    try {
      const { data } = await attendanceApi.peopleStaffRankings(params);
      setRankings(data.data ?? null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load rankings'));
    }
  }, [params, toast]);

  useEffect(() => {
    if (pageTab === 'rankings') void loadRankings();
  }, [pageTab, loadRankings]);

  const rows = overview?.rows ?? [];
  const rankedRows = rankings?.rows ?? [];
  const periodLabel = filterSummary(filters, academic);

  return (
    <PageShell
      title="Staff"
      badge={
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">{periodLabel}</span>
      }
      actions={
        <button type="button" className="btn-secondary px-3" aria-label="Refresh" onClick={() => void load()}>
          <RefreshCw size={16} />
        </button>
      }
    >
      <KpiGrid
        columns={4}
        items={[
          { label: 'Roster', value: overview?.total ?? 0 },
          { label: 'In', value: overview?.checkedIn ?? 0 },
          { label: 'Late', value: overview?.late ?? 0 },
          { label: 'Inside', value: overview?.inside ?? 0 },
        ]}
      />

      <AttendanceFilterBar filters={filters} setFilters={setFilters} academic={academic} searchPlaceholder="Search…" />

      <TabBar
        active={pageTab}
        onChange={(id) => setPageTab(id as 'roster' | 'rankings')}
        tabs={[
          { id: 'roster', label: 'List' },
          { id: 'rankings', label: 'Rankings' },
        ]}
      />

      {pageTab === 'rankings' ? (
        <Panel flush>
          <ul className="divide-y divide-border/70">
            {rankedRows.map((r, index) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    setDetailTab('profile');
                    setPageTab('roster');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50/90"
                >
                  <RankMedal rank={index + 1} />
                  <PersonAvatar name={r.fullName} photoUrl={r.photoUrl} personKind="STAFF" size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-medium text-navy">{r.fullName}</p>
                      <WeekendWorkerBadge days={r.performance?.weekendPresentDays} iconOnly />
                    </div>
                    <TermPerformanceBar performance={r.performance} compact />
                  </div>
                  <span className="text-lg font-bold tabular-nums text-navy">{r.performance?.rate ?? 0}%</span>
                </button>
              </li>
            ))}
            {rankedRows.length === 0 ? (
              <li className="px-4 py-14 text-center text-sm text-muted">No data</li>
            ) : null}
          </ul>
        </Panel>
      ) : null}

      {pageTab === 'roster' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="List">
            <div className="max-h-[32rem] space-y-1.5 overflow-y-auto">
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    setDetailTab('profile');
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                    selected?.id === r.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <PersonAvatar name={r.fullName} photoUrl={r.photoUrl} personKind="STAFF" size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy">{r.fullName}</p>
                    <TermPerformanceBar performance={r.performance} compact />
                  </div>
                  <StatusBadge status={r.todayStatus} />
                </button>
              ))}
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">No staff</p>
              ) : null}
            </div>
            <ListPagination
              page={overview?.page ?? page}
              totalPages={overview?.totalPages ?? 1}
              total={overview?.total ?? 0}
              limit={overview?.limit ?? limit}
              onPageChange={setPage}
              onLimitChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
            />
          </Panel>

          <div className="space-y-3 lg:col-span-2">
            {selected ? (
              <TabBar
                active={detailTab}
                onChange={(id) => setDetailTab(id as 'profile' | 'performance')}
                tabs={[
                  { id: 'profile', label: 'Profile' },
                  { id: 'performance', label: 'Trend' },
                ]}
              />
            ) : null}
            <Panel title={selected?.fullName ?? 'Select someone'}>
              {selected && detailTab === 'performance' ? (
                <PersonPerformancePanel
                  personId={selected.id}
                  kind="STAFF"
                  performance={selected.performance}
                  params={params}
                />
              ) : null}
              {selected && detailTab === 'profile' ? (
                <div className="space-y-5">
                  <div className="flex gap-4">
                    <PersonAvatar name={selected.fullName} photoUrl={selected.photoUrl} personKind="STAFF" size={72} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={selected.todayStatus} />
                        {selected.isTeacher ? (
                          <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                            Teacher
                          </span>
                        ) : null}
                        <WeekendWorkerBadge days={selected.performance?.weekendPresentDays} iconOnly />
                      </div>
                      <p className="mt-1 text-sm text-muted">{selected.position || 'Staff'}</p>
                      <TermPerformanceBar performance={selected.performance} />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <DetailStat label="Card" value={selected.rfidUid || '—'} />
                    <DetailStat
                      label="Hours today"
                      value={
                        selected.attendance?.durationMins != null
                          ? `${Math.floor(selected.attendance.durationMins / 60)}h ${selected.attendance.durationMins % 60}m`
                          : selected.attendance?.entryTime
                            ? 'Active'
                            : '—'
                      }
                    />
                    <DetailStat label="In" value={formatTime(selected.attendance?.entryTime)} />
                    <DetailStat label="Out" value={formatTime(selected.attendance?.exitTime)} />
                  </div>

                  {selected.isTeacher && selected.schedule ? (
                    <div className="grid gap-2 rounded-xl bg-violet-50/60 p-3 sm:grid-cols-3">
                      <DetailStat label="Classes" value={selected.schedule.todayClasses} />
                      <DetailStat label="Now" value={selected.schedule.currentLesson || '—'} />
                      <DetailStat label="Next" value={selected.schedule.nextLesson || '—'} />
                    </div>
                  ) : null}
                </div>
              ) : !selected ? (
                <p className="text-sm text-muted">Pick from the list</p>
              ) : null}
            </Panel>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
