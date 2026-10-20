'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, Search, Upload, X } from 'lucide-react';
import { FormField } from '@/components/hr-step-wizard';

export function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {icon} {title}
    </h3>
  );
}

type ComboboxItem = { value: string; label: string; key: string };

function normalizeOptions(options: string[]): ComboboxItem[] {
  const items: ComboboxItem[] = [];
  const seen = new Map<string, number>();
  for (const raw of options) {
    const value = raw.trim();
    if (!value) continue;
    const count = seen.get(value) ?? 0;
    seen.set(value, count + 1);
    items.push({ value, label: value, key: count === 0 ? value : `${value}-${count}` });
  }
  return items;
}

export function SearchableSelect({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = 'Search or select…',
  className = '',
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const normalized = useMemo(() => normalizeOptions(options), [options]);

  useEffect(() => setQuery(value), [value]);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () => normalized.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30),
    [normalized, query]
  );

  return (
    <FormField label={label} required={required} className={className}>
      <div className="relative" ref={ref}>
        <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {filtered.map((item) => (
              <button
                key={item.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(item.value); setQuery(item.value); setOpen(false); }}
                className={`flex w-full rounded-xl px-3 py-2 text-left text-sm ${
                  value === item.value ? 'bg-[#FCB038]/10 font-semibold text-[#000435]' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </FormField>
  );
}

export function MultiSelectChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }
  return (
    <FormField label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                active ? 'border-[#FCB038] bg-[#FCB038]/10 text-[#000435]' : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </FormField>
  );
}

export function FileUploadBox({
  label,
  hint,
  file,
  accept,
  onPick,
}: {
  label: string;
  hint: string;
  file: File | null;
  accept: string;
  onPick: (file: File | null) => void;
}) {
  if (file) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#FCB038]/40 bg-[#FCB038]/[0.06] px-3 py-4 text-center">
        <Check size={16} className="text-[#FCB038]" />
        <p className="text-xs font-semibold text-[#000435]">{label}</p>
        <p className="truncate text-[10px] text-slate-500">{file.name}</p>
        <button type="button" onClick={() => onPick(null)} className="text-[10px] font-bold text-red-500">
          Remove
        </button>
      </div>
    );
  }
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center hover:border-[#FCB038]/50">
      <Upload size={16} className="text-[#FCB038]" />
      <p className="text-xs font-semibold text-[#000435]">{label}</p>
      <p className="text-[10px] text-slate-500">{hint}</p>
      <input type="file" accept={accept} className="sr-only" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}
