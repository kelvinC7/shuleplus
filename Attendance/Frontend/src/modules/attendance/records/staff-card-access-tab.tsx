'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileDown, IdCard, Loader2, RefreshCw, Users, UserSquare2 } from 'lucide-react';
import { FilterSelect, filterSelectClass } from '@/components/attendance-ui';
import { ListPagination } from '@/components/list-pagination';
import { attendanceApi } from '@/services/attendance-api';
import { exportCardAccessPdf } from '@/utils/export-attendance-pdf';
import { buildSchoolPdfBranding, fetchSchoolOrganizationProfile } from '@/utils/school-pdf-branding';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

type AssignedFilter = 'all' | 'yes' | 'no';
type Mode = 'STUDENT' | 'STAFF';

type Row = {
  id: string;
  fullName: string;
  code: string | null;
  group: string | null;
  role: string | null;
  cardAssigned: boolean;
  cardNumber: string | null;
  cardStatus: string | null;
  source: string;
};

export function StaffCardAccessTab({
  schoolName,
  departments,
  staffRoles,
  classes = [],
  periodLabel,
}: {
  schoolName: string;
  departments: string[];
  staffRoles: string[];
  classes?: string[];
  periodLabel: string;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('STUDENT');
  const [groupFilter, setGroupFilter] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [assigned, setAssigned] = useState<AssignedFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ total: 0, assigned: 0, notAssigned: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'STAFF') {
        const { data } = await attendanceApi.staffCardAccess({
          department: groupFilter || undefined,
          staffRole: staffRole || undefined,
          q: search.trim() || undefined,
          assigned,
          page,
          limit,
        });
        const items = (data.data?.items ?? []).map((r) => ({
          id: r.staffId,
          fullName: r.fullName,
          code: r.employeeNumber,
          group: r.department,
          role: r.role,
          cardAssigned: r.cardAssigned,
          cardNumber: r.cardNumber,
          cardStatus: r.cardStatus,
          source: r.source,
        }));
        setRows(items);
        setTotal(data.data?.total ?? 0);
        setTotalPages(data.data?.totalPages ?? 1);
        setSummary((data.data as any)?.summary ?? { total: data.data?.total ?? 0, assigned: items.filter((i) => i.cardAssigned).length, notAssigned: items.filter((i) => !i.cardAssigned).length });
      } else {
        const { data } = await attendanceApi.studentCardAccess({
          className: groupFilter || undefined,
          q: search.trim() || undefined,
          assigned,
          page,
          limit,
        });
        const items = (data.data?.items ?? []).map((r) => ({
          id: r.studentId,
          fullName: r.fullName,
          code: r.studentCode,
          group: r.className,
          role: r.studentCode,
          cardAssigned: r.cardAssigned,
          cardNumber: r.cardNumber,
          cardStatus: r.cardStatus,
          source: r.source,
        }));
        setRows(items);
        setTotal(data.data?.total ?? 0);
        setTotalPages(data.data?.totalPages ?? 1);
        setSummary((data.data as any)?.summary ?? { total: data.data?.total ?? 0, assigned: items.filter((i) => i.cardAssigned).length, notAssigned: items.filter((i) => !i.cardAssigned).length });
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load smart access list'));
    } finally {
      setLoading(false);
    }
  }, [assigned, groupFilter, limit, mode, page, search, staffRole, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportPdf(scope: 'page' | 'all') {
    setExporting(true);
    try {
      let exportRows = rows;
      if (scope === 'all') {
        const lim = 200;
        exportRows = [];
        for (let p = 1; p <= 50; p++) {
          if (mode === 'STAFF') {
            const { data } = await attendanceApi.staffCardAccess({
              department: groupFilter || undefined,
              staffRole: staffRole || undefined,
              q: search.trim() || undefined,
              assigned,
              page: p,
              limit: lim,
            });
            const batch = (data.data?.items ?? []).map((r) => ({
              id: r.staffId,
              fullName: r.fullName,
              code: r.employeeNumber,
              group: r.department,
              role: r.role,
              cardAssigned: r.cardAssigned,
              cardNumber: r.cardNumber,
              cardStatus: r.cardStatus,
              source: r.source,
            }));
            exportRows.push(...batch);
            if ((data.data?.items ?? []).length < lim) break;
          } else {
            const { data } = await attendanceApi.studentCardAccess({
              className: groupFilter || undefined,
              q: search.trim() || undefined,
              assigned,
              page: p,
              limit: lim,
            });
            const batch = (data.data?.items ?? []).map((r) => ({
              id: r.studentId,
              fullName: r.fullName,
              code: r.studentCode,
              group: r.className,
              role: r.studentCode,
              cardAssigned: r.cardAssigned,
              cardNumber: r.cardNumber,
              cardStatus: r.cardStatus,
              source: r.source,
            }));
            exportRows.push(...batch);
            if ((data.data?.items ?? []).length < lim) break;
          }
        }
      }
      const profile = await fetchSchoolOrganizationProfile();
      await exportCardAccessPdf(
        buildSchoolPdfBranding(profile, periodLabel, {
          title: 'Smart access cards',
          subtitle: `Filter: ${assigned === 'all' ? 'All' : assigned === 'yes' ? 'Card assigned' : 'No card'} · ${mode === 'STUDENT' ? 'Students' : 'Staff'}`,
          audienceLabel: mode === 'STUDENT' ? 'Students (Student Management / assigned cards)' : 'Staff (IAM / HR)',
        }) as any,
        exportRows.map((r) => ({
          fullName: r.fullName,
          code: r.code,
          group: r.group,
          role: mode === 'STAFF' ? r.role : r.code,
          cardAssigned: r.cardAssigned,
          cardNumber: r.cardNumber,
        }))
      );
      toast.success(`PDF ready · ${exportRows.length} row(s)`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  const groupOptions = mode === 'STUDENT' ? classes : departments;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#FCB038]">Smart access</p>
            <p className="text-sm text-muted">
              {mode === 'STUDENT'
                ? 'Students with assigned RFID cards (from Student Management and card registry).'
                : 'Staff with RFID card assignment (IAM / HR sync).'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button type="button" className="btn-secondary text-xs" disabled={exporting} onClick={() => void exportPdf('page')}>
              <FileDown size={14} /> PDF · page
            </button>
            <button type="button" className="btn-primary text-xs" disabled={exporting} onClick={() => void exportPdf('all')}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown size={14} />}
              PDF · all
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/90 p-1">
          {[
            { id: 'STUDENT' as const, label: 'Students', icon: Users },
            { id: 'STAFF' as const, label: 'Staff', icon: UserSquare2 },
          ].map((t) => {
            const Icon = t.icon;
            const active = mode === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setMode(t.id); setGroupFilter(''); setStaffRole(''); setPage(1); }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'}`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Assigned cards</p>
            <p className="text-xl font-extrabold text-navy">{loading ? '—' : summary.assigned.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Not assigned</p>
            <p className="text-xl font-extrabold text-navy">{loading ? '—' : summary.notAssigned.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Total {mode === 'STUDENT' ? 'students' : 'staff'}</p>
            <p className="text-xl font-extrabold text-navy">{loading ? '—' : (summary.total || total).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="input min-w-[180px] flex-1 text-sm"
          placeholder={mode === 'STUDENT' ? 'Search student name or code…' : 'Search staff…'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <FilterSelect
          label={mode === 'STUDENT' ? 'Class' : 'Department'}
          value={groupFilter}
          onChange={(v) => { setGroupFilter(v); setPage(1); }}
          options={[
            { value: '', label: mode === 'STUDENT' ? 'All classes' : 'All departments' },
            ...groupOptions.map((d) => ({ value: d, label: d })),
          ]}
        />
        {mode === 'STAFF' ? (
          <FilterSelect
            label="Position"
            value={staffRole}
            onChange={(v) => { setStaffRole(v); setPage(1); }}
            options={[
              { value: '', label: 'All positions' },
              ...staffRoles.map((p) => ({ value: p, label: p })),
            ]}
          />
        ) : null}
        <select className={filterSelectClass} value={assigned} onChange={(e) => { setAssigned(e.target.value as AssignedFilter); setPage(1); }}>
          <option value="all">All</option>
          <option value="yes">Card assigned</option>
          <option value="no">Not assigned</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{mode === 'STUDENT' ? 'Student' : 'Staff'}</th>
                <th className="px-4 py-3">{mode === 'STUDENT' ? 'Class' : 'Department'}</th>
                <th className="px-4 py-3">{mode === 'STUDENT' ? 'Code' : 'Position'}</th>
                <th className="px-4 py-3">Smart access card</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-4 py-3 text-muted">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{r.fullName}</p>
                      <p className="font-mono text-[10px] text-muted">{r.code ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">{r.group ?? '—'}</td>
                    <td className="px-4 py-3">{mode === 'STAFF' ? (r.role ?? '—') : (r.code ?? '—')}</td>
                    <td className="px-4 py-3">
                      {r.cardAssigned ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                          <IdCard size={12} /> Assigned · {r.cardNumber}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-800 ring-1 ring-red-200">
                          Not assigned
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No {mode === 'STUDENT' ? 'students' : 'staff'} match these filters.</p>
        ) : null}
        <ListPagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} />
      </div>
    </div>
  );
}
