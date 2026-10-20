'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchCaSchoolFeesBalances } from '@/lib/chief-accountant-api';
import { balanceStatusLabel, formatRwf } from '@/lib/rep-finance-utils';
import { CaSchoolFeesPageHeader } from '@/components/chief-accountant/ca-school-fees-page-header';
import { CaSchoolFeesToolbar } from '@/components/chief-accountant/ca-school-fees-toolbar';
import {
  CaSchoolFeesFilters,
  feesFocusToPaymentStatus,
  type CaFeesFocus,
} from '@/components/chief-accountant/ca-school-fees-filters';
import { CaStudentFeeDrawer, type CaStudentFeeRow } from '@/components/chief-accountant/ca-student-fee-drawer';
import { RepPagination } from '@/components/school-representative/rep-pagination';
import { StatCard } from '@/components/school-representative/stat-card';
import { useCaContext } from '@/components/chief-accountant/ca-context';

const PAGE_SIZE = 20;

type Row = Awaited<ReturnType<typeof fetchCaSchoolFeesBalances>>['items'][number];

export function CaStudentFeeAccountsView() {
  const searchParams = useSearchParams();
  const feesParam = searchParams.get('fees');
  const initialFocus: CaFeesFocus =
    feesParam === 'paid' || feesParam === 'unpaid' ? feesParam : 'all';
  const { orgScope, academicYear, term } = useCaContext();
  const [className, setClassName] = useState('');
  const [feesFocus, setFeesFocus] = useState<CaFeesFocus>(initialFocus);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCaSchoolFeesBalances>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CaStudentFeeRow | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
    if (orgScope !== 'all') p.organizationId = orgScope;
    if (academicYear) p.academicYear = academicYear;
    if (term) p.term = term;
    if (className) p.className = className;
    const statusFromFocus = feesFocusToPaymentStatus(feesFocus);
    const status = statusFromFocus || paymentStatus;
    if (status) p.paymentStatus = status;
    if (search) p.search = search;
    return p;
  }, [orgScope, academicYear, term, className, feesFocus, paymentStatus, search, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCaSchoolFeesBalances(params));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [orgScope, academicYear, term, className, feesFocus, paymentStatus, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <CaSchoolFeesPageHeader />
      <CaSchoolFeesToolbar
        onRefresh={load}
        refreshing={loading}
        tableFilters={
          <CaSchoolFeesFilters
            showFeesFocus
            feesFocus={feesFocus}
            onFeesFocusChange={setFeesFocus}
            className={className}
            paymentStatus={paymentStatus}
            onClassNameChange={setClassName}
            onPaymentStatusChange={setPaymentStatus}
            search={search}
            onSearchChange={setSearch}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Students" value={summary?.totalStudents ?? 0} accent />
        <StatCard label="Paid" value={summary?.paid ?? 0} />
        <StatCard label="Partial" value={summary?.partial ?? 0} />
        <StatCard label="Unpaid" value={summary?.unpaid ?? 0} />
        <StatCard label="Overdue" value={summary?.overdue ?? 0} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8f9fc] text-left text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Class</th>
                {orgScope === 'all' ? <th className="px-4 py-3">School</th> : null}
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((row: Row) => {
                const badge = balanceStatusLabel(row.status);
                return (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium text-navy">{row.studentName}</td>
                    <td className="px-4 py-3 text-xs text-muted">{row.studentCode}</td>
                    <td className="px-4 py-3">{row.className}</td>
                    {orgScope === 'all' ? (
                      <td className="px-4 py-3 text-muted">{row.schoolName ?? ''}</td>
                    ) : null}
                    <td className="px-4 py-3 tabular-nums">{formatRwf(row.expected)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatRwf(row.paid)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold">{formatRwf(row.balance)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${badge.tone}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSelected({
                            id: row.id,
                            studentId: row.studentId,
                            studentName: row.studentName,
                            studentCode: row.studentCode,
                            className: row.className,
                            schoolName: row.schoolName,
                            expected: row.expected,
                            paid: row.paid,
                            balance: row.balance,
                            status: row.status,
                            academicYear: row.academicYear,
                            term: row.term,
                          })
                        }
                        className="rounded-lg bg-primary/90 px-3 py-1.5 text-xs font-bold text-navy hover:bg-primary"
                      >
                        View
                      </button>
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

      <CaStudentFeeDrawer row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
