'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { StepIndicator, type Step } from './StepIndicator';

type WizardShellProps = {
  eyebrow: string;
  title: string;
  steps: Step[];
  current: number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void | Promise<void>;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  hideNav?: boolean;
};

export function WizardShell({
  eyebrow,
  title,
  steps,
  current,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  loading,
  hideNav,
}: WizardShellProps) {
  return (
    <div className="mx-auto w-full max-w-[720px] rounded-[24px] border border-navy-900/[0.06] bg-white p-5 shadow-[0_16px_48px_-16px_rgba(0,4,53,0.16)] sm:p-8">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">{eyebrow}</p>
        <h2 className="mt-1 font-display text-xl font-bold text-navy-900 sm:text-2xl">{title}</h2>
      </div>

      <div className="mb-7 sm:mb-9">
        <StepIndicator steps={steps} current={current} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!hideNav && (
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-navy-900/[0.06] pt-5">
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-navy-900/12 bg-white px-4 text-sm font-semibold text-navy-900 transition hover:bg-navy-900/[0.03] disabled:cursor-not-allowed disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#000435] px-6 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:min-w-[180px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {nextLabel}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </div>
      )}
    </div>
  );
}