"use client";

import type { ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";

export interface WizardStep {
  title: string;
  description: string;
}

interface KaziStepWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  children: ReactNode;
  onCancel?: () => void;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isLastStep?: boolean;
  saving?: boolean;
  submitLabel?: string;
  nextDisabled?: boolean;
}

export function KaziStepWizard({
  steps,
  currentStep,
  onStepClick,
  children,
  onCancel,
  onBack,
  onNext,
  onSubmit,
  isLastStep,
  saving,
  submitLabel = "Submit",
  nextDisabled,
}: KaziStepWizardProps) {
  const step = steps[currentStep];
  const percent = Math.round((currentStep / Math.max(steps.length - 1, 1)) * 100);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white">
      <div className="relative bg-gradient-to-b from-slate-50/70 to-white px-4 pb-5 pt-6 sm:px-8">
        <div className="flex items-start gap-0.5 overflow-x-auto pb-1 sm:gap-1">
          {steps.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => onStepClick?.(i)}
                aria-current={active ? "step" : undefined}
                className="group flex min-w-[72px] flex-1 flex-col items-center gap-2 rounded-xl px-1 py-1.5 text-center transition-colors hover:bg-slate-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    active
                      ? "bg-primary text-navy shadow-[0_0_0_5px_rgba(252,176,56,0.18)]"
                      : done
                        ? "bg-navy text-white"
                        : "border border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {done ? <Check size={15} strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase leading-tight tracking-wide ${
                    active ? "text-navy" : done ? "text-navy/60" : "text-slate-400"
                  }`}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative -mx-4 h-[3px] rounded-full bg-slate-100 sm:-mx-8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-navy to-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="px-5 py-7 sm:px-10 sm:py-9">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-l-4 border-primary pl-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-navy">{step.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{step.description}</p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Step {currentStep + 1} of {steps.length} · {percent}%
          </span>
        </div>

        <div key={currentStep}>{children}</div>

        <div className="mt-9 flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
          {currentStep === 0 && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-semibold text-navy transition hover:bg-slate-50"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={onBack}
              className="rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-semibold text-navy transition hover:bg-slate-50 disabled:opacity-40"
            >
              Back
            </button>
          )}

          {isLastStep ? (
            <button
              type="button"
              disabled={saving || nextDisabled}
              onClick={onSubmit}
              className="rounded-xl bg-primary px-8 py-2.5 text-sm font-semibold text-navy transition hover:brightness-105 disabled:opacity-60"
            >
              {saving ? "Submitting…" : submitLabel}
            </button>
          ) : (
            <button
              type="button"
              disabled={nextDisabled}
              onClick={onNext}
              className="inline-flex items-center gap-1 rounded-xl bg-navy px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-60"
            >
              Next <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FormField({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
