'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppLanguage } from '@/i18n/app-language';

export function AboutUs() {
  const { t } = useAppLanguage();

  const stats = [
    { value: '10+', label: t.statSchools },
    { value: '10K+', label: t.statStudents },
    { value: '99.9%', label: t.statUptime },
  ];

  return (
    <section id="about-us" className="w-full bg-white py-16 sm:py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45 }}
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FCB038]" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#667085]">
                {t.aboutEyebrow}
              </p>
            </div>

            <h2 className="mt-4 text-2xl font-semibold leading-tight text-[#000435] sm:text-3xl lg:text-[2.65rem] lg:leading-[1.15]">
              {t.aboutTitle}
            </h2>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#667085] sm:text-[17px]">
              {t.aboutBody}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/enter-as-school"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#000435] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a0f52] active:scale-[0.98]"
              >
                {t.exploreModules}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#000435]/12 px-5 py-2.5 text-sm font-semibold text-[#000435] transition-colors hover:bg-[#000435]/[0.03] active:scale-[0.98]"
              >
                {t.howItWorksLink}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="flex flex-col justify-center border-t border-[#000435]/[0.08] pt-8 lg:border-t-0 lg:border-l lg:pl-12 lg:pt-0"
          >
            <ul className="flex flex-col divide-y divide-[#000435]/[0.07]">
              {stats.map((stat, i) => (
                <li
                  key={stat.label}
                  className={`flex items-baseline justify-between gap-6 ${
                    i === 0 ? 'pb-5' : 'py-5'
                  }`}
                >
                  <span className="text-[13px] text-[#667085]">{stat.label}</span>
                  <span className="text-2xl font-semibold text-[#000435] sm:text-[1.75rem]">
                    {stat.value}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
