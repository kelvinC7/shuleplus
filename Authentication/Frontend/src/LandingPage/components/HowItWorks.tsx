'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Blocks, Settings, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppLanguage } from '@/i18n/app-language';

function BrushWord({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block px-1">
      <span className="relative z-10 text-navy-900">{children}</span>
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -inset-x-3 bottom-[0.12em] z-0 h-[0.62em] origin-left -rotate-2 rounded-sm bg-amber-400/75"
        aria-hidden
      />
    </span>
  );
}

function StepCard({
  step,
  index,
}: {
  step: { num: string; title: string; body: string; icon: LucideIcon };
  index: number;
}) {
  const Icon = step.icon;

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="relative flex flex-col rounded-2xl border border-navy-900/[0.06] bg-white p-5 shadow-[0_12px_40px_-20px_rgba(0,4,53,0.12)] sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="font-display text-sm font-bold text-amber-500">{step.num}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-navy-900">{step.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#667085]">{step.body}</p>
    </motion.li>
  );
}

export function HowItWorks() {
  const { t } = useAppLanguage();

  const steps = [
    { num: '01', title: t.step1Title, body: t.step1Body, icon: Building2 },
    { num: '02', title: t.step2Title, body: t.step2Body, icon: Blocks },
    { num: '03', title: t.step3Title, body: t.step3Body, icon: Settings },
    { num: '04', title: t.step4Title, body: t.step4Body, icon: Rocket },
  ];

  return (
    <section id="how-it-works" className="bg-white py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#667085]"
          >
            {t.howEyebrow}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="mt-4 font-script text-3xl font-semibold leading-tight text-navy-900 sm:text-4xl lg:text-[3.5rem]"
          >
            {t.howTitlePrefix} <BrushWord>{t.howTitleHighlight}</BrushWord> {t.howTitleSuffix}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#667085] sm:text-lg"
          >
            {t.howSubtitle}
          </motion.p>
        </div>

        <ol className="relative mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:mt-14 lg:grid-cols-4 lg:gap-6">
          <div
            className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent lg:block"
            aria-hidden
          />
          {steps.map((step, i) => (
            <StepCard key={step.num} step={step} index={i} />
          ))}
        </ol>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 flex justify-center sm:mt-12 lg:mt-14"
        >
          <Link
            href="/onboard"
            className="group inline-flex min-h-[48px] items-center gap-2 rounded-full bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_-12px_rgba(252,176,56,0.55)] transition-all hover:bg-amber-400 active:scale-[0.98] sm:px-8 sm:text-base"
          >
            {t.getStartedShule}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
