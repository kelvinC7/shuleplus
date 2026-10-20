'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function AssetsModal({
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
  size?: 'md' | 'lg';
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={`flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assets-modal-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 id="assets-modal-title" className="text-lg font-semibold text-navy">
                {title}
              </h2>
              {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </label>
  );
}

export function AssetPicker({
  assets,
  value,
  onChange,
  placeholder = 'Search asset…',
}: {
  assets: Array<{ id: string; assetCode: string; assetName: string; categoryName?: string }>;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const selected = assets.find((a) => a.id === value);

  return (
    <div className="space-y-2">
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.assetCode} — {a.assetName}
          </option>
        ))}
      </select>
      {selected ? (
        <div className="rounded-xl border border-border bg-slate-50/80 px-3 py-2.5">
          <p className="font-semibold text-navy">{selected.assetCode}</p>
          <p className="text-sm text-navy">{selected.assetName}</p>
          {selected.categoryName ? (
            <p className="text-xs text-muted">{selected.categoryName}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
