'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Play } from 'lucide-react';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { MONTHS, formatRwf } from '@/config/payroll-nav';
import { payrollApi } from '@/services/payroll-api';

export function DisbursementView() {
  const [runs, setRuns] = useState<{ id: string; runNumber: string; month: number; year: number; status: string }[]>([]);
  const [runId, setRunId] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [banks, setBanks] = useState<{ bankName: string; employeeCount: number; totalAmount: number }[]>([]);
  const [rules, setRules] = useState<{ id: string; name: string; amount: number; amountType: string }[]>([]);
  const [audit, setAudit] = useState<{ id: string; action: string; createdAt: string; detailJson?: Record<string, unknown> }[]>([]);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    payrollApi.listRuns({ status: 'PAID' }).catch(() => payrollApi.listRuns()).then(({ data }) => {
      const paid = data.data.filter((r: { status: string }) => r.status === 'PAID' || r.status === 'PROCESSING');
      setRuns(paid);
      if (paid[0]) setRunId(paid[0].id);
    });
    payrollApi.disbursementRules().then(({ data }) => setRules(data.data));
  }, []);

  useEffect(() => {
    if (!runId) return;
    payrollApi.paymentRows(runId).then(({ data }) => {
      setRows(data.data);
      setBanks(data.banks ?? []);
    });
    payrollApi.auditTrail(runId).then(({ data }) => setAudit(data.data));
  }, [runId]);

  async function applyDeductions() {
    if (!runId) return;
    setApplying(true);
    setMessage(null);
    try {
      const { data } = await payrollApi.applyScheduledDeductions(runId);
      setMessage(`Applied ${data.data.count} scheduled deduction entries`);
      const auditRes = await payrollApi.auditTrail(runId);
      setAudit(auditRes.data.data);
    } catch {
      setMessage('Failed to apply scheduled deductions');
    } finally {
      setApplying(false);
    }
  }

  return (
    <PayrollPageLayout
      title="Payroll Disbursement"
      subtitle="Process salary payments, apply scheduled deductions and audit trail"
      actions={
        <button type="button" className="btn-primary" onClick={() => void applyDeductions()} disabled={!runId || applying}>
          <Play size={16} /> {applying ? 'Applying…' : 'Apply Scheduled Deductions'}
        </button>
      }
    >
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.includes('Applied') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <label className="mb-1 block text-[10px] font-semibold uppercase text-muted">Paid Run</label>
            <select className="input" value={runId} onChange={(e) => setRunId(e.target.value)}>
              {runs.map((r) => <option key={r.id} value={r.id}>{r.runNumber} — {MONTHS[r.month - 1]} {r.year}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[10px] uppercase text-muted">
                <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Bank</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Payable</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{String(r.employeeName)}</td>
                    <td className="px-4 py-3 text-muted">{String(r.bankName ?? '—')}</td>
                    <td className="px-4 py-3 font-mono text-xs">{String(r.bankAccount ?? '—')}</td>
                    <td className="px-4 py-3 font-semibold">{formatRwf(Number(r.finalPayable ?? 0))}</td>
                    <td className="px-4 py-3"><span className="badge bg-amber-100 text-amber-800">{String(r.paymentStatus ?? 'pending')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-navy">Disbursement Rules</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {rules.map((r) => (
                <li key={r.id} className="rounded-xl bg-slate-50 px-3 py-2">{r.name} — {Number(r.amount).toLocaleString()} ({r.amountType})</li>
              ))}
              {!rules.length && <li className="text-muted">No active rules</li>}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-navy">By Bank Summary</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {banks.map((b) => (
                <li key={b.bankName} className="flex justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <span>{b.bankName} ({b.employeeCount})</span>
                  <span className="font-semibold">{formatRwf(b.totalAmount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-navy">
              <ClipboardList size={18} /> Audit Trail
            </h2>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
              {audit.map((a) => (
                <li key={a.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="font-medium text-navy">{a.action}</p>
                  <p className="text-muted">{new Date(a.createdAt).toLocaleString()}</p>
                </li>
              ))}
              {!audit.length && <li className="text-muted">No audit entries yet</li>}
            </ul>
          </div>
        </div>
      </div>
    </PayrollPageLayout>
  );
}
