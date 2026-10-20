'use client';

import { useEffect, useState } from 'react';
import { fetchCaSchoolFeesFilterOptions } from '@/lib/chief-accountant-api';
import { useCaContext } from './ca-context';

export type CaFeesFocus = 'all' | 'paid' | 'unpaid';

type Props = {
  className?: string;
  paymentStatus?: string;
  onClassNameChange?: (v: string) => void;
  onPaymentStatusChange?: (v: string) => void;
  onSearchChange?: (v: string) => void;
  search?: string;
  feesFocus?: CaFeesFocus;
  onFeesFocusChange?: (v: CaFeesFocus) => void;
  /** Show paid/unpaid focus control (student balances, transactions, etc.) */
  showFeesFocus?: boolean;
  /** Payments list: only All + Paid fees */
  feesFocusVariant?: 'student' | 'payments';
};

export function CaSchoolFeesFilters({
  className: classFilter,
  paymentStatus,
  onClassNameChange,
  onPaymentStatusChange,
  onSearchChange,
  search,
  feesFocus = 'all',
  onFeesFocusChange,
  showFeesFocus = false,
  feesFocusVariant = 'student',
}: Props) {
  const { orgScope } = useCaContext();
  const [options, setOptions] = useState<Awaited<ReturnType<typeof fetchCaSchoolFeesFilterOptions>> | null>(
    null
  );

  useEffect(() => {
    void fetchCaSchoolFeesFilterOptions(orgScope !== 'all' ? orgScope : undefined).then(setOptions);
  }, [orgScope]);

  const focusLocksStatus = showFeesFocus && feesFocus !== 'all';

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {showFeesFocus && onFeesFocusChange ? (
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Fees</label>
          <select
            className="input w-full"
            value={feesFocus}
            onChange={(e) => onFeesFocusChange(e.target.value as CaFeesFocus)}
          >
            <option value="all">All fees</option>
            <option value="paid">Paid fees</option>
            {feesFocusVariant === 'student' ? <option value="unpaid">Unpaid fees</option> : null}
          </select>
        </div>
      ) : null}
      {onClassNameChange ? (
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Class</label>
          <select className="input w-full" value={classFilter ?? ''} onChange={(e) => onClassNameChange(e.target.value)}>
            <option value="">All classes</option>
            {(options?.classes ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {onPaymentStatusChange ? (
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Payment status</label>
          <select
            className="input w-full"
            value={paymentStatus ?? ''}
            onChange={(e) => onPaymentStatusChange(e.target.value)}
            disabled={focusLocksStatus}
            title={focusLocksStatus ? 'Clear Fees filter to refine by status' : undefined}
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partially paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      ) : null}
      {onSearchChange ? (
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Search</label>
          <input
            className="input w-full"
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Student name, code, or bill number…"
          />
        </div>
      ) : null}
    </div>
  );
}

/** Map UI fees focus to balance list API paymentStatus */
export function feesFocusToPaymentStatus(focus: CaFeesFocus): string {
  if (focus === 'paid') return 'paid';
  if (focus === 'unpaid') return 'outstanding';
  return '';
}
