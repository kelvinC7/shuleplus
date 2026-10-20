'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Briefcase, ChevronDown, Search } from 'lucide-react';
import {
  STAFF_POSITION_CATALOG,
  TEACHING_POSITION_CATEGORY,
  RESERVED_POSITION_CODES,
  formatCustomPosition,
  parseCustomPosition,
  findCatalogEntryByTitle,
  type StaffPositionEntry,
} from '@/lib/staff-positions';

const OTHER_VALUE = '__OTHER__';

export type StaffPositionSelectProps = {
  value: string;
  onChange: (position: string) => void;
  /** Full catalog vs teaching roles only (Timetable). */
  scope?: 'all' | 'teachers';
  required?: boolean;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
};

function filterCatalog(scope: 'all' | 'teachers', query: string): StaffPositionEntry[] {
  let list =
    scope === 'teachers'
      ? STAFF_POSITION_CATALOG.filter((p) => p.category === TEACHING_POSITION_CATEGORY)
      : STAFF_POSITION_CATALOG;

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }
  return list;
}

function grouped(entries: StaffPositionEntry[]): Map<string, StaffPositionEntry[]> {
  const map = new Map<string, StaffPositionEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.category) ?? [];
    arr.push(e);
    map.set(e.category, arr);
  }
  return map;
}

export function StaffPositionSelect({
  value,
  onChange,
  scope = 'all',
  required,
  disabled,
  label = 'Position',
  id: idProp,
  className = '',
}: StaffPositionSelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);

  const custom = parseCustomPosition(value);
  const catalogMatch = findCatalogEntryByTitle(value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'catalog' | 'other'>(custom ? 'other' : 'catalog');
  const [otherTitle, setOtherTitle] = useState(custom?.title ?? '');
  const [otherCode, setOtherCode] = useState(custom?.code ?? '');
  const [otherError, setOtherError] = useState<string | null>(null);

  const filtered = useMemo(() => filterCatalog(scope, query), [scope, query]);
  const groups = useMemo(() => grouped(filtered), [filtered]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const displayLabel = catalogMatch
    ? `${catalogMatch.title} (${catalogMatch.code})`
    : custom
      ? `${custom.title} (${custom.code})`
      : value.trim() || 'Select position…';

  function pick(entry: StaffPositionEntry) {
    onChange(entry.title);
    setMode('catalog');
    setOpen(false);
    setQuery('');
  }

  function applyOther() {
    const title = otherTitle.trim();
    const code = otherCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (!title) {
      setOtherError('Enter a position title.');
      return;
    }
    if (!/^[A-Z0-9]{2,4}$/.test(code)) {
      setOtherError('Abbreviation must be 2–4 letters/numbers.');
      return;
    }
    if (RESERVED_POSITION_CODES.has(code)) {
      setOtherError(`Code ${code} is reserved. Choose another abbreviation.`);
      return;
    }
    setOtherError(null);
    onChange(formatCustomPosition(title, code));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-navy">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}

      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-navy outline-none transition hover:border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Briefcase className="size-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1.5 w-full min-w-[min(100%,20rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search position or code…"
                className="h-9 w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-2 text-sm outline-none focus:border-primary/40"
                autoFocus
              />
            </div>
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                onClick={() => setMode('catalog')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${mode === 'catalog' ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-slate-50'}`}
              >
                Standard list
              </button>
              <button
                type="button"
                onClick={() => setMode('other')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${mode === 'other' ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-slate-50'}`}
              >
                Other (custom)
              </button>
            </div>
          </div>

          {mode === 'catalog' ? (
            <ul className="max-h-64 overflow-y-auto py-1 text-sm" role="listbox">
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-muted">No positions match your search.</li>
              ) : (
                [...groups.entries()].map(([category, items]) => (
                  <li key={category}>
                    <p className="sticky top-0 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {category}
                    </p>
                    {items.map((entry) => (
                      <button
                        key={entry.title}
                        type="button"
                        role="option"
                        aria-selected={value === entry.title}
                        onClick={() => pick(entry)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-primary/5 ${value === entry.title ? 'bg-primary/10 font-medium' : ''}`}
                      >
                        <span className="truncate text-navy">{entry.title}</span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-500">{entry.code}</span>
                      </button>
                    ))}
                  </li>
                ))
              )}
            </ul>
          ) : (
            <div className="space-y-2 p-3">
              <p className="text-xs text-muted">
                Custom role with a unique abbreviation (2–4 characters). Stored as{' '}
                <span className="font-mono">Title · CODE</span>.
              </p>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none focus:border-primary/40"
                placeholder="Position title"
                value={otherTitle}
                onChange={(e) => setOtherTitle(e.target.value)}
              />
              <input
                className="h-9 w-full rounded-lg border border-slate-200 px-2.5 font-mono text-sm uppercase outline-none focus:border-primary/40"
                placeholder="Code e.g. SPT"
                value={otherCode}
                maxLength={4}
                onChange={(e) => setOtherCode(e.target.value.toUpperCase())}
              />
              {otherError ? <p className="text-xs text-red-600">{otherError}</p> : null}
              <button
                type="button"
                onClick={applyOther}
                className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Apply custom position
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
