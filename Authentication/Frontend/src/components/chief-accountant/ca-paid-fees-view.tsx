'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCaSchoolFeesTransactions } from '@/lib/chief-accountant-api';
import { formatRwf } from '@/lib/rep-finance-utils';
import { RepFeesExportMenu } from '@/components/school-representative/rep-fees-export-menu';
import { CaSchoolFeesPageHeader } from '@/components/chief-accountant/ca-school-fees-page-header';
import { CaSchoolFeesToolbar } from '@/components/chief-accountant/ca-school-fees-toolbar';
import { CaSchoolFeesFilters } from '@/components/chief-accountant/ca-school-fees-filters';
import { RepPagination } from '@/components/school-representative/rep-pagination';
import { useCaContext } from '@/components/chief-accountant/ca-context';

const PAGE_SIZE = 20;

type TxRow = Awaited<ReturnType<typeof fetchCaSchoolFeesTransactions>>['items'][number];

export function CaPaidFeesView() {
  const { orgScope, academicYear, term } = useCaContext();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCaSchoolFeesTransactions>> | null>(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const p: Record<string, string | number> = {
      page,
      pageSize: PAGE_SIZE,
      transactionStatus: 'SUCCESSFUL',
    };
    if (orgScope !== 'all') p.organizationId = orgScope;
    if (academicYear) p.academicYear = academicYear;
    if (term) p.term = term;
    if (search) p.search = search;
    return p;
  }, [orgScope, academicYear, term, search, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCaSchoolFeesTransactions(params));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [orgScope, academicYear, term, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportRows = (data?.items ?? []).map((row: TxRow) => ({
    Receipt: row.receiptNumber ?? row.paymentNumber,
    Date: new Date(row.paidAt).toLocaleString('en-GB'),
    Student: row.studentName,
    Code: row.studentCode,
    School: row.schoolName ?? '',
    Amount: row.amount,
    Method: row.method,
    Status: row.status,
    Reference: (row as { reference?: string }).reference ?? '',
  }));

  return (
    <div className="space-y-6">
      <CaSchoolFeesPageHeader
        title="Paid fees"
        actions={
          <RepFeesExportMenu
            title="Paid fees register"
            filterSummary={`${orgScope === 'all' ? 'All schools' : 'Single school'} · ${academicYear} · ${term}`}
            summaryRows={[{ 'Record count': data?.total ?? 0 }]}
            tableHeaders={['Receipt', 'Date', 'Student', 'Code', 'School', 'Amount', 'Method', 'Status', 'Reference']}
            tableRows={exportRows}
            fileBaseName="ca-paid-fees"
          />
        }
      />
      <CaSchoolFeesToolbar
        onRefresh={load}
        refreshing={loading}
        tableFilters={<CaSchoolFeesFilters search={search} onSearchChange={setSearch} />}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8f9fc] text-left text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Payment date</th>
                <th className="px-4 py-3">Student</th>
                {orgScope === 'all' ? <th className="px-4 py-3">School</th> : null}
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Amount paid</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((row: TxRow) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono text-xs">{row.receiptNumber ?? row.paymentNumber}</td>
                  <td className="px-4 py-3 text-xs text-muted">{new Date(row.paidAt).toLocaleString('en-GB')}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{row.studentName}</p>
                    <p className="text-xs text-muted">{row.studentCode}</p>
                  </td>
                  {orgScope === 'all' ? (
                    <td className="px-4 py-3 text-muted">{row.schoolName ?? ''}</td>
                  ) : null}
                  <td className="px-4 py-3">{row.className ?? ''}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-emerald-700">{formatRwf(row.amount)}</td>
                  <td className="px-4 py-3 text-muted">{row.method}</td>
                  <td className="px-4 py-3 font-mono text-xs">{(row as { reference?: string }).reference ?? ''}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data ? (
          <div className="border-t border-border px-4 py-3">
            <RepPagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
