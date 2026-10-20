'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Pin action buttons below scrollable content */
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export function LibModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  footer,
}: LibModalProps) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lib-modal-title"
    >
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'relative flex w-full flex-col overflow-hidden bg-white shadow-2xl',
          'max-h-[min(92dvh,900px)]',
          'rounded-t-3xl border border-white/60 sm:rounded-3xl',
          'animate-in fade-in slide-in-from-bottom-4 duration-200 sm:zoom-in-95 sm:slide-in-from-bottom-0',
          sizeClasses[size],
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/40 bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0 pr-2">
            <h2 id="lib-modal-title" className="truncate text-lg font-bold text-navy">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-slate-100 hover:text-navy"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="lib-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-border/40 bg-slate-50/80 px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, required, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

/** Standard modal footer with Cancel + primary action */
export function ModalFooter({
  onCancel,
  cancelLabel = 'Cancel',
  submitLabel,
  loading,
  disabled,
  formId,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  loading?: boolean;
  disabled?: boolean;
  formId?: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className="btn-secondary w-full sm:w-auto" disabled={loading}>
        {cancelLabel}
      </button>
      <button
        type="submit"
        form={formId}
        disabled={loading || disabled}
        className="btn-primary w-full sm:w-auto"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
            Saving…
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
