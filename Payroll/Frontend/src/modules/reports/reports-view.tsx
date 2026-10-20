'use client';

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { PayrollRegisterTable } from '@/components/payroll-register-table';
import { MONTHS, formatRwf, statusColor } from '@/config/payroll-nav';
import { payrollApi } from '@/services/payroll-api';
import { exportBankPdf, exportPayePdf, exportRssbPdf } from '@/utils/payroll-pdf-export';

export function ReportsView() {
  const [runs, setRuns] = useState<{ id: string; runNumber: string; month: number; year: number; status: string; totalsJson?: Record<string, number> }[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [schoolName, setSchoolName] = useState<string>();

  useEffect(() => {
    Promise.all([payrollApi.listRuns(), payrollApi.getBranding()]).then(([r, b]) => {
      setRuns(r.data.data);
      if (r.data.data[0]) setSelectedRun(r.data.data[0].id);
      setSchoolName(b.data.data?.schoolName);
    });
  }, []);

  useEffect(() => {
    if (!selectedRun) return;
    payrollApi.getRun(selectedRun).then(({ data }) => {
      setRows((data.data.registerJson as Record<string, unknown>[]) ?? []);
    });
  }, [selectedRun]);

  const selected = runs.find((r) => r.id === selectedRun);
  const totals = selected?.totalsJson;

  function meta() {
    return {
      runNumber: selected?.runNumber ?? 'export',
      month: selected?.month ?? 1,
      year: selected?.year ?? new Date().getFullYear(),
      schoolName,
    };
  }

  function exportCsv() {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => r[c]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-report-${selected?.runNumber ?? 'export'}.csv`;
    a.click();
  }

  return (
    <PayrollPageLayout
      title="Payroll Reports"
      subtitle="Tax registers, RSSB remittance summaries and regulatory exports"
      actions={<button type="button" onClick={exportCsv} disabled={!rows.length} className="btn-secondary"><Download size={16} /> Export CSV</button>}
      kpis={totals ? [
        { label: 'Gross', value: formatRwf(totals.gross ?? 0).replace(' RWF', '') },
        { label: 'PAYE', value: formatRwf(totals.paye ?? 0).replace(' RWF', '') },
        { label: 'Headcount', value: totals.headcount ?? rows.length },
        { label: 'Net Payable', value: formatRwf(totals.finalPayable ?? 0).replace(' RWF', '') },
      ] : undefined}
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Select Run</label>
        <select className="input max-w-md" value={selectedRun ?? ''} onChange={(e) => setSelectedRun(e.target.value)}>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>{r.runNumber} — {MONTHS[r.month - 1]} {r.year} ({r.status})</option>
          ))}
        </select>
        {selected && <span className={`badge ml-3 ${statusColor(selected.status)}`}>{selected.status}</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: 'PAYE Remittance', fn: () => exportPayePdf(rows, meta()) },
          { title: 'RSSB Declaration', fn: () => exportRssbPdf(rows, meta()) },
          { title: 'Bank Register', fn: () => exportBankPdf(rows, meta()) },
        ].map((report) => (
          <div key={report.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-amber" />
              <h3 className="text-sm font-semibold text-navy">{report.title}</h3>
            </div>
            <p className="mt-1 text-xs text-muted">PDF export from selected payroll run</p>
            <button type="button" onClick={report.fn} disabled={!rows.length} className="btn-secondary mt-3 w-full text-xs">
              <Download size={14} /> Download PDF
            </button>
          </div>
        ))}
      </div>

      <PayrollRegisterTable rows={rows} />
    </PayrollPageLayout>
  );
}
