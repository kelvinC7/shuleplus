'use client';

import { Building2, CalendarDays, CheckCircle2, Clock, Link2, Wallet, XCircle } from 'lucide-react';
import { SALARY_ADVANCE } from '@/config/salary-advance-brand';
import type { ShuleAvanceEligibility } from '@/types';

const STATUS_UI: Record<
  NonNullable<ShuleAvanceEligibility['status']>,
  { title: string; tone: 'slate' | 'amber' | 'sky' | 'emerald' }
> = {
  payroll_not_connected: {
    title: 'Payroll not connected',
    tone: 'slate',
  },
  timetable_linked: {
    title: 'Teaching account active',
    tone: 'sky',
  },
  profile_not_linked: {
    title: 'Register in Timetable',
    tone: 'amber',
  },
  advance_not_enabled: {
    title: 'Advance not enabled',
    tone: 'amber',
  },
  salary_pending: {
    title: 'Salary sync pending',
    tone: 'sky',
  },
  cap_reached: {
    title: 'Monthly limit reached',
    tone: 'amber',
  },
  ready: {
    title: 'Ready to request',
    tone: 'emerald',
  },
};

export function AdvanceEligibilityCard({
  eligibility,
  employeeNumber,
  syncedAt,
  compact,
}: {
  eligibility: ShuleAvanceEligibility;
  employeeNumber?: string | null;
  syncedAt?: string | null;
  compact?: boolean;
}) {
  const status = eligibility.status ?? (eligibility.allowed ? 'ready' : 'profile_not_linked');
  const ui = STATUS_UI[status];
  const toneClass = {
    slate: 'border-slate-200 bg-gradient-to-br from-slate-50 to-white',
    amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
    sky: 'border-sky-200 bg-gradient-to-br from-sky-50 to-white',
    emerald: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
  }[ui.tone];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
          {status === 'ready' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : status === 'timetable_linked' ? (
            <CalendarDays className="h-5 w-5 text-sky-600" />
          ) : status === 'payroll_not_connected' ? (
            <Building2 className="h-5 w-5 text-slate-600" />
          ) : status === 'salary_pending' ? (
            <Clock className="h-5 w-5 text-sky-600" />
          ) : (
            <Wallet className="h-5 w-5 text-amber-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{SALARY_ADVANCE.shortName}</p>
          <h3 className="mt-0.5 font-bold text-navy">{ui.title}</h3>
          {eligibility.message ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">{eligibility.message}</p>
          ) : null}
          {!compact && status === 'ready' ? (
            <p className="mt-2 text-sm text-muted">
              Net salary from Payroll:{' '}
              <span className="font-semibold text-navy">
                {eligibility.net_salary_rwf.toLocaleString()} RWF
              </span>
            </p>
          ) : null}
          {employeeNumber ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
              <Link2 className="h-3.5 w-3.5" />
              Employee ID: <span className="font-mono font-semibold text-navy">{employeeNumber}</span>
            </p>
          ) : null}
          {syncedAt ? (
            <p className="mt-1 text-[11px] text-muted">
              Last synced from Payroll: {new Date(syncedAt).toLocaleString()}
            </p>
          ) : null}
          {status === 'payroll_not_connected' ? (
            <ul className="mt-3 space-y-1.5 text-xs text-muted">
              <li className="flex gap-2"><span className="text-navy">1.</span> Optional: HR registers staff (not required if added in Timetable)</li>
              <li className="flex gap-2"><span className="text-navy">2.</span> Payroll saves salary or marks a run paid</li>
              <li className="flex gap-2"><span className="text-navy">3.</span> Salary Advance unlocks here automatically</li>
            </ul>
          ) : null}
          {status === 'profile_not_linked' ? (
            <p className="mt-3 rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-xs text-muted">
              Admin path: Timetable → Teacher profiles → enable Portal → use your sign-in email. No HR step required.
            </p>
          ) : null}
          {status === 'timetable_linked' ? (
            <p className="mt-3 rounded-lg border border-sky-100 bg-white/80 px-3 py-2 text-xs text-muted">
              You can use My Timetable, attendance, and check-in without HR or Payroll. Salary Advance is separate and only needs Payroll when your school uses it.
            </p>
          ) : null}
        </div>
        {status === 'ready' || status === 'timetable_linked' ? (
          <CheckCircle2 className={`h-5 w-5 shrink-0 ${status === 'ready' ? 'text-emerald-600' : 'text-sky-600'}`} />
        ) : status === 'cap_reached' ? (
          <XCircle className="h-5 w-5 shrink-0 text-amber-600" />
        ) : null}
      </div>
    </div>
  );
}
