'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

type PanelLayout = {
  top: number;
  left: number;
  width: number;
  listMaxHeight: number;
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

function measurePanelLayout(trigger: HTMLButtonElement): PanelLayout {
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(rect.width, 288);
  const left = Math.min(rect.left, window.innerWidth - width - 12);
  const headerHeight = 108;
  const margin = 12;
  const gap = 6;
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const preferBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
  const available = preferBelow ? spaceBelow - gap : spaceAbove - gap;
  const listMaxHeight = Math.max(160, Math.min(320, available - headerHeight));
  const top = preferBelow
    ? rect.bottom + gap
    : Math.max(margin, rect.top - gap - headerHeight - listMaxHeight);

  return { top, left, width, listMaxHeight };
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const custom = parseCustomPosition(value);
  const catalogMatch = findCatalogEntryByTitle(value);

  const [open, setOpen] = useState(false);
  const [panelLayout, setPanelLayout] = useState<PanelLayout | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'catalog' | 'other'>(custom ? 'other' : 'catalog');
  const [otherTitle, setOtherTitle] = useState(custom?.title ?? '');
  const [otherCode, setOtherCode] = useState(custom?.code ?? '');
  const [otherError, setOtherError] = useState<string | null>(null);

  const filtered = useMemo(() => filterCatalog(scope, query), [scope, query]);
  const groups = useMemo(() => grouped(filtered), [filtered]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    function reposition() {
      if (!triggerRef.current) return;
      setPanelLayout(measurePanelLayout(triggerRef.current));
    }

    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

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

  const panel =
    open && panelLayout && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Position options"
            style={{
              position: 'fixed',
              top: panelLayout.top,
              left: panelLayout.left,
              width: panelLayout.width,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-100 bg-white p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search position or code…"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-navy shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
              <div className="mt-2.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode('catalog')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === 'catalog' ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-slate-50'}`}
                >
                  Standard list
                </button>
                <button
                  type="button"
                  onClick={() => setMode('other')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === 'other' ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-slate-50'}`}
                >
                  Other (custom)
                </button>
              </div>
            </div>

            {mode === 'catalog' ? (
              <ul
                className="overflow-y-auto overscroll-contain py-1 text-sm"
                style={{ maxHeight: panelLayout.listMaxHeight }}
                role="listbox"
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-muted">No positions match your search.</li>
                ) : (
                  [...groups.entries()].map(([category, items]) => (
                    <li key={category}>
                      <p className="sticky top-0 z-[1] bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {category}
                      </p>
                      {items.map((entry) => (
                        <button
                          key={entry.title}
                          type="button"
                          role="option"
                          aria-selected={value === entry.title}
                          onClick={() => pick(entry)}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-primary/5 ${value === entry.title ? 'bg-primary/10 font-medium' : ''}`}
                        >
                          <span className="text-navy">{entry.title}</span>
                          <span className="shrink-0 font-mono text-[10px] text-slate-500">{entry.code}</span>
                        </button>
                      ))}
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <div className="max-h-[min(20rem,50vh)] space-y-2 overflow-y-auto p-3">
                <p className="text-xs text-muted">
                  Custom role with a unique abbreviation (2–4 characters). Stored as{' '}
                  <span className="font-mono">Title · CODE</span>.
                </p>
                <input
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Position title"
                  value={otherTitle}
                  onChange={(e) => setOtherTitle(e.target.value)}
                />
                <input
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Code e.g. SPT"
                  value={otherCode}
                  maxLength={4}
                  onChange={(e) => setOtherCode(e.target.value.toUpperCase())}
                />
                {otherError ? <p className="text-xs text-red-600">{otherError}</p> : null}
                <button
                  type="button"
                  onClick={applyOther}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  Apply custom position
                </button>
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-navy">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open && triggerRef.current) {
            setPanelLayout(measurePanelLayout(triggerRef.current));
          }
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-navy outline-none transition hover:border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Briefcase className="size-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {panel}
    </div>
  );
}
