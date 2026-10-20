'use client';

import { useRouter } from 'next/navigation';
import { SchoolLogo } from '@/components/super-admin/smart-access/school-logo';
import { useCaContext } from '@/components/chief-accountant/ca-context';

export default function CaOrganizationsPage() {
  const router = useRouter();
  const { organizations, loading, setOrgScope } = useCaContext();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-navy">Organizations</h1>
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {organizations.map((org) => (
            <article
              key={org.id}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/30"
            >
              <div className="flex gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-border bg-slate-50 p-1.5">
                  <SchoolLogo logoUrl={org.logoUrl} name={org.name} />
                </div>
                <div>
                  <h2 className="font-semibold text-navy">{org.name}</h2>
                  <p className="text-xs text-muted">{org.organizationCode ? `Code: ${org.organizationCode}` : org.district}</p>
                  <span className="mt-1 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                    {org.status}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">{org.access}</p>
              <p className="text-sm">
                <span className="text-muted">Students</span>{' '}
                <span className="font-semibold text-navy">{org.students.toLocaleString()}</span>
              </p>
              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-navy py-2.5 text-sm font-medium text-white hover:bg-navy/90"
                onClick={() => {
                  setOrgScope(org.id);
                  router.push('/chief-accountant/revenue/school-fees');
                }}
              >
                Open school finance
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
