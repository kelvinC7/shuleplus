'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, User } from 'lucide-react';
import { AvatarInitials } from '@/components/payroll-data-table';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { formatRwf } from '@/config/payroll-nav';
import { payrollApi, type PayrollStaff } from '@/services/payroll-api';

export function EmployeeProfileView({ staffId }: { staffId: string }) {
  const router = useRouter();
  const [staff, setStaff] = useState<PayrollStaff | null>(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    payrollApi.getStaff(staffId).then(({ data }) => setStaff(data.data)).catch(() => router.push('/employees'));
  }, [staffId, router]);

  if (!staff) {
    return (
      <PayrollPageLayout title="Employee Profile" backHref="/employees">
        <div className="rounded-2xl border bg-white p-12 text-center text-muted">Loading…</div>
      </PayrollPageLayout>
    );
  }

  const profile = (staff.hrProfile ?? {}) as Record<string, Record<string, unknown>>;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contact', label: 'Contact' },
    { id: 'employment', label: 'Employment' },
    { id: 'salary', label: 'Salary' },
  ];

  return (
    <PayrollPageLayout
      title="Employee Profile"
      backHref="/employees"
      actions={
        <Link href={`/employees/register?edit=${staff.id}`} className="btn-primary">
          <Edit size={16} /> Edit
        </Link>
      }
    >
      <div className="hr-card flex flex-wrap items-center gap-5 p-6">
        <AvatarInitials name={staff.fullName} seed={staff.id} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-navy">{staff.fullName}</h1>
          <p className="text-sm text-muted">{staff.employeeNumber} · {staff.position}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={staff.status} />
            {staff.hrEmployeeId && <span className="badge bg-sky-100 text-sky-800">Linked to HR</span>}
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted">Basic salary</p>
          <p className="text-lg font-bold text-amber-700">{formatRwf(staff.basicSalary)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t.id ? 'bg-amber/15 text-navy' : 'text-muted hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard title="Personal" icon={<User size={16} />} rows={[
            ['Gender', staff.gender],
            ['Date of birth', staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString() : '—'],
            ['National ID', staff.nationalId ?? '—'],
          ]} />
          <InfoCard title="Organization" rows={[
            ['Department', staff.department ?? '—'],
            ['Position', staff.position ?? '—'],
            ['Hire date', staff.hireDate ? new Date(staff.hireDate).toLocaleDateString() : '—'],
          ]} />
        </div>
      )}

      {tab === 'contact' && (
        <InfoCard title="Contact" rows={[
          ['Email', staff.email ?? '—'],
          ['Phone', staff.phone ?? '—'],
          ['Emergency', String(profile.contact?.emergencyName ?? '—')],
        ]} />
      )}

      {tab === 'employment' && (
        <InfoCard title="Employment" rows={[
          ['Branch', String(profile.employment?.branch ?? '—')],
          ['Supervisor', String(profile.employment?.supervisor ?? '—')],
          ['Contract', String(profile.contractType ?? '—')],
        ]} />
      )}

      {tab === 'salary' && (
        <InfoCard title="Compensation" rows={[
          ['Basic salary', formatRwf(staff.basicSalary)],
          ['Bank', staff.bankName ?? '—'],
          ['Account', staff.bankAccount ?? '—'],
        ]} />
      )}
    </PayrollPageLayout>
  );
}

function InfoCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon?: React.ReactNode;
  rows: [string, string][];
}) {
  return (
    <div className="hr-card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-navy">
        {icon} {title}
      </h3>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-slate-50 pb-2">
            <dt className="text-muted">{label}</dt>
            <dd className="font-medium text-navy text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
