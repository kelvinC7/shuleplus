'use client';

import Link from 'next/link';
import { ModulePage } from '@/components/ui/module-page';

export default function CircularDetailsLegacyPage() {
  return (
    <ModulePage
      title="Circular details"
      subtitle="Open a circular from the list to review or preview the official document."
    >
      <div className="nesa-card">
        <p className="text-sm text-navy/60">
          Detail and View &amp; Print live at <code>/nesa/circulars/[id]</code>.
        </p>
        <Link
          href="/nesa/circulars/list"
          className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary"
        >
          Go to circular list
        </Link>
      </div>
    </ModulePage>
  );
}
