'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Step = {
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

type StepIndicatorProps = {
  steps: Step[];
  current: number; // 0-indexed
};

/**
 * Modern connected-node step indicator.
 * Desktop: full horizontal rail with labels.
 * Mobile: compact rail with only the active label shown, dots for the rest.
 */
export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Desktop / tablet */}
      <ol className="relative hidden items-start justify-between sm:flex">
        <div className="absolute left-0 right-0 top-5 h-[2px] bg-navy-900/[0.08]" aria-hidden />
        <motion.div
          className="absolute left-0 top-5 h-[2px] bg-[#FCB038]"
          initial={false}
          animate={{ width: `${(current / (steps.length - 1)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          aria-hidden
        />
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isDone = i < current;
          const isActive = i === current;
          return (
            <li key={step.label} className="relative z-10 flex flex-col items-center gap-2 px-2 text-center">
              <motion.span
                initial={false}
                animate={{
                  backgroundColor: isDone || isActive ? '#FCB038' : '#FFFFFF',
                  borderColor: isDone || isActive ? '#FCB038' : 'rgba(0,4,53,0.12)',
                  scale: isActive ? 1.08 : 1,
                }}
                transition={{ duration: 0.25 }}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-[0_6px_16px_-8px_rgba(0,4,53,0.25)]"
              >
                {isDone ? (
                  <Check className="h-4 w-4 text-[#000435]" strokeWidth={3} />
                ) : (
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#000435]' : 'text-navy-900/35'}`} strokeWidth={2.25} />
                )}
              </motion.span>
              <span
                className={`max-w-[92px] text-[11px] font-semibold leading-tight ${
                  isActive ? 'text-navy-900' : isDone ? 'text-navy-900/70' : 'text-navy-900/35'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact progress + current label */}
      <div className="sm:hidden">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-600">
            Step {current + 1} of {steps.length}
          </span>
          <span className="text-[12px] font-semibold text-navy-900">
            {steps[current].shortLabel ?? steps[current].label}
          </span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((step, i) => (
            <motion.span
              key={step.label}
              className="h-1.5 flex-1 rounded-full bg-navy-900/[0.08]"
              animate={{ backgroundColor: i <= current ? '#FCB038' : 'rgba(0,4,53,0.08)' }}
              transition={{ duration: 0.25 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}