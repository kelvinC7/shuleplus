'use client';

import { Check } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@shuleplus/ui';

export interface FormStep {
  title: string;
  description?: string;
}

interface MultiStepFormProps {
  steps: FormStep[];
  currentStep: number;
  onStepChange?: (step: number) => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function MultiStepForm({
  steps,
  currentStep,
  onStepChange,
  children,
  footer,
  className,
}: MultiStepFormProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm', className)}>
      <div className="border-b border-border bg-gradient-to-r from-navy/[0.03] to-primary/[0.06] px-6 py-5 sm:px-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h2>
            {step.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
            )}
          </div>
          <span className="hidden rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-navy sm:inline">
            {Math.round(progress)}% complete
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ochre to-gold transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 hidden gap-2 lg:grid lg:grid-cols-7">
          {steps.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <button
                key={s.title}
                type="button"
                disabled={!onStepChange}
                onClick={() => onStepChange?.(i)}
                className={cn(
                  'flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition',
                  active && 'border-primary/40 bg-primary/10 shadow-sm',
                  done && !active && 'border-emerald-200 bg-emerald-50/80',
                  !active && !done && 'border-transparent bg-white/60 hover:bg-white',
                  onStepChange ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                    active && 'bg-primary text-navy',
                    done && !active && 'bg-emerald-500 text-white',
                    !active && !done && 'bg-muted/20 text-muted-foreground'
                  )}
                >
                  {done && !active ? <Check size={12} /> : i + 1}
                </span>
                <span className="mt-2 line-clamp-2 text-[11px] font-medium leading-tight text-foreground">
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {steps.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <button
                key={s.title}
                type="button"
                disabled={!onStepChange}
                onClick={() => onStepChange?.(i)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                  active && 'bg-primary text-navy shadow-sm',
                  done && !active && 'bg-emerald-100 text-emerald-800',
                  !active && !done && 'bg-muted/30 text-muted-foreground'
                )}
              >
                {done && !active ? <Check size={12} /> : <span>{i + 1}</span>}
                <span className="max-w-[8rem] truncate">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8">{children}</div>

      {footer && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-4 sm:px-8">
          {footer}
        </div>
      )}
    </div>
  );
}
