'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCaSchoolFeesBills } from '@/lib/chief-accountant-api';
import { balanceStatusLabel, formatRwf } from '@/lib/rep-finance-utils';
import { CaSchoolFeesPageHeader } from '@/components/chief-accountant/ca-school-fees-page-header';
import { CaSchoolFeesToolbar } from '@/components/chief-accountant/ca-school-fees-toolbar';
import { CaSchoolFeesFilters } from '@/components/chief-accountant/ca-school-fees-filters';
import { RepPagination } from '@/components/school-representative/rep-pagination';
import { useCaContext } from '@/components/chief-accountant/ca-context';

const PAGE_SIZE = 20;

type BillRow = Awaited<ReturnType<typeof fetchCaSchoolFeesBills>>['items'][number];

type Mode = 'invoices' | 'requirements';

export function CaInvoicesBillsView({ mode }: { mode: Mode }) {
  const { orgScope, academicYear, term } = useCaContext();
  const [className, setClassName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCaSchoolFeesBills>> | null>(null);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    try {
      setData(await fetchCaSchoolFeesBills(params));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [orgScope, academicYear, term, className, paymentStatus, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const isInvoices = mode === 'invoices';

  return (
    <div className="space-y-6">
      <CaSchoolFeesPageHeader title={isInvoices ? 'Invoices' : 'Bills & requirements'} />
      <CaSchoolFeesToolbar
        onRefresh={load}
        refreshing={loading}
        tableFilters={
          <CaSchoolFeesFilters
            className={className}
            paymentStatus={paymentStatus}
            onClassNameChange={setClassName}
            onPaymentStatusChange={setPaymentStatus}
            search={search}
            onSearchChange={setSearch}
          />
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8f9fc] text-left text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{isInvoices ? 'Invoice no.' : 'Bill no.'}</th>
                <th className="px-4 py-3">Student</th>
                {isInvoices ? <th className="px-4 py-3">Term</th> : <th className="px-4 py-3">Description</th>}
                {orgScope === 'all' ? <th className="px-4 py-3">School</th> : null}
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((row: BillRow) => {
                const badge = balanceStatusLabel(row.status);
                return (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono text-xs">{row.billNumber ?? row.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{row.studentName}</p>
                      <p className="text-xs text-muted">{row.studentCode}</p>
                    </td>
                    {isInvoices ? (
                      <td className="px-4 py-3 text-muted">
                        {[row.term, row.academicYear].filter(Boolean).join(', ')}
                      </td>
                    ) : (
                      <td className="px-4 py-3 text-muted">{row.structureName ?? 'Requirements'}</td>
                    )}
                    {orgScope === 'all' ? (
                      <td className="px-4 py-3 text-muted">{row.schoolName ?? ''}</td>
                    ) : null}
                    <td className="px-4 py-3 tabular-nums">{formatRwf(row.netAmount)}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-700">{formatRwf(row.paidAmount)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold">{formatRwf(row.balance)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isInvoices ? 'bg-sky-100 text-sky-900' : badge.tone
                        }`}
                      >
                        {isInvoices ? badge.label : badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
