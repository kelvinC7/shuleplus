"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface FormSheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export function FormSheet({ title, subtitle, onClose, children, footer }: FormSheetProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-sheet-title"
        className="relative z-[81] flex w-full max-h-[94dvh] flex-col overflow-hidden rounded-t-[28px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_40px_rgba(0,4,53,0.18)] sm:max-h-[88vh] sm:max-w-[520px] sm:rounded-[28px] sm:shadow-[0_24px_60px_-20px_rgba(0,4,53,0.35)]"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200 sm:hidden" />
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-3 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <h2 id="form-sheet-title" className="text-lg font-bold tracking-tight text-navy">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>
        <footer className="flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {footer}
        </footer>
      </div>
    </div>
  );
}
