'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function SideDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'lg' | 'xl' | 'full';
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

  const w =
    width === 'full'
      ? 'w-full max-w-[96vw]'
      : width === 'xl'
        ? 'w-full max-w-[min(920px,92vw)]'
        : 'w-full max-w-[min(720px,90vw)]';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close panel"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative grid h-dvh ${w} grid-rows-[auto_minmax(0,1fr)_auto] border-l border-white/20 bg-white shadow-[-12px_0_40px_rgba(0,4,53,0.18)] animate-slide-in-right`}
      >
        <div className="border-b border-border/50 bg-gradient-to-r from-navy/[0.04] via-white to-primary/[0.1] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-navy">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-transparent p-2 text-muted hover:border-border hover:bg-white hover:text-navy"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="modal-scroll overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-border/50 bg-slate-50/90 px-5 py-3">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
