'use client';

import Link from 'next/link';
import { ModulePage } from '@/components/ui/module-page';

/** Legacy static route — real details live at /nesa/schools/[id]. */
export default function LegacySchoolDetailsPage() {
  return (
    <ModulePage
      title="School details"
      subtitle="Pick a registered school from the list to open its full profile and location."
    >
      <div className="nesa-card">
        <p className="text-sm text-navy/60">
          School profiles are loaded live from Authentication. Use the schools list, then click{' '}
          <strong>View details</strong>.
        </p>
        <Link
          href="/nesa/schools"
          className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary"
        >
          Go to schools list
        </Link>
      </div>
    </ModulePage>
  );
}
