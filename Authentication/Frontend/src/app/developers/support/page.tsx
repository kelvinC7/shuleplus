'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchApiCatalog, fetchSandboxOverview } from '@/lib/developer-api';
import { useDeveloperPortal } from '@/components/developer/developer-shell';
import { PageHeader } from '@/components/developer/developer-page-ui';

export default function SupportPage() {
  const { user } = useDeveloperPortal();
  const [moduleCount, setModuleCount] = useState(0);
  const [productionStatus, setProductionStatus] = useState('NONE');

  useEffect(() => {
    Promise.all([fetchApiCatalog(), fetchSandboxOverview()])
      .then(([catalog, sandbox]) => {
        const slugs = Object.keys(user?.allowedModules ?? {}).filter((slug) =>
          Object.values(user?.allowedModules[slug] ?? {}).some(Boolean)
        );
        setModuleCount(slugs.length || catalog.modules.length);
        setProductionStatus(sandbox.production.accessStatus);
      })
      .catch(() => {});
  }, [user]);

  const links = [
    { href: '/developers/docs', title: 'API documentation', desc: 'OpenAPI specs and module reference for your assigned APIs' },
    { href: '/developers/sandbox', title: 'Sandbox environment', desc: 'Run test scenarios against your isolated sandbox organization' },
    { href: '/developers/logs', title: 'API logs', desc: 'Inspect recent request history and response codes' },
    { href: '/developers/security', title: 'Security center', desc: 'Manage MFA, sessions, and account protection' },
    { href: '/developers/explorer', title: 'API explorer', desc: 'Try endpoints interactively with your developer session' },
    { href: '/developers/applications', title: 'Applications', desc: 'Create OAuth client credentials for server-to-server calls' },
  ];

  return (
    <div>
      <PageHeader title="Help & Support" description="Quick links for your assigned ShulePlus developer resources" />

      <div className="mb-6 rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your account</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Partner</dt>
            <dd className="font-semibold text-navy">{user?.partner.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Assigned modules</dt>
            <dd className="font-semibold text-navy">{moduleCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Production access</dt>
            <dd className="font-semibold text-navy">{productionStatus.replace(/_/g, ' ')}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-border/60 bg-white p-5 transition hover:border-primary/40 hover:shadow-md"
          >
            <p className="font-semibold text-navy">{item.title}</p>
            <p className="mt-1 text-sm text-muted">{item.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-navy">Need platform help?</h3>
        <p className="mt-2 text-sm text-muted">
          For production access, additional module scopes, or partner onboarding changes, contact your ShulePlus Super Admin
          or platform administrator.
        </p>
      </div>
    </div>
  );
}
