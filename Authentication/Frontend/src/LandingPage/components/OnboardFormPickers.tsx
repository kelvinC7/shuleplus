'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildYearOptions, MONTHS } from './onboard-school-options';

const selectClass =
  'w-full rounded-xl border border-navy-900/[0.12] bg-white px-3.5 py-3 text-sm text-navy-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15';

export function EstablishedDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const [draft, setDraft] = useState({ year: '', month: '', day: '' });
  const years = useMemo(() => buildYearOptions(), []);

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      setDraft({ year, month, day });
    } else if (!value) {
      setDraft({ year: '', month: '', day: '' });
    }
  }, [value]);

  const daysInMonth = useMemo(() => {
    if (!draft.year || !draft.month) return 31;
    return new Date(Number(draft.year), Number(draft.month), 0).getDate();
  }, [draft.year, draft.month]);

  function patch(next: Partial<typeof draft>) {
    const merged = { ...draft, ...next };
    setDraft(merged);
    if (merged.year && merged.month && merged.day) {
      const max = new Date(Number(merged.year), Number(merged.month), 0).getDate();
      const day = Math.min(Number(merged.day), max);
      onChange(
        `${merged.year}-${merged.month}-${String(day).padStart(2, '0')}`,
      );
    } else {
      onChange('');
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        className={selectClass}
        value={draft.year}
        onChange={(e) => patch({ year: e.target.value, day: '' })}
        aria-label="Established year"
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={draft.month}
        onChange={(e) => patch({ month: e.target.value, day: '' })}
        aria-label="Established month"
        disabled={!draft.year}
      >
        <option value="">Month</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={draft.day}
        onChange={(e) => patch({ day: e.target.value })}
        aria-label="Established day"
        disabled={!draft.year || !draft.month}
      >
        <option value="">Day</option>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = String(i + 1).padStart(2, '0');
          return (
            <option key={d} value={d}>
              {i + 1}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export function SearchableMultiSelect({
  label,
  hint,
  placeholder,
  options,
  selected,
  onChange,
  allowCustom = true,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = options.filter((o) => !selected.includes(o));
    if (!q) return pool.slice(0, 40);
    return pool.filter((o) => o.toLowerCase().includes(q)).slice(0, 40);
  }, [options, query, selected]);

  const customCandidate = query.trim();
  const canAddCustom =
    allowCustom &&
    customCandidate.length > 0 &&
    !selected.some((s) => s.toLowerCase() === customCandidate.toLowerCase()) &&
    !options.some((o) => o.toLowerCase() === customCandidate.toLowerCase());

  function add(item: string) {
    const value = item.trim();
    if (!value) return;
    if (selected.some((s) => s.toLowerCase() === value.toLowerCase())) return;
    onChange([...selected, value]);
    setQuery('');
    setOpen(false);
  }

  function remove(item: string) {
    onChange(selected.filter((s) => s !== item));
  }

  return (
    <div ref={rootRef} className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/55">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-navy-700/45">{hint}</p> : null}
      </div>

      <div className="relative">
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 transition',
            open
              ? 'border-amber-400 ring-4 ring-amber-400/15'
              : 'border-navy-900/[0.12] hover:border-navy-900/25',
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-navy-700/40" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canAddCustom) {
                e.preventDefault();
                add(customCandidate);
              }
            }}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-navy-900 outline-none placeholder:text-navy-700/35"
          />
          {canAddCustom ? (
            <button
              type="button"
              onClick={() => add(customCandidate)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#000435] px-2.5 py-1.5 text-[11px] font-semibold text-white"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          ) : null}
        </div>

        {open && (filtered.length > 0 || canAddCustom) ? (
          <ul className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-navy-900/10 bg-white py-1 shadow-[0_16px_40px_rgba(0,4,53,0.14)]">
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm text-navy-900 hover:bg-amber-50"
                  onClick={() => add(opt)}
                >
                  <span>{opt}</span>
                  <Check className="h-4 w-4 text-amber-600 opacity-0" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <li key={item}>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#000435]/10 bg-[#000435]/[0.04] px-3 py-1.5 text-xs font-semibold text-[#000435]">
                {item}
                <button
                  type="button"
                  onClick={() => remove(item)}
                  className="rounded-md p-0.5 text-navy-700/45 hover:bg-navy-900/[0.06] hover:text-navy-900"
                  aria-label={`Remove ${item}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-navy-900/10 bg-[#f8f9fb] px-3.5 py-3 text-xs text-navy-700/45">
          Nothing selected yet — search the list or type a custom value and press Add.
        </p>
      )}
    </div>
  );
}
