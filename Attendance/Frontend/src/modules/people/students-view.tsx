'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import {
  PageShell,
  KpiGrid,
  Panel,
  PersonAvatar,
  TabBar,
  RankMedal,
  DetailStat,
} from '@/components/attendance-ui';
import { PersonPerformancePanel } from '@/components/person-performance-panel';
import { AttendanceFilterBar, filterSummary, useAttendanceFilters } from '@/components/attendance-filters';
import { TermPerformanceBar } from '@/components/term-performance-bar';
import { StatusBadge } from '@/components/status-badge';
import { ListPagination } from '@/components/list-pagination';
import { attendanceApi, type StudentPerson } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function StudentsView() {
  const toast = useToast();
  const { filters, setFilters, params, academic } = useAttendanceFilters({ mode: 'term' });
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof attendanceApi.peopleStudents>>['data']['data'] | null>(null);
  const [selected, setSelected] = useState<StudentPerson | null>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'performance'>('profile');
  const [pageTab, setPageTab] = useState<'roster' | 'classes'>('roster');
  const [classPerf, setClassPerf] = useState<
    Awaited<ReturnType<typeof attendanceApi.peopleStudentsClassPerformance>>['data']['data'] | null
  >(null);
  const [classDrill, setClassDrill] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<
    Awaited<ReturnType<typeof attendanceApi.peopleStudentsByClass>>['data']['data'] | null
  >(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const filterKey = JSON.stringify(params);
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const load = useCallback(async () => {
    try {
      const { data } = await attendanceApi.peopleStudents({ ...params, page, limit });
      setOverview(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load students'));
    }
  }, [params, page, limit, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadClassPerf = useCallback(async () => {
    try {
      const { data } = await attendanceApi.peopleStudentsClassPerformance(params);
      setClassPerf(data.data ?? null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load classes'));
    }
  }, [params, toast]);

  const openClass = useCallback(
    async (className: string) => {
      setClassDrill(className);
      try {
        const { data } = await attendanceApi.peopleStudentsByClass({ ...params, className });
        setClassStudents(data.data ?? null);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load class'));
      }
    },
    [params, toast]
  );

  useEffect(() => {
    if (pageTab === 'classes') {
      setClassDrill(null);
      setClassStudents(null);
      void loadClassPerf();
    }
  }, [pageTab, loadClassPerf]);

  const rows = overview?.rows ?? [];
  const periodLabel = filterSummary(filters, academic);

  return (
    <PageShell
      title="Students"
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
          { label: 'Total', value: overview?.total ?? 0 },
          { label: 'Present', value: overview?.present ?? 0 },
          { label: 'Late', value: overview?.late ?? 0 },
          { label: 'Absent', value: overview?.absent ?? 0 },
        ]}
      />

      <AttendanceFilterBar
        filters={filters}
        setFilters={setFilters}
        academic={academic}
        showClassFilter
        searchPlaceholder="Search…"
      />

      <TabBar
        active={pageTab}
        onChange={(id) => setPageTab(id as 'roster' | 'classes')}
        tabs={[
          { id: 'roster', label: 'List' },
          { id: 'classes', label: 'Classes' },
        ]}
      />

      {pageTab === 'classes' ? (
        <Panel flush>
          {classDrill ? (
            <>
              <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-navy"
                  aria-label="Back"
                  onClick={() => {
                    setClassDrill(null);
                    setClassStudents(null);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="truncate text-sm font-semibold text-navy">{classDrill}</h2>
              </div>
              <ul className="divide-y divide-border/70">
                {(classStudents?.rows ?? []).map((r, index) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setDetailTab('profile');
                        setPageTab('roster');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/90"
                    >
                      <RankMedal rank={index + 1} />
                      <PersonAvatar name={r.fullName} photoUrl={r.photoUrl} personKind="STUDENT" size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-navy">{r.fullName}</p>
                        <TermPerformanceBar performance={r.performance} compact />
                      </div>
                      <span className="font-bold tabular-nums text-navy">{r.performance?.rate ?? 0}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {(classPerf?.classes ?? []).map((c) => (
                <button
                  key={c.className}
                  type="button"
                  onClick={() => void openClass(c.className)}
                  className="rounded-xl border border-border/80 bg-white p-4 text-left transition hover:border-primary/35 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">{c.className}</p>
                      <p className="mt-0.5 text-xs text-muted tabular-nums">{c.studentCount}</p>
                    </div>
                    <span className="text-lg font-bold tabular-nums text-navy">{c.avgRate}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, c.avgRate)}%` }}
                    />
                  </div>
                </button>
              ))}
              {(classPerf?.classes ?? []).length === 0 ? (
                <p className="col-span-full py-12 text-center text-sm text-muted">No classes</p>
              ) : null}
            </div>
          )}
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
                  <PersonAvatar name={r.fullName} photoUrl={r.photoUrl} personKind="STUDENT" size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy">{r.fullName}</p>
                    <p className="truncate text-[11px] text-muted">{r.className || '—'}</p>
                    <TermPerformanceBar performance={r.performance} compact />
                  </div>
                  <StatusBadge status={r.todayStatus} />
                </button>
              ))}
              {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">No students</p>
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
                  kind="STUDENT"
                  performance={selected.performance}
                  params={params}
                />
              ) : null}
              {selected && detailTab === 'profile' ? (
                <div className="space-y-5">
                  <div className="flex gap-4">
                    <PersonAvatar name={selected.fullName} photoUrl={selected.photoUrl} personKind="STUDENT" size={72} />
                    <div className="min-w-0 flex-1">
                      <StatusBadge status={selected.todayStatus} />
                      <p className="mt-1 text-sm text-muted">
                        {selected.className || '—'} · {selected.studentCode || '—'}
                      </p>
                      <TermPerformanceBar performance={selected.performance} />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <DetailStat label="Card" value={selected.rfidUid || '—'} />
                    <DetailStat label="In" value={formatTime(selected.attendance?.entryTime)} />
                    <DetailStat label="Out" value={formatTime(selected.attendance?.exitTime)} />
                    <DetailStat
                      label="Gate"
                      value={selected.attendance?.gateName || selected.attendance?.deviceCode || '—'}
                    />
                  </div>

                  {selected.parentName || selected.parentPhone ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <DetailStat label="Parent" value={selected.parentName || '—'} />
                      <DetailStat label="Phone" value={selected.parentPhone || '—'} />
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
