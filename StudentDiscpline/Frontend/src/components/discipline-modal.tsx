'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function DisciplineModal({
  open,
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#000435]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className={`flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl ${
        size === 'xl' ? 'sm:max-w-4xl' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
      }`} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-3 rounded-t-2xl bg-[#000435] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fcb038]/20 text-[#fcb038]">{icon}</span> : null}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#fcb038]">Student Discipline</p>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs text-white/60">{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}

export function FormField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}{required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}
