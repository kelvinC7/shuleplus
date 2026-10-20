'use client';

import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, GraduationCap, LogIn, LogOut, Users } from 'lucide-react';
import { fetchRepGateAttendance } from '@/lib/school-representative-api';
import { AttendanceStatusPill } from '@/components/school-representative/attendance-status-pill';
import { RepFilterBar } from '@/components/school-representative/rep-filter-bar';
import { RepPagination } from '@/components/school-representative/rep-pagination';
import { StatCard } from '@/components/school-representative/stat-card';
import { useRepContext } from '@/components/school-representative/rep-context';

type Tab = 'student' | 'staff';
type GateRow = Awaited<ReturnType<typeof fetchRepGateAttendance>>['items'][number];

const PAGE_SIZE = 15;

function statusForRow(row: GateRow) {
  if (row.todayStatus === 'present') return 'present';
  if (row.todayStatus === 'partial') return 'late';
  return 'absent';
}

function GateMobileCard({ row, showSchool }: { row: GateRow; showSchool: boolean }) {
  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy">{row.personName}</p>
          <p className="font-mono text-xs text-muted">{row.personCode}</p>
          {showSchool && <p className="mt-1 text-xs text-muted">{row.schoolName}</p>}
        </div>
        <AttendanceStatusPill status={statusForRow(row)} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {row.classOrRole ?? '—'}
        {row.source ? ` · ${row.source}` : ''}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-emerald-50 px-3 py-2">
          <p className="flex items-center gap-1 font-bold uppercase tracking-wide text-emerald-800">
            <LogIn className="h-3 w-3" /> Morning
          </p>
          <p className="mt-1 font-semibold text-navy">{row.morningEntry ?? '—'}</p>
          <p className="text-muted">{row.morningGate ?? ''}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 px-3 py-2">
          <p className="flex items-center gap-1 font-bold uppercase tracking-wide text-indigo-800">
            <LogOut className="h-3 w-3" /> Evening
          </p>
          <p className="mt-1 font-semibold text-navy">{row.eveningExit ?? '—'}</p>
          <p className="text-muted">{row.eveningGate ?? ''}</p>
        </div>
      </div>
    </article>
  );
}

export default function RepGateAttendancePage() {
  const { schoolScope } = useRepContext();
  const [tab, setTab] = useState<Tab>('student');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRepGateAttendance>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [shift, setShift] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const showSchoolColumn = schoolScope === 'all';

  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      setData(
        await fetchRepGateAttendance({
          organizationId: schoolScope === 'all' ? undefined : schoolScope,
          date,
          personKind: tab,
          shift: shift === 'all' ? undefined : shift,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [schoolScope, date, tab, shift, statusFilter, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab, schoolScope, date, shift, statusFilter, search]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex gap-1 rounded-2xl border border-border bg-white p-1 shadow-sm">
        {(
          [
            { id: 'student' as const, label: 'Students', icon: GraduationCap },
            { id: 'staff' as const, label: 'Staff', icon: Users },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === id ? 'bg-navy text-white shadow-md' : 'text-muted hover:bg-slate-50 hover:text-navy'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {data?.integrationHint && (
        <div className="flex gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CircleAlert className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy">{data.integrationHint.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{data.integrationHint.message}</p>
            {data.integrationHint.schools?.length ? (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-[#f8f9fc] text-sm">
                {data.integrationHint.schools.map((s) => (
                  <li key={`${s.schoolName}-${s.detail.slice(0, 24)}`} className="px-3 py-2.5">
                    <span className="font-medium text-navy">{s.schoolName}</span>
                    <p className="mt-0.5 text-muted">{s.detail}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}

      <RepFilterBar
        showAcademic={false}
        onRefresh={load}
        refreshing={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={tab === 'student' ? 'Student name or ID…' : 'Staff name or ID…'}
        extraFilters={
          <>
            <div className="w-full min-w-[140px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" />
            </div>
            <div className="w-full min-w-[130px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Shift</label>
              <select value={shift} onChange={(e) => setShift(e.target.value)} className="input w-full">
                <option value="all">All shifts</option>
                <option value="morning_entry">Morning entry only</option>
                <option value="evening_exit">Evening exit only</option>
              </select>
            </div>
            <div className="w-full min-w-[120px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full">
                <option value="">All</option>
                <option value="present">Full day (in & out)</option>
                <option value="partial">Partial scan</option>
                <option value="absent">No scan</option>
              </select>
            </div>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={tab === 'student' ? 'Morning entries' : 'Staff morning'}
          value={tab === 'student' ? (data?.summary.studentMorning ?? '—') : (data?.summary.staffMorning ?? '—')}
          accent
        />
        <StatCard
          label={tab === 'student' ? 'Evening exits' : 'Staff evening'}
          value={tab === 'student' ? (data?.summary.studentEvening ?? '—') : (data?.summary.staffEvening ?? '—')}
        />
        <StatCard label="Listed on page" value={items.length} />
        <StatCard label="Total matching" value={data?.total ?? '—'} />
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted">
            No {tab} records for this date and filters.
          </p>
        ) : (
          items.map((row) => <GateMobileCard key={`${row.id}-${row.organizationId}`} row={row} showSchool={showSchoolColumn} />)
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">ID</th>
                {showSchoolColumn && <th className="px-4 py-3">School</th>}
                <th className="px-4 py-3">{tab === 'student' ? 'Class' : 'Role'}</th>
                {tab === 'staff' && <th className="px-4 py-3">Source</th>}
                <th className="px-4 py-3">Morning in</th>
                <th className="px-4 py-3">Evening out</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={showSchoolColumn ? 9 : 8} className="px-4 py-12 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={showSchoolColumn ? 9 : 8} className="px-4 py-12 text-center text-muted">
                    No records match your filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={`${row.id}-${row.organizationId}`} className="border-t border-border/70 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-navy">{row.personName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.personCode}</td>
                    {showSchoolColumn && <td className="px-4 py-3 text-muted">{row.schoolName}</td>}
                    <td className="px-4 py-3">{row.classOrRole ?? '—'}</td>
                    {tab === 'staff' && <td className="px-4 py-3 text-xs text-muted">{row.source ?? '—'}</td>}
                    <td className="px-4 py-3">
                      <span className="font-medium text-navy">{row.morningEntry ?? '—'}</span>
                      {row.morningGate && <p className="text-xs text-muted">{row.morningGate}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-navy">{row.eveningExit ?? '—'}</span>
                      {row.eveningGate && <p className="text-xs text-muted">{row.eveningGate}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{row.scanMethod ?? '—'}</td>
                    <td className="px-4 py-3">
                      <AttendanceStatusPill status={statusForRow(row)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && (
          <RepPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Mobile pagination */}
      {data && data.total > 0 && (
        <div className="md:hidden">
          <RepPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
