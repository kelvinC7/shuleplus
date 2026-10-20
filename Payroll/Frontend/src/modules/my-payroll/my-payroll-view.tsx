'use client';

import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { MONTHS, formatRwf, statusColor } from '@/config/payroll-nav';
import { payrollApi } from '@/services/payroll-api';

export function MyPayrollView() {
  const [runs, setRuns] = useState<{ id: string; runNumber: string; month: number; year: number; status: string; totalsJson?: Record<string, number> }[]>([]);

  useEffect(() => {
    payrollApi.myPayroll().then(({ data }) => setRuns(data.data));
  }, []);

  return (
    <PayrollPageLayout title="My Payroll" subtitle="Staff self-service — view your payslip history">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {runs.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-amber/40">
            <div className="flex items-center justify-between">
              <Receipt size={20} className="text-amber" />
              <span className={`badge ${statusColor(r.status)}`}>{r.status}</span>
            </div>
            <h3 className="mt-3 font-semibold text-navy">{MONTHS[r.month - 1]} {r.year}</h3>
            <p className="text-xs text-muted">{r.runNumber}</p>
            {r.totalsJson && (
              <p className="mt-3 text-lg font-bold text-navy">{formatRwf(r.totalsJson.finalPayable ?? r.totalsJson.netSalary ?? 0)}</p>
            )}
          </div>
        ))}
        {!runs.length && (
          <div className="col-span-full rounded-2xl border border-dashed bg-white p-12 text-center">
            <p className="text-muted">No paid payroll history available yet</p>
          </div>
        )}
      </div>
    </PayrollPageLayout>
  );
}
