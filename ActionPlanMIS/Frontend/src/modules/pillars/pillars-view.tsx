'use client';

import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';
import { ApPageLayout } from '@/components/ap-page-layout';
import { RWANDA_STRATEGIC_PILLARS } from '@/lib/strategic-pillars';

export function PillarsView() {
  return (
    <ApPageLayout
      title="Strategic Pillars"
      subtitle="Rwanda school planning priorities — select when creating action plans"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          These pillars align with national emphasis on learning outcomes, teacher development, ICT, inclusion, infrastructure and governance.
        </p>
        <Link href="/plans/new" className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white">
          Create plan <ChevronRight size={16} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {RWANDA_STRATEGIC_PILLARS.map((pillar) => (
          <article
            key={pillar.id}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: `${pillar.color}18` }}
              >
                {pillar.icon}
              </span>
              <div>
                <h2 className="text-sm font-bold text-navy">{pillar.name}</h2>
                <p className="mt-0.5 text-xs text-muted">{pillar.themes.length} focus themes</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {pillar.themes.map((theme) => (
                <li key={theme} className="flex items-start gap-2 text-xs text-navy/80">
                  <Building2 size={12} className="mt-0.5 shrink-0 text-primary" />
                  {theme}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </ApPageLayout>
  );
}
