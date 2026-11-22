'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface TransportModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Full-width wizard / map steps */
  xl?: boolean;
}

export function TransportModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  wide,
  xl,
}: TransportModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const maxWidth = xl ? 'max-w-5xl' : wide ? 'max-w-3xl' : 'max-w-lg';

  return createPortal(
    <div className="transport-modal-root fixed inset-0 z-[10000] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-navy/55 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transport-modal-title"
        className={`relative z-[1] flex max-h-[min(92vh,780px)] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl animate-scale-in sm:rounded-3xl ${maxWidth}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="transport-modal-title" className="text-lg font-bold text-navy sm:text-xl">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-border p-2 text-muted transition hover:bg-slate-50 hover:text-navy"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="relative z-[1] flex-1 overflow-y-auto bg-white px-5 py-4 sm:px-6">{children}</div>
        {footer ? (
          <div className="relative z-[1] flex flex-wrap items-center justify-end gap-2 border-t border-border bg-slate-50/95 px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
