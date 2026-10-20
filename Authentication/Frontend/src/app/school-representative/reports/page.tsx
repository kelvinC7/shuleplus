'use client';

import { useRepContext } from '@/components/school-representative/rep-context';

const REPORT_TYPES = [
  { id: 'academic', name: 'Academic Performance', scope: 'All schools or selected school' },
  { id: 'student-att', name: 'Student Attendance', scope: 'Daily, weekly, monthly' },
  { id: 'staff-att', name: 'Staff Attendance', scope: 'School and department' },
  { id: 'payroll', name: 'Payroll Summary', scope: 'Monthly, by organization' },
  { id: 'fees', name: 'School Fees', scope: 'Collection and outstanding balances' },
  { id: 'compare', name: 'School Comparison', scope: 'Performance ranking' },
  { id: 'improvement', name: 'School Improvement', scope: 'Progress against action plans' },
  { id: 'executive', name: 'Executive Summary', scope: 'Combined PDF report' },
];

export default function RepReportsPage() {
  const { schools, schoolScope, academicYear, term } = useRepContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Reports & Analytics</h1>
        <p className="text-sm text-muted">Cross-school reports for your assigned organizations</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <p className="text-sm text-muted">
          Scope:{' '}
          <span className="font-medium text-navy">
            {schoolScope === 'all' ? `${schools.length} schools` : 'Single school'}
          </span>{' '}
          · {academicYear} · {term}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f8f9fc] text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Report</th>
              <th className="hidden px-4 py-3 sm:table-cell">Scope</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {REPORT_TYPES.map((r) => (
              <tr key={r.id} className="border-t border-border/80">
                <td className="px-4 py-3 font-medium text-navy">{r.name}</td>
                <td className="hidden px-4 py-3 text-muted sm:table-cell">{r.scope}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy hover:border-primary/40"
                  >
                    Generate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        PDF and Excel exports respect your permission profile. Sensitive payroll reports require
        elevated SuperAdmin authorization.
      </p>
    </div>
  );
}
