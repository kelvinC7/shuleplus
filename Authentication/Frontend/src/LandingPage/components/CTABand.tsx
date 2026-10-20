'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAppLanguage } from '@/i18n/app-language';

export function GetStartedSection() {
  const { t } = useAppLanguage();

  return (
    <section className="relative overflow-hidden bg-[#f8f9fb] py-16 sm:py-20 lg:py-28">
      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="font-script text-2xl font-semibold leading-tight text-navy-900 sm:text-3xl lg:text-[2.75rem]">
          {t.ctaTitlePrefix}{' '}
          <span className="text-amber-500 underline decoration-amber-500/40 decoration-2 underline-offset-4">
            {t.ctaTitleHighlight}
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-navy-700/60 sm:text-base">
          {t.ctaSubtitle}
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/enter-as-school"
            className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-amber-500 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-400 active:scale-[0.98] sm:text-base"
          >
            {t.ctaGetStarted}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-navy-900/12 px-7 py-3.5 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-900/[0.03] active:scale-[0.98] sm:text-base"
          >
            {t.ctaTalkToUs}
          </Link>
        </div>
      </div>
    </section>
  );
}
