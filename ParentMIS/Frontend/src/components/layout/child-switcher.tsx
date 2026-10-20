'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ChildSwitcher({ compact = false }: { compact?: boolean }) {
  const { linkedStudents, activeStudentId, setActiveStudent } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = linkedStudents.find((s) => s.id === activeStudentId) ?? linkedStudents[0] ?? null;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (linkedStudents.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border/60 bg-white transition hover:border-primary/40',
          compact ? 'py-1 pl-1 pr-2' : 'px-3 py-2'
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-[11px] font-bold text-primary">
          {active ? initials(active.fullName) : <Users size={14} />}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[140px] truncate text-xs font-semibold leading-tight text-navy">
            {active?.fullName ?? 'Select child'}
          </span>
          <span className="block text-[10px] uppercase tracking-wider text-muted">
            {linkedStudents.length > 1
              ? `${linkedStudents.length} children`
              : active?.className || 'Child'}
          </span>
        </span>
        <ChevronDown size={14} className={cn('text-muted', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-white shadow-soft-lg">
          <div className="border-b border-border bg-slate-50 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <Users size={12} className="text-primary" />
              Filter by child
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {linkedStudents.map((child) => {
              const selected = child.id === activeStudentId;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    setActiveStudent(child.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                    selected ? 'bg-navy/[0.05]' : 'hover:bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      selected ? 'bg-navy text-primary' : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {initials(child.fullName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy">{child.fullName}</span>
                    <span className="block truncate text-xs text-muted">
                      {[child.className, child.stream, child.shuleCode].filter(Boolean).join(' · ') || 'Student'}
                    </span>
                  </span>
                  {selected ? <Check size={16} className="shrink-0 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
