'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, GraduationCap, Scale, Plus, Bell } from 'lucide-react';
import { api } from '@/services/api';

type CommandData = {
  paymentsToday: number;
  installmentsDueWeek: number;
  overdueInstallments: number;
  pendingScholarships: number;
  receiptsToday: number;
  overdueStudents: number;
};

export function CollectionsCommandCenter() {
  const [data, setData] = useState<CommandData | null>(null);

  useEffect(() => {
    void api.get('/collections/command-center').then(({ data: res }) => setData(res.data ?? null));
  }, []);

  if (!data) return null;

  const items = [
    { label: 'Payments today', value: data.paymentsToday },
    { label: 'Installments due this week', value: data.installmentsDueWeek },
    { label: 'Overdue installments', value: data.overdueInstallments, warn: data.overdueInstallments > 0 },
    { label: 'Scholarships pending', value: data.pendingScholarships },
    { label: 'Receipts today', value: data.receiptsToday },
  ];

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-navy/[0.03] via-white to-primary/[0.06] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Collections Command Center</p>
          <h3 className="text-base font-bold text-navy">Today at a glance</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/payments/new" className="btn-primary !py-2 text-xs">
            <Plus size={14} /> Record Payment
          </Link>
          <Link href="/installments" className="btn-secondary !py-2 text-xs">
            <CalendarClock size={14} /> Create Installment
          </Link>
          <Link href="/scholarships" className="btn-secondary !py-2 text-xs">
            <GraduationCap size={14} /> Apply Scholarship
          </Link>
          <Link href="/outstanding" className="btn-secondary !py-2 text-xs">
            <Scale size={14} /> View Outstanding
          </Link>
          <Link href="/notifications" className="btn-secondary !py-2 text-xs">
            <Bell size={14} /> Send Reminders
          </Link>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map(({ label, value, warn }) => (
          <div
            key={label}
            className={`rounded-xl border px-3 py-2.5 ${warn ? 'border-amber-200 bg-amber-50/80' : 'border-border bg-white/80'}`}
          >
            <div className="flex items-center gap-2 text-muted">
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className={`mt-1 text-xl font-bold tabular-nums ${warn ? 'text-amber-800' : 'text-navy'}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
