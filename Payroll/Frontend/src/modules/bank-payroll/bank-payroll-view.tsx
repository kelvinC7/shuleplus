'use client';

import { useEffect, useState } from 'react';
import { Download, Building2 } from 'lucide-react';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { MONTHS, formatRwf } from '@/config/payroll-nav';
import { payrollApi } from '@/services/payroll-api';

interface BankGroup {
  bankName: string; employeeCount: number; totalAmount: number;
  employees: { employeeName?: string; bankAccount?: string; finalPayable?: number }[];
}

export function BankPayrollView() {
  const [runs, setRuns] = useState<{ id: string; runNumber: string; month: number; year: number }[]>([]);
  const [runId, setRunId] = useState('');
  const [banks, setBanks] = useState<BankGroup[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    payrollApi.listRuns().then(({ data }) => {
      const eligible = data.data.filter((r: { status: string }) => ['PAID', 'PROCESSING'].includes(r.status));
      setRuns(eligible);
      if (eligible[0]) setRunId(eligible[0].id);
    });
  }, []);

  useEffect(() => {
    if (!runId) return;
    payrollApi.paymentRows(runId).then(({ data }) => setBanks(data.banks ?? []));
  }, [runId]);

  function exportBank(bank: BankGroup) {
    const csv = ['Name,Account,Amount', ...bank.employees.map((e) => `${e.employeeName},${e.bankAccount},${e.finalPayable}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bank-${bank.bankName.replace(/\s+/g, '-')}.csv`;
    a.click();
  }

  return (
    <PayrollPageLayout title="Bank Payroll" subtitle="Generate bank transfer files grouped by financial institution">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="mb-1 block text-[10px] font-semibold uppercase text-muted">Payroll Run</label>
        <select className="input max-w-md" value={runId} onChange={(e) => setRunId(e.target.value)}>
          {runs.map((r) => <option key={r.id} value={r.id}>{r.runNumber} — {MONTHS[r.month - 1]} {r.year}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banks.map((b) => (
          <div key={b.bankName} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/5 text-navy"><Building2 size={20} /></div>
              <button type="button" onClick={() => exportBank(b)} className="btn-secondary py-1.5 text-xs"><Download size={14} /> CSV</button>
            </div>
            <h3 className="mt-3 font-semibold text-navy">{b.bankName}</h3>
            <p className="text-sm text-muted">{b.employeeCount} employees</p>
            <p className="mt-2 text-lg font-bold text-amber-700">{formatRwf(b.totalAmount)}</p>
            <button type="button" onClick={() => setExpanded(expanded === b.bankName ? null : b.bankName)} className="mt-3 text-xs font-semibold text-navy hover:text-amber">
              {expanded === b.bankName ? 'Hide' : 'View'} employees
            </button>
            {expanded === b.bankName && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                {b.employees.map((e, i) => (
                  <li key={i} className="flex justify-between border-t border-slate-100 py-1">
                    <span>{e.employeeName}</span>
                    <span className="font-medium">{formatRwf(e.finalPayable ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {!banks.length && <div className="col-span-full rounded-2xl border border-dashed bg-white p-12 text-center text-muted">No bank data for selected run</div>}
      </div>
    </PayrollPageLayout>
  );
}
