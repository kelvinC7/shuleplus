'use client';

import Link from 'next/link';
import { BackButton } from '@/components/root-admin/back-button';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';

const CARDS = [
  {
    href: '/super-admin/module-catalog',
    title: 'Module Catalog',
    description: 'View and create platform modules — name, code, URLs, category, and dependencies.',
  },
  {
    href: '/super-admin/module-assignment',
    title: 'Organization Module Assignment',
    description: 'Assign Academic, Finance, Sample Module and other modules to each organization.',
  },
  {
    href: '/super-admin/organizations',
    title: 'Manage org modules',
    description: 'Open an organization, then Modules — activate, lock, provision, hide, or remove one by one.',
  },
  {
    href: '/super-admin/module-provisioning',
    title: 'Module Access & Provisioning',
    description: 'Monitor tenant provisioning and retry failed microservice tenant creation.',
  },
];

export default function SuperAdminModulesPage() {
  const platform = usePlatformAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackButton href={platform.dashboardPath} />
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-navy">Module Management</h1>
        <p className="text-sm text-muted">
          Create modules in the catalog, assign them to organizations, and provision tenant access across
          Babyeyi microservices.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md"
          >
            <h2 className="font-poppins-semibold text-navy">{card.title}</h2>
            <p className="mt-2 text-sm text-muted">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
