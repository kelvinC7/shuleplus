'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SchoolLogo } from '@/components/super-admin/smart-access/school-logo';
import { RepPerformanceBar } from '@/components/school-representative/rep-performance-bar';
import { RepChiefAccountantAccess } from '@/components/school-representative/rep-chief-accountant-access';
import { useRepContext } from '@/components/school-representative/rep-context';

export default function RepSchoolsPage() {
  const router = useRouter();
  const { schools, loading, academicYear, term, setSchoolScope } = useRepContext();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.organizationCode?.toLowerCase().includes(q) ?? false)
    );
  }, [schools, search]);

  function openDashboard(schoolId: string) {
    setSchoolScope(schoolId);
    router.push('/school-representative');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">My Schools</h1>
          <p className="text-sm text-muted">Organizations assigned to you</p>
          {academicYear && term ? (
            <p className="mt-1 text-xs text-muted">
              Performance for {term} · {academicYear}
            </p>
          ) : null}
        </div>
        <span className="inline-flex w-fit rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-navy">
          {schools.length} active
        </span>
      </div>

      <input
        type="search"
        placeholder="Search by name or organization code…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-primary/50"
      />

      {loading ? (
        <p className="text-sm text-muted">Loading schools…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-slate-50 p-1.5">
                  <SchoolLogo logoUrl={s.logoUrl} name={s.name} className="rounded-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-navy">{s.name}</h2>
                  <p className="text-xs text-muted">
                    {s.organizationCode ? `Code: ${s.organizationCode}` : s.slug}
                  </p>
                  <span className="mt-1 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                    {s.status}
                  </span>
                </div>
              </div>

              <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted">Students</dt>
                  <dd className="font-semibold text-navy">{s.students.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted">Staff</dt>
                  <dd className="font-semibold text-navy">{s.staff}</dd>
                </div>
              </dl>

              {s.performance ? (
                <div className="mb-4 space-y-3 rounded-xl bg-slate-50/80 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Performance</p>
                  <RepPerformanceBar label="Attendance" value={s.performance.attendance} tone="attendance" />
                  <RepPerformanceBar label="Academic (pass rate)" value={s.performance.academic} tone="academic" />
                  <RepPerformanceBar label="School fees collected" value={s.performance.schoolFees} tone="fees" />
                </div>
              ) : null}

              <RepChiefAccountantAccess organizationId={s.id} />

              <button
                type="button"
                onClick={() => openDashboard(s.id)}
                className="mt-auto rounded-xl bg-navy py-2.5 text-sm font-medium text-white transition hover:bg-navy/90"
              >
                View school dashboard
              </button>
            </article>
          ))}
        </div>
      )}

      {!loading && !filtered.length ? (
        <p className="text-sm text-muted">No schools match your search.</p>
      ) : null}

      <p className="text-xs text-muted">
        Need another school? Contact your SuperAdmin to update assignments.{' '}
        <Link href="/school-representative" className="text-navy underline">
          Back to Dashboard
        </Link>
      </p>
    </div>
  );
}
