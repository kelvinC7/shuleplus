'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchRepSchoolFeesFilterOptions,
  fetchRepSchoolFeesTransactions,
} from '@/lib/school-representative-api';
import { formatRwf } from '@/lib/rep-finance-utils';
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

export default function RepSchoolFeesTransactionsPage() {
  const { schools, schoolScope, academicYear, term } = useRepContext();
  const [filters, setFilters] = useState<FeesFilterState>({
    ...DEFAULT_FILTERS,
    organizationId: schoolScope,
    academicYear,
    term,
  });
  const [options, setOptions] = useState<Awaited<ReturnType<typeof fetchRepSchoolFeesFilterOptions>> | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRepSchoolFeesTransactions>> | null>(null);
  const [page, setPage] = useState(1);
  type TxRow = Awaited<ReturnType<typeof fetchRepSchoolFeesTransactions>>['items'][number];
  const [drawer, setDrawer] = useState<TxRow | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
    if (filters.organizationId !== 'all') p.organizationId = filters.organizationId;
    if (filters.academicYear) p.academicYear = filters.academicYear;
    if (filters.term) p.term = filters.term;
    if (filters.feeCategory) p.feeCategory = filters.feeCategory;
    if (filters.paymentMethod) p.paymentMethod = filters.paymentMethod;
    if (filters.dateFrom) p.dateFrom = filters.dateFrom;
    if (filters.dateTo) p.dateTo = filters.dateTo;
    if (filters.search) p.search = filters.search;
    return p;
  }, [filters, page]);

  const load = useCallback(async () => {
    setData(await fetchRepSchoolFeesTransactions(queryParams));
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

  const rows = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <RepFeesExportMenu
          title="Payment Transactions"
          filterSummary="Filtered export"
          summaryRows={[{ Total: data?.total ?? 0 }]}
          tableHeaders={['Receipt', 'Student', 'School', 'Amount', 'Status', 'Date']}
          tableRows={rows.map((r) => ({
            Receipt: r.receiptNumber ?? r.paymentNumber,
            Student: r.studentName,
            School: r.schoolName ?? '',
            Amount: r.amount,
            Status: r.status,
            Date: r.paidAt,
          }))}
          fileBaseName="school-fees-transactions"
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
        showPaymentStatus={false}
        searchPlaceholder="Receipt, student, or reference…"
      />

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f8f9fc] text-left text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-border/70 hover:bg-slate-50"
                onClick={() => setDrawer(row)}
              >
                <td className="px-4 py-3 font-mono text-xs">{row.receiptNumber ?? row.paymentNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-navy">{row.studentName}</p>
                  <p className="text-xs text-muted">{row.studentCode}</p>
                </td>
                <td className="px-4 py-3">{row.schoolName}</td>
                <td className="px-4 py-3 font-semibold">{formatRwf(row.amount)}</td>
                <td className="px-4 py-3">{row.method}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3 text-muted">{new Date(row.paidAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setDrawer(row)}
            className="w-full rounded-2xl border border-border bg-white p-4 text-left shadow-sm"
          >
            <p className="font-mono text-xs text-muted">{row.receiptNumber ?? row.paymentNumber}</p>
            <p className="mt-1 font-semibold text-navy">{row.studentName}</p>
            <p className="text-xs text-muted">
              {row.schoolName} · {formatRwf(row.amount)} · {row.status}
            </p>
          </button>
        ))}
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

      {drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="font-semibold text-navy">Payment detail</p>
              <button type="button" className="text-sm text-muted" onClick={() => setDrawer(null)}>
                Close
              </button>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <Row label="Receipt" value={drawer.receiptNumber ?? drawer.paymentNumber} />
              <Row label="Student" value={`${drawer.studentName} (${drawer.studentCode})`} />
              <Row label="School" value={drawer.schoolName ?? '—'} />
              <Row label="Amount" value={formatRwf(drawer.amount)} />
              <Row label="Category" value={drawer.feeCategory} />
              <Row label="Method" value={drawer.method} />
              <Row label="Reference" value={drawer.reference ?? '—'} />
              <Row label="Status" value={drawer.status} />
              <Row label="Recorded by" value={drawer.recordedBy} />
              <Row label="Paid at" value={new Date(drawer.paidAt).toLocaleString()} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-navy">{value}</p>
    </div>
  );
}
