'use client';

import { Loader2 } from 'lucide-react';
import { FormField } from '@/components/form-fields';

export function DayToggleGroup({
  days,
  selected,
  onChange,
}: {
  days: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <FormField label="Available days" compact>
      <div className="grid grid-cols-5 gap-2">
        {days.map((day) => {
          const checked = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                const next = checked ? selected.filter((d) => d !== day) : [...selected, day];
                onChange(next);
              }}
              className={`rounded-xl border py-2 text-center text-xs font-semibold transition ${
                checked
                  ? 'border-primary bg-primary text-navy shadow-sm'
                  : 'border-border bg-white text-muted hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </FormField>
  );
}

export function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
        checked
          ? 'border-primary/50 bg-primary/10'
          : 'border-border bg-white hover:border-slate-300 hover:bg-slate-50/80'
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-navy bg-navy text-primary' : 'border-slate-300 bg-white'
        }`}
      >
        {checked ? (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-navy">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
    </button>
  );
}

export function ModalFooterActions({
  onCancel,
  onSave,
  saveLabel,
  saving,
  disabled,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
  saving?: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      <button type="button" className="btn-secondary w-full py-2 sm:w-auto sm:px-4" onClick={onCancel}>
        Cancel
      </button>
      <button
        type="button"
        className="btn-primary w-full py-2 sm:w-auto sm:px-4"
        disabled={disabled || saving}
        onClick={onSave}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        {saveLabel}
      </button>
    </>
  );
}
