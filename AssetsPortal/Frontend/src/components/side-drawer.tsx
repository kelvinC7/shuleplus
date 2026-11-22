'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SideDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

const WIDTH_CLASS: Record<NonNullable<SideDrawerProps['width']>, string> = {
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

export function SideDrawer({
  open,
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  width = 'lg',
}: SideDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/45 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div
        className={`relative flex h-dvh w-full flex-col bg-white shadow-2xl ${WIDTH_CLASS[width]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-drawer-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy text-primary">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 id="side-drawer-title" className="text-lg font-semibold text-navy">
                {title}
              </h2>
              {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-white px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DrawerSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,4,53,0.03)] sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
