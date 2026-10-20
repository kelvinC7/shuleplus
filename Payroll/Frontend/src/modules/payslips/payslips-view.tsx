'use client';

import { useEffect, useState } from 'react';
import { Download, Printer, Save } from 'lucide-react';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { MONTHS, formatRwf } from '@/config/payroll-nav';
import { payrollApi } from '@/services/payroll-api';
import { exportPayslipPdf } from '@/utils/payroll-pdf-export';

export function PayslipsView() {
  const [runs, setRuns] = useState<{ id: string; runNumber: string; month: number; year: number }[]>([]);
  const [runId, setRunId] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [branding, setBranding] = useState<{ schoolName?: string; logoUrl?: string; footerText?: string } | null>(null);
  const [brandForm, setBrandForm] = useState({ schoolName: '', logoUrl: '', footerText: '' });
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [savingBrand, setSavingBrand] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    Promise.all([payrollApi.listRuns(), payrollApi.getBranding()]).then(([r, b]) => {
      const paid = r.data.data.filter((x: { status: string }) => x.status === 'PAID' || x.status === 'PROCESSING');
      setRuns(paid);
      if (paid[0]) setRunId(paid[0].id);
      const br = b.data.data ?? {};
      setBranding(br);
      setBrandForm({
        schoolName: br.schoolName ?? '',
        logoUrl: br.logoUrl ?? '',
        footerText: br.footerText ?? '',
      });
    });
  }, []);

  useEffect(() => {
    if (!runId) return;
    payrollApi.getRun(runId).then(({ data }) => setRows((data.data.registerJson as Record<string, unknown>[]) ?? []));
  }, [runId]);

  const slip = rows[selectedIdx];
  const run = runs.find((r) => r.id === runId);

  function print() {
    window.print();
  }

  async function downloadPdf() {
    if (!slip) return;
    setPdfLoading(true);
    try {
      await exportPayslipPdf('payslip-preview', `payslip-${slip.employeeNumber}-${run?.runNumber ?? 'export'}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  }

  async function saveBranding() {
    setSavingBrand(true);
    try {
      const { data } = await payrollApi.saveBranding(brandForm);
      setBranding(data.data);
    } finally {
      setSavingBrand(false);
    }
  }

  return (
    <PayrollPageLayout
      title="Pay Slips"
      subtitle="Preview, PDF download, print and branding"
      actions={
        <>
          <button type="button" onClick={() => void downloadPdf()} disabled={!slip || pdfLoading} className="btn-secondary">
            <Download size={16} /> {pdfLoading ? 'Generating…' : 'PDF'}
          </button>
          <button type="button" onClick={print} className="btn-secondary"><Printer size={16} /> Print</button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <label className="mb-1 block text-[10px] font-semibold uppercase text-muted">Run</label>
            <select className="input" value={runId} onChange={(e) => { setRunId(e.target.value); setSelectedIdx(0); }}>
              {runs.map((r) => <option key={r.id} value={r.id}>{r.runNumber}</option>)}
            </select>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-navy">Branding</h3>
            <input className="input mb-2" placeholder="School name" value={brandForm.schoolName} onChange={(e) => setBrandForm((f) => ({ ...f, schoolName: e.target.value }))} />
            <input className="input mb-2" placeholder="Logo URL" value={brandForm.logoUrl} onChange={(e) => setBrandForm((f) => ({ ...f, logoUrl: e.target.value }))} />
            <input className="input mb-2" placeholder="Footer text" value={brandForm.footerText} onChange={(e) => setBrandForm((f) => ({ ...f, footerText: e.target.value }))} />
            <button type="button" className="btn-primary w-full" onClick={() => void saveBranding()} disabled={savingBrand}>
              <Save size={14} /> {savingBrand ? 'Saving…' : 'Save branding'}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            {rows.map((r, i) => (
              <button key={i} type="button" onClick={() => setSelectedIdx(i)}
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left text-sm ${selectedIdx === i ? 'bg-amber/15 font-semibold' : 'hover:bg-slate-50'}`}>
                {String(r.employeeName)}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {slip ? (
            <div id="payslip-preview" className="rounded-2xl border-2 border-navy/10 bg-white p-8 shadow-lg print:shadow-none">
              <div className="border-b border-slate-200 pb-4">
                {branding?.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.logoUrl} alt="" className="mb-2 h-12 object-contain" />
                )}
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber">Payslip</p>
                <h2 className="text-xl font-bold text-navy">{branding?.schoolName ?? 'School'}</h2>
                <p className="text-sm text-muted">{run ? `${MONTHS[run.month - 1]} ${run.year}` : ''} · {String(run?.runNumber ?? '')}</p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase text-muted">Employee</p>
                  <p className="font-semibold text-navy">{String(slip.employeeName)}</p>
                  <p className="text-xs text-muted">{String(slip.employeeNumber)} · {String(slip.department ?? '')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted">Bank</p>
                  <p className="text-sm">{String(slip.bankName ?? '—')}</p>
                  <p className="font-mono text-xs">{String(slip.bankAccount ?? '—')}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-emerald-50/60 p-4">
                  <p className="text-[10px] font-bold uppercase text-emerald-800">Earnings</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li className="flex justify-between"><span>Basic</span><span>{formatRwf(Number(slip.basicSalary ?? 0))}</span></li>
                    <li className="flex justify-between"><span>Housing</span><span>{formatRwf(Number(slip.housing ?? 0))}</span></li>
                    <li className="flex justify-between"><span>Transport</span><span>{formatRwf(Number(slip.transport ?? 0))}</span></li>
                    <li className="flex justify-between font-bold border-t pt-1"><span>Gross</span><span>{formatRwf(Number(slip.gross ?? 0))}</span></li>
                  </ul>
                </div>
                <div className="rounded-xl bg-red-50/40 p-4">
                  <p className="text-[10px] font-bold uppercase text-red-800">Deductions</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li className="flex justify-between"><span>PAYE</span><span>{formatRwf(Number(slip.paye ?? 0))}</span></li>
                    <li className="flex justify-between"><span>RSSB</span><span>{formatRwf(Number(slip.rssbEmployee ?? 0))}</span></li>
                    <li className="flex justify-between"><span>RAMA</span><span>{formatRwf(Number(slip.ramaEmployee ?? 0))}</span></li>
                    <li className="flex justify-between font-bold border-t pt-1"><span>Net</span><span>{formatRwf(Number(slip.netSalary ?? 0))}</span></li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-navy px-6 py-4 text-white">
                <p className="text-[10px] uppercase text-white/60">Final Payable</p>
                <p className="text-2xl font-bold text-amber">{formatRwf(Number(slip.finalPayable ?? 0))}</p>
              </div>
              {branding?.footerText && (
                <p className="mt-4 text-center text-xs text-muted">{branding.footerText}</p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-muted">Select a run with payroll data</div>
          )}
        </div>
      </div>
    </PayrollPageLayout>
  );
}
