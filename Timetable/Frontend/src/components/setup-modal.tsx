'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';

interface SetupModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export function SetupModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
  footer,
  size = 'md',
}: SetupModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!open || !mounted) return null;

  const maxW =
    size === 'xl' ? 'max-w-2xl sm:max-w-3xl' : size === 'lg' ? 'max-w-xl sm:max-w-2xl' : 'max-w-md sm:max-w-lg';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-modal-title"
        className={`relative grid w-full ${maxW} max-h-[min(calc(100dvh-2rem),680px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_24px_60px_-12px_rgba(0,4,53,0.35)] animate-scale-in`}
      >
        {/* Header — fixed */}
        <div className="border-b border-border/50 bg-gradient-to-r from-navy/[0.03] via-white to-primary/[0.08] px-4 py-3.5 sm:px-5">
          <div className="flex items-start gap-3">
            {Icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-primary shadow-sm">
                <Icon size={18} strokeWidth={1.75} />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="setup-modal-title" className="text-base font-bold leading-tight text-navy sm:text-lg">
                  {title}
                </h2>
                {badge ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ochre">
                    {badge}
                  </span>
                ) : null}
              </div>
              {subtitle ? <p className="mt-0.5 text-xs leading-snug text-muted sm:text-sm">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-transparent p-1.5 text-muted transition hover:border-border hover:bg-white hover:text-navy"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="modal-scroll overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {children}
        </div>

        {/* Footer — fixed */}
        {footer ? (
          <div className="border-t border-border/50 bg-slate-50/90 px-4 py-3 sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function ModalSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-navy/75">{title}</h3>
        {description ? <p className="mt-0.5 text-[11px] leading-snug text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
