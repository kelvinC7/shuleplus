'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { api } from '@/services/api';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesPageTitle } from '@/components/fees-page-title';

interface ReportsSummary {
  daily: { collections: number; label: string };
  weekly: { collections: number; label: string };
  monthly: { collections: number; label: string };
  annual: { collections: number; label: string };
  outstanding: number;
  scholarships: number;
  collectionRate: number;
}

const REPORT_TYPES = [
  'Daily Collection Report',
  'Weekly Collection Report',
  'Monthly Revenue Report',
  'Outstanding Balances Report',
  'Scholarship Report',
  'Installment Report',
  'Student Statement',
  'Parent Statement',
  'Executive Financial Report',
  'Comparative Academic Year Report',
];

export function ReportsView() {
  const [data, setData] = useState<ReportsSummary | null>(null);

  useEffect(() => {
    void api.get('/reports').then(({ data: res }) => setData(res.data));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <FeesPageTitle className="text-lg font-bold text-navy">Financial Reports</FeesPageTitle>
          <p className="text-sm text-muted">Daily to executive statements with export</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-xs"><Printer size={14} /> Print</button>
          <button type="button" className="btn-primary text-xs"><Download size={14} /> Export</button>
        </div>
      </div>
      <StatsGrid columns={4}>
        <StatCard label="Daily" value={data?.daily.label ?? '—'} delta="Collections" />
        <StatCard label="Weekly" value={data?.weekly.label ?? '—'} delta="Collections" />
        <StatCard label="Monthly" value={data?.monthly.label ?? '—'} delta="Collections" />
        <StatCard label="Collection Rate" value={`${data?.collectionRate ?? 0}%`} delta="Performance" />
      </StatsGrid>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((name) => (
          <button
            key={name}
            type="button"
            className="hr-card hr-card-hover flex items-start gap-3 p-4 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
              <FileText size={18} />
            </span>
            <span>
              <span className="block text-sm font-bold text-navy">{name}</span>
              <span className="mt-1 block text-xs text-muted">PDF · Excel · CSV</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
