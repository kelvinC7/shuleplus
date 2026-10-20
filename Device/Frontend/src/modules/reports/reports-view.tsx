'use client';

import { DevicePageLayout } from '@/components/device-page-layout';

export function ReportsView() {
  return (
    <DevicePageLayout subtitle="Export summaries by gate, date range and student">
      <div className="hr-card p-6">
        <p className="text-sm text-muted">Generate daily, weekly or term attendance reports from RFID card events.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {['Daily Gate Summary', 'Late Arrivals', 'Unknown Card Report'].map((r) => (
            <button key={r} type="button" className="rounded-xl border border-border p-4 text-left hover:bg-slate-50">
              <p className="font-semibold text-navy">{r}</p>
              <p className="mt-1 text-xs text-muted">Export CSV / PDF</p>
            </button>
          ))}
        </div>
      </div>
    </DevicePageLayout>
  );
}
