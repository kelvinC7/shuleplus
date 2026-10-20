'use client';

import type { ReactNode } from 'react';
import { Check, ChevronRight, Plus } from 'lucide-react';
import { formatFrw } from '@/utils/currency';

export type WizardStep = { title: string; description: string };

export function FormField({
  label,
  required,
  children,
  className = '',
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="flex items-center text-[13px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required ? <span className="ml-1 text-sm font-bold text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
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
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export function SectionHeading({ title, icon }: { title: string; icon?: ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {icon}
      {title}
    </h3>
  );
}

export function ItemFormCard({
  index,
  onRemove,
  canRemove,
  children,
}: {
  index: number;
  onRemove?: () => void;
  canRemove?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-navy">
          Item {index + 1}
        </span>
        {canRemove && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-red-600 transition hover:text-red-700"
          >
            Remove
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function MoneyDisplay({
  amount,
  className = '',
  emphasis = false,
}: {
  amount: number | string;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <p
      className={`rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm tabular-nums ${
        emphasis ? 'font-bold text-navy' : 'font-semibold text-navy/90'
      } ${className}`}
    >
      {formatFrw(amount)}
    </p>
  );
}

export function SummaryPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <h4 className="mb-3 text-sm font-bold text-navy">{title}</h4>
      {children}
    </div>
  );
}

export function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-navy">{value}</span>
    </div>
  );
}

export function AddItemButton({ onClick, label = 'Add another item' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3.5 text-sm font-semibold text-navy transition hover:border-primary hover:bg-primary/10"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

export function ModalStepWizard({
  steps,
  currentStep,
  children,
  onCancel,
  onBack,
  onNext,
  onSubmit,
  isLastStep,
  saving,
  submitLabel = 'Submit',
}: {
  steps: WizardStep[];
  currentStep: number;
  children: ReactNode;
  onCancel?: () => void;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isLastStep?: boolean;
  saving?: boolean;
  submitLabel?: string;
}) {
  const step = steps[currentStep];
  const percent = Math.round((currentStep / Math.max(steps.length - 1, 1)) * 100);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(0,4,53,0.04),0_16px_40px_-12px_rgba(0,4,53,0.14)]">
      <div className="relative bg-gradient-to-b from-slate-50/70 to-white px-4 pb-5 pt-6 sm:px-8">
        <div className="flex items-start gap-0.5 overflow-x-auto pb-1 scrollbar-none sm:gap-1">
          {steps.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div
                key={s.title}
                className="flex min-w-[76px] flex-1 flex-col items-center gap-2 px-1 py-1.5 text-center sm:min-w-[96px]"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    active
                      ? 'bg-primary text-navy shadow-[0_0_0_5px_rgba(252,176,56,0.18)]'
                      : done
                        ? 'bg-navy text-white'
                        : 'border border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {done ? <Check size={15} strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-[10.5px] ${
                    active ? 'text-navy' : done ? 'text-navy/60' : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative -mx-4 mt-4 h-[3px] rounded-full bg-slate-100 sm:-mx-8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-navy to-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="max-h-[min(58vh,520px)] overflow-y-auto px-6 py-8 sm:px-10">
        <div className="mb-8 border-l-4 border-primary pl-4">
          <h2 className="text-xl font-bold tracking-tight text-navy">{step.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{step.description}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
        {children}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/40 px-6 py-5 sm:px-10">
        {currentStep === 0 && onCancel ? (
          <button type="button" onClick={onCancel} className="btn-secondary px-6">
            Cancel
          </button>
        ) : (
          <button type="button" onClick={onBack} className="btn-secondary px-6">
            Back
          </button>
        )}
        {isLastStep ? (
          <button type="button" disabled={saving} onClick={onSubmit} className="btn-primary px-8 disabled:opacity-70">
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
                Saving…
              </span>
            ) : (
              submitLabel
            )}
          </button>
        ) : (
          <button type="button" onClick={onNext} className="btn-primary px-8">
            Next <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ModalFormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(0,4,53,0.04),0_16px_40px_-12px_rgba(0,4,53,0.14)]">
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white px-6 py-6 sm:px-10">
        <h2 className="text-xl font-bold tracking-tight text-navy">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="max-h-[min(62vh,560px)] overflow-y-auto px-6 py-8 sm:px-10">{children}</div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-5 sm:flex-row sm:justify-end sm:px-10">
        {footer}
      </div>
    </div>
  );
}

export { formatFrw };
