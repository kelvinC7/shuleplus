'use client';

import Link from 'next/link';
import { ModulePage } from '@/components/ui/module-page';

export default function CircularsHubPage() {
  return (
    <ModulePage
      title="Circulars"
      subtitle="National Babyeyi circular registry — lists and reviews are live from the backend."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/nesa/circulars/list" className="nesa-card transition hover:border-primary/40">
          <p className="text-sm font-bold text-navy">Circular list</p>
          <p className="mt-1 text-xs text-navy/50">All schools · newest first · preview & review</p>
        </Link>
        <Link href="/nesa/circulars/approval" className="nesa-card transition hover:border-primary/40">
          <p className="text-sm font-bold text-navy">Approval queue</p>
          <p className="mt-1 text-xs text-navy/50">Pending circulars for NESA decision</p>
        </Link>
        <Link href="/nesa/schools" className="nesa-card transition hover:border-primary/40">
          <p className="text-sm font-bold text-navy">Filter by school</p>
          <p className="mt-1 text-xs text-navy/50">Open a school, then its circulars</p>
        </Link>
      </div>
    </ModulePage>
  );
}
