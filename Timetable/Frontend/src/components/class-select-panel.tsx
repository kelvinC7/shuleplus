'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, GraduationCap, Loader2, Search, Users } from 'lucide-react';
import type { ClassConfigListItem, ClassConfigStatus } from '@/types';

const NAVY = '#000435';

function statusChip(status: ClassConfigStatus) {
  if (status === 'ready') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (status === 'incomplete') return 'bg-amber-50 text-amber-800 ring-amber-100';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function statusLabel(status: ClassConfigStatus) {
  if (status === 'ready') return 'Ready';
  if (status === 'incomplete') return 'Incomplete';
  return 'Not configured';
}

export interface ClassSelectPanelProps {
  classes: ClassConfigListItem[];
  selectedClass: string | null;
  onSelect: (className: string) => void;
  /** Opens full class grid while keeping current selection visible until user picks another class */
  onBrowseClasses?: () => void;
  loading?: boolean;
  compact?: boolean;
}

export function ClassSelectPanel({
  classes,
  selectedClass,
  onSelect,
  onBrowseClasses,
  loading,
  compact,
}: ClassSelectPanelProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClassConfigStatus | 'all'>('all');

  const levels = useMemo(
    () => [...new Set(classes.map((c) => c.level).filter(Boolean))].sort(),
    [classes],
  );
  const streams = useMemo(
    () => [...new Set(classes.map((c) => c.stream).filter(Boolean))].sort() as string[],
    [classes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes.filter((c) => {
      if (q && !c.className.toLowerCase().includes(q)) return false;
      if (levelFilter && c.level !== levelFilter) return false;
      if (streamFilter && (c.stream ?? '') !== streamFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [classes, search, levelFilter, streamFilter, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-16 text-sm text-slate-400">
        <Loader2 className="animate-spin" size={18} /> Loading classes…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search classes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-amber-400/40 focus:ring-2"
          />
        </div>
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="">All levels</option>
          {levels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          value={streamFilter}
          onChange={(e) => setStreamFilter(e.target.value)}
        >
          <option value="">All streams</option>
          {streams.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ClassConfigStatus | 'all')}
        >
          <option value="all">All statuses</option>
          <option value="ready">Ready</option>
          <option value="incomplete">Incomplete</option>
          <option value="missing">Not configured</option>
        </select>
      </div>

      {selectedClass && compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-white px-4 py-3.5 shadow-sm">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800/70">Working on</p>
            <p className="truncate text-base font-extrabold" style={{ color: NAVY }}>
              {selectedClass}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-300/90 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-50"
            onClick={() => (onBrowseClasses ? onBrowseClasses() : onSelect(''))}
          >
            <ArrowLeftRight size={14} className="text-amber-600" />
            Change class
          </button>
        </div>
      ) : null}

      {!compact || !selectedClass ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-slate-400">No classes match your filters.</p>
          ) : (
            filtered.map((c) => {
              const selected = selectedClass === c.className;
              return (
                <button
                  key={c.className}
                  type="button"
                  onClick={() => onSelect(c.className)}
                  className={`group relative rounded-2xl border p-4 text-left transition shadow-sm hover:shadow-md ${
                    selected
                      ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/30'
                      : 'border-slate-200/80 bg-white hover:border-slate-300'
                  }`}
                >
                  {selected ? (
                    <CheckCircle2 className="absolute right-3 top-3 size-5 text-amber-600" />
                  ) : null}
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ background: `linear-gradient(135deg, ${NAVY}, #1c237e)` }}
                    >
                      <GraduationCap size={20} />
                    </div>
                    <div className="min-w-0 flex-1 pr-6">
                      <p className="truncate text-base font-bold" style={{ color: NAVY }}>
                        {c.className}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {[c.level, c.stream].filter(Boolean).join(' · ') || 'Class'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusChip(c.status)}`}
                    >
                      {statusLabel(c.status)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Users size={12} /> {c.studentCount} students
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {c.courseCount} courses · {c.teacherCount} teachers
                  </p>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
