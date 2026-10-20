'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function SalaryPanel({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          {title ? <h3 className="text-sm font-bold text-navy">{title}</h3> : <span />}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function SalaryField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function SalaryMiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-lg font-extrabold tracking-tight ${accent ? 'text-[#FCB038]' : 'text-navy'}`}>{value}</p>
    </div>
  );
}

export function SalarySwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
        checked ? 'border-[#FCB038]/40 bg-[#FCB038]/10 text-[#000435]' : 'border-slate-200 bg-white text-navy'
      }`}
    >
      <span>{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#FCB038]' : 'bg-slate-200'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}

export function ModeSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50/80 p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            value === opt.id ? 'bg-white text-navy shadow-sm ring-1 ring-slate-200/80' : 'text-muted hover:text-navy'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SalaryModal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl motion-safe:animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export function SalaryEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-muted">
      {message}
    </div>
  );
}

export const STATUTORY_LABELS: Record<string, string> = {
  rssbEmployee: 'RSSB Employee',
  rssbEmployer: 'RSSB Employer',
  occupationalHazard: 'Occupational Hazard',
  maternityEmployee: 'Maternity (Emp)',
  maternityEmployer: 'Maternity (Er)',
  ramaEmployee: 'RAMA Employee',
  ramaEmployer: 'RAMA Employer',
  cbhi: 'CBHI',
};
