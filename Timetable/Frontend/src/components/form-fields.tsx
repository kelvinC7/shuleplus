'use client';

import type { ReactNode } from 'react';

export function FormField({
  label,
  required,
  children,
  className = '',
  compact = false,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-1.5'} ${className}`}>
      <label
        className={
          compact
            ? 'flex items-center text-xs font-semibold text-navy/75'
            : 'flex items-center text-[13px] font-semibold uppercase tracking-wider text-slate-500'
        }
      >
        {label}
        {required && <span className="ml-1 text-sm font-bold text-red-500">*</span>}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}

export function TextField({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  min,
  max,
  disabled,
  compact = false,
}: {
  label: string;
  required?: boolean;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <FormField label={label} required={required} className={className} compact={compact}>
      <input
        className={`input disabled:cursor-not-allowed disabled:opacity-60 ${compact ? '!rounded-xl !py-2.5 !px-3.5 !text-sm' : ''}`}
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
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
  compact = false,
  disabled = false,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <FormField label={label} required={required} className={className} compact={compact}>
      <select
        className={`input cursor-pointer appearance-none focus-visible:ring-2 focus-visible:ring-[#FCB038] ${compact ? '!rounded-xl !py-2.5 !px-3.5 !text-sm' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
