'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

const SIZE_CLASS = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function BudgetModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'lg',
}: BudgetModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#000435]/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
        className={`relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-white shadow-2xl sm:rounded-2xl ${SIZE_CLASS[size]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="budget-modal-title" className="text-lg font-bold text-navy sm:text-xl">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border p-2 text-muted transition hover:bg-slate-50 hover:text-navy"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-border bg-slate-50/80 px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
