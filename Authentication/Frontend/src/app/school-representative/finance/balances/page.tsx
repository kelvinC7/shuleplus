'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchRepSchoolFeesBalances,
  fetchRepSchoolFeesFilterOptions,
} from '@/lib/school-representative-api';
import { balanceStatusLabel, formatRwf } from '@/lib/rep-finance-utils';
import { RepFeesExportMenu } from '@/components/school-representative/rep-fees-export-menu';
import { RepFeesFilters, type FeesFilterState } from '@/components/school-representative/rep-fees-filters';
import { RepPagination } from '@/components/school-representative/rep-pagination';
import { useRepContext } from '@/components/school-representative/rep-context';

const PAGE_SIZE = 15;

const DEFAULT_FILTERS: FeesFilterState = {
  organizationId: 'all',
  academicYear: '',
  term: '',
  className: '',
  paymentStatus: '',
  feeCategory: '',
  paymentMethod: '',
  dateFrom: '',
  dateTo: '',
  search: '',
};

type BalanceRow = Awaited<ReturnType<typeof fetchRepSchoolFeesBalances>>['items'][number];

export default function RepSchoolFeesBalancesPage() {
  const { schools, schoolScope, academicYear, term } = useRepContext();
  const [filters, setFilters] = useState<FeesFilterState>({
    ...DEFAULT_FILTERS,
    organizationId: schoolScope,
    academicYear,
    term,
  });
  const [options, setOptions] = useState<Awaited<ReturnType<typeof fetchRepSchoolFeesFilterOptions>> | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRepSchoolFeesBalances>> | null>(null);
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
    if (filters.organizationId !== 'all') p.organizationId = filters.organizationId;
    if (filters.academicYear) p.academicYear = filters.academicYear;
    if (filters.term) p.term = filters.term;
    if (filters.className) p.className = filters.className;
    if (filters.paymentStatus) p.paymentStatus = filters.paymentStatus;
    if (filters.search) p.search = filters.search;
    return p;
  }, [filters, page]);

  const load = useCallback(async () => {
    setData(await fetchRepSchoolFeesBalances(queryParams));
  }, [queryParams]);

  useEffect(() => {
    void fetchRepSchoolFeesFilterOptions(
      filters.organizationId !== 'all' ? filters.organizationId : undefined
    ).then(setOptions);
  }, [filters.organizationId]);

  useEffect(() => {
    if (academicYear && term) {
      setFilters((f) => ({ ...f, academicYear, term }));
    }
  }, [academicYear, term]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: BalanceRow[] = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <RepFeesExportMenu
          title="Student Balances"
          filterSummary="Filtered balances"
          summaryRows={[{ Records: data?.total ?? 0 }]}
          tableHeaders={['Student', 'School', 'Class', 'Expected', 'Paid', 'Balance', 'Status']}
          tableRows={rows.map((r) => ({
            Student: r.studentName,
            School: r.schoolName ?? '',
            Class: r.className,
            Expected: r.expected,
            Paid: r.paid,
            Balance: r.balance,
            Status: r.status,
          }))}
          fileBaseName="student-fee-balances"
        />
      </div>

      <RepFeesFilters
        schools={schools}
        filters={filters}
        onChange={setFilters}
        options={options}
        onReset={() =>
          setFilters({ ...DEFAULT_FILTERS, organizationId: schoolScope, academicYear, term })
        }
        showDates={false}
        searchPlaceholder="Student name or code…"
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8f9fc] text-left text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const st = balanceStatusLabel(row.status);
                return (
                  <tr key={row.id} className="border-t border-border/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{row.studentName}</p>
                      <p className="font-mono text-xs text-muted">{row.studentCode}</p>
                    </td>
                    <td className="px-4 py-3">{row.schoolName}</td>
                    <td className="px-4 py-3">{row.className}</td>
                    <td className="px-4 py-3">{formatRwf(row.expected)}</td>
                    <td className="px-4 py-3">{formatRwf(row.paid)}</td>
                    <td className="px-4 py-3 font-semibold">{formatRwf(row.balance)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.tone}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {data ? (
        <RepPagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={data.pageSize ?? PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
