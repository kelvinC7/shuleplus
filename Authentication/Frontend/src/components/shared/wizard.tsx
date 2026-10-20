'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
}

interface WizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  onFinish?: () => void;
  finishLabel?: string;
  isLastStepValid?: boolean;
  isNextValid?: boolean;
  isSubmitting?: boolean;
}

export function Wizard({
  steps,
  currentStep,
  onStepChange,
  children,
  onFinish,
  finishLabel = 'Complete',
  isLastStepValid = true,
  isNextValid = true,
  isSubmitting = false,
}: WizardProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => i < currentStep && onStepChange(i)}
                className="flex min-w-[72px] flex-col items-center gap-2"
                disabled={i > currentStep}
              >
                <div
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-all',
                    done && 'bg-emerald-500 text-white',
                    active && 'bg-primary text-navy shadow-md shadow-primary/30',
                    !done && !active && 'bg-muted text-muted-foreground'
                  )}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'hidden text-center text-[11px] font-medium sm:block',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </button>
              {i < steps.length - 1 ? (
                <div
                  className={cn(
                    'mx-1 h-0.5 min-w-[16px] flex-1 rounded',
                    i < currentStep ? 'bg-emerald-500' : 'bg-border'
                  )}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-navy">{steps[currentStep].title}</h2>
        {steps[currentStep].description ? (
          <p className="mt-1 text-sm text-muted-foreground">{steps[currentStep].description}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={isFirst || isSubmitting}
          onClick={() => onStepChange(currentStep - 1)}
        >
          Previous
        </Button>
        {isLast ? (
          <Button
            type="button"
            disabled={!isLastStepValid || isSubmitting}
            isLoading={isSubmitting}
            onClick={onFinish}
          >
            {finishLabel}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={!isNextValid || isSubmitting}
            onClick={() => onStepChange(currentStep + 1)}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
