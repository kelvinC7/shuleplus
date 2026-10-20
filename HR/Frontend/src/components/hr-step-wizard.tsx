'use client';

import type { ReactNode } from 'react';
import { Check, ChevronRight } from 'lucide-react';

export interface WizardStep {
  title: string;
  description: string;
}

interface HrStepWizardProps {
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
}

export function HrStepWizard({
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
  submitLabel = 'Submit',
}: HrStepWizardProps) {
  const step = steps[currentStep];
  const percent = Math.round((currentStep / (steps.length - 1)) * 100);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(0,4,53,0.04),0_16px_40px_-12px_rgba(0,4,53,0.14)] motion-safe:animate-scale-in">
      {/* Stepper */}
      <div className="relative bg-gradient-to-b from-slate-50/70 to-white px-4 pb-5 pt-6 sm:px-8">
        <div className="flex items-start gap-0.5 overflow-x-auto pb-1 scrollbar-none sm:gap-1">
          {steps.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => onStepClick?.(i)}
                aria-current={active ? 'step' : undefined}
                className="group flex min-w-[76px] flex-1 flex-col items-center gap-2 rounded-xl px-1 py-1.5 text-center transition-colors duration-200 hover:bg-slate-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FCB038] focus-visible:ring-offset-2 sm:min-w-[96px]"
              >
                <span
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    active
                      ? 'bg-[#FCB038] text-[#000435] shadow-[0_0_0_5px_rgba(252,176,56,0.18)]'
                      : done
                        ? 'bg-[#000435] text-white'
                        : 'border border-slate-200 bg-white text-slate-400 group-hover:border-slate-300'
                  }`}
                >
                  {done ? (
                    <span className="motion-safe:animate-scale-in inline-flex -rotate-6 items-center justify-center">
                      <Check size={15} strokeWidth={3} />
                    </span>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase leading-tight tracking-wide transition-colors duration-200 sm:text-[10.5px] ${
                    active ? 'text-[#000435]' : done ? 'text-[#000435]/60' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress rail */}
        <div className="relative -mx-4 h-[3px] rounded-full bg-slate-100 sm:-mx-8">
          <div
            className="motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out h-full rounded-full bg-gradient-to-r from-[#000435] to-[#FCB038]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Step Body */}
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-l-4 border-[#FCB038] pl-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#000435]">{step.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{step.description}</p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Step {currentStep + 1} of {steps.length} · {percent}% complete
          </span>
        </div>

        <div className="motion-safe:animate-fade-in-up" key={currentStep}>
          {children}
        </div>

        {/* Footer Actions */}
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
          {currentStep === 0 && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary px-6 focus-visible:ring-2 focus-visible:ring-[#FCB038] focus-visible:ring-offset-2"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={onBack}
              className="btn-secondary px-6 focus-visible:ring-2 focus-visible:ring-[#FCB038] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
            >
              Back
            </button>
          )}
          {isLastStep ? (
            <button
              type="button"
              disabled={saving}
              onClick={onSubmit}
              className="btn-primary px-8 transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#FCB038] focus-visible:ring-offset-2 disabled:opacity-70"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#000435] border-t-transparent" />
                  Saving…
                </span>
              ) : (
                submitLabel
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="btn-primary px-8 transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#FCB038] focus-visible:ring-offset-2"
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
  className = '',
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="flex items-center text-[13px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="ml-1 text-sm font-bold text-red-500">*</span>}
      </label>
      <div className="relative rounded-2xl">{children}</div>
    </div>
  );
}

export function SelectField({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <FormField label={label} required={required} className={className}>
      <select
        className="input cursor-pointer appearance-none focus-visible:ring-2 focus-visible:ring-[#FCB038]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export function RadioGroup({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="inline-flex rounded-2xl border border-slate-200/60 bg-slate-100/70 p-1 backdrop-blur-sm"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold tracking-wide uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCB038] ${
              selected
                ? 'bg-white text-[#000435] shadow-[0_1px_2px_rgba(0,4,53,0.06),0_2px_8px_-2px_rgba(0,4,53,0.12)]'
                : 'text-slate-500 hover:bg-white/50 hover:text-[#000435]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}