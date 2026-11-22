'use client';

import * as React from 'react';
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


export function SearchableSelectField({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
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
  searchPlaceholder?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <FormField label={label} required={required} className={className} compact={compact}>
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) { setOpen((v) => !v); setQ(''); } }}
          className={`input w-full text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FCB038] ${compact ? '!rounded-xl !py-2.5 !px-3.5 !text-sm' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <span className={selected ? 'text-navy' : 'text-muted'}>{selected?.label || placeholder}</span>
        </button>
        {open && !disabled ? (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-white shadow-lg">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                className="input !py-2 !px-3 !text-sm w-full"
                placeholder={searchPlaceholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="max-h-56 overflow-auto py-1">
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${!value ? 'font-semibold text-navy bg-slate-50' : 'text-muted'}`}
                onClick={() => { onChange(''); setOpen(false); setQ(''); }}
              >
                {placeholder}
              </button>
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted">No results found</div>
              ) : filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${opt.value === value ? 'font-semibold text-navy bg-primary/5' : 'text-slate-700'}`}
                  onClick={() => { onChange(opt.value); setOpen(false); setQ(''); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </FormField>
  );
}
