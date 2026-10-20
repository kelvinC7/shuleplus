'use client';

import { X } from 'lucide-react';
import { balanceStatusLabel, formatRwf } from '@/lib/rep-finance-utils';

export type CaStudentFeeRow = {
  id: string;
  studentId?: string;
  studentName: string;
  studentCode: string;
  className: string;
  schoolName?: string;
  expected: number;
  paid: number;
  balance: number;
  status: string;
  academicYear?: string;
  term?: string;
};

type Props = {
  row: CaStudentFeeRow | null;
  onClose: () => void;
};

function termLabel(term?: string, academicYear?: string) {
  if (term && academicYear) return `${term}, ${academicYear}`;
  return term || academicYear || '';
}

export function CaStudentFeeDrawer({ row, onClose }: Props) {
  if (!row) return null;
  const badge = balanceStatusLabel(row.status);
  const pct =
    row.expected > 0 ? Math.min(100, Math.round((row.paid / row.expected) * 1000) / 10) : row.paid > 0 ? 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-navy/40" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy">{row.studentName}</h2>
            <p className="text-sm text-muted">
              {row.studentCode} · {row.className}
            </p>
            {row.schoolName ? <p className="text-xs text-muted">{row.schoolName}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-navy"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-2xl border border-border bg-[#f8f9fc] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${badge.tone}`}>
                {badge.label}
              </span>
              <span className="text-sm font-semibold text-navy">{pct}% paid</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase text-muted">Expected</dt>
                <dd className="font-semibold tabular-nums text-navy">{formatRwf(row.expected)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-muted">Paid</dt>
                <dd className="font-semibold tabular-nums text-emerald-700">{formatRwf(row.paid)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-muted">Balance</dt>
                <dd className="font-semibold tabular-nums text-amber-700">{formatRwf(row.balance)}</dd>
              </div>
              {termLabel(row.term, row.academicYear) ? (
                <div>
                  <dt className="text-[10px] font-bold uppercase text-muted">Term</dt>
                  <dd className="text-navy">{termLabel(row.term, row.academicYear)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </aside>
    </div>
  );
}
