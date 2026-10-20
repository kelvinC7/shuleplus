'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCaSchoolFeesBalances } from '@/lib/chief-accountant-api';
import { balanceStatusLabel, formatRwf } from '@/lib/rep-finance-utils';
import { RepFeesExportMenu } from '@/components/school-representative/rep-fees-export-menu';
import { CaSchoolFeesPageHeader } from '@/components/chief-accountant/ca-school-fees-page-header';
import { CaSchoolFeesToolbar } from '@/components/chief-accountant/ca-school-fees-toolbar';
import { CaSchoolFeesFilters } from '@/components/chief-accountant/ca-school-fees-filters';
import { RepPagination } from '@/components/school-representative/rep-pagination';
import { useCaContext } from '@/components/chief-accountant/ca-context';

const PAGE_SIZE = 20;

const TABS = [
  { id: 'all', label: 'All unpaid', status: 'unpaid' },
  { id: 'partial', label: 'Partially paid', status: 'partial' },
  { id: 'full', label: 'Fully unpaid', status: 'unpaid' },
  { id: 'overdue', label: 'Overdue', status: 'overdue' },
  { id: 'plan', label: 'Payment plan', status: '' },
  { id: 'exempted', label: 'Exempted', status: '' },
] as const;

type Row = Awaited<ReturnType<typeof fetchCaSchoolFeesBalances>>['items'][number];

export function CaUnpaidFeesView() {
  const { orgScope, academicYear, term } = useCaContext();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all');
  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCaSchoolFeesBalances>> | null>(null);
  const [loading, setLoading] = useState(true);

  const tabDef = TABS.find((t) => t.id === tab)!;
  const paymentStatus = tabDef.status;

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
    if (orgScope !== 'all') p.organizationId = orgScope;
    if (academicYear) p.academicYear = academicYear;
    if (term) p.term = term;
    if (className) p.className = className;
    if (paymentStatus) p.paymentStatus = paymentStatus;
    if (search) p.search = search;
    return p;
  }, [orgScope, academicYear, term, className, paymentStatus, search, page]);

  const load = useCallback(async () => {
    if (tab === 'plan' || tab === 'exempted') {
      setData({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0, summary: undefined });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchCaSchoolFeesBalances(params);
      let items = res.items ?? [];
      if (tab === 'full') {
        items = items.filter((r: Row) => r.paid === 0 && r.balance > 0);
      }
      setData({ ...res, items, total: tab === 'full' ? items.length : res.total });
    } finally {
      setLoading(false);
    }
  }, [params, tab]);

  useEffect(() => {
    setPage(1);
  }, [orgScope, academicYear, term, className, paymentStatus, search, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportRows = (data?.items ?? []).map((row: Row) => ({
    Student: row.studentName,
    Code: row.studentCode,
    Class: row.className,
    Expected: row.expected,
    Paid: row.paid,
    Balance: row.balance,
    Status: row.status,
  }));

  return (
    <div className="space-y-6">
      <CaSchoolFeesPageHeader
        title="Unpaid fees"
        actions={
          <RepFeesExportMenu
            title="Unpaid fees / debtors list"
            filterSummary={`Tab: ${tabDef.label} · ${academicYear} · ${term}`}
            summaryRows={[]}
            tableHeaders={['Student', 'Code', 'Class', 'Expected', 'Paid', 'Balance', 'Status']}
            tableRows={exportRows}
            fileBaseName="ca-unpaid-fees"
          />
        }
      />
      <CaSchoolFeesToolbar onRefresh={load} refreshing={loading} />

      <div className="flex flex-wrap gap-2 rounded-xl border border-border/80 bg-white p-2 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold sm:text-sm ${
              tab === t.id ? 'bg-navy text-white' : 'text-muted hover:bg-slate-50 hover:text-navy'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' || tab === 'exempted' ? (
        <p className="rounded-xl border border-border bg-[#f8f9fc] px-4 py-6 text-sm text-muted">No records.</p>
      ) : (
        <>
          <div className="sticky top-[56px] z-10 rounded-2xl border border-border bg-white p-4 shadow-sm">
            <CaSchoolFeesFilters
              className={className}
              onClassNameChange={setClassName}
              search={search}
              onSearchChange={setSearch}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f8f9fc] text-left text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Expected</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Due date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items ?? []).map((row: Row) => {
                    const badge = balanceStatusLabel(row.status);
                    return (
                      <tr key={row.id} className="border-t border-border/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-navy">{row.studentName}</p>
                          <p className="text-xs text-muted">{row.studentCode}</p>
                        </td>
                        <td className="px-4 py-3">{row.className}</td>
                        <td className="px-4 py-3 tabular-nums">{formatRwf(row.expected)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatRwf(row.paid)}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-amber-800">{formatRwf(row.balance)}</td>
                        <td className="px-4 py-3 text-xs text-muted">
                          {(row as { dueDate?: string | null }).dueDate
                            ? new Date((row as { dueDate: string }).dueDate).toLocaleDateString('en-GB')
                            : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${badge.tone}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data && tab !== 'full' ? (
              <div className="border-t border-border px-4 py-3">
                <RepPagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
